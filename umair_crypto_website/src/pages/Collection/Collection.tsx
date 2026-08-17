import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks';
import { COLLECTION_PAGE, SEO } from '../../constants/content';
import { ROUTES } from '../../constants/routes';
import {
  ARCHETYPES,
  COLLECTION_GALLERY,
  COLLECTION_SIZE,
  RARITY_ORDER,
  type Archetype,
  type GalleryPiece,
} from '../../constants/collection';
import { formatNumber } from '../../utils';
import type { Rarity } from '../../types';
import './Collection.css';

/*
 * The gallery. Three movements, each doing a job the others cannot:
 *
 *   1. The wall  — art in motion the moment the page opens, no reading required.
 *   2. The ladder— the rarity spread, as a bar whose widths are the real counts.
 *                  Doubles as the filter, so the chart is the control.
 *   3. The vault — the browsable grid. Opening any piece hands off to the viewer.
 *
 * Everything reads from constants/collection.ts, so the page grows with the art
 * rather than with edits here.
 */

const WALL_ROW_COUNT = 3;
const WALL_TILES_PER_ROW = 12;

/*
 * The wall is built straight from the archetypes rather than from the weighted
 * gallery: weighting is right for the vault, but on a decorative wall it stacks
 * the common build next to itself. Cycling the archetypes guarantees no two
 * neighbours match, and offsetting each row keeps the columns varied too.
 */
const WALL_ROWS: readonly (readonly Archetype[])[] = Array.from(
  { length: WALL_ROW_COUNT },
  (_, row) =>
    Array.from(
      { length: WALL_TILES_PER_ROW },
      (_, i) => ARCHETYPES[(i + row * 2) % ARCHETYPES.length],
    ),
);

/* Seconds per lap. Staggered so the rows never lock into a visible beat. */
const ROW_DURATIONS = [64, 52, 76];

const RARITY_COUNTS = RARITY_ORDER.map((rarity) => ({
  rarity,
  count: COLLECTION_GALLERY.filter((piece) => piece.rarity === rarity).length,
}));

type Filter = Rarity | 'ALL';

export default function Collection() {
  useDocumentTitle(SEO.collection.title);

  const [filter, setFilter] = useState<Filter>('ALL');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const visible = useMemo(
    () =>
      filter === 'ALL'
        ? COLLECTION_GALLERY
        : COLLECTION_GALLERY.filter((piece) => piece.rarity === filter),
    [filter],
  );

  const closeViewer = useCallback(() => setViewerIndex(null), []);

  const stepViewer = useCallback(
    (delta: number) => {
      setViewerIndex((current) => {
        if (current === null || visible.length === 0) return current;
        return (current + delta + visible.length) % visible.length;
      });
    },
    [visible.length],
  );

  /* Changing the filter renumbers `visible`, which would leave the open piece
     pointing at something else. Close rather than guess. */
  const applyFilter = useCallback((next: Filter) => {
    setViewerIndex(null);
    setFilter(next);
  }, []);

  const isViewerOpen = viewerIndex !== null;
  const activePiece = viewerIndex === null ? null : visible[viewerIndex] ?? null;

  return (
    <main className="collection-page">
      <CollectionWall />

      <section className="section collection-ladder" aria-labelledby="ladder-heading">
        <div className="container">
          <h2 id="ladder-heading" className="heading-md collection-ladder__heading">
            {COLLECTION_PAGE.ladderHeading}
          </h2>

          {/* Segment widths are the real counts, so the bar is the data and the
              filter at the same time. */}
          <div className="collection-ladder__bar" role="group" aria-label={COLLECTION_PAGE.ladderHeading}>
            {RARITY_COUNTS.map(({ rarity, count }) => (
              <button
                key={rarity}
                type="button"
                className={`collection-ladder__segment ${
                  filter === rarity ? 'collection-ladder__segment--active' : ''
                }`}
                style={
                  {
                    '--segment-grow': count,
                    '--tier-colour': `var(--rarity-${rarity.toLowerCase()})`,
                  } as CSSProperties
                }
                onClick={() => applyFilter(filter === rarity ? 'ALL' : rarity)}
                aria-pressed={filter === rarity}
              >
                <span className="collection-ladder__tier">{rarity}</span>
                <span className="collection-ladder__count">{count}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`collection-ladder__reset ${
              filter === 'ALL' ? 'collection-ladder__reset--active' : ''
            }`}
            onClick={() => applyFilter('ALL')}
            aria-pressed={filter === 'ALL'}
          >
            {COLLECTION_PAGE.filterAllLabel}
          </button>
        </div>
      </section>

      <section className="section collection-vault" aria-labelledby="vault-heading">
        <div className="container">
          <div className="collection-vault__head">
            <h2 id="vault-heading" className="heading-md">
              {COLLECTION_PAGE.vaultHeading}
            </h2>
            <p className="collection-vault__readout" aria-live="polite">
              {visible.length} / {formatNumber(COLLECTION_SIZE)}
            </p>
          </div>

          {visible.length === 0 ? (
            <p className="collection-vault__empty">{COLLECTION_PAGE.emptyLabel}</p>
          ) : (
            /* Keyed by filter so the stagger animation replays on every change
               instead of snapping the new set into place. */
            <ul className="collection-vault__grid" key={filter}>
              {visible.map((piece, i) => (
                <li
                  key={piece.key}
                  className="collection-vault__cell"
                  style={{ '--cell-index': i } as CSSProperties}
                >
                  <button
                    type="button"
                    className="specimen"
                    onClick={() => setViewerIndex(i)}
                    aria-label={`Open ${piece.name}`}
                  >
                    <span className="specimen__frame">
                      <img
                        src={piece.image}
                        alt={piece.description}
                        className="specimen__img"
                        width={400}
                        height={400}
                        loading="lazy"
                        decoding="async"
                      />
                    </span>
                    <span className="specimen__meta">
                      <span className="specimen__id">
                        #{String(piece.tokenId).padStart(4, '0')}
                      </span>
                      <span
                        className="specimen__rarity"
                        style={
                          { '--tier-colour': `var(--rarity-${piece.rarity.toLowerCase()})` } as CSSProperties
                        }
                      >
                        {piece.rarity}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="collection-vault__outro">
            <Link to={`${ROUTES.ACTIVATE}#mint`} className="btn btn--primary btn--lg">
              {COLLECTION_PAGE.cta}
            </Link>
          </div>
        </div>
      </section>

      {isViewerOpen && activePiece && (
        <SpecimenViewer
          piece={activePiece}
          position={viewerIndex + 1}
          total={visible.length}
          onClose={closeViewer}
          onStep={stepViewer}
        />
      )}
    </main>
  );
}

/* ─── The wall ─────────────────────────────────────────
   Rows drift in alternating directions behind the title. Each track holds its
   row twice, so translating it by exactly -50% lands on an identical frame and
   the loop is seamless. */
function CollectionWall() {
  return (
    <section className="collection-wall" aria-labelledby="collection-heading">
      <div className="collection-wall__stage" aria-hidden="true">
        {WALL_ROWS.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="collection-wall__row"
            style={{ '--row-duration': `${ROW_DURATIONS[rowIndex]}s` } as CSSProperties}
          >
            <div className="collection-wall__track">
              {[...row, ...row].map((archetype, i) => (
                <span className="collection-wall__tile" key={`${archetype.key}-${i}`}>
                  {/* Not lazy-loaded: the tiles start offscreen horizontally, so
                      lazy loading leaves gaps drifting into view. Only a handful
                      of unique files back the whole wall anyway. */}
                  <img src={archetype.image} alt="" className="collection-wall__img" decoding="async" />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="collection-wall__veil" aria-hidden="true" />

      <header className="collection-wall__intro">
        <p className="subtitle collection-wall__label">{COLLECTION_PAGE.wallLabel}</p>
        <h1 id="collection-heading" className="heading-xl collection-wall__heading">
          {COLLECTION_PAGE.heading}
        </h1>
        <p className="body-lg collection-wall__desc">{COLLECTION_PAGE.description}</p>
      </header>
    </section>
  );
}

/* ─── The viewer ───────────────────────────────────────
   Full-screen study of one piece. Owns its own key handling and scroll lock so
   the page underneath does not have to know it exists. */
interface SpecimenViewerProps {
  readonly piece: GalleryPiece;
  readonly position: number;
  readonly total: number;
  readonly onClose: () => void;
  readonly onStep: (delta: number) => void;
}

function SpecimenViewer({ piece, position, total, onClose, onStep }: SpecimenViewerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') onStep(1);
      else if (event.key === 'ArrowLeft') onStep(-1);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onStep]);

  /* Lock the page behind the overlay, and hand focus to the dialog so the
     arrow keys work without a click first. Focus goes back where it came from
     on close. */
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, []);

  return (
    <div className="specimen-viewer" onClick={onClose}>
      <div
        className="specimen-viewer__panel"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={piece.name}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="specimen-viewer__close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="specimen-viewer__art">
          <img src={piece.image} alt={piece.description} className="specimen-viewer__img" />
        </div>

        <div className="specimen-viewer__body">
          <p className="specimen-viewer__counter">
            {position} / {total}
          </p>

          <h2 className="specimen-viewer__name">{piece.name}</h2>

          <p
            className="specimen-viewer__rarity"
            style={
              { '--tier-colour': `var(--rarity-${piece.rarity.toLowerCase()})` } as CSSProperties
            }
          >
            {piece.rarity}
          </p>

          <p className="specimen-viewer__desc">{piece.description}</p>

          <h3 className="specimen-viewer__traits-heading">{COLLECTION_PAGE.traitsHeading}</h3>
          <dl className="specimen-viewer__traits">
            {piece.traits.map((trait) => (
              <div className="specimen-viewer__trait" key={trait.label}>
                <dt className="specimen-viewer__trait-label">{trait.label}</dt>
                <dd className="specimen-viewer__trait-value">{trait.value}</dd>
              </div>
            ))}
          </dl>

          <div className="specimen-viewer__nav">
            <button
              type="button"
              className="specimen-viewer__step"
              onClick={() => onStep(-1)}
              aria-label="Previous Oohdie"
            >
              ←
            </button>
            <button
              type="button"
              className="specimen-viewer__step"
              onClick={() => onStep(1)}
              aria-label="Next Oohdie"
            >
              →
            </button>
          </div>

          <p className="specimen-viewer__hint">{COLLECTION_PAGE.viewerHint}</p>
        </div>
      </div>
    </div>
  );
}
