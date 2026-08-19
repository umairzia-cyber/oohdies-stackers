import { useState, useCallback, type HTMLAttributes } from 'react';
import { useScrollReveal, useDocumentTitle, useMediaQuery } from '../../hooks';
import { DOCS_PAGE, DOCS_TEASE, SEO } from '../../constants/content';
import DocsTease from './DocsTease';
import './Docs.css';

interface DocSectionData {
  readonly id: string;
  readonly title: string;
}

const DOC_SECTIONS: readonly DocSectionData[] = [
  { id: 'overview', title: 'Overview' },
  { id: 'how-it-works', title: 'How Monkey Business Works' },
  { id: 'activation', title: 'Activation' },
  { id: 'my-stack', title: 'My Stack' },
  { id: 'collection', title: 'Collection' },
  { id: 'wallet-safety', title: 'Wallet Safety' },
  { id: 'security', title: 'Security' },
  { id: 'faq', title: 'FAQ' },
];

export default function Docs() {
  const isTeased = DOCS_TEASE.enabled;

  useDocumentTitle(isTeased ? `${DOCS_TEASE.heading} — Monkey Business` : SEO.docs.title);
  const [ref, isVisible] = useScrollReveal<HTMLDivElement>();
  const [activeSection, setActiveSection] = useState('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const scrollToSection = useCallback((id: string) => {
    setActiveSection(id);
    setIsMobileSidebarOpen(false);
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, []);

  // While teased, the real docs are decorative wallpaper: hidden from assistive
  // tech and taken out of the tab order so nothing behind the veil is reachable.
  const veilProps: HTMLAttributes<HTMLDivElement> = isTeased
    ? { 'aria-hidden': true, inert: true }
    : {};

  return (
    <main className={isTeased ? 'docs-page docs-page--teased' : 'docs-page'}>

      <div className="docs-header" ref={ref} {...veilProps}>
        <div className={`container ${isVisible ? 'animate-fade-in' : ''}`}>
          <p className="subtitle mb-4">{DOCS_PAGE.subtitle}</p>
          <h1 className="heading-xl">{DOCS_PAGE.heading}</h1>
        </div>
      </div>

      <div className="docs-layout container" {...veilProps}>

        {isMobile && (
          <button
            className="docs-sidebar-toggle btn btn--secondary"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            aria-expanded={isMobileSidebarOpen}
            aria-controls="docs-sidebar"
          >
            {isMobileSidebarOpen ? 'Close Navigation' : 'Open Navigation'}
          </button>
        )}

        <aside
          id="docs-sidebar"
          className={`docs-sidebar ${isMobileSidebarOpen ? 'docs-sidebar--open' : ''}`}
          aria-label="Documentation navigation"
        >
          <nav>
            <ul className="docs-sidebar__list">
              {DOC_SECTIONS.map((section) => (
                <li key={section.id}>
                  <button
                    className={`docs-sidebar__link ${activeSection === section.id ? 'docs-sidebar__link--active' : ''}`}
                    onClick={() => scrollToSection(section.id)}
                    aria-current={activeSection === section.id ? 'true' : undefined}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="docs-content">

          <section id="overview" className="docs-section">
            <h2 className="heading-md mb-4">Overview</h2>
            <p className="docs-text">
              Monkey Business is an experimental digital collectible project built on Web3 technology.
              It combines NFT collectibles with an automated accumulation system — your activated
              Associate accumulates value every cycle without any manual intervention.
            </p>
            <p className="docs-text">
              The collection consists of 1,111 unique Associates, each with distinct traits and visual attributes.
              Activated Associates earn automatically, and the accumulated value lives inside the NFT itself.
            </p>
            <div className="docs-image-block">
              <img
                src="/assets/collection/user_art_2.jpg"
                alt="Example Associate — Cyber Cowboy variant"
                className="docs-image"
                width={300}
                height={300}
                loading="lazy"
              />
            </div>
          </section>

          <section id="how-it-works" className="docs-section">
            <h2 className="heading-md mb-4">How Monkey Business Works</h2>
            <p className="docs-text">
              The system operates on a cycle-based accumulation model. Each cycle, all activated
              Associates receive their allocation based on their tier multiplier.
            </p>
            <h3 className="heading-sm mb-2 mt-6">The Cycle</h3>
            <p className="docs-text">
              Cycles run continuously. Once your Associate is activated, it begins accumulating
              from the next cycle onwards. Higher tier Associates receive proportionally more per cycle.
            </p>
            <h3 className="heading-sm mb-2 mt-6">Multipliers</h3>
            <div className="code-block">
              Tier 1 (Active)   → 1.0x multiplier  → burn 25,000 tokens{'\n'}
              Tier 2            → 1.4x multiplier  → burn 75,000 tokens{'\n'}
              Tier 3            → 1.9x multiplier  → burn 150,000 tokens{'\n'}
              Tier 4            → 2.5x multiplier  → burn 300,000 tokens{'\n'}
              Tier 5 (Top)      → 3.5x multiplier  → burn 850,000 tokens
            </div>
            <div className="callout callout--info">
              <p className="callout__title">Note</p>
              <p className="callout__text">
                Token burns are permanent and irreversible. The burned tokens are removed
                from circulation forever, creating deflationary pressure.
              </p>
            </div>
          </section>

          <section id="activation" className="docs-section">
            <h2 className="heading-md mb-4">Activation</h2>
            <p className="docs-text">
              Activation is a one-time process that transforms a dormant Associate into
              an active accumulator. The process involves burning tokens to select your tier.
            </p>
            <h3 className="heading-sm mb-2 mt-6">Steps to Activate</h3>
            <ol className="docs-list">
              <li>Connect your wallet on the Activate page</li>
              <li>Select an Associate from your collection</li>
              <li>Choose your desired tier and stock split</li>
              <li>Confirm the token burn transaction</li>
              <li>Your Associate begins accumulating from the next cycle</li>
            </ol>
          </section>

          <section id="my-stack" className="docs-section">
            <h2 className="heading-md mb-4">My Stack</h2>
            <p className="docs-text">
              The My Stack page is your personal dashboard. It displays everything you own,
              your accumulation history, and your current stack level.
            </p>
            <h3 className="heading-sm mb-2 mt-6">Dashboard Features</h3>
            <ul className="docs-list">
              <li><strong>Portfolio Overview</strong> — total owned, active stacks, stack level</li>
              <li><strong>Collection Grid</strong> — visual display of your Associates</li>
              <li><strong>Accumulated Balance</strong> — balance from accumulation cycles</li>
              <li><strong>Activity History</strong> — recent activations, upgrades, and cycles</li>
            </ul>
            <div className="docs-image-block">
              <img
                src="/assets/collection/user_art_4.jpg"
                alt="Associate Dragon Skull — portfolio display example"
                className="docs-image"
                width={300}
                height={300}
                loading="lazy"
              />
            </div>
          </section>

          <section id="collection" className="docs-section">
            <h2 className="heading-md mb-4">Collection</h2>
            <p className="docs-text">
              The Monkey Business collection comprises 1,111 unique digital collectibles.
              Each Associate has a unique combination of traits including headgear, eyewear,
              clothing, accessories, and backgrounds.
            </p>
          </section>

          <section id="wallet-safety" className="docs-section">
            <h2 className="heading-md mb-4">Wallet Safety</h2>
            <div className="callout callout--warning">
              <p className="callout__title">Critical Security Warning</p>
              <p className="callout__text">
                Never share your seed phrase, private keys, or recovery phrases with anyone.
                Monkey Business will NEVER ask for your seed phrase or private keys.
                If anyone asks for these, it is a scam.
              </p>
            </div>
            <h3 className="heading-sm mb-2 mt-6">Best Practices</h3>
            <ul className="docs-list">
              <li>Always verify you are on the official Monkey Business website</li>
              <li>Never enter your seed phrase on any website</li>
              <li>Use a hardware wallet for significant holdings</li>
              <li>Review every transaction before signing</li>
              <li>Be cautious of direct messages claiming to be from the team</li>
            </ul>
          </section>

          <section id="security" className="docs-section">
            <h2 className="heading-md mb-4">Security</h2>
            <p className="docs-text">
              Monkey Business is built with security as a core principle. The frontend
              implements multiple layers of protection against common web vulnerabilities.
            </p>
          </section>

          <section id="faq" className="docs-section">
            <h2 className="heading-md mb-4">FAQ</h2>

            <div className="docs-faq">
              <h3 className="heading-sm mb-2">What is Monkey Business?</h3>
              <p className="docs-text">
                Monkey Business is an experimental digital collectible project that combines
                NFTs with an automated accumulation system on Web3.
              </p>
            </div>

            <div className="docs-faq">
              <h3 className="heading-sm mb-2">How do I get an Associate?</h3>
              <p className="docs-text">
                Associates can be acquired through the collection. Connect your wallet
                and visit the Activate page to begin.
              </p>
            </div>

            <div className="docs-faq">
              <h3 className="heading-sm mb-2">What happens to burned tokens?</h3>
              <p className="docs-text">
                Burned $SPECIE tokens are permanently removed from circulation. This is a one-way
                process and cannot be reversed.
              </p>
            </div>
          </section>
        </div>
      </div>

      {isTeased && <DocsTease />}
    </main>
  );
}
