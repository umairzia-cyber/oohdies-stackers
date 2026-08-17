import { Link } from 'react-router-dom';
import { useScrollReveal, useDocumentTitle } from '../../hooks';
import { TRAIL_PAGE, TRAIL_STOPS, SEO } from '../../constants/content';
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

          <section className="trail-stops" aria-labelledby="trail-stops-heading">
            <h2 id="trail-stops-heading" className="heading-md trail-stops__heading">
              {TRAIL_PAGE.stopsHeading}
            </h2>

            <ol className="trail-stops__list">
              {TRAIL_STOPS.map((stop) => (
                <li
                  key={stop.id}
                  className={`trail-stop ${stop.charted ? '' : 'trail-stop--uncharted'}`}
                >
                  <div className="trail-stop__marker" aria-hidden="true">
                    <span className="trail-stop__id">{stop.id}</span>
                  </div>

                  <div className="trail-stop__body">
                    {stop.charted ? (
                      <>
                        <h3 className="trail-stop__title">{stop.title}</h3>
                        <p className="trail-stop__text">{stop.body}</p>
                      </>
                    ) : (
                      <>
                        <h3 className="trail-stop__title trail-stop__title--locked">
                          {TRAIL_PAGE.unchartedLabel}
                        </h3>
                        <p className="trail-stop__text">{TRAIL_PAGE.unchartedNote}</p>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>

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
