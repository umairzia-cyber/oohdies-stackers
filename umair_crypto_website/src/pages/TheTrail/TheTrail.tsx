import { Link } from 'react-router-dom';
import { useScrollReveal, useDocumentTitle } from '../../hooks';
import { TRAIL_PAGE, SEO } from '../../constants/content';
import { ROUTES } from '../../constants/routes';
import './TheTrail.css';

/*
 * Roadmap tease. The map is the content — it carries every hint about what is
 * coming, so nothing here labels or explains the individual stops. The copy
 * only frames it, and the header is kept short so the image dominates.
 */
export default function TheTrail() {
  useDocumentTitle(SEO.theTrail.title);
  const [ref, isVisible] = useScrollReveal<HTMLDivElement>();

  return (
    <main className="trail-page">
      <section className="section">
        <div className="container">

          <header className="trail-header" ref={ref}>
            <div className={isVisible ? 'animate-fade-in' : ''}>
              <p className="subtitle mb-4">{TRAIL_PAGE.subtitle}</p>
              <h1 className="heading-xl trail-header__heading">{TRAIL_PAGE.heading}</h1>
              <p className="body-lg trail-header__desc">{TRAIL_PAGE.description}</p>
            </div>
          </header>

          <figure className="trail-map">
            <div className="trail-map__frame">
              <img
                src="/assets/the-trail-map.webp"
                alt={TRAIL_PAGE.mapAlt}
                className="trail-map__image"
                width={2752}
                height={1536}
                decoding="async"
                fetchPriority="high"
              />
              {/* Light sweeping across the map — surveying unmapped ground. */}
              <div className="trail-map__scan" aria-hidden="true" />
              <div className="trail-map__vignette" aria-hidden="true" />
            </div>

            <figcaption className="trail-map__caption">
              {TRAIL_PAGE.mapCaption}
            </figcaption>
          </figure>

          <div className="trail-outro">
            <Link to={ROUTES.ACTIVATE} className="btn btn--primary btn--lg">
              {TRAIL_PAGE.cta}
            </Link>
          </div>

        </div>
      </section>
    </main>
  );
}
