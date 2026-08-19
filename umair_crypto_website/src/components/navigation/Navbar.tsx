import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants/routes';
import { BRAND, WALLET } from '../../constants/content';
import { useWallet } from '../../context/WalletContext';
import { formatWalletAddress } from '../../utils';
import './Navbar.css';

export default function Navbar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { wallet, isConnected, isConnecting, connect, disconnect } = useWallet();
  const location = useLocation();

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  const toggleMobile = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

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
    <>
      <nav
        className={`navbar ${isScrolled ? 'navbar--scrolled' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="navbar__inner container">

          <NavLink to="/" className="navbar__brand" aria-label="Monkey Business Home">
            <span className="navbar__brand-first">{BRAND.nameFirst}</span>
            <span className="navbar__brand-second">{BRAND.nameSecond}</span>
          </NavLink>

          <ul className="navbar__links" role="menubar">
            {NAV_ITEMS.map((item) => (
              <li key={item.path} role="none">
                <NavLink
                  to={item.path}
                  role="menuitem"
                  className={({ isActive }) =>
                    `navbar__link ${isActive ? 'navbar__link--active' : ''}`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <button
            className={`btn btn--primary btn--sm navbar__wallet-btn ${isConnected ? 'navbar__wallet-btn--connected' : ''}`}
            onClick={handleWalletClick}
            disabled={isConnecting}
            aria-label={isConnected ? 'Disconnect wallet' : 'Connect wallet'}
          >
            {walletButtonText}
          </button>

          <button
            className={`navbar__hamburger ${isMobileOpen ? 'navbar__hamburger--open' : ''}`}
            onClick={toggleMobile}
            aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileOpen}
            aria-controls="mobile-menu"
          >
            <span className="navbar__hamburger-line" />
            <span className="navbar__hamburger-line" />
            <span className="navbar__hamburger-line" />
          </button>
        </div>
      </nav>

      {isMobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        id="mobile-menu"
        className={`mobile-menu ${isMobileOpen ? 'mobile-menu--open' : ''}`}
        role="dialog"
        aria-label="Mobile navigation"
        aria-modal={isMobileOpen}
      >
        <ul className="mobile-menu__links">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `mobile-menu__link ${isActive ? 'mobile-menu__link--active' : ''}`
                }
                onClick={() => setIsMobileOpen(false)}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <button
          className={`btn btn--primary btn--lg w-full ${isConnected ? '' : ''}`}
          onClick={handleWalletClick}
          disabled={isConnecting}
        >
          {walletButtonText}
        </button>
      </div>
    </>
  );
}
