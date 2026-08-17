import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { ethers } from 'ethers';
import type { WalletState } from '../types';
import {
  connectWeb3Wallet,
  switchToRobinhoodTestnet,
  getInitialWalletState,
  getMetaMaskProvider,
} from '../services/wallet/web3Service';
import { ROBINHOOD_TESTNET_CONFIG } from '../constants/contracts';

interface WalletContextValue {
  readonly wallet: WalletState;
  readonly isConnected: boolean;
  readonly isConnecting: boolean;
  readonly provider: ethers.BrowserProvider | null;
  readonly signer: ethers.JsonRpcSigner | null;
  readonly connect: () => Promise<void>;
  readonly disconnect: () => void;
  readonly switchNetwork: () => Promise<boolean>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(getInitialWalletState());
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  const connect = useCallback(async () => {
    setWallet({
      status: 'connecting',
      address: null,
      displayName: null,
      chainId: null,
      isCorrectNetwork: false,
      error: null,
    });

    try {
      const { walletState, provider: web3Provider, signer: web3Signer } = await connectWeb3Wallet();
      setWallet(walletState);
      setProvider(web3Provider);
      setSigner(web3Signer);
    } catch (err: any) {
      setProvider(null);
      setSigner(null);
      setWallet({
        status: 'error',
        address: null,
        displayName: null,
        chainId: null,
        isCorrectNetwork: false,
        error: err?.message || 'Unable to connect wallet. Please try again.',
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet(getInitialWalletState());
    setProvider(null);
    setSigner(null);
  }, []);

  const switchNetwork = useCallback(async (): Promise<boolean> => {
    const success = await switchToRobinhoodTestnet();
    if (success && provider) {
      const net = await provider.getNetwork();
      const newChainId = Number(net.chainId);
      setWallet((prev) => ({
        ...prev,
        chainId: newChainId,
        isCorrectNetwork: newChainId === ROBINHOOD_TESTNET_CONFIG.chainId,
      }));
    }
    return success;
  }, [provider]);

  useEffect(() => {
    const ethereumProvider = getMetaMaskProvider();
    if (!ethereumProvider) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        disconnect();
      } else {
        connect();
      }
    };

    const handleChainChanged = () => {
      connect();
    };

    ethereumProvider.on?.('accountsChanged', handleAccountsChanged);
    ethereumProvider.on?.('chainChanged', handleChainChanged);

    return () => {
      ethereumProvider.removeListener?.('accountsChanged', handleAccountsChanged);
      ethereumProvider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [connect, disconnect]);

  const value: WalletContextValue = {
    wallet,
    isConnected: wallet.status === 'connected',
    isConnecting: wallet.status === 'connecting',
    provider,
    signer,
    connect,
    disconnect,
    switchNetwork,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
