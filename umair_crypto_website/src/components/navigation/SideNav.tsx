import { useCallback, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS, ROUTES } from '../../constants/routes';
import { BRAND, WALLET, SOCIALS } from '../../constants/content';
import { useWallet } from '../../context/WalletContext';
import { formatWalletAddress } from '../../utils';
import './SideNav.css';

/*
 * The primary left rail, shown above 1024px. Below that it hides and Navbar
 * takes over as a top bar. Deliberately stateless — NavLink owns the active
 * state and a full-height rail has no scrolled-state to track.
 *
 * Icons are keyed by route here rather than in constants/routes.ts, which
 * Footer also consumes and which is intentionally JSX-free.
 */
const NAV_ICONS: Record<string, ReactNode> = {
  [ROUTES.HOME]: (
    <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z" />
  ),
  /* Four framed panels — a wall of art. */
  [ROUTES.COLLECTION]: (
    <path d="M3.5 3.5h7v7h-7v-7Zm1.5 1.5v4h4V5H5Zm8.5-1.5h7v7h-7v-7Zm1.5 1.5v4h4V5h-4Zm-11.5 8.5h7v7h-7v-7Zm1.5 1.5v4h4v-4H5Zm8.5-1.5h7v7h-7v-7Zm1.5 1.5v4h4v-4h-4Z" />
  ),
  [ROUTES.ACTIVATE]: (
    <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />
  ),
  [ROUTES.MY_STACK]: (
    <path d="M12 2 2 7l10 5 10-5-10-5Zm0 9L2 16l10 5 10-5-10-5Z" />
  ),
  /* A winding trail with a marker pin at its head. */
  [ROUTES.THE_TRAIL]: (
    <path d="M17 2a3 3 0 0 0-3 3c0 2.2 3 5.5 3 5.5S20 7.2 20 5a3 3 0 0 0-3-3Zm0 2.1a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM10.6 6.2a4.4 4.4 0 0 0-.9 8.7l2.6.5a1.6 1.6 0 0 1-.3 3.2H8.3a3 3 0 1 0 0 2H12a3.6 3.6 0 0 0 .7-7.2l-2.6-.5a2.4 2.4 0 0 1 .5-4.7h1.2v-2h-1.2ZM5.3 19.6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
  ),
  [ROUTES.DOCS]: (
    <path d="M5 3h9l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm8 1.5V9h4.5L13 4.5ZM7.5 12h9v1.5h-9V12Zm0 4h9v1.5h-9V16Z" />
  ),
};

export default function SideNav() {
  const { wallet, isConnected, isConnecting, connect, disconnect } = useWallet();

  const handleWalletClick = useCallback(() => {
    if (isConnected) {
      disconnect();
    } else if (!isConnecting) {
      connect();
    }
  }, [isConnected, isConnecting, connect, disconnect]);

  const walletButtonText = isConnecting
    ? WALLET.connecting
    : isConnected
      ? formatWalletAddress(wallet.address)
      : WALLET.connectButton;

  return (
    <aside className="app-sidebar" aria-label="Primary">

      <NavLink to={ROUTES.HOME} className="app-sidebar__brand">
        <span className="app-sidebar__brand-first">{BRAND.nameFirst}</span>
        <span className="app-sidebar__brand-second">{BRAND.nameSecond}</span>
      </NavLink>

      <nav className="app-sidebar__nav">
        <ul className="app-sidebar__list">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === ROUTES.HOME}
                className={({ isActive }) =>
                  `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`
                }
              >
                <svg
                  className="app-sidebar__icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  {NAV_ICONS[item.path]}
                </svg>
                <span className="app-sidebar__label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="app-sidebar__footer">
        <ul className="app-sidebar__socials">
          {SOCIALS.map((social) => (
            <li key={social.label}>
              <a
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="app-sidebar__social"
                aria-label={social.label}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={social.icon} />
                </svg>
              </a>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleWalletClick}
          disabled={isConnecting}
          className={`btn btn--primary btn--sm app-sidebar__wallet ${
            isConnected ? 'app-sidebar__wallet--connected' : ''
          }`}
        >
          {walletButtonText}
        </button>
      </div>
    </aside>
  );
}
