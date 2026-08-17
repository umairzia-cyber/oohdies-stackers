import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { useWallet } from '../../context/WalletContext';
import { useScrollReveal, useDocumentTitle, useContract, type UserNFTItem, type UserActivityItem } from '../../hooks';
import { SEO, WALLET } from '../../constants/content';
import { MOCK_TIERS, MOCK_STOCKS } from '../../services/mock/mockData';
import { formatNumber, formatWalletAddress } from '../../utils';
import { ROBINHOOD_TESTNET_CONFIG, SUPPORTED_REWARD_ASSETS } from '../../constants/contracts';
import { getNFTChosenStockIds, setNFTChosenStockIds } from '../../utils/stockSelection';
import type { TierInfo, StockItem } from '../../types';
import './Activate.css';

export default function Activate() {
  useDocumentTitle(SEO.activate.title);
  const { wallet, isConnected, isConnecting, connect, switchNetwork } = useWallet();
  const [ref, isVisible] = useScrollReveal<HTMLElement>();
  const location = useLocation();
  const mintSectionRef = useRef<HTMLDivElement>(null);

  const {
    loading,
    txStatus,
    txHash,
    txError,
    fetchUserBananaBalance,
    fetchUserNFTs,
    fetchUserActivity,
    mintNFT,
    activateNFT,
    resetTxState,
  } = useContract();

  const [bananaBalance, setBananaBalance] = useState<string>('0.0');
  const [userNFTs, setUserNFTs] = useState<UserNFTItem[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivityItem[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [fetchingUserState, setFetchingUserState] = useState(false);

  const [searchParams] = useSearchParams();
  const paramTokenId = searchParams.get('tokenId');

  const [selectedTier, setSelectedTier] = useState<string>(MOCK_TIERS[4].id);
  const [selectedStockIds, setSelectedStockIds] = useState<string[]>(['tsla', 'nvda', 'aapl']);

  const handleSelectTokenId = useCallback((tokenId: number) => {
    setSelectedTokenId(tokenId);
    setSelectedStockIds(getNFTChosenStockIds(tokenId));
  }, []);

  useEffect(() => {
    if (location.hash === '#mint' || searchParams.get('mint') === 'true') {
      const timer = setTimeout(() => {
        mintSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.hash, searchParams]);

  useEffect(() => {
    if (paramTokenId) {
      const tid = Number(paramTokenId);
      if (!isNaN(tid)) {
        setSelectedTokenId(tid);
        setSelectedStockIds(getNFTChosenStockIds(tid));
      }
    }
  }, [paramTokenId]);

  const loadUserData = useCallback(async () => {
    if (!isConnected || !wallet.address) return;
    setFetchingUserState(true);
    try {
      const [bal, nfts, acts] = await Promise.all([
        fetchUserBananaBalance(wallet.address),
        fetchUserNFTs(wallet.address),
        fetchUserActivity(wallet.address),
      ]);
      setBananaBalance(bal);
      setUserNFTs(nfts);
      setUserActivity(acts);
      if (nfts.length > 0 && selectedTokenId === null) {
        const initialId = paramTokenId ? Number(paramTokenId) : nfts[0].tokenId;
        setSelectedTokenId(initialId);
        setSelectedStockIds(getNFTChosenStockIds(initialId));
      }
    } catch (err) {
      console.error('Failed to load user blockchain state:', err);
    } finally {
      setFetchingUserState(false);
    }
  }, [isConnected, wallet.address, fetchUserBananaBalance, fetchUserNFTs, fetchUserActivity, selectedTokenId, paramTokenId]);

  useEffect(() => {
    loadUserData();
    const interval = setInterval(() => {
      loadUserData();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadUserData]);

  const toggleStock = useCallback((id: string) => {
    setSelectedStockIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  }, []);

  const handleMintNewNFT = useCallback(async () => {
    try {
      await mintNFT();
      await loadUserData();
    } catch (err) {
      console.error('Mint error:', err);
    }
  }, [mintNFT, loadUserData]);

  const handleRealActivate = useCallback(async () => {
    if (!isConnected || !wallet.isCorrectNetwork || selectedTokenId === null) return;
    try {
      const chosenStocks = selectedStockIds.length > 0 ? selectedStockIds.slice(0, 3) : ['tsla', 'nvda', 'aapl'];

      // Resolve ids to addresses up front: a missing one would be dropped silently and the
      // contract would just reject the wrong-sized selection.
      const chosenAddresses = chosenStocks.map((id) => {
        const asset = SUPPORTED_REWARD_ASSETS.find((a) => a.id === id);
        if (!asset) throw new Error(`Unknown stock "${id}" — cannot activate.`);
        return asset.address;
      });

      // Local copy only so the picker remembers the draft; the chain is authoritative.
      setNFTChosenStockIds(selectedTokenId, chosenStocks);
      await activateNFT(selectedTokenId, chosenAddresses);
      await loadUserData();
    } catch (err) {
      console.error('Activation error:', err);
    }
  }, [isConnected, wallet.isCorrectNetwork, selectedTokenId, selectedStockIds, activateNFT, loadUserData]);

  const selectedNFT = userNFTs.find((n) => n.tokenId === selectedTokenId);

  return (
    <main className="activate-page">
      <section className="section" ref={ref}>
        <div className="container">

          <div className={`activate-header-grid ${isVisible ? 'animate-fade-in' : ''}`}>
            <div className="activate-header-left">
              <p className="subtitle mb-2">WAKE YOUR OOHDIE</p>
              <h1 className="heading-xl mb-4">ACTIVATE</h1>
              <p className="body-lg mb-8">
                Burn 100 $BANANA to activate your Oohdie NFT and start earning real tokenized rewards on Robinhood Chain Testnet.
              </p>
            </div>

            <div className="activate-header-right">
              <Link to="/" className="activate-art-banner block" title="Back to Home">
                <img
                  src="/assets/activate-pixel-ape.jpg"
                  alt="Pixel Oohdie Running Over Candlesticks"
                  className="activate-art-banner__img"
                  width={400}
                  height={225}
                  loading="eager"
                />
                <div className="activate-art-banner__badge">
                  <span className="stock-icon-symbol">📈</span> LIVE ACCUMULATION ENGINE
                </div>
              </Link>
            </div>
          </div>

          <div className={`activate-pills ${isVisible ? 'animate-fade-in animate-delay-1' : ''}`}>
            <div className="pill">
              <span>BANANA Balance</span>
              <span className="pill__value">{formatNumber(parseFloat(bananaBalance))}</span>
            </div>
            <div className="pill">
              <span>wallet</span>
              <span className={`pill__value ${!isConnected ? 'text-muted' : ''}`}>
                {isConnected && wallet.address ? formatWalletAddress(wallet.address) : WALLET.notConnected}
              </span>
            </div>
            <div className="pill">
              <span>network</span>
              <span className={`pill__value ${wallet.isCorrectNetwork ? 'text-accent' : 'text-muted'}`}>
                {wallet.isCorrectNetwork ? 'Robinhood Testnet' : isConnected ? 'Wrong Network' : 'Not Connected'}
              </span>
            </div>
          </div>

          {isConnected && !wallet.isCorrectNetwork && (
            <div className="mystack-alert-banner mb-8">
              <div className="mystack-alert-banner__content">
                <p className="mystack-alert-banner__text">
                  <strong>Wrong Network:</strong> Please switch your wallet to Robinhood Chain Testnet (Chain ID 46630).
                </p>
                <button className="btn btn--primary btn--sm flex-shrink-0" onClick={switchNetwork}>
                  Switch Network
                </button>
              </div>
            </div>
          )}

          <div className={`activate-section ${isVisible ? 'animate-fade-in animate-delay-2' : ''}`}>
            <h2 className="heading-md mb-2">STEP 1. SELECT YOUR OOHDIE NFT</h2>
            <p className="text-secondary mb-6 max-w-700">
              Select an NFT from your connected wallet to activate. If you do not own an Oohdie yet, mint one directly below.
            </p>

            {fetchingUserState && userNFTs.length === 0 ? (
              <p className="text-secondary">Loading your Oohdies from Robinhood Testnet...</p>
            ) : userNFTs.length === 0 ? (
              <div className="empty-state p-6 bordered-box mb-6 text-center">
                <h3 className="heading-sm mb-2">No Oohdies found in this wallet</h3>
                <p className="text-secondary mb-4">Mint an official Oohdie NFT on Robinhood Chain Testnet to start earning.</p>
              </div>
            ) : (
              <div className="nft-select-grid mb-6">
                {userNFTs.map((nft) => (
                  <button
                    key={nft.tokenId}
                    type="button"
                    className={`nft-select-card ${selectedTokenId === nft.tokenId ? 'nft-select-card--selected' : ''}`}
                    onClick={() => handleSelectTokenId(nft.tokenId)}
                  >
                    <div className="nft-select-card__image-wrapper">
                      <img
                        src={nft.image}
                        alt={nft.name}
                        className="nft-select-card__image"
                        width={300}
                        height={300}
                        loading="lazy"
                      />
                      <span className={`nft-select-card__status-badge ${nft.isActivated ? 'nft-select-card__status-badge--active' : ''}`}>
                        {nft.isActivated ? '● Active' : '○ Inactive'}
                      </span>
                    </div>
                    <div className="nft-select-card__meta">
                      <span className="nft-select-card__name">{nft.name}</span>
                      <span className="nft-select-card__id font-mono">#{String(nft.tokenId).padStart(3, '0')}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div id="mint" ref={mintSectionRef} className="mint-dedicated-container mb-8">
              <div className="mint-dedicated-box">
                <div className="mint-dedicated-info">
                  <h3 className="heading-sm mb-1">MINT A NEW OOHDIE</h3>
                  <p className="text-secondary text-xs">
                    Directly on Robinhood Chain Testnet. Mint your next Oohdie to expand your stack.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--primary btn--md animate-pulse-glow"
                  onClick={handleMintNewNFT}
                  disabled={loading || !wallet.isCorrectNetwork}
                >
                  {txStatus === 'awaiting' ? 'Confirm in Wallet...' : txStatus === 'pending' ? 'Minting NFT...' : '+ Mint New Oohdie'}
                </button>
              </div>
            </div>
          </div>

          <div className={`activate-section ${isVisible ? 'animate-fade-in animate-delay-3' : ''}`}>
            <h2 className="heading-md mb-2">STEP 2. PICK YOUR TIER (STRATEGY & MULTIPLIER PREVIEW)</h2>
            <p className="text-secondary mb-6 max-w-700">
              Note: Current on-chain testnet activation burns a fixed 100 $BANANA for standard earning across all active Oohdies. Multipliers below display visual strategy previews.
            </p>

            <div className="grid-bordered grid-5 activate-tiers">
              {MOCK_TIERS.map((tier: TierInfo) => (
                <button
                  key={tier.id}
                  className={`tier-card ${selectedTier === tier.id ? 'tier-card--selected' : ''}`}
                  onClick={() => setSelectedTier(tier.id)}
                  aria-pressed={selectedTier === tier.id}
                >
                  <span className="tier-card__multiplier">{tier.multiplier}</span>
                  <span className="tier-card__name">{tier.name}</span>
                  <span className="tier-card__cost">100 BANANA</span>
                </button>
              ))}
            </div>
          </div>

          <div className={`activate-section ${isVisible ? 'animate-fade-in animate-delay-4' : ''}`}>
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
              <h2 className="heading-md">STEP 3. PICK YOUR 3 STOCKS</h2>
              <span className="text-sm font-mono text-accent font-bold">
                {selectedStockIds.length} of 3 Selected
              </span>
            </div>
            <p className="text-secondary mb-6 max-w-800">
              Select the 3 synthetic stock assets for this Oohdie. Upon burning 100 $BANANA, this Oohdie will exclusively accrue and let you claim those 3 chosen stocks on Robinhood Chain Testnet.
            </p>

            <div className="stock-picker-grid">
              {MOCK_STOCKS.map((stock: StockItem) => {
                const isSelected = selectedStockIds.includes(stock.id);
                return (
                  <button
                    key={stock.id}
                    className={`stock-tile ${isSelected ? 'stock-tile--selected' : ''}`}
                    onClick={() => toggleStock(stock.id)}
                  >
                    <span className="stock-tile__icon">{stock.icon}</span>
                    <span className="stock-tile__symbol">{stock.symbol}</span>
                    <span className="stock-tile__name">{stock.name}</span>
                    {isSelected && <span className="stock-tile__check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`activate-section ${isVisible ? 'animate-fade-in animate-delay-5' : ''}`}>
            <h2 className="heading-md mb-4">STEP 4. CONFIRM & ACTIVATE ON-CHAIN</h2>

            {!isConnected ? (
              <div className="activate-connect">
                <p className="text-secondary mb-4">Connect your wallet to activate your Oohdie on Robinhood Testnet.</p>
                <button className="btn btn--primary btn--lg" onClick={connect} disabled={isConnecting}>
                  {isConnecting ? WALLET.connecting : WALLET.connectButton}
                </button>
              </div>
            ) : selectedNFT?.isActivated ? (
              <div className="activate-success">
                <p className="heading-sm text-accent mb-4">OOHDIE #{selectedTokenId} IS ALREADY ACTIVE</p>
                <p className="text-secondary mb-6">
                  This Oohdie is currently earning rewards on-chain. View its live balance on the My Stack page!
                </p>
              </div>
            ) : txStatus === 'confirmed' ? (
              <div className="activate-success">
                <p className="heading-sm text-accent mb-4">ACTIVATION CONFIRMED!</p>
                <p className="text-secondary mb-4">
                  Oohdie #{selectedTokenId} has been successfully activated on Robinhood Chain Testnet.
                </p>
                {txHash && (
                  <p className="mb-6 text-sm">
                    Transaction:{' '}
                    <a
                      href={`${ROBINHOOD_TESTNET_CONFIG.blockExplorerUrl}/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline"
                    >
                      {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                    </a>
                  </p>
                )}
                <button className="btn btn--secondary btn--lg" onClick={resetTxState}>
                  Done
                </button>
              </div>
            ) : (
              <div className="activate-action">
                <div className="activate-summary-row mb-6">
                  <div>
                    <span className="text-muted block text-xs">SELECTED NFT</span>
                    <span className="font-bold text-accent">
                      {selectedTokenId !== null ? `Oohdie #${selectedTokenId}` : 'None Selected'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block text-xs">ON-CHAIN BURN COST</span>
                    <span className="font-bold">100 $BANANA (Permanently Burned)</span>
                  </div>
                  <div>
                    <span className="text-muted block text-xs">SELECTED REWARD STOCKS</span>
                    <span className="font-bold text-accent">
                      {selectedStockIds.length > 0
                        ? selectedStockIds.map((s) => s.toUpperCase() + (s !== 'usdg' && !s.endsWith('x') ? 'x' : '')).join(', ')
                        : 'TSLAx, NVDAx, AAPLx, USDG'}
                    </span>
                  </div>
                </div>

                {txError && (
                  <p className="text-sm mb-4" style={{ color: 'var(--danger)' }}>
                    Error: {txError}
                  </p>
                )}

                {txHash && txStatus === 'pending' && (
                  <p className="text-sm mb-4 text-accent">
                    Pending Tx:{' '}
                    <a
                      href={`${ROBINHOOD_TESTNET_CONFIG.blockExplorerUrl}/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                    </a>
                  </p>
                )}

                <button
                  className={`btn btn--primary btn--lg ${loading ? 'btn--loading' : ''}`}
                  onClick={handleRealActivate}
                  disabled={loading || selectedTokenId === null || !wallet.isCorrectNetwork}
                >
                  {txStatus === 'awaiting'
                    ? 'AWAITING WALLET SIGNATURE...'
                    : txStatus === 'pending'
                    ? 'WAITING FOR CONFIRMATION...'
                    : 'BURN 100 $BANANA & ACTIVATE ON-CHAIN'}
                </button>
              </div>
            )}
          </div>

          {isConnected && (
            <div className={`activate-section ${isVisible ? 'animate-fade-in animate-delay-5' : ''}`}>
              <h2 className="heading-md mb-6">RECENT ON-CHAIN ACTIVITY</h2>
              {fetchingUserState ? (
                <p className="text-secondary">Loading live activity from Robinhood Testnet...</p>
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
          )}
        </div>
      </section>
    </main>
  );
}
