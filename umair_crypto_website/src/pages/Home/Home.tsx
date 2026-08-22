import { useState, useEffect, type CSSProperties } from 'react';
import { useScrollReveal, useDocumentTitle, useContract, type AssetClaimTotal } from '../../hooks';
import { ALLIANCE, CRATE_TEASE, HERO, HOW_IT_WORKS, PROFIT_LOOP, SEO } from '../../constants/content';
import { ROUTES } from '../../constants/routes';
import { ALL_REWARD_ASSETS, SUPPORTED_REWARD_ASSETS, TEASER_REWARD_ASSETS } from '../../constants/contracts';
import { ARCHETYPES, COLLECTION_SIZE, drawRandom } from '../../constants/collection';
import { MOCK_COLLECTION, MOCK_STATS, MOCK_STEPS, MOCK_STOCKS } from '../../services/mock/mockData';
import { formatNumber } from '../../utils';
import { Link } from 'react-router-dom';
import './Home.css';

function JungleCageOverlay() {
  return (
    <span className="jungle-cage" aria-hidden="true">
      <svg
        className="jungle-cage__svg"
        viewBox="0 0 240 56"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="woodPostGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#152412" />
            <stop offset="50%" stopColor="#2c4420" />
            <stop offset="100%" stopColor="#192a14" />
          </linearGradient>
          <linearGradient id="vineRootGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4c9241" />
            <stop offset="100%" stopColor="#173b15" />
          </linearGradient>
          <filter id="jungleShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#040c04" floodOpacity="0.85" />
          </filter>
        </defs>

        {/* ── Weathered Bamboo / Wooden Vertical Posts (Asymmetrical & Organic) ── */}
        <g opacity="0.68">
          <path d="M 28,0 Q 26,28 29,56" stroke="url(#woodPostGrad)" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="25" y1="18" x2="31" y2="19" stroke="#3d5e2c" strokeWidth="1" />
          <line x1="26" y1="38" x2="32" y2="39" stroke="#3d5e2c" strokeWidth="1" />

          <path d="M 78,0 Q 81,26 77,56" stroke="url(#woodPostGrad)" strokeWidth="4" strokeLinecap="round" />
          <line x1="75" y1="24" x2="81" y2="25" stroke="#3d5e2c" strokeWidth="1" />

          <path d="M 162,0 Q 159,30 163,56" stroke="url(#woodPostGrad)" strokeWidth="4.2" strokeLinecap="round" />
          <line x1="159" y1="32" x2="165" y2="33" stroke="#3d5e2c" strokeWidth="1" />

          <path d="M 212,0 Q 215,24 211,56" stroke="url(#woodPostGrad)" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="209" y1="16" x2="215" y2="17" stroke="#3d5e2c" strokeWidth="1" />
        </g>

        {/* ── Entwined Climbing Thick Vines & Tendrils ── */}
        <g filter="url(#jungleShadow)">
          {/* Top border creeping vine */}
          <path
            d="M -2,4 Q 30,-2 60,6 T 120,3 T 180,7 Q 210,1 242,5"
            fill="none"
            stroke="#163814"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 0,3 Q 32,-1 62,5 T 122,2 T 182,6 Q 212,0 240,4"
            fill="none"
            stroke="url(#vineRootGrad)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Bottom border heavy root vine */}
          <path
            d="M -2,52 Q 40,48 85,54 T 155,50 Q 200,56 242,51"
            fill="none"
            stroke="#122d10"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M 0,51 Q 42,47 87,53 T 157,49 Q 202,55 240,50"
            fill="none"
            stroke="url(#vineRootGrad)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* S-curving winding vine wrapping left post */}
          <path
            d="M 22,2 Q 35,14 25,28 T 32,54"
            fill="none"
            stroke="#214d1e"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 27,18 Q 37,16 34,10 Q 31,6 35,8"
            fill="none"
            stroke="#4d9b41"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* S-curving vine wrapping right post */}
          <path
            d="M 216,4 Q 205,20 215,36 T 208,54"
            fill="none"
            stroke="#214d1e"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M 212,32 Q 199,34 203,42 Q 207,46 201,44"
            fill="none"
            stroke="#4d9b41"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>

        {/* ── Tropical Leaves & Foliage Clusters ── */}
        <g filter="url(#jungleShadow)">
          {/* Top-Left Leaf Cluster */}
          <path d="M 2,0 C 8,6 18,12 24,10 C 26,6 20,2 14,0 Z" fill="#184216" stroke="#0e260c" strokeWidth="0.8" />
          <path d="M 4,2 C 10,7 18,10 22,9" fill="none" stroke="#63b557" strokeWidth="0.8" />
          
          <path d="M 0,6 C 6,14 16,18 20,15 C 22,11 14,8 8,4 Z" fill="#296826" stroke="#103310" strokeWidth="0.8" />
          <path d="M 2,7 C 7,13 14,16 18,14" fill="none" stroke="#84d676" strokeWidth="0.8" />

          <path d="M 12,0 C 20,4 28,6 34,2 C 32,-1 24,-1 16,-1 Z" fill="#367d31" stroke="#143c13" strokeWidth="0.8" />

          {/* Bottom-Right Leaf Cluster */}
          <path d="M 238,56 C 230,48 220,44 214,46 C 212,50 218,54 226,56 Z" fill="#184216" stroke="#0e260c" strokeWidth="0.8" />
          <path d="M 236,54 C 228,47 220,45 216,47" fill="none" stroke="#63b557" strokeWidth="0.8" />

          <path d="M 240,48 C 232,40 222,36 218,39 C 216,43 224,47 230,51 Z" fill="#296826" stroke="#103310" strokeWidth="0.8" />
          <path d="M 238,47 C 231,41 224,38 220,40" fill="none" stroke="#84d676" strokeWidth="0.8" />

          <path d="M 226,56 C 218,52 210,50 204,54 C 206,57 214,57 222,57 Z" fill="#367d31" stroke="#143c13" strokeWidth="0.8" />

          {/* Top leaves along the vine */}
          <path d="M 64,4 C 70,8 76,8 80,5 C 78,2 72,2 66,3 Z" fill="#296826" stroke="#103310" strokeWidth="0.6" />
          <path d="M 118,2 C 124,7 132,6 135,2 C 132,-1 126,0 120,1 Z" fill="#367d31" stroke="#143c13" strokeWidth="0.6" />
          <path d="M 176,6 C 182,10 188,9 192,6 C 190,3 184,3 178,4 Z" fill="#296826" stroke="#103310" strokeWidth="0.6" />

          {/* Bottom leaves along the vine */}
          <path d="M 44,52 C 50,47 58,48 62,52 C 59,55 52,54 46,53 Z" fill="#296826" stroke="#103310" strokeWidth="0.6" />
          <path d="M 98,53 C 104,49 112,49 116,53 C 113,56 106,56 100,54 Z" fill="#367d31" stroke="#143c13" strokeWidth="0.6" />
          <path d="M 152,51 C 158,46 166,47 170,51 C 167,54 160,54 154,52 Z" fill="#296826" stroke="#103310" strokeWidth="0.6" />

          {/* Hanging ivy leaves */}
          <path d="M 28,26 C 34,28 36,34 32,38 C 29,35 28,30 27,27 Z" fill="#388434" stroke="#133c12" strokeWidth="0.7" />
          <path d="M 212,24 C 206,26 204,32 208,36 C 211,33 212,28 213,25 Z" fill="#388434" stroke="#133c12" strokeWidth="0.7" />
        </g>
      </svg>
    </span>
  );
}

function HeroSection() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>();
  const { fetchPlatformStats } = useContract();
  const [stats, setStats] = useState<{ mintsLeft: number; burnedTokens: string; totalMinted: number } | null>(null);

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
  }, [fetchPlatformStats]);

  const mintsLeftDisplay = stats ? stats.mintsLeft : MOCK_STATS.supplyAlive;
  const burnedDisplay = stats ? formatNumber(parseFloat(stats.burnedTokens)) : formatNumber(MOCK_STATS.destroyed);

  return (
    <section className="hero hero--clean" ref={ref} aria-labelledby="hero-heading">
      <div className="container hero__content">
        <div className={`hero__left ${isVisible ? 'animate-fade-in' : ''}`}>
          <p className="subtitle">1111 DIGITAL COLLECTIBLES · READY TO EARN</p>
          <h1 id="hero-heading" className="hero__heading">
            <span className="hero__heading-line1">{HERO.headingLine1}</span>
            <span className="hero__heading-line2 text-accent">{HERO.headingLine2}</span>
          </h1>
          <p className="body-lg hero__desc">
            Acquire an Executive, activate it by burning tokens, and watch your holdings grow automatically. The asset lives inside the NFT — it travels with it if you sell. The cycle never stops.
          </p>

          <div className="hero__actions">
            <button type="button" className="btn btn--primary btn--lg btn--locked" disabled aria-disabled="true" title="Mint date to be announced">
              <span className="btn__text">MINT EXECUTIVE (SOON)</span>
              <JungleCageOverlay />
            </button>

            <button type="button" className="btn btn--secondary btn--lg btn--locked" disabled aria-disabled="true" title="Marketplace listing to be announced">
              <span className="btn__text">VIEW ON OPENSEA (SOON)</span>
              <JungleCageOverlay />
            </button>
          </div>

          <div className="hero__pills">
            <div className="pill">
              <span>accrual status</span>
              <span className="pill__value text-accent">
                TO BE ANNOUNCED
              </span>
            </div>
            <div className="pill">
              <span>mints left</span>
              <span className="pill__value">{mintsLeftDisplay} / 1,111</span>
            </div>
            <div className="pill">
              <span>$SPECIE burned</span>
              <span className="pill__value">{burnedDisplay}</span>
            </div>
          </div>
        </div>

        <div className={`hero__right ${isVisible ? 'animate-fade-in animate-delay-3' : ''}`}>
          <div className="hero__artwork animate-float">
            <img
              src="/assets/oohdie-sword.jpg"
              alt="Samurai Primate with Glowing Katana Sword Slicing Candlesticks"
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
        <Link to="/" className={`banner-card block ${isVisible ? 'reveal--visible' : 'reveal'}`} title="Monkey Business Space Station">
          <img
            src="/assets/space-hero-bg.jpg"
            alt="Space Trading Monkey Floating in Galaxy with Charts"
            className="banner-card__image"
            width={1200}
            height={675}
            loading="lazy"
          />
          <div className="banner-card__badge">
            <span className="stock-icon-symbol">🌌</span> GALAXY ACCUMULATION STATION
          </div>
        </Link>
      </div>
    </section>
  );
}

/* ─── Extraction Band ──────────────────────────────────
   A split band rather than another wide banner card. The render is square and
   reads top-to-bottom — rotor, Executive, coin-stamped crate — so cropping it to
   16:9 would throw away both ends of the composition. Running it beside the
   copy at its native ratio keeps the picture intact and breaks up what would
   otherwise be three identical banner cards in a row. */
function ExtractionBandSection() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>();

  return (
    <section className="section section--extraction" ref={ref} aria-labelledby="extraction-heading">
      <div className="container">
        <div className={`extraction-band ${isVisible ? 'reveal--visible' : 'reveal'}`}>
          <figure className="extraction-band__art">
            <img
              src="/assets/extraction-airlift.jpg"
              alt="A primate in field gear riding the lift lines of a helicopter, standing on a crate stamped with a gold Monkey Business coin as it is airlifted out of the jungle at sunset."
              className="extraction-band__img"
              width={1024}
              height={1024}
              loading="lazy"
              decoding="async"
            />
            <div className="extraction-band__glow" aria-hidden="true" />
          </figure>

          <div className="extraction-band__copy">
            <p className="extraction-band__tag">THE HOLDINGS TRAVEL WITH IT</p>
            <h2 id="extraction-heading" className="heading-md">
              EVERYTHING IT EARNS STAYS IN THE CRATE
            </h2>
            <p className="body-lg extraction-band__desc">
              Rewards accrue into the NFT&rsquo;s own on-chain account, not yours. Sell the
              Executive and everything it holds goes with it &mdash; tier, split and balance
              intact. Nothing has to be swept out first.
            </p>
            <Link to={ROUTES.THE_TRAIL} className="extraction-band__link">
              See where the troop is headed &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Profit Loop ────────────────────────────
   The second half of the extraction band's argument. That one says where the
   money lands; this says where it comes from, so it runs directly after it.

   The pipeline is an <ol> because the order is the point — at 768px the nodes
   wrap to two rows and the connector line is dropped, and the 01–04 ordinals
   are what carries the sequence once the line is gone. */
function ProfitLoopSection() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>();

  return (
    <section className="section section--profit-loop" ref={ref} aria-labelledby="profit-heading">
      <div className="container">
        <article className={`profit-loop ${isVisible ? 'reveal--visible' : 'reveal'}`}>
          <header className="profit-loop__rail">
            <span className="profit-loop__mark">{PROFIT_LOOP.mark}</span>
            <span className="profit-loop__ref">{PROFIT_LOOP.ref}</span>
          </header>

          <div className="profit-loop__body">
            <div className="profit-loop__figure-row">
              <span className="profit-loop__value">{PROFIT_LOOP.value}</span>
              <span className="profit-loop__value-label">
                OF ALL FIRM<br />PROFITS
              </span>
            </div>

            <div className="profit-loop__copy">
              <h2 id="profit-heading" className="heading-md profit-loop__heading">
                {PROFIT_LOOP.heading}
              </h2>
              <div className="profit-loop__bar" aria-hidden="true" />
              <h3 className="profit-loop__subheading">
                {PROFIT_LOOP.subheading}
              </h3>
              <p className="body-md profit-loop__desc">{PROFIT_LOOP.body}</p>
            </div>
          </div>

          {/* The connector and the light that travels it are both drawn as
              pseudo-elements on this list — an <ol> may only parent <li>. */}
          <ol className="profit-loop__flow">
            {PROFIT_LOOP.steps.map((step) => (
              <li
                key={step.ordinal}
                className={`profit-loop__node ${step.ordinal === '04' ? 'profit-loop__node--active' : ''} ${step.ordinal === '01' || step.ordinal === '02' ? 'profit-loop__node--green' : ''}`}
              >
                <span className="profit-loop__ordinal">{step.ordinal}</span>
                <span className="profit-loop__dot" aria-hidden="true" />
                <span className="profit-loop__label">{step.label}</span>
                <span className="profit-loop__caption">{step.caption}</span>
              </li>
            ))}
          </ol>

          <footer className="profit-loop__strip">
            <p className="profit-loop__claims">{PROFIT_LOOP.strip}</p>
          </footer>
        </article>
      </div>
    </section>
  );
}

/* ─── Stats & Compact Stock Section ───────────────────── */
function StatsSection() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>();
  const { fetchPlatformStats, fetchGlobalRewardStats } = useContract();
  const [stats, setStats] = useState<{ mintsLeft: number; burnedTokens: string; burnedPercent: number; totalMinted: number } | null>(null);
  const [rewardStats, setRewardStats] = useState<AssetClaimTotal[]>([]);

  useEffect(() => {
    fetchPlatformStats().then((res) => {
      if (res) {
        setStats({
          mintsLeft: res.mintsLeft,
          burnedTokens: res.burnedTokens,
          burnedPercent: res.burnedPercent,
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
  const burnedTokensDisplay = stats ? `${formatNumber(parseFloat(stats.burnedTokens))} $SPECIE` : MOCK_STATS.supplyBurnedTokens;
  /* Was a hardcoded 14.08%, so the bar sat filled while the figure above it read
     zero. It tracks the burn now: live percentage when the chain answers, and
     the mock's own supplyBurnedPercent — which existed but was never read — when
     it does not. */
  const burnedPercentDisplay = stats ? stats.burnedPercent : parseFloat(MOCK_STATS.supplyBurnedPercent);

  // Merge registered assets with live claimed stats. Teased tokens carry no
  // address, so they never match a live row and simply read zero — which is what
  // an asset nobody has claimed yet should say.
  const allStockStripItems = ALL_REWARD_ASSETS.map((asset) => {
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
        <div className={`stats-grid-executives ${isVisible ? 'reveal--visible' : 'reveal'}`}>

          <div className="stat-card-main">
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {/* The same medallion stamped on the airlifted crate below. A
                    repeat of a mark already introduced, so it is decorative. */}
                <img
                  src="/assets/oohdie-coin.png"
                  alt=""
                  aria-hidden="true"
                  className="coin-mark coin-mark--stat"
                  width={28}
                  height={28}
                  loading="lazy"
                  decoding="async"
                />
                <p className="stat-card__tag mb-0">TOTAL REWARDS CLAIMED (GLOBAL ON-CHAIN)</p>
              </div>
              <span className="text-xs text-accent font-mono">
                {SUPPORTED_REWARD_ASSETS.length} Stocks &amp; USDG · {TEASER_REWARD_ASSETS.length} Tokens
                <span className="text-muted"> · Many more to come</span>
              </span>
            </div>

            <div className="global-stock-strip">
              {allStockStripItems.map((stock) => (
                <div key={stock.id || stock.symbol || stock.address} className="global-stock-card">
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
              Cumulative rewards claimed by all NFT holders across the entire protocol on Robinhood.
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
                Executives available to mint in real-time. Total collection is capped at 1,111.
              </p>
            </div>

            <div className="stat-card-item">
              <p className="stat-card__tag">SUPPLY BURNED</p>
              <h3 className="stat-card__val">{burnedTokensDisplay}</h3>
              <p className="stat-card__desc">
                Gone forever, out of a billion. Burned by every activation and tier climb.
              </p>
              <div className="stat-card__progress-track">
                <div className="stat-card__progress-bar" style={{ width: `${burnedPercentDisplay}%` }} />
              </div>
            </div>

            <div className="stat-card-item stat-card-item--cta">
              <p className="stat-card__tag">GET IN</p>
              <h3 className="stat-card__val text-accent">MINT SOON</h3>
              <p className="stat-card__desc">
                1,111 total supply. Mint and activation date to be announced on Twitter/X.
              </p>
              <button type="button" className="btn btn--primary btn--sm mt-4 btn--locked" disabled aria-disabled="true">
                <span className="btn__text">Mint Executive (Soon)</span>
                <JungleCageOverlay />
              </button>
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
            <p className="showcase-card__tag">NINETEEN WAYS TO EARN</p>
            <p className="showcase-card__desc">
              Eleven tokenized stocks, USDG, and seven crypto tokens. Pick up to three, split your hourly earnings between them. Your split decides what you collect, not how much.
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
              Your tier decides how much. Burn $SPECIE to climb from 1x to 3.5x. The tier stays with the NFT forever, even when sold.
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

/* ─── Alliance Band ────────────────────────────────────
   Sits directly under the showcase, whose last card is about how much an
   Executive earns. This is the one lever on that number that is not bought with
   $SPECIE, so it belongs immediately after it rather than further down.

   Held to a partnership band, not a banner card: the perks are numbers read
   off EarningEngine, and numbers need a panel to sit in. The plate bleeds to
   the card edge on the picture side, so the figures stand on the bottom rail
   the way the render composed them.

   Copy and every figure in it live in ALLIANCE in constants/content.ts —
   including the note on what has to be re-checked on chain before any of it
   is edited. */
function AllianceSection() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>();

  return (
    <section className="section section--alliance" ref={ref} aria-labelledby="alliance-heading">
      <div className="container">
        <article className={`alliance-card ${isVisible ? 'reveal--visible' : 'reveal'}`}>
          <header className="alliance-card__rail">
            <p className="alliance-card__mark">{ALLIANCE.mark}</p>
            <p className="alliance-card__ref">{ALLIANCE.ref}</p>
          </header>

          <div className="alliance-card__body">
            <div className="alliance-card__copy">
              <h2 id="alliance-heading" className="alliance-card__heading">
                <span className="alliance-card__heading-line">{ALLIANCE.headingLine1}</span>
                <span className="alliance-card__heading-line text-accent">{ALLIANCE.headingLine2}</span>
              </h2>

              <p className="alliance-card__tagline">{ALLIANCE.tagline}</p>
              <p className="alliance-card__desc">{ALLIANCE.body}</p>

              {/* The recognised collections. Same chip language as the perks
                  below so the band reads as one panel rather than two. */}
              <ul className="alliance-partners">
                {ALLIANCE.partners.map((partner) => (
                  <li key={partner.key} className="alliance-partner">
                    <span className="alliance-partner__glyph" aria-hidden="true">
                      {partner.glyph}
                    </span>
                    <span className="alliance-partner__text">
                      <span className="alliance-partner__name">{partner.name}</span>
                      <span className="alliance-partner__supply">{partner.supply}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="alliance-card__perks">
                {ALLIANCE.perks.map((perk) => (
                  <div key={perk.value} className="alliance-perk">
                    <dt className="alliance-perk__value">{perk.value}</dt>
                    <dd className="alliance-perk__label">{perk.label}</dd>
                  </div>
                ))}
              </dl>

              <p className="alliance-card__note">{ALLIANCE.note}</p>

              <a
                href={ALLIANCE.href}
                target="_blank"
                rel="noopener noreferrer"
                className="alliance-card__cta"
              >
                {ALLIANCE.cta} ↗
              </a>
            </div>

            <figure className="alliance-card__plate">
              <img
                src="/assets/stonkbrokers-alliance.webp"
                alt={ALLIANCE.imageAlt}
                className="alliance-card__img"
                width={1200}
                height={860}
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>

          <p className="alliance-card__strip">{ALLIANCE.strip}</p>
        </article>
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
        <Link to="/" className={`banner-card block ${isVisible ? 'reveal--visible' : 'reveal'}`} title="Monkey Business Trading Desk">
          <img
            src="/assets/cave-cta-bg.jpg"
            alt="Cave Trading Desk Station"
            className="banner-card__image"
            width={1200}
            height={675}
            loading="lazy"
          />
          <div className="banner-card__badge">
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
          <p className="body-lg mb-8">Set it up once. Your Executive works while you sleep.</p>
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
        <img
          src="/assets/oohdie-coin.png"
          alt="The Monkey Business coin — a gold medallion stamped with a primate in profile."
          className="coin-mark coin-mark--cta"
          width={96}
          height={96}
          loading="lazy"
          decoding="async"
        />
        <h2 id="cta-heading" className="heading-xl mb-8">READY TO EARN?</h2>
        <button type="button" className="btn btn--primary btn--lg btn--locked" disabled aria-disabled="true">
          <span className="btn__text">MINT EXECUTIVE (SOON)</span>
          <JungleCageOverlay />
        </button>
      </div>
    </section>
  );
}

/* ─── Crate Tease ──────────────────────────────────────
   The stinger. Placed after the CTA on purpose, the same way Appendix B sits
   after the CTA on /collection: it is not an offer, and putting it last means
   it never competes with the thing the page is actually asking for.

   Built as the same document Appendix B is — head, plate, struck-out field
   list, stamp — because both are the Firm's own paperwork. The two are not the
   same announcement and must not be written as if they were; see CRATE_TEASE
   in constants/content.ts.

   Not a link. There is nowhere to send anyone yet, so it is an article and the
   plate is a figure. The whole panel sits back at rest and comes up when it is
   leant on, which is the only interaction it has. */
function CrateTeaseSection() {
  const [ref, isVisible] = useScrollReveal<HTMLElement>();

  return (
    <section className="section crate-tease" ref={ref} aria-labelledby="crate-tease-heading">
      <div className="container">
        <article className={`crate-tease__doc ${isVisible ? 'reveal--visible' : 'reveal'}`}>
          <header className="crate-tease__head">
            <h2 id="crate-tease-heading" className="crate-tease__label">
              {CRATE_TEASE.label}
            </h2>
            <p className="crate-tease__ref">{CRATE_TEASE.docRef}</p>
            <p className="crate-tease__clearance">{CRATE_TEASE.clearance}</p>
          </header>

          <div className="crate-tease__body">
            <figure className="crate-tease__plate">
              <img
                src={CRATE_TEASE.image}
                alt={CRATE_TEASE.imageAlt}
                className="crate-tease__img"
                width={800}
                height={800}
                loading="lazy"
                decoding="async"
              />
              <span className="crate-tease__scan" aria-hidden="true" />
              <figcaption className="crate-tease__plate-note">
                {CRATE_TEASE.imageNote}
              </figcaption>
            </figure>

            <div className="crate-tease__record">
              <dl className="crate-tease__fields">
                {CRATE_TEASE.fields.map((entry) => (
                  <div className="field" key={entry.label}>
                    <dt className="field__label">{entry.label}</dt>
                    <span className="field__leader" aria-hidden="true" />
                    <dd
                      className={`field__value ${
                        entry.value === '[REDACTED]' ? 'field__value--struck' : ''
                      }`}
                    >
                      {entry.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="crate-tease__manifest">{CRATE_TEASE.manifest}</p>
            </div>
          </div>

          <p className="crate-tease__footer">{CRATE_TEASE.footer}</p>
        </article>
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
      <ExtractionBandSection />
      <ProfitLoopSection />
      <ShowcaseSection />
      <AllianceSection />
      <CollectionSection />
      <CaveTradingBannerSection />
      <HowItWorksSection />
      <FinalCTASection />
      <CrateTeaseSection />
    </main>
  );
}
