import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '../../context/WalletContext';
import {
  useScrollReveal,
  useDocumentTitle,
  useContract,
  type UserNFTItem,
  type UserActivityItem,
  type AssetClaimTotal,
  type RewardPeriodInfo,
} from '../../hooks';
import { SEO, WALLET } from '../../constants/content';
import { formatWalletAddress } from '../../utils';
import { shortenAddress } from '../../utils/tokenBoundAccount';
import {
  SUPPORTED_REWARD_ASSETS,
  ROBINHOOD_TESTNET_CONFIG,
} from '../../constants/contracts';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import './MyStack.css';

export default function MyStack() {
  useDocumentTitle(SEO.myStack.title);
  const { wallet, isConnected, isConnecting, connect, switchNetwork } = useWallet();
  const [ref, isVisible] = useScrollReveal<HTMLElement>();

  const {
    loading,
    txStatus,
    txHash,
    txError,
    fetchUserNFTs,
    fetchUserTotalClaimed,
    fetchUserActivity,
    fetchRewardPeriodInfo,
    claimRewardAsset,
    withdrawFromWallet,
  } = useContract();

  const [userNFTs, setUserNFTs] = useState<UserNFTItem[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivityItem[]>([]);
  const [userClaimedTotals, setUserClaimedTotals] = useState<AssetClaimTotal[]>([]);
  const [rewardPeriods, setRewardPeriods] = useState<RewardPeriodInfo[]>([]);
  const [fetchingNFTs, setFetchingNFTs] = useState(false);
  const [fetchingActivity, setFetchingActivity] = useState(false);
  const [activeClaimingKey, setActiveClaimingKey] = useState<string | null>(null);
  const [activeWithdrawKey, setActiveWithdrawKey] = useState<string | null>(null);
  const [copiedWallet, setCopiedWallet] = useState<number | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadBlockchainData = useCallback(async (isInitial = false) => {
    if (!isConnected || !wallet.address) return;
    if (isInitial) {
      setFetchingNFTs(true);
      setFetchingActivity(true);
    }
    try {
      const [items, periods] = await Promise.all([
        fetchUserNFTs(wallet.address),
        fetchRewardPeriodInfo(),
      ]);
      if (isMountedRef.current) {
        setUserNFTs(items);
        setRewardPeriods(periods);
      }

      if (isInitial) {
        const ownedTokenIds = items.map((item) => item.tokenId);
        const [acts, claimed] = await Promise.all([
          fetchUserActivity(wallet.address, ownedTokenIds),
          fetchUserTotalClaimed(wallet.address, ownedTokenIds),
        ]);
        if (isMountedRef.current) {
          setUserActivity(acts);
          setUserClaimedTotals(claimed);
        }
      }
    } catch (err) {
      console.error('Failed to load user blockchain state/activity:', err);
    } finally {
      if (isMountedRef.current && isInitial) {
        setFetchingNFTs(false);
        setFetchingActivity(false);
      }
    }
  }, [isConnected, wallet.address, fetchUserNFTs, fetchUserActivity, fetchUserTotalClaimed, fetchRewardPeriodInfo]);

  useEffect(() => {
    loadBlockchainData(true);
    const interval = setInterval(() => {
      loadBlockchainData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadBlockchainData]);

  const handleClaim = async (tokenId: number, assetAddress: string, assetSymbol: string) => {
    if (!wallet.isCorrectNetwork) return;
    const key = `${tokenId}:${assetAddress.toLowerCase()}`;
    setActiveClaimingKey(key);
    try {
      await claimRewardAsset(tokenId, assetAddress);
      await loadBlockchainData(true);
    } catch (err) {
      console.error(`Claim ${assetSymbol} failed for Oohdie #${tokenId}:`, err);
    } finally {
      if (isMountedRef.current) {
        setActiveClaimingKey(null);
      }
    }
  };

  const handleWithdraw = async (
    tokenId: number,
    assetAddress: string,
    assetSymbol: string,
    amountRaw: bigint,
  ) => {
    if (!wallet.isCorrectNetwork) return;
    const key = `${tokenId}:${assetAddress.toLowerCase()}`;
    setActiveWithdrawKey(key);
    try {
      await withdrawFromWallet(tokenId, assetAddress, amountRaw);
      await loadBlockchainData(true);
    } catch (err) {
      console.error(`Withdraw ${assetSymbol} failed for Oohdie #${tokenId}:`, err);
    } finally {
      if (isMountedRef.current) {
        setActiveWithdrawKey(null);
      }
    }
  };

  const handleCopyWallet = async (tokenId: number, address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedWallet(tokenId);
      setTimeout(() => {
        if (isMountedRef.current) setCopiedWallet(null);
      }, 1500);
    } catch {
      /* clipboard unavailable — the address is on screen anyway */
    }
  };

  const activeNFTs = userNFTs.filter((item) => item.isActivated);

  const activeChosenStockIds = Array.from(
    new Set(activeNFTs.flatMap((item) => item.chosenStockIds || []))
  );

  const relevantAssets = activeChosenStockIds.length > 0
    ? SUPPORTED_REWARD_ASSETS.filter((a) => activeChosenStockIds.includes(a.id))
    : (activeNFTs.length > 0 ? SUPPORTED_REWARD_ASSETS.slice(0, 3) : SUPPORTED_REWARD_ASSETS.slice(0, 3));

  const claimableStats = relevantAssets.map((asset) => {
    const total = userNFTs.reduce((acc, item) => {
      const rew = item.rewards?.[asset.address.toLowerCase()];
      return acc + (rew ? parseFloat(rew.claimable) || 0 : 0);
    }, 0);
    return {
      ...asset,
      totalClaimable: total.toFixed(asset.decimals === 6 ? 2 : 4),
    };
  });

  const relevantRewardPeriods = rewardPeriods.filter((rp) =>
    relevantAssets.some((ra) => ra.address.toLowerCase() === rp.assetAddress.toLowerCase())
  );

  return (
    <main className="mystack-page">
      <section className="section" ref={ref}>
        <div className="container">

          <div className={`${isVisible ? 'animate-fade-in' : ''}`}>
            <h1 className="heading-xl mb-4">MY STACK</h1>
            <p className="body-lg mb-8">
              Everything you own and everything it earns you on Robinhood Chain Testnet. Real tokenized rewards live inside your Oohdies.
            </p>
          </div>

          <div className={`mystack-pills ${isVisible ? 'animate-fade-in animate-delay-1' : ''}`}>
            <div className="pill">
              <span>wallet</span>
              <span className={`pill__value ${!isConnected ? 'text-muted' : ''}`}>
                {isConnected && wallet.address ? formatWalletAddress(wallet.address) : WALLET.notConnected}
              </span>
            </div>
            <div className="pill">
              <span>network</span>
              <span className={`pill__value ${wallet.isCorrectNetwork ? 'text-accent' : 'text-muted'}`}>
                {wallet.isCorrectNetwork ? 'Robinhood Testnet' : isConnected ? 'Wrong Network' : 'Disconnected'}
              </span>
            </div>
            <div className="pill">
              <span>owned Oohdies</span>
              <span className="pill__value">{userNFTs.length} ({activeNFTs.length} Active)</span>
            </div>
            {claimableStats.slice(0, 2).map((stat) => (
              <div key={stat.address} className="pill">
                <span>{stat.symbol} Claimable</span>
                <span className="pill__value text-accent">
                  {stat.decimals === 6 ? `$${stat.totalClaimable}` : stat.totalClaimable}
                </span>
              </div>
            ))}
          </div>

          {isConnected && !wallet.isCorrectNetwork && (
            <div className="mystack-alert-banner mb-8">
              <div className="mystack-alert-banner__content">
                <p className="mystack-alert-banner__text">
                  <strong>Wrong Network:</strong> Connect to Robinhood Chain Testnet (Chain ID 46630) to view and claim rewards.
                </p>
                <button className="btn btn--primary btn--sm flex-shrink-0" onClick={switchNetwork}>
                  Switch Network
                </button>
              </div>
            </div>
          )}

          <div className={`mystack-accrual-section mb-8 ${isVisible ? 'animate-fade-in animate-delay-2' : ''}`}>
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <h2 className="heading-sm mb-0">YOUR ACCUMULATION STACK</h2>
              <span className="text-xs text-accent font-mono">
                {claimableStats.length} Active {claimableStats.length === 1 ? 'Asset' : 'Assets'} · Live On-Chain
              </span>
            </div>

            {activeNFTs.length === 0 ? (
              <div className="stat-cell text-center p-6">
                <p className="stat-cell__label">ACCRUAL STATUS</p>
                <p className="stat-cell__value text-muted" style={{ fontSize: '1.1rem' }}>No Active Oohdies Stacking</p>
                <p className="mystack-stat-note">Activate an Oohdie NFT from your collection to start earning real tokenized stock rewards.</p>
                <Link to={ROUTES.ACTIVATE} className="btn btn--primary btn--sm mt-3 inline-block">
                  Activate Now →
                </Link>
              </div>
            ) : (
              <div className="portfolio-tokens-scroll-container">
                {claimableStats.map((stat) => {
                  const periodInfo = relevantRewardPeriods.find(
                    (rp) => rp.assetAddress.toLowerCase() === stat.address.toLowerCase()
                  );
                  const isPeriodActive = periodInfo?.isActive;
                  const hrs = periodInfo ? Math.floor(periodInfo.secondsRemaining / 3600) : 0;
                  const mins = periodInfo ? Math.floor((periodInfo.secondsRemaining % 3600) / 60) : 0;
                  const timerDisplay = isPeriodActive
                    ? `${hrs}h ${mins}m left`
                    : periodInfo && periodInfo.periodFinish > 0
                    ? 'Ended'
                    : 'Active';

                  return (
                    <div key={stat.address} className="portfolio-token-card">
                      <div className="portfolio-token-card__top">
                        <div className="portfolio-token-card__badge-row">
                          <span className="portfolio-token-card__icon">{stat.icon}</span>
                          <div className="portfolio-token-card__titles">
                            <span className="portfolio-token-card__symbol">{stat.symbol}</span>
                            <span className="portfolio-token-card__name">{stat.name}</span>
                          </div>
                        </div>
                        <span className={`portfolio-token-card__timer ${isPeriodActive ? 'timer--active' : 'timer--muted'}`}>
                          {timerDisplay}
                        </span>
                      </div>

                      <div className="portfolio-token-card__body font-mono">
                        <span className="portfolio-token-card__label">TOTAL CLAIMABLE</span>
                        <span className="portfolio-token-card__value text-accent">
                          {stat.decimals === 6 ? `$${stat.totalClaimable}` : stat.totalClaimable} {stat.symbol}
                        </span>
                      </div>

                      <div className="portfolio-token-card__footer">
                        <span className="text-xs text-muted">
                          {isPeriodActive ? 'Accruing on-chain' : 'Period ended'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {isConnected && userClaimedTotals.length > 0 && (
            <div className="flex gap-4 mb-8 flex-wrap">
              {userClaimedTotals.map((item) => (
                <div key={item.assetAddress} className="pill">
                  <span>Total {item.symbol} Claimed (Wallet):</span>
                  <span className="pill__value text-accent font-mono">
                    {item.decimals === 6 ? `$${parseFloat(item.totalClaimed).toFixed(2)}` : parseFloat(item.totalClaimed).toFixed(4)} {item.symbol}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!isConnected && (
            <div className={`mystack-disconnected mb-12 ${isVisible ? 'animate-fade-in animate-delay-4' : ''}`}>
              <div className="empty-state">
                <img
                  src="/assets/collection/user_art_1.jpg"
                  alt="Oohdie"
                  className="mystack-disconnected__image"
                  width={120}
                  height={120}
                  loading="lazy"
                />
                <h2 className="empty-state__title">Connect your wallet to view your Oohdie stack.</h2>
                <button className="btn btn--primary btn--lg" onClick={connect} disabled={isConnecting}>
                  {isConnecting ? WALLET.connecting : WALLET.connectButton}
                </button>
              </div>
            </div>
          )}

          {txHash && (
            <div className="mystack-alert-banner mb-6">
              <div className="mystack-alert-banner__content">
                <p className="mystack-alert-banner__text">
                  Status: <strong>{txStatus.toUpperCase()}</strong> — Tx:{' '}
                  <a
                    href={`${ROBINHOOD_TESTNET_CONFIG.blockExplorerUrl}/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-accent"
                  >
                    {txHash.substring(0, 12)}...{txHash.substring(txHash.length - 8)}
                  </a>
                </p>
              </div>
            </div>
          )}

          {txError && (
            <div className="mystack-alert-banner mb-6" style={{ borderColor: 'var(--danger)' }}>
              <p style={{ color: 'var(--danger)' }}>Transaction Error: {txError}</p>
            </div>
          )}

          {isConnected && (
            <>

              <div className={`mystack-section ${isVisible ? 'animate-fade-in animate-delay-4' : ''}`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="heading-md">YOUR OOHDIES ON ROBINHOOD TESTNET</h2>
                </div>

                {fetchingNFTs && userNFTs.length === 0 ? (
                  <p className="text-secondary">Scanning Robinhood Chain Testnet for owned Oohdies...</p>
                ) : userNFTs.length > 0 ? (
                  <div className="mystack-grid">
                    {userNFTs.map((item) => (
                      <div key={item.tokenId} className="nft-card">
                        <div className="nft-card__image-wrapper">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="nft-card__image"
                            width={400}
                            height={400}
                            loading="lazy"
                          />
                        </div>
                        <div className="nft-card__info">
                          <p className="nft-card__name">{item.name}</p>
                          <div className="mystack-card-meta mb-3 flex items-center gap-2">
                            <span className={`mystack-card-status ${item.isActivated ? 'mystack-card-status--active' : ''}`}>
                              {item.isActivated ? '● Active' : '○ Inactive'}
                            </span>
                            {item.isCollectionQBonusActive && (
                              <span
                                className="mystack-card-status"
                                style={{
                                  backgroundColor: 'rgba(234, 179, 8, 0.15)',
                                  color: '#EAB308',
                                  borderColor: '#EAB308',
                                }}
                              >
                                ⚡ 2.0x Q Bonus
                              </span>
                            )}
                          </div>

                          <div className="nft-card__wallet flex justify-between items-center mb-3 text-xs">
                            <span className="text-muted">NFT wallet:</span>
                            <button
                              type="button"
                              className="font-mono text-accent"
                              title={`${item.walletAddress} — click to copy`}
                              onClick={() => handleCopyWallet(item.tokenId, item.walletAddress)}
                            >
                              {copiedWallet === item.tokenId ? 'Copied!' : shortenAddress(item.walletAddress)}
                            </button>
                          </div>

                          {item.isActivated ? (
                            /* Activated: 3 Chosen Stocks Rewards & Individual Claim Buttons */
                            <div className="nft-card__rewards pt-3 border-t border-color">
                              {item.chosenAssets.map((asset) => {
                                const rewardInfo = item.rewards?.[asset.address.toLowerCase()];
                                const claimableVal = rewardInfo ? rewardInfo.claimable : (asset.decimals === 6 ? '0.00' : '0.0000');
                                const claimableNum = parseFloat(claimableVal) || 0;
                                const claimKey = `${item.tokenId}:${asset.address.toLowerCase()}`;
                                const isThisClaiming = loading && activeClaimingKey === claimKey;
                                const isThisWithdrawing = loading && activeWithdrawKey === claimKey;

                                const inWalletRaw = rewardInfo ? rewardInfo.walletBalanceRaw : 0n;
                                const inWalletNum = parseFloat(rewardInfo ? rewardInfo.walletBalance : '0') || 0;
                                const fmt = (n: number) =>
                                  asset.decimals === 6 ? `$${n.toFixed(2)}` : n.toFixed(4);

                                return (
                                  <div key={asset.address} className="mb-3">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs text-muted">Claimable {asset.symbol}:</span>
                                      <span className="font-bold text-accent font-mono">
                                        {fmt(claimableNum)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs text-muted">In NFT wallet:</span>
                                      <span className="font-bold font-mono">{fmt(inWalletNum)}</span>
                                    </div>
                                    <button
                                      className={`btn ${asset.symbol === 'USDG' ? 'btn--primary' : 'btn--secondary'} btn--xs w-full mb-1`}
                                      onClick={() => handleClaim(item.tokenId, asset.address, asset.symbol)}
                                      disabled={loading || claimableNum <= 0 || !wallet.isCorrectNetwork}
                                      title={`Move accrued ${asset.symbol} from the vault into Oohdie #${item.tokenId}'s wallet`}
                                    >
                                      {isThisClaiming
                                        ? `Claiming ${asset.symbol} from #${item.tokenId}...`
                                        : `Claim ${asset.symbol} → NFT wallet`}
                                    </button>
                                    <button
                                      className="btn btn--ghost btn--xs w-full"
                                      onClick={() =>
                                        handleWithdraw(item.tokenId, asset.address, asset.symbol, inWalletRaw)
                                      }
                                      disabled={loading || inWalletRaw <= 0n || !wallet.isCorrectNetwork}
                                      title={`Move ${asset.symbol} out of Oohdie #${item.tokenId}'s wallet into your own`}
                                    >
                                      {isThisWithdrawing
                                        ? `Withdrawing ${asset.symbol}...`
                                        : `Withdraw ${asset.symbol} → me`}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            /* A freshly bought Oohdie arrives deactivated but may still be loaded. */
                            <div className="nft-card__rewards pt-3 border-t border-color text-center">
                              {(() => {
                                const held = SUPPORTED_REWARD_ASSETS
                                  .map((asset) => ({ asset, info: item.rewards?.[asset.address.toLowerCase()] }))
                                  .filter(({ info }) => info && info.walletBalanceRaw > 0n);

                                if (held.length === 0) return null;

                                return (
                                  <div className="mb-3 text-left">
                                    <p className="text-xs text-muted mb-2">
                                      This Oohdie's wallet is holding tokens from before it was transferred or deactivated.
                                    </p>
                                    {held.map(({ asset, info }) => {
                                      const key = `${item.tokenId}:${asset.address.toLowerCase()}`;
                                      const isThisWithdrawing = loading && activeWithdrawKey === key;
                                      const amount = parseFloat(info!.walletBalance) || 0;
                                      return (
                                        <div key={asset.address} className="mb-2">
                                          <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-muted">In NFT wallet:</span>
                                            <span className="font-bold font-mono">
                                              {asset.decimals === 6 ? `$${amount.toFixed(2)}` : amount.toFixed(4)} {asset.symbol}
                                            </span>
                                          </div>
                                          <button
                                            className="btn btn--ghost btn--xs w-full"
                                            onClick={() =>
                                              handleWithdraw(item.tokenId, asset.address, asset.symbol, info!.walletBalanceRaw)
                                            }
                                            disabled={loading || !wallet.isCorrectNetwork}
                                          >
                                            {isThisWithdrawing
                                              ? `Withdrawing ${asset.symbol}...`
                                              : `Withdraw ${asset.symbol} → me`}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                              <p className="text-xs text-muted mb-3">
                                This Oohdie is not activated. Burn 100 $BANANA and choose your 3 stocks to begin stacking hourly earnings.
                              </p>
                              <Link
                                to={`${ROUTES.ACTIVATE}?tokenId=${item.tokenId}`}
                                className="btn btn--primary btn--sm w-full block text-center"
                              >
                                Activate Oohdie →
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <h3 className="empty-state__title">No Oohdies found in this wallet.</h3>
                    <p className="empty-state__message">Mint an Oohdie NFT on Robinhood Chain Testnet to start earning rewards.</p>
                    <Link to={ROUTES.ACTIVATE} className="btn btn--secondary btn--lg">
                      Mint an Oohdie →
                    </Link>
                  </div>
                )}
              </div>

              <div className={`mystack-section ${isVisible ? 'animate-fade-in animate-delay-5' : ''}`}>
                <h2 className="heading-md mb-6">RECENT ON-CHAIN ACTIVITY</h2>
                {fetchingActivity && userActivity.length === 0 ? (
                  <p className="text-secondary">Loading your live blockchain activity from Robinhood Testnet...</p>
                ) : userActivity.length > 0 ? (
                  <div className="mystack-activity">
                    {userActivity.map((record) => (
                      <div key={record.id} className="activity-item">
                        <div className="activity-item__left">
                          <span className="activity-item__type">{record.typeLabel}</span>
                          <span className="activity-item__desc">
                            <strong>{record.title}:</strong> {record.description}
                          </span>
                          <span className="activity-item__time">{record.timeFormatted}</span>
                          <a
                            href={`${ROBINHOOD_TESTNET_CONFIG.blockExplorerUrl}/tx/${record.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent text-xs underline ml-2"
                          >
                            View Tx ↗
                          </a>
                        </div>
                        {record.amount && <span className="activity-item__amount font-mono">{record.amount}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state p-4 bordered-box">
                    <p className="text-secondary text-sm">No on-chain activity recorded for this wallet yet.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
