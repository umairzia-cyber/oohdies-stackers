import { ethers } from 'ethers';
import { ROBINHOOD_CHAIN_CONFIG } from '../../constants/contracts';
import type { WalletState } from '../../types';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function getMetaMaskProvider(): any {
  if (typeof window === 'undefined' || !window.ethereum) return null;

  if (Array.isArray(window.ethereum.providers) && window.ethereum.providers.length > 0) {
    const metaMask = window.ethereum.providers.find(
      (p: any) => p.isMetaMask === true && p.isBraveWallet !== true
    );
    if (metaMask) return metaMask;
    return window.ethereum.providers[0];
  }

  return window.ethereum;
}

export function getInitialWalletState(): WalletState {
  return {
    status: 'disconnected',
    address: null,
    displayName: null,
    chainId: null,
    isCorrectNetwork: false,
    error: null,
  };
}

export async function connectWeb3Wallet(): Promise<{
  walletState: WalletState;
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
}> {
  const ethereumProvider = getMetaMaskProvider();
  if (!ethereumProvider) {
    throw new Error('MetaMask or Web3 wallet not detected. Please install MetaMask to connect.');
  }

  const provider = new ethers.BrowserProvider(ethereumProvider);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  const isCorrectNetwork = chainId === ROBINHOOD_CHAIN_CONFIG.chainId;

  const displayName = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

  const walletState: WalletState = {
    status: 'connected',
    address,
    displayName,
    chainId,
    isCorrectNetwork,
    error: null,
  };

  return { walletState, provider, signer };
}

export const connectWalletDirect = connectWeb3Wallet;

export async function switchToRobinhoodMainnet(): Promise<boolean> {
  const ethereumProvider = getMetaMaskProvider();
  if (!ethereumProvider) return false;

  try {
    await ethereumProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ROBINHOOD_CHAIN_CONFIG.chainIdHex }],
    });
    return true;
  } catch (switchError: any) {
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await ethereumProvider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: ROBINHOOD_CHAIN_CONFIG.chainIdHex,
              chainName: ROBINHOOD_CHAIN_CONFIG.chainName,
              rpcUrls: [ROBINHOOD_CHAIN_CONFIG.rpcUrl],
              blockExplorerUrls: [ROBINHOOD_CHAIN_CONFIG.blockExplorerUrl],
              nativeCurrency: ROBINHOOD_CHAIN_CONFIG.nativeCurrency,
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add Robinhood Chain Mainnet to wallet:', addError);
        return false;
      }
    }
    console.error('Failed to switch to Robinhood Chain Mainnet:', switchError);
    return false;
  }
}

/** Backward-compatible alias */
export const switchToRobinhoodTestnet = switchToRobinhoodMainnet;
