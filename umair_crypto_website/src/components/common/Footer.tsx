import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants/routes';
import { BRAND } from '../../constants/content';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container">

        <div className="footer__marquee" aria-hidden="true">
          <div className="footer__marquee-track">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="footer__marquee-item">
                EARN · STACK · ACTIVATE · UPGRADE · MONKEY BUSINESS ·{' '}
              </span>
            ))}
          </div>
        </div>

        <div className="footer__content">
          <div className="footer__left">
            <div className="footer__brand">
              <span className="footer__brand-first">{BRAND.nameFirst}</span>
              <span className="footer__brand-second">{BRAND.nameSecond}</span>
            </div>
            <p className="footer__tagline">
              {BRAND.tagline}
            </p>
          </div>

          <nav className="footer__nav" aria-label="Footer navigation">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.path} to={item.path} className="footer__link">
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="footer__bottom">
          <p className="footer__disclaimer">
            <strong>Disclaimer.</strong> Monkey Business is an experimental digital collectible project.
            Nothing on this site is financial, investment, or legal advice. Digital assets are volatile
            and can lose value. Never share your seed phrase. Participate only with funds you can afford to lose.
          </p>
          <p className="footer__copyright">
            © {BRAND.year} Monkey Business. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
