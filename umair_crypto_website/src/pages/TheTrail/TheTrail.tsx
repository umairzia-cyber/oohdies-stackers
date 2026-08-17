import { Link } from 'react-router-dom';
import { useScrollReveal, useDocumentTitle } from '../../hooks';
import { TRAIL_PAGE, TRAIL_EXPEDITIONS, SEO } from '../../constants/content';
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
  const [scoutRef, scoutVisible] = useScrollReveal<HTMLElement>();

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

          <section className="trail-expeditions" aria-labelledby="trail-expeditions-heading">
            <h2
              id="trail-expeditions-heading"
              className="heading-md trail-expeditions__heading"
            >
              {TRAIL_PAGE.expeditionsHeading}
            </h2>

            <div className="trail-expeditions__layout">

              {/* The scout rides alongside the list: the map up top is the plan,
                  this is someone already walking it. Cropped to a portrait in
                  CSS so it holds a column rather than spanning the page. */}
              <figure className="trail-scout" ref={scoutRef}>
                <div className={`trail-scout__frame ${scoutVisible ? 'reveal--visible' : 'reveal'}`}>
                  <img
                    src="/assets/trail-scout.webp"
                    alt={TRAIL_PAGE.scoutAlt}
                    className="trail-scout__image"
                    width={1600}
                    height={893}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="trail-scout__fade" aria-hidden="true" />
                </div>

                <figcaption className="trail-scout__caption">
                  {TRAIL_PAGE.scoutCaption}
                </figcaption>
              </figure>

              <ol className="trail-expeditions__list">
                {TRAIL_EXPEDITIONS.map((expedition) => (
                  <li
                    key={expedition.id}
                    className={`trail-expedition ${
                      expedition.charted ? '' : 'trail-expedition--uncharted'
                    }`}
                  >
                    <div className="trail-expedition__marker" aria-hidden="true">
                      <span className="trail-expedition__id">{expedition.id}</span>
                    </div>

                    <div className="trail-expedition__body">
                      <p className="trail-expedition__ordinal">{expedition.ordinal}</p>

                      {expedition.charted ? (
                        <>
                          <h3 className="trail-expedition__title">{expedition.title}</h3>
                          <p className="trail-expedition__text">{expedition.body}</p>
                        </>
                      ) : (
                        <>
                          <h3 className="trail-expedition__title trail-expedition__title--locked">
                            {TRAIL_PAGE.unchartedLabel}
                          </h3>
                          <p className="trail-expedition__text">{TRAIL_PAGE.unchartedNote}</p>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ol>

            </div>
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
