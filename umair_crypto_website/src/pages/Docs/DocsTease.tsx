import { useScrambledCountdown } from '../../hooks';
import { DOCS_TEASE } from '../../constants/content';
import './DocsTease.css';

export default function DocsTease() {
  const units = useScrambledCountdown();

  return (
    <div
      className="docs-tease"
      role="dialog"
      aria-modal="true"
      aria-labelledby="docs-tease-heading"
    >
      <div className="docs-tease__panel">

        <div className="docs-tease__badges">
          <span className="docs-tease__badge">{DOCS_TEASE.badge}</span>
          <span className="docs-tease__badge docs-tease__badge--accent">
            {DOCS_TEASE.badgeStatus}
          </span>
        </div>

        <h1 id="docs-tease-heading" className="heading-lg docs-tease__heading">
          {DOCS_TEASE.heading}
        </h1>
        <p className="docs-tease__signal">{DOCS_TEASE.signal}</p>

        <div className="docs-tease__timer" aria-hidden="true">
          {units.map((unit) => (
            <div key={unit.label} className="docs-tease__unit">
              <span className="docs-tease__unit-value">{unit.value}</span>
              <span className="docs-tease__unit-label">{unit.label}</span>
            </div>
          ))}
        </div>
        <p className="sr-only">{DOCS_TEASE.timerNote}</p>

        <p className="docs-tease__body">{DOCS_TEASE.body}</p>

        <a
          href={DOCS_TEASE.xUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--primary btn--lg docs-tease__cta"
        >
          {DOCS_TEASE.primaryCta}
        </a>
      </div>
    </div>
  );
}
