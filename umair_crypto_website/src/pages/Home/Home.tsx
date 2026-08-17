import { useState, useEffect, type CSSProperties } from 'react';
import { useScrollReveal, useDocumentTitle, useContract, type AssetClaimTotal, type RewardPeriodInfo } from '../../hooks';
import { HERO, HOW_IT_WORKS, SEO } from '../../constants/content';
import { ROUTES } from '../../constants/routes';
import { SUPPORTED_REWARD_ASSETS } from '../../constants/contracts';
import { ARCHETYPES, COLLECTION_SIZE, drawRandom } from '../../constants/collection';
import { MOCK_COLLECTION, MOCK_STATS, MOCK_STEPS, MOCK_STOCKS } from '../../services/mock/mockData';
import { formatNumber } from '../../utils';
import { Link } from 'react-router-dom';
import './Home.css';

function HeroSection() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>();
  const { fetchPlatformStats, fetchRewardPeriodInfo } = useContract();
  const [stats, setStats] = useState<{ mintsLeft: number; burnedTokens: string; totalMinted: number } | null>(null);
  const [rewardPeriods, setRewardPeriods] = useState<RewardPeriodInfo[]>([]);

  useEffect(() => {
    fetchPlatformStats().then((res) => {
      if (res) {
        setStats({
          mintsLeft: res.mintsLeft,
          burnedTokens: res.burnedTokens,
          totalMinted: res.totalMinted,
        });
      }
    });
    fetchRewardPeriodInfo().then((periods) => {
      setRewardPeriods(periods);
    });
  }, [fetchPlatformStats, fetchRewardPeriodInfo]);

  const mintsLeftDisplay = stats ? stats.mintsLeft : MOCK_STATS.supplyAlive;
  const burnedDisplay = stats ? formatNumber(parseFloat(stats.burnedTokens)) : formatNumber(MOCK_STATS.destroyed);

  const accrualStatus = (() => {
    if (rewardPeriods.length === 0) return 'Loading…';
    const activePeriod = rewardPeriods.find((rp) => rp.isActive);
    if (activePeriod) {
      const hrs = Math.floor(activePeriod.secondsRemaining / 3600);
      const mins = Math.floor((activePeriod.secondsRemaining % 3600) / 60);
      return `${hrs}h ${mins}m left`;
    }
    return 'Period Ended';
  })();

  return (
    <section className="hero hero--clean" ref={ref} aria-labelledby="hero-heading">
      <div className="container hero__content">
        <div className={`hero__left ${isVisible ? 'animate-fade-in' : ''}`}>
          <p className="subtitle">1111 DIGITAL COLLECTIBLES · READY TO EAT</p>
          <h1 id="hero-heading" className="hero__heading">
            <span className="hero__heading-line1">{HERO.headingLine1}</span>
            <span className="hero__heading-line2 text-accent">{HERO.headingLine2}</span>
          </h1>
          <p className="body-lg hero__desc">
            Acquire an Oohdie, activate it by burning tokens, and watch your stack grow automatically. The asset lives inside the NFT — it travels with it if you sell. The cycle never stops.
          </p>

          <div className="hero__actions">
            <Link to={`${ROUTES.ACTIVATE}#mint`} className="btn btn--primary btn--lg">
              MINT OOHDIE
            </Link>

            <Link to="/" className="btn btn--secondary btn--lg">
              VIEW ON OPENSEA
            </Link>
          </div>

          <div className="hero__pills">
            <div className="pill">
              <span>accrual status</span>
              <span className={`pill__value ${rewardPeriods.some((rp) => rp.isActive) ? 'text-accent' : 'text-muted'}`}>
                {accrualStatus}
              </span>
            </div>
            <div className="pill">
              <span>mints left</span>
              <span className="pill__value">{mintsLeftDisplay} / 1,111</span>
            </div>
            <div className="pill">
              <span>$BANANA eaten</span>
              <span className="pill__value">{burnedDisplay}</span>
            </div>
          </div>
        </div>

        <div className={`hero__right ${isVisible ? 'animate-fade-in animate-delay-3' : ''}`}>
          <div className="hero__artwork animate-float">
            <img
              src="/assets/oohdie-sword.jpg"
              alt="Oohdie Samurai with Glowing Katana Sword Slicing Candlesticks"
              className="hero__artwork-image"
              width={500}
              height={500}
              loading="eager"
            />
            <div className="hero__artwork-glow" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Full-View Space Trading Monkey Banner Section ────── */
function SpaceTradingBannerSection() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>();

  return (
    <section className="section section--space-banner" ref={ref} aria-label="Space Trading Station Visual Showcase">
      <div className="container">
        <Link to="/" className={`space-banner-card block ${isVisible ? 'reveal--visible' : 'reveal'}`} title="Oohdies Space Station">
          <img
            src="/assets/space-hero-bg.jpg"
            alt="Oohdie Space Trading Monkey Floating in Galaxy with Charts"
            className="space-banner-card__image"
            width={1200}
            height={675}
            loading="lazy"
          />
          <div className="space-banner-card__badge">
            <span className="stock-icon-symbol">🌌</span> GALAXY ACCUMULATION STATION
          </div>
        </Link>
      </div>
    </section>
  );
}

/* ─── Stats & Compact Stock Section ───────────────────── */
function StatsSection() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>();
  const { fetchPlatformStats, fetchGlobalRewardStats } = useContract();
  const [stats, setStats] = useState<{ mintsLeft: number; burnedTokens: string; totalMinted: number } | null>(null);
  const [rewardStats, setRewardStats] = useState<AssetClaimTotal[]>([]);

  useEffect(() => {
    fetchPlatformStats().then((res) => {
      if (res) {
        setStats({
          mintsLeft: res.mintsLeft,
          burnedTokens: res.burnedTokens,
          totalMinted: res.totalMinted,
        });
      }
    });
    fetchGlobalRewardStats().then((res) => {
      if (res && res.assetTotals) {
        setRewardStats(res.assetTotals);
      }
    });
  }, [fetchPlatformStats, fetchGlobalRewardStats]);

  const mintsLeftDisplay = stats ? stats.mintsLeft : MOCK_STATS.supplyAlive;
  const burnedTokensDisplay = stats ? `${formatNumber(parseFloat(stats.burnedTokens))} $BANANA` : MOCK_STATS.supplyBurnedTokens;

  // Merge registered assets with live claimed stats
  const allStockStripItems = SUPPORTED_REWARD_ASSETS.map((asset) => {
    const liveMatch = rewardStats.find(
      (rs) => rs.assetAddress.toLowerCase() === asset.address.toLowerCase()
    );
    const num = liveMatch ? parseFloat(liveMatch.totalClaimed) || 0 : 0;
    const formatted = asset.decimals === 6 ? num.toFixed(2) : num.toFixed(4);
    return {
      ...asset,
      totalClaimedFormatted: formatted,
    };
  });

  return (
    <section className="section section--bordered stats-section--pushed" ref={ref} aria-label="Platform Statistics Overview">
      <div className="container">
        <div className={`stats-grid-stackers ${isVisible ? 'reveal--visible' : 'reveal'}`}>

          <div className="stat-card-main">
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <p className="stat-card__tag mb-0">TOTAL REWARDS CLAIMED (GLOBAL ON-CHAIN)</p>
              <span className="text-xs text-accent font-mono">12 Supported Stocks & USDG</span>
            </div>

            <div className="global-stock-strip">
              {allStockStripItems.map((stock) => (
                <div key={stock.address} className="global-stock-card">
                  <span className="global-stock-card__icon">{stock.icon}</span>
                  <div className="global-stock-card__info">
                    <span className="global-stock-card__symbol">{stock.symbol}</span>
                    <span className="global-stock-card__name">{stock.name}</span>
                  </div>
                  <div className="global-stock-card__claimed">
                    <span className="global-stock-card__val font-mono text-accent">
                      {stock.decimals === 6 ? `$${stock.totalClaimedFormatted}` : stock.totalClaimedFormatted}
                    </span>
                    <span className="global-stock-card__lbl">claimed</span>
                  </div>
                </div>
              ))}
            </div>

            <p className="stat-card__subtext mt-4">
              Cumulative rewards claimed by all NFT holders across the entire protocol on Robinhood Chain Testnet.
            </p>
          </div>

          <div className="stat-cards-subgrid stat-cards-subgrid--3col">

            <div className="stat-card-item">
              <p className="stat-card__tag">MINTS LEFT</p>
              <div className="stat-card__val-row">
                <h3 className="stat-card__val">{mintsLeftDisplay}</h3>
                <span className="stat-card__badge">OF 1,111</span>
              </div>
              <p className="stat-card__desc">
                Oohdies available to mint in real-time. Total collection is capped at 1,111.
              </p>
            </div>

            <div className="stat-card-item">
              <p className="stat-card__tag">SUPPLY BURNED</p>
              <h3 className="stat-card__val">{burnedTokensDisplay}</h3>
              <p className="stat-card__desc">
                Eaten forever, out of a billion. Burned by every activation and tier climb.
              </p>
              <div className="stat-card__progress-track">
                <div className="stat-card__progress-bar" style={{ width: '14.08%' }} />
              </div>
            </div>

            <div className="stat-card-item stat-card-item--cta">
              <p className="stat-card__tag">GET IN</p>
              <h3 className="stat-card__val text-accent">MINT LIVE</h3>
              <p className="stat-card__desc">
                1,111 total supply. Activate by burning 100 $BANANA tokens to start stacking hourly earnings.
              </p>
              <Link to={`${ROUTES.ACTIVATE}#mint`} className="btn btn--primary btn--sm mt-4">
                Mint Oohdie
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Showcase Section ────────────────────────────────── */
function ShowcaseSection() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>();

  return (
    <section className="section section--bordered" ref={ref} aria-labelledby="showcase-heading">
      <div className="container">
        <h2 id="showcase-heading" className="sr-only">Platform Features Showcase</h2>

        <div className={`showcase-grid-3col ${isVisible ? 'reveal--visible' : 'reveal'}`}>

          <div className="showcase-card showcase-card--stocks">
            <p className="showcase-card__tag">TWELVE WAYS TO EARN</p>
            <p className="showcase-card__desc">
              Eleven tokenized stocks plus USDG. Pick up to three, split your hourly earnings between them. Your split decides what you collect, not how much.
            </p>
            <div className="stocks-icon-row stocks-icon-row--large">
              {MOCK_STOCKS.map((stock) => (
                <span key={stock.id} className="stock-icon-pill stock-icon-pill--lg" title={`${stock.name} (${stock.symbol})`}>
                  <span className="stock-icon-symbol">{stock.icon}</span>
                </span>
              ))}
            </div>
            <Link to={`${ROUTES.ACTIVATE}#mint`} className="showcase-card__link mt-4">
              Build your split →
            </Link>
          </div>

          <div className="showcase-card showcase-card--collection">
            <p className="showcase-card__tag">THE COLLECTION</p>
            <div className="collection-thumb-grid">
              {MOCK_COLLECTION.slice(0, 6).map((item) => (
                <div key={item.id} className="collection-thumb">
                  <img src={item.image} alt={item.name} className="collection-thumb__img" loading="lazy" />
                </div>
              ))}
            </div>
          </div>

          <div className="showcase-card showcase-card--earn">
            <p className="showcase-card__tag">HOW MUCH YOU EARN</p>
            <p className="showcase-card__desc">
              Your tier decides how much. Burn $BANANA to climb from 1x to 3.5x. The tier stays with the NFT forever, even when sold.
            </p>
            <div className="earn-multiplier-display">
              <span className="earn-multiplier__low">1x</span>
              <span className="earn-multiplier__arrow">→</span>
              <span className="earn-multiplier__high text-accent">3.5x</span>
            </div>
            <Link to={`${ROUTES.ACTIVATE}#mint`} className="showcase-card__link mt-4">
              See the tier ladder →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Collection Strip ─────────────────────────────────
   Was a featured hero plus a full six-card grid, which cost most of a screen
   to say something the collection's own page now says properly. Compressed to
   a single row: prove the art exists, then send people to /collection. */

const STRIP_COUNT = 5;
const STRIP_WORD = 'Five'; // keep in step with STRIP_COUNT

function CollectionSection() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>();
  // Drawn once per visit rather than per render, so the row cannot reshuffle
  // itself midway through the reveal transition.
  const [strip] = useState(() => drawRandom(ARCHETYPES, STRIP_COUNT));

  return (
    <section className="section section--collection-strip" ref={ref} aria-labelledby="collection-heading">
      <div className="container">
        <div className={`collection-strip grid-bordered ${isVisible ? 'reveal--visible' : 'reveal'}`}>
          <h2 id="collection-heading" className="heading-md collection-strip__heading">
            THE COLLECTION
          </h2>

          <ul className="collection-strip__row">
            {strip.map((piece, i) => (
              <li
                key={piece.key}
                className="collection-strip__tile"
                style={{ '--tile-index': i } as CSSProperties}
              >
                <img
                  src={piece.image}
                  alt={`${piece.name} — ${piece.description}`}
                  className="collection-strip__img"
                  width={256}
                  height={256}
                  loading="lazy"
                  decoding="async"
                />
              </li>
            ))}
          </ul>

          <p className="collection-strip__caption">
            {STRIP_WORD} of the {formatNumber(COLLECTION_SIZE)}, drawn at random.
            <Link to={ROUTES.COLLECTION} className="collection-strip__link">
              See the collection →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Full-View Cave Trading Ape Banner Section ────────── */
function CaveTradingBannerSection() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>();

  return (
    <section className="section section--cave-banner" ref={ref} aria-label="Cave Trading Station Visual Showcase">
      <div className="container">
        <Link to="/" className={`cave-banner-card block ${isVisible ? 'reveal--visible' : 'reveal'}`} title="Oohdies Trading Desk">
          <img
            src="/assets/cave-cta-bg.jpg"
            alt="Oohdie Cave Trading Desk Station"
            className="cave-banner-card__image"
            width={1200}
            height={675}
            loading="lazy"
          />
          <div className="cave-banner-card__badge">
            <span className="stock-icon-symbol">🖥️</span> LIVE 24/7 MARKET ENGINE
          </div>
        </Link>
      </div>
    </section>
  );
}

/* ─── How It Works ────────────────────────────────────── */
function HowItWorksSection() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>();

  return (
    <section className="section section--bordered how-it-works how-it-works--pushed" ref={ref} aria-labelledby="how-heading">
      <div className="container">
        <div className={`${isVisible ? 'reveal--visible' : 'reveal'}`}>
          <h2 id="how-heading" className="heading-lg mb-2">{HOW_IT_WORKS.heading}</h2>
          <p className="body-lg mb-8">Set it up once. Your Oohdie works while you sleep.</p>
        </div>

        <div className={`grid-bordered grid-4 ${isVisible ? 'reveal--visible reveal--delay-2' : 'reveal'}`}>
          {MOCK_STEPS.map((step) => (
            <div key={step.number} className="step-cell">
              <p className="step-cell__number">{step.number}</p>
              <p className="step-cell__title">{step.title}</p>
              <p className="step-cell__desc">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ────────────────────────────────────────── */
function FinalCTASection() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>();

  return (
    <section className="section cta-final cta-final--clean" ref={ref} aria-labelledby="cta-heading">
      <div className={`container text-center cta-final__content ${isVisible ? 'reveal--visible' : 'reveal'}`}>
        <h2 id="cta-heading" className="heading-xl mb-8">READY TO EAT?</h2>
        <Link to={`${ROUTES.ACTIVATE}#mint`} className="btn btn--primary btn--lg animate-pulse-glow">
          MINT OOHDIE
        </Link>
      </div>
    </section>
  );
}

/* ─── Home Page ────────────────────────────────────────── */
export default function Home() {
  useDocumentTitle(SEO.home.title);

  return (
    <main>
      <HeroSection />
      <SpaceTradingBannerSection />
      <StatsSection />
      <ShowcaseSection />
      <CollectionSection />
      <CaveTradingBannerSection />
      <HowItWorksSection />
      <FinalCTASection />
    </main>
  );
}
