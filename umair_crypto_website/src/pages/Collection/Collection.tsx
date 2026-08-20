import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks';
import { COLLECTION_PAGE, SEO } from '../../constants/content';
import { ROUTES } from '../../constants/routes';
import { COLLECTION_SIZE, WALL_ART } from '../../constants/collection';
import {
  APPENDIX_B,
  DIRECTORY,
  EXECUTIVES,
  FIRM_LORE,
  type Clause,
  type Executive,
} from '../../constants/firm';
import { formatNumber } from '../../utils';
import './Collection.css';

/*
 * The collection page. Three movements, and the order is the argument:
 *
 *   1. The wall     — art in motion the moment the page opens, no reading required.
 *   2. The dossier  — the lore, staged as a part-redacted internal document.
 *   3. The roster   — five executives, each a portrait beside a personnel record.
 *   4. The directory— the firm itself, summarised in the same readout.
 *
 * A browsable vault grid used to sit where the dossier and roster are now. It
 * repeated five archetypes forty-eight times to fake a depth the art does not
 * have yet; the fiction is the better use of the space.
 *
 * The dossier reads and the records scan, so the two are set deliberately
 * differently — prose against a Bloomberg-terminal readout.
 */

const WALL_ROW_COUNT = 3;

/*
 * Deal the art round-robin across the rows: every render appears exactly once,
 * and neighbours within a row sit three apart in the pool — which widens the
 * gaps WALL_ART already leaves between near-identical builds.
 */
const WALL_ROWS: readonly (readonly string[])[] = Array.from(
  { length: WALL_ROW_COUNT },
  (_, row) => WALL_ART.filter((_image, i) => i % WALL_ROW_COUNT === row),
);

/* Seconds per lap. Staggered so the rows never lock into a visible beat. */
const ROW_DURATIONS = [64, 52, 76];

export default function Collection() {
  useDocumentTitle(SEO.collection.title);

  return (
    <main className="collection-page">
      <CollectionWall />
      <FirmDossier />
      <TeamRoster />
      <ExecutiveDirectory />

      <section className="section collection-outro">
        <div className="container">
          <Link to={`${ROUTES.ACTIVATE}#mint`} className="btn btn--primary btn--lg">
            {COLLECTION_PAGE.cta}
          </Link>
        </div>
      </section>

      <AppendixB />
    </main>
  );
}

/* ─── Appendix B ───────────────────────────────────────
   The second collection, teased by refusing to describe it. Sits after the CTA
   on purpose: it is a stinger, not an offer, and putting it last means it never
   competes with the thing the page is actually asking for.

   The plate shows the render plainly. It used to be a pair of tiny upscaled
   copies that sharpened on hover without resolving; that was removed at the
   user's request, so the withholding now rests entirely on the redacted fields
   beside it. */
function AppendixB() {
  return (
    <section className="appendix" aria-labelledby="appendix-heading">
      <div className="container">
        <article className="appendix__doc">
          <header className="appendix__head">
            <h2 id="appendix-heading" className="appendix__label">
              {APPENDIX_B.label}
            </h2>
            <p className="appendix__ref">{APPENDIX_B.docRef}</p>
            <p className="appendix__clearance">{APPENDIX_B.clearance}</p>
          </header>

          <div className="appendix__body">
            <figure className="appendix__plate">
              <img
                src={APPENDIX_B.image}
                alt={APPENDIX_B.imageAlt}
                className="appendix__img"
                width={1024}
                height={1024}
                loading="lazy"
                decoding="async"
              />
              <span className="appendix__scan" aria-hidden="true" />
              <figcaption className="appendix__plate-note">
                {APPENDIX_B.imageNote}
              </figcaption>
            </figure>

            <dl className="appendix__fields">
              {APPENDIX_B.fields.map((entry) => (
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
          </div>

          <p className="appendix__footer">{APPENDIX_B.footer}</p>
        </article>
      </div>
    </section>
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
              {[...row, ...row].map((image, i) => (
                <span className="collection-wall__tile" key={`${image}-${i}`}>
                  {/* Not lazy-loaded: the tiles start offscreen horizontally, so
                      lazy loading leaves gaps drifting into view. The wall art is
                      exported small (640px) precisely because it all arrives at
                      once — see WALL_ART. */}
                  <img src={image} alt="" className="collection-wall__img" decoding="async" />
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


/* ─── The dossier ──────────────────────────────────────
   The lore, filed as a controlled internal document: metadata header, numbered
   clauses, revision bar, footnotes, an approval block, and two notes somebody
   pencilled into the margin. The apparatus is the joke — a firm this shambolic
   keeping immaculate document control. */
function FirmDossier() {
  return (
    <section className="section firm" aria-labelledby="firm-heading">
      <div className="container">
        <article className="firm__doc">
          <p className="firm__stamp" aria-hidden="true">
            {FIRM_LORE.stamp}
          </p>

          <header className="firm__masthead">
            <h2 id="firm-heading" className="firm__title">
              {FIRM_LORE.title}
            </h2>
            <p className="firm__subtitle">{FIRM_LORE.subtitle}</p>
          </header>

          {/* The header form. A definition list, because that is what it is. */}
          <dl className="firm__meta">
            {FIRM_LORE.meta.map((entry) => (
              <div className="firm__meta-row" key={entry.label}>
                <dt className="firm__meta-label">{entry.label}</dt>
                <dd
                  className={`firm__meta-value ${
                    entry.value === '[REDACTED]' ? 'firm__meta-value--redacted' : ''
                  }`}
                >
                  {entry.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="firm__clauses">
            {FIRM_LORE.clauses.map((clause) => (
              <ClauseBlock key={clause.number} clause={clause} />
            ))}
          </div>

          <p className="firm__signoff">{FIRM_LORE.signOff}</p>

          <div className="firm__notes">
            <p className="firm__hint">{FIRM_LORE.redactionHint}</p>
            <ol className="firm__footnotes">
              {FIRM_LORE.footnotes.map((note) => (
                <li className="firm__footnote" key={note.marker}>
                  <span className="firm__footnote-marker">{note.marker}</span>
                  {note.text}
                </li>
              ))}
            </ol>
          </div>

          <div className="firm__approval">
            <div className="firm__approval-field">
              <p className="firm__approval-label">{FIRM_LORE.approval.label}</p>
              <p className="firm__signature">{FIRM_LORE.approval.signature}</p>
              <p className="firm__approval-role">{FIRM_LORE.approval.role}</p>
            </div>
            <div className="firm__approval-field">
              <p className="firm__approval-label">{FIRM_LORE.approval.dateLabel}</p>
              <p className="firm__approval-date">{FIRM_LORE.approval.date}</p>
            </div>
          </div>

          <p className="firm__footer">{FIRM_LORE.footer}</p>
        </article>
      </div>
    </section>
  );
}

/* One numbered clause. The margin carries whatever applies to it — a revision
   bar if this is what changed in REV 11, and any note pencilled beside it. */
function ClauseBlock({ clause }: { readonly clause: Clause }) {
  const annotation = FIRM_LORE.annotations.find(
    (note) => note.clause === clause.number,
  );

  return (
    <section
      className={`clause clause--${clause.variant} ${
        clause.revised ? 'clause--revised' : ''
      }`}
    >
      {clause.revised && (
        <span className="clause__revision" aria-hidden="true">
          {FIRM_LORE.revisionNote}
        </span>
      )}

      <h3 className="clause__head">
        <span className="clause__number">{clause.number}</span>
        <span className="clause__heading">{clause.heading}</span>
      </h3>

      <p className="clause__body">
        {clause.segments.map((segment, i) => {
          if (segment.kind === 'redaction') {
            return <Redaction key={i}>{segment.text}</Redaction>;
          }
          if (segment.kind === 'footnote') {
            return (
              <sup className="clause__footnote-marker" key={i}>
                {segment.marker}
              </sup>
            );
          }
          return <span key={i}>{segment.text}</span>;
        })}
      </p>

      {/* Decorative: a margin scrawl is somebody else's aside, and reading it
          aloud mid-clause would break the sentence it sits next to. */}
      {annotation && (
        <span className="clause__annotation" aria-hidden="true">
          {annotation.text}
        </span>
      )}
    </section>
  );
}

/* A blacked-out phrase that lifts on hover or focus. The text stays in the
   accessibility tree — this is a joke about the fiction, not real redaction, so
   hiding it from a screen reader would only remove the punchline. */
function Redaction({ children }: { readonly children: string }) {
  return (
    <span className="firm__redaction" tabIndex={0}>
      {children}
    </span>
  );
}

/* ─── The roster ───────────────────────────────────────
   Portrait beside personnel record, five times. The record is the detail view,
   so nothing here opens. */
function TeamRoster() {
  return (
    <section className="section roster" aria-labelledby="roster-heading">
      <div className="container">
        <div className="roster__head">
          <h2 id="roster-heading" className="heading-md">
            {COLLECTION_PAGE.rosterHeading}
          </h2>
          <p className="roster__note">{COLLECTION_PAGE.rosterNote}</p>
        </div>

        <ul className="roster__list">
          {EXECUTIVES.map((executive, i) => (
            <li key={executive.id}>
              <ExecutiveRecord
                executive={executive}
                position={i + 1}
                total={EXECUTIVES.length}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

interface ExecutiveRecordProps {
  readonly executive: Executive;
  readonly position: number;
  readonly total: number;
}

function ExecutiveRecord({ executive, position, total }: ExecutiveRecordProps) {
  const isAwarded = executive.status === 'EXECUTIVE_OF_THE_MONTH';
  const isUnpaid = executive.status === 'UNPAID';

  return (
    <article
      className={`record ${isAwarded ? 'record--awarded' : ''}`}
      aria-label={`Executive ${executive.id}, ${executive.position}`}
    >
      <div className="record__portrait">
        <img
          src={executive.image}
          alt={executive.portraitAlt}
          className="record__img"
          width={320}
          height={320}
          loading="lazy"
          decoding="async"
        />
        {isAwarded && (
          <p className="record__rosette" aria-hidden="true">
            <span className="record__rosette-top">EXECUTIVE</span>
            <span className="record__rosette-mid">OF THE</span>
            <span className="record__rosette-bot">MONTH</span>
          </p>
        )}
      </div>

      <div className="record__panel">
        {/* Reverse video, the way a terminal marks the field it is holding. */}
        <h3 className="record__id">
          EXECUTIVE #{executive.id}
          <span
            className={`record__led ${isUnpaid ? 'record__led--idle' : ''}`}
            aria-hidden="true"
          />
        </h3>

        <dl className="record__fields">
          <Field label="Department" value={executive.department} />
          <Field label="Position" value={executive.position} />
          <Field label="Tenure" value={`${formatNumber(executive.tenureDays)} days`} numeric />
          <Field
            label="Performance"
            value={executive.performance}
            tone={executive.performanceTone}
          />
          <Field
            label="$SPECIE Earned"
            value={formatNumber(executive.specieEarned)}
            numeric
            /* Zero is the intern's whole joke — muting it would bury it. */
            tone={isUnpaid ? 'bad' : undefined}
          />
          <Field
            label="Status"
            value={executive.statusLabel}
            tone={isAwarded ? 'good' : isUnpaid ? 'bad' : 'neutral'}
          />
        </dl>

        <p className="record__counter">
          {COLLECTION_PAGE.recordLabel} {position} OF {total}
        </p>
      </div>
    </article>
  );
}

/* One label/value row with a dotted leader running between them. The leader is
   a flex spacer rather than CSS-generated dots so it stays exactly one line and
   never wraps away from its value. */
interface FieldProps {
  readonly label: string;
  readonly value: string;
  /** Amber, per the palette rule: numbers are values. */
  readonly numeric?: boolean;
  readonly tone?: 'good' | 'bad' | 'neutral';
}

function Field({ label, value, numeric, tone }: FieldProps) {
  const valueClass = [
    'field__value',
    numeric ? 'field__value--numeric' : '',
    tone ? `field__value--${tone}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="field">
      <dt className="field__label">{label}</dt>
      <span className="field__leader" aria-hidden="true" />
      <dd className={valueClass}>{value}</dd>
    </div>
  );
}

/* ─── The directory ────────────────────────────────────
   The firm's own record, in the same readout as its staff. */
function ExecutiveDirectory() {
  return (
    <section className="section directory" aria-labelledby="directory-heading">
      <div className="container">
        <div className="directory__panel">
          <h2 id="directory-heading" className="directory__id">
            {DIRECTORY.heading}
            <span className="record__led" aria-hidden="true" />
          </h2>

          <dl className="directory__fields">
            {/* Headcount comes from the mint size rather than a literal, so the
                two can never drift apart. */}
            <Field
              label={DIRECTORY.totalLabel}
              value={formatNumber(COLLECTION_SIZE)}
              numeric
            />
            {DIRECTORY.fields.map((entry) => (
              <Field key={entry.label} label={entry.label} value={entry.value} />
            ))}
          </dl>

          <p className="directory__cursor" aria-hidden="true">
            <span className="directory__caret" />
          </p>
        </div>
      </div>
    </section>
  );
}
