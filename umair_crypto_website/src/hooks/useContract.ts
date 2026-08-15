import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import {
  CONTRACT_ADDRESSES,
  ROBINHOOD_TESTNET_CONFIG,
  SUPPORTED_REWARD_ASSETS,
  type RewardAssetConfig,
} from '../constants/contracts';
import {
  BANANA_TOKEN_ABI,
  OOHDIES_NFT_ABI,
  ACTIVATION_CONTROLLER_ABI,
  EARNING_ENGINE_ABI,
  REWARD_VAULT_ABI,
} from '../constants/abis';
import { getNFTChosenStockIds, getNFTChosenAssets } from '../utils/stockSelection';

const publicProvider = new ethers.JsonRpcProvider(ROBINHOOD_TESTNET_CONFIG.rpcUrl);

export interface NFTRewardClaimable {
  assetId: string;
  assetAddress: string;
  symbol: string;
  decimals: number;
  icon?: string;
  claimable: string;
  claimableRaw: bigint;
}

export interface UserNFTItem {
  tokenId: number;
  name: string;
  image: string;
  isActivated: boolean;
  activatedAt: number;
  chosenStockIds: string[];
  chosenAssets: RewardAssetConfig[];
  rewards: Record<string, NFTRewardClaimable>;
  claimableUSDG: string;
  claimableAAPL: string;
}

export interface AssetClaimTotal {
  assetAddress: string;
  symbol: string;
  decimals: number;
  icon?: string;
  totalClaimed: string;
  totalClaimedRaw: bigint;
}

export interface RewardPeriodInfo {
  assetAddress: string;
  symbol: string;
  rewardRate: bigint;
  periodFinish: number;
  lastUpdateTime: number;
  isActive: boolean;
  secondsRemaining: number;
}

export interface UserActivityItem {
  id: string;
  type: 'mint' | 'activation' | 'claim' | 'transfer';
  typeLabel: string;
  title: string;
  description: string;
  amount?: string;
  txHash: string;
  timestamp: number;
  timeFormatted: string;
}

export function useContract() {
  const { signer, isConnected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'awaiting' | 'pending' | 'confirmed' | 'failed'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const fetchPlatformStats = useCallback(async () => {
    try {
      const bananaContract = new ethers.Contract(CONTRACT_ADDRESSES.BANANA_TOKEN, BANANA_TOKEN_ABI, publicProvider);
      const nftContract = new ethers.Contract(CONTRACT_ADDRESSES.OOHDIES_NFT, OOHDIES_NFT_ABI, publicProvider);

      const [totalSupply, totalMinted, maxSupply] = await Promise.all([
        bananaContract.totalSupply(),
        nftContract.totalMinted(),
        nftContract.MAX_SUPPLY(),
      ]);

      const initialSupply = 1_000_000_000n * 10n ** 18n;
      const burnedWei = initialSupply - BigInt(totalSupply);

      return {
        totalSupply: ethers.formatEther(totalSupply),
        burnedTokens: ethers.formatEther(burnedWei),
        totalMinted: Number(totalMinted),
        maxSupply: Number(maxSupply),
        mintsLeft: Number(maxSupply) - Number(totalMinted),
      };
    } catch (err) {
      console.error('Failed to fetch platform stats:', err);
      return null;
    }
  }, []);

  const fetchGlobalRewardStats = useCallback(async () => {
    try {
      const vaultContract = new ethers.Contract(CONTRACT_ADDRESSES.REWARD_VAULT, REWARD_VAULT_ABI, publicProvider);

      const assetTotals: AssetClaimTotal[] = await Promise.all(
        SUPPORTED_REWARD_ASSETS.map(async (asset) => {
          try {
            const raw = await vaultContract.totalClaimed(asset.address);
            const formatted = ethers.formatUnits(raw, asset.decimals);
            return {
              assetAddress: asset.address,
              symbol: asset.symbol,
              decimals: asset.decimals,
              icon: asset.icon,
              totalClaimed: formatted,
              totalClaimedRaw: raw,
            };
          } catch {
            return {
              assetAddress: asset.address,
              symbol: asset.symbol,
              decimals: asset.decimals,
              icon: asset.icon,
              totalClaimed: '0',
              totalClaimedRaw: 0n,
            };
          }
        })
      );

      const usdgTotal = assetTotals.find((a) => a.symbol === 'USDG')?.totalClaimed || '0.00';
      const aaplTotal = assetTotals.find((a) => a.symbol === 'AAPLx')?.totalClaimed || '0.0000';

      return {
        assetTotals,
        totalClaimedUSDG: usdgTotal,
        totalClaimedAAPLx: aaplTotal,
      };
    } catch (err) {
      console.error('Failed to fetch global reward stats:', err);
      return null;
    }
  }, []);

  const fetchUserBananaBalance = useCallback(async (address: string) => {
    try {
      const bananaContract = new ethers.Contract(CONTRACT_ADDRESSES.BANANA_TOKEN, BANANA_TOKEN_ABI, publicProvider);
      const balance = await bananaContract.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (err) {
      console.error('Failed to fetch BANANA balance:', err);
      return '0.0';
    }
  }, []);

  const fetchUserNFTs = useCallback(async (userAddress: string): Promise<UserNFTItem[]> => {
    try {
      const nftContract = new ethers.Contract(CONTRACT_ADDRESSES.OOHDIES_NFT, OOHDIES_NFT_ABI, publicProvider);
      const activationContract = new ethers.Contract(CONTRACT_ADDRESSES.ACTIVATION_CONTROLLER, ACTIVATION_CONTROLLER_ABI, publicProvider);
      const engineContract = new ethers.Contract(CONTRACT_ADDRESSES.EARNING_ENGINE, EARNING_ENGINE_ABI, publicProvider);

      const userBalance = Number(await nftContract.balanceOf(userAddress));
      if (userBalance === 0) return [];

      const totalMinted = Number(await nftContract.totalMinted().catch(() => 0n));
      if (totalMinted === 0) return [];

      let candidateIds: number[] = [];

      if (totalMinted <= 50) {
        candidateIds = Array.from({ length: totalMinted }, (_, i) => i + 1);
      } else {
        try {
          const filter = nftContract.filters.Transfer(null, userAddress);
          const events = await nftContract.queryFilter(filter);
          const ids = new Set<number>();
          for (const ev of events) {
            if ('args' in ev && ev.args && ev.args.tokenId) {
              ids.add(Number(ev.args.tokenId));
            }
          }
          candidateIds = Array.from(ids);
        } catch {
          candidateIds = Array.from({ length: Math.min(totalMinted, 50) }, (_, i) => i + 1);
        }
      }

      const ownedItems: UserNFTItem[] = [];
      const checkPromises = candidateIds.map(async (tokenId) => {
        try {
          const owner = await nftContract.ownerOf(tokenId);
          if (owner.toLowerCase() === userAddress.toLowerCase()) {
            const [isAct, actAt] = await Promise.all([
              activationContract.isActivated(tokenId).catch(() => false),
              activationContract.getActivatedAt(tokenId).catch(() => 0n),
            ]);

            const chosenStockIds = getNFTChosenStockIds(tokenId);
            const chosenAssets = getNFTChosenAssets(tokenId);

            const rewards: Record<string, NFTRewardClaimable> = {};
            let usdgClaimableStr = '0.00';
            let aaplClaimableStr = '0.0000';

            if (Boolean(isAct)) {

              await Promise.all(
                chosenAssets.map(async (asset: RewardAssetConfig) => {
                  try {
                    const claimableWei = await engineContract.getTotalClaimableReward(tokenId, asset.address).catch(() => 0n);
                    const formatted = ethers.formatUnits(claimableWei, asset.decimals);

                    rewards[asset.address.toLowerCase()] = {
                      assetId: asset.id,
                      assetAddress: asset.address,
                      symbol: asset.symbol,
                      decimals: asset.decimals,
                      icon: asset.icon,
                      claimable: formatted,
                      claimableRaw: claimableWei,
                    };

                    if (asset.symbol === 'USDG') usdgClaimableStr = formatted;
                    if (asset.symbol === 'AAPLx') aaplClaimableStr = formatted;
                  } catch {
                    rewards[asset.address.toLowerCase()] = {
                      assetId: asset.id,
                      assetAddress: asset.address,
                      symbol: asset.symbol,
                      decimals: asset.decimals,
                      icon: asset.icon,
                      claimable: '0.00',
                      claimableRaw: 0n,
                    };
                  }
                })
              );
            }

            for (const asset of SUPPORTED_REWARD_ASSETS) {
              if (!rewards[asset.address.toLowerCase()]) {
                rewards[asset.address.toLowerCase()] = {
                  assetId: asset.id,
                  assetAddress: asset.address,
                  symbol: asset.symbol,
                  decimals: asset.decimals,
                  icon: asset.icon,
                  claimable: asset.decimals === 6 ? '0.00' : '0.0000',
                  claimableRaw: 0n,
                };
              }
            }

            const artIndex = ((tokenId - 1) % 5) + 1;

            return {
              tokenId,
              name: `Oohdie #${String(tokenId).padStart(3, '0')}`,
              image: `/assets/collection/user_art_${artIndex}.jpg`,
              isActivated: Boolean(isAct),
              activatedAt: Number(actAt),
              chosenStockIds,
              chosenAssets,
              rewards,
              claimableUSDG: usdgClaimableStr,
              claimableAAPL: aaplClaimableStr,
            };
          }
        } catch {
          return null;
        }
        return null;
      });

      const results = await Promise.all(checkPromises);
      for (const res of results) {
        if (res) ownedItems.push(res);
      }

      return ownedItems.sort((a, b) => a.tokenId - b.tokenId);
    } catch (err) {
      console.error('Failed to fetch user NFTs:', err);
      return [];
    }
  }, []);

  const fetchUserTotalClaimed = useCallback(async (userAddress: string): Promise<AssetClaimTotal[]> => {
    if (!userAddress) return [];
    try {
      const vaultContract = new ethers.Contract(CONTRACT_ADDRESSES.REWARD_VAULT, REWARD_VAULT_ABI, publicProvider);
      const claimFilter = vaultContract.filters.RewardClaimed(null, null, userAddress);
      const claimEvents = await vaultContract.queryFilter(claimFilter, 0, 'latest');

      const totalsByAsset: Record<string, bigint> = {};
      for (const ev of claimEvents) {
        if ('args' in ev && ev.args) {
          const assetAddr = String(ev.args.asset).toLowerCase();
          const amount = BigInt(ev.args.amount);
          totalsByAsset[assetAddr] = (totalsByAsset[assetAddr] || 0n) + amount;
        }
      }

      return SUPPORTED_REWARD_ASSETS.map((asset) => {
        const raw = totalsByAsset[asset.address.toLowerCase()] || 0n;
        return {
          assetAddress: asset.address,
          symbol: asset.symbol,
          decimals: asset.decimals,
          icon: asset.icon,
          totalClaimed: ethers.formatUnits(raw, asset.decimals),
          totalClaimedRaw: raw,
        };
      });
    } catch (err) {
      console.error('Failed to fetch user total claimed:', err);
      return [];
    }
  }, []);

  const fetchUserActivity = useCallback(async (userAddress: string): Promise<UserActivityItem[]> => {
    if (!userAddress) return [];
    try {
      const vaultContract = new ethers.Contract(CONTRACT_ADDRESSES.REWARD_VAULT, REWARD_VAULT_ABI, publicProvider);
      const actContract = new ethers.Contract(CONTRACT_ADDRESSES.ACTIVATION_CONTROLLER, ACTIVATION_CONTROLLER_ABI, publicProvider);
      const nftContract = new ethers.Contract(CONTRACT_ADDRESSES.OOHDIES_NFT, OOHDIES_NFT_ABI, publicProvider);

      const [claimEvents, actEvents, transferEvents] = await Promise.all([
        vaultContract.queryFilter(vaultContract.filters.RewardClaimed(null, null, userAddress), 0, 'latest').catch(() => []),
        actContract.queryFilter(actContract.filters.NFTActivated(null, userAddress), 0, 'latest').catch(() => []),
        nftContract.queryFilter(nftContract.filters.Transfer(null, userAddress), 0, 'latest').catch(() => []),
      ]);

      const blockTimestampCache = new Map<number, number>();
      const getBlockTime = async (blockNumber: number): Promise<number> => {
        if (blockTimestampCache.has(blockNumber)) {
          return blockTimestampCache.get(blockNumber)!;
        }
        try {
          const block = await publicProvider.getBlock(blockNumber);
          const t = block ? block.timestamp : Math.floor(Date.now() / 1000);
          blockTimestampCache.set(blockNumber, t);
          return t;
        } catch {
          return Math.floor(Date.now() / 1000);
        }
      };

      const formatTime = (ts: number): string => {
        const now = Math.floor(Date.now() / 1000);
        const diff = Math.max(0, now - ts);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
      };

      const activities: UserActivityItem[] = [];

      for (const ev of claimEvents) {
        if ('args' in ev && ev.args) {
          const tokenId = Number(ev.args.tokenId);
          const assetAddr = String(ev.args.asset).toLowerCase();
          const amountRaw = ev.args.amount;

          const matchedConfig = SUPPORTED_REWARD_ASSETS.find(
            (a) => a.address.toLowerCase() === assetAddr
          );
          const symbol = matchedConfig ? matchedConfig.symbol : 'REWARD';
          const decimals = matchedConfig ? matchedConfig.decimals : 18;
          const formattedAmount = `${ethers.formatUnits(amountRaw, decimals)} ${symbol}`;
          const timestamp = await getBlockTime(ev.blockNumber);

          activities.push({
            id: `claim-${ev.transactionHash}-${tokenId}-${assetAddr}`,
            type: 'claim',
            typeLabel: 'CLAIM',
            title: `Oohdie #${String(tokenId).padStart(3, '0')}`,
            description: `${symbol} rewards claimed from vault`,
            amount: `+${formattedAmount}`,
            txHash: ev.transactionHash,
            timestamp,
            timeFormatted: formatTime(timestamp),
          });
        }
      }

      for (const ev of actEvents) {
        if ('args' in ev && ev.args) {
          const tokenId = Number(ev.args.tokenId);
          const burnedAmount = ethers.formatEther(ev.args.bananaBurned);
          const timestamp = ev.args.activatedAtTimestamp ? Number(ev.args.activatedAtTimestamp) : await getBlockTime(ev.blockNumber);

          activities.push({
            id: `act-${ev.transactionHash}-${tokenId}`,
            type: 'activation',
            typeLabel: 'ACTIVATION',
            title: `Oohdie #${String(tokenId).padStart(3, '0')}`,
            description: `Activated on-chain (${burnedAmount} BANANA eaten)`,
            amount: `-${burnedAmount} BANANA`,
            txHash: ev.transactionHash,
            timestamp,
            timeFormatted: formatTime(timestamp),
          });
        }
      }

      for (const ev of transferEvents) {
        if ('args' in ev && ev.args) {
          const from = String(ev.args.from);
          const tokenId = Number(ev.args.tokenId);
          const isMint = from === ethers.ZeroAddress;
          const timestamp = await getBlockTime(ev.blockNumber);

          activities.push({
            id: `transfer-${ev.transactionHash}-${tokenId}`,
            type: isMint ? 'mint' : 'transfer',
            typeLabel: isMint ? 'MINT' : 'TRANSFER',
            title: `Oohdie #${String(tokenId).padStart(3, '0')}`,
            description: isMint ? 'Minted from primary collection' : `Received from ${from.substring(0, 6)}...${from.substring(from.length - 4)}`,
            txHash: ev.transactionHash,
            timestamp,
            timeFormatted: formatTime(timestamp),
          });
        }
      }

      return activities.sort((a, b) => b.timestamp - a.timestamp);
    } catch (err) {
      console.error('Failed to fetch user on-chain activity:', err);
      return [];
    }
  }, []);

  const mintNFT = useCallback(async () => {
    if (!signer || !isConnected) throw new Error('Wallet not connected');
    setLoading(true);
    setTxStatus('awaiting');
    setTxHash(null);
    setTxError(null);

    try {
      const nftContract = new ethers.Contract(CONTRACT_ADDRESSES.OOHDIES_NFT, OOHDIES_NFT_ABI, signer);
      const userAddress = await signer.getAddress();
      const mintPrice = await nftContract.mintPrice().catch(() => 0n);
      const tx = await nftContract.mint(userAddress, { value: mintPrice });
      setTxStatus('pending');
      setTxHash(tx.hash);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        setTxStatus('confirmed');
        return true;
      } else {
        throw new Error('Transaction reverted');
      }
    } catch (err: any) {
      setTxStatus('failed');
      setTxError(err.reason || err.message || 'Minting failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [signer, isConnected]);

  const activateNFT = useCallback(async (tokenId: number) => {
    if (!signer || !isConnected) throw new Error('Wallet not connected');
    setLoading(true);
    setTxStatus('awaiting');
    setTxHash(null);
    setTxError(null);

    try {
      const userAddress = await signer.getAddress();
      const bananaContract = new ethers.Contract(CONTRACT_ADDRESSES.BANANA_TOKEN, BANANA_TOKEN_ABI, signer);
      const activationContract = new ethers.Contract(CONTRACT_ADDRESSES.ACTIVATION_CONTROLLER, ACTIVATION_CONTROLLER_ABI, signer);

      const cost = await activationContract.activationCost();
      const allowance = await bananaContract.allowance(userAddress, CONTRACT_ADDRESSES.ACTIVATION_CONTROLLER);

      if (BigInt(allowance) < BigInt(cost)) {
        console.log('Requesting BANANA approval...');
        const approveTx = await bananaContract.approve(CONTRACT_ADDRESSES.ACTIVATION_CONTROLLER, cost);
        setTxStatus('pending');
        setTxHash(approveTx.hash);
        await approveTx.wait();
        console.log('BANANA approved.');
      }

      setTxStatus('awaiting');
      const actTx = await activationContract.activate(tokenId);
      setTxStatus('pending');
      setTxHash(actTx.hash);
      const receipt = await actTx.wait();

      if (receipt.status === 1) {
        setTxStatus('confirmed');
        return true;
      } else {
        throw new Error('Activation transaction failed');
      }
    } catch (err: any) {
      setTxStatus('failed');
      setTxError(err.reason || err.message || 'Activation failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [signer, isConnected]);

  const claimRewardAsset = useCallback(async (tokenId: number, assetAddress: string) => {
    if (!signer || !isConnected) throw new Error('Wallet not connected');
    setLoading(true);
    setTxStatus('awaiting');
    setTxHash(null);
    setTxError(null);

    try {
      const vaultContract = new ethers.Contract(CONTRACT_ADDRESSES.REWARD_VAULT, REWARD_VAULT_ABI, signer);
      const tx = await vaultContract.claimReward(tokenId, assetAddress);
      setTxStatus('pending');
      setTxHash(tx.hash);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        setTxStatus('confirmed');
        return true;
      } else {
        throw new Error('Claim transaction failed');
      }
    } catch (err: any) {
      setTxStatus('failed');
      setTxError(err.reason || err.message || 'Claim failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [signer, isConnected]);

  const fetchRewardPeriodInfo = useCallback(async (): Promise<RewardPeriodInfo[]> => {
    try {
      const engineContract = new ethers.Contract(CONTRACT_ADDRESSES.EARNING_ENGINE, EARNING_ENGINE_ABI, publicProvider);
      const now = Math.floor(Date.now() / 1000);

      const infos: RewardPeriodInfo[] = await Promise.all(
        SUPPORTED_REWARD_ASSETS.map(async (asset) => {
          try {
            const info = await engineContract.rewardAssets(asset.address);
            const periodFinish = Number(info.periodFinish);
            const lastUpdateTime = Number(info.lastUpdateTime);
            const rewardRate = BigInt(info.rewardRate);
            const isActive = periodFinish > now && rewardRate > 0n;
            const secondsRemaining = isActive ? periodFinish - now : 0;

            return {
              assetAddress: asset.address,
              symbol: asset.symbol,
              rewardRate,
              periodFinish,
              lastUpdateTime,
              isActive,
              secondsRemaining,
            };
          } catch {
            return {
              assetAddress: asset.address,
              symbol: asset.symbol,
              rewardRate: 0n,
              periodFinish: 0,
              lastUpdateTime: 0,
              isActive: false,
              secondsRemaining: 0,
            };
          }
        })
      );
      return infos;
    } catch (err) {
      console.error('Failed to fetch reward period info:', err);
      return [];
    }
  }, []);

  return {
    loading,
    txStatus,
    txHash,
    txError,
    fetchPlatformStats,
    fetchGlobalRewardStats,
    fetchUserBananaBalance,
    fetchUserNFTs,
    fetchUserTotalClaimed,
    fetchUserActivity,
    fetchRewardPeriodInfo,
    mintNFT,
    activateNFT,
    claimRewardAsset,
    resetTxState: () => {
      setTxStatus('idle');
      setTxHash(null);
      setTxError(null);
    },
  };
}
