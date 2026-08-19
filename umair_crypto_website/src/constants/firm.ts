/**
 * The Firm — lore and personnel records for /collection.
 *
 * The collection's story is that Monkey Business is a company and every piece
 * is an Associate. This file holds that fiction as data: the lore beats, the
 * five staff on the roster, and the directory summary.
 *
 * Art paths point straight at /public/assets/collection. These five are picked
 * for the role rather than generated, so the roster is a cast, not a sample —
 * swapping a face means swapping the profile that goes with it.
 */

/*
 * The dossier — the lore, filed as a controlled internal document.
 *
 * Every beat of the original lore is here, but re-cut into numbered clauses so
 * the page can render the apparatus a real internal doc carries: a metadata
 * header, a revision bar, footnotes, margin annotations somebody added by hand,
 * and an approval block. The apparatus is the joke — a firm this shambolic
 * keeping immaculate document control.
 */

/**
 * Clause bodies are segment lists rather than plain strings so a redaction or a
 * footnote marker can sit mid-sentence. A clause with nothing special in it is
 * simply one text segment.
 */
export type ClauseSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'redaction'; readonly text: string }
  | { readonly kind: 'footnote'; readonly marker: string };

/** `lead` sets the opening statement large; `policy` is the highlighted rule. */
export type ClauseVariant = 'lead' | 'policy' | 'body';

export interface Clause {
  readonly number: string;
  readonly heading: string;
  readonly variant: ClauseVariant;
  readonly segments: readonly ClauseSegment[];
  /** Draws the margin revision bar — real doc control marks what changed. */
  readonly revised?: boolean;
}

export const FIRM_LORE = {
  title: 'THE FIRM',
  subtitle: 'Onboarding brief — issued to all new Associates',
  stamp: 'CLASSIFIED',

  /* The header form. `[REDACTED]` is written out rather than flagged: these are
     printed values, not the liftable blackouts inside the clauses. */
  meta: [
    { label: 'Document Ref', value: 'MB-HR-001' },
    { label: 'Classification', value: 'Internal — do not distribute' },
    { label: 'Issued', value: '[REDACTED]' },
    { label: 'Revision', value: '11 — supersedes all prior' },
    { label: 'Author', value: '[REDACTED]' },
    { label: 'Distribution', value: 'All Associates' },
  ],

  clauses: [
    {
      number: '1.0',
      heading: 'Purpose',
      variant: 'lead',
      segments: [
        { kind: 'text', text: "Monkey Business isn't just a collection. It's a Firm." },
      ],
    },
    {
      number: '2.0',
      heading: 'Background',
      variant: 'body',
      segments: [
        { kind: 'text', text: 'Nobody remembers ' },
        { kind: 'redaction', text: 'who founded it' },
        { kind: 'text', text: ', ' },
        { kind: 'redaction', text: 'what it trades' },
        { kind: 'text', text: ', or how any of its Associates passed the interview.' },
        { kind: 'footnote', marker: '1' },
        { kind: 'text', text: ' What is known is that business is booming.' },
        { kind: 'footnote', marker: '2' },
      ],
    },
    {
      number: '3.0',
      heading: 'Workforce',
      variant: 'body',
      segments: [
        {
          kind: 'text',
          text: 'The Firm is staffed by an eclectic workforce of ambitious primates, each with their own style, status and questionable approach to business. From fresh-faced interns to self-appointed executives, no two Associates are quite alike.',
        },
      ],
    },
    {
      number: '4.0',
      heading: 'Policy',
      variant: 'policy',
      revised: true,
      segments: [
        { kind: 'text', text: 'Qualifications are optional. Ambition is mandatory.' },
      ],
    },
    {
      number: '5.0',
      heading: 'Conduct',
      variant: 'body',
      segments: [
        {
          kind: 'text',
          text: 'They speculate. They accumulate. They climb the corporate ladder — and occasionally the furniture.',
        },
      ],
    },
    {
      number: '6.0',
      heading: 'Closing',
      variant: 'body',
      segments: [{ kind: 'text', text: 'Together, they are Monkey Business.' }],
    },
  ] as readonly Clause[],

  signOff: 'Welcome to The Firm.',

  footnotes: [
    { marker: '1', text: 'Records unavailable.' },
    { marker: '2', text: 'Unaudited.' },
  ],

  /*
   * Pencilled into the margin by somebody who read this before you did. Each
   * one is anchored to the clause number it sits beside.
   */
  annotations: [
    { clause: '2.0', text: 'who wrote this?' },
    { clause: '4.0', text: 'legal has not seen this' },
  ],

  approval: {
    label: 'Approved by',
    signature: 'M. Business',
    role: 'Office of the Chairman',
    dateLabel: 'Date',
    date: '[REDACTED]',
  },

  revisionNote: 'REV 11',
  redactionHint: 'Hover a redaction to lift it.',
  footer: 'PAGE 1 OF 1 · UNCONTROLLED WHEN PRINTED · MONKEY BUSINESS INTERNAL',
} as const;

/**
 * How a performance review should read on screen. The palette rule in
 * styles/index.css reserves lime for affordances and amber for values, so a
 * review — which is neither — gets its own third track: green for good, red for
 * bad, plain secondary text for everything ambiguous.
 */
export type ReviewTone = 'good' | 'bad' | 'neutral';

/** Employment state. Drives the LED and the colour of the Status row. */
export type EmploymentStatus = 'EMPLOYED' | 'UNPAID' | 'ASSOCIATE_OF_THE_MONTH';

export interface Associate {
  readonly id: string;
  readonly image: string;
  /** Alt text — the art is the portrait on a personnel file, not decoration. */
  readonly portraitAlt: string;
  readonly department: string;
  readonly position: string;
  readonly tenureDays: number;
  readonly performance: string;
  readonly performanceTone: ReviewTone;
  readonly specieEarned: number;
  readonly status: EmploymentStatus;
  readonly statusLabel: string;
}

export const ASSOCIATES: readonly Associate[] = [
  {
    id: '0001',
    image: '/assets/collection/oohdie-crowned-admiral.jpg',
    portraitAlt:
      'A crowned primate in black-and-gold admiral regalia, smoking a pipe.',
    department: 'Executive',
    position: 'Self-Appointed CEO',
    tenureDays: 1111,
    performance: 'Unimpeachable (self-assessed)',
    performanceTone: 'neutral',
    specieEarned: 412900,
    status: 'ASSOCIATE_OF_THE_MONTH',
    statusLabel: 'Associate of the Month',
  },
  {
    id: '0447',
    image: '/assets/collection/oohdie-brain-dome-respirator.jpg',
    portraitAlt:
      'A primate with an exposed brain under a glass dome, wearing a black respirator and a tie.',
    department: 'Quantitative Research',
    position: 'Senior Analyst',
    tenureDays: 892,
    performance: 'Exceeds Expectations',
    performanceTone: 'good',
    specieEarned: 96340,
    status: 'EMPLOYED',
    statusLabel: 'Employed',
  },
  {
    id: '2841',
    image: '/assets/collection/oohdie-pirate-tricorn.jpg',
    portraitAlt:
      'A primate in a skull-badged pirate tricorn and domino mask, eating a banana.',
    department: 'Trading',
    position: 'Trader',
    tenureDays: 427,
    performance: 'Questionable',
    performanceTone: 'bad',
    specieEarned: 8420,
    status: 'EMPLOYED',
    statusLabel: 'Employed',
  },
  {
    id: '0912',
    image: '/assets/collection/oohdie-tiger-captain.jpg',
    portraitAlt:
      'A tiger-striped primate in a naval captain’s cap and a leather flight jacket.',
    department: 'Compliance',
    position: 'Head of Compliance',
    tenureDays: 1004,
    performance: 'Asleep',
    performanceTone: 'bad',
    specieEarned: 61150,
    status: 'EMPLOYED',
    statusLabel: 'Employed',
  },
  {
    id: '5309',
    image: '/assets/collection/oohdie-goggle-lollipop.jpg',
    portraitAlt:
      'A young primate in a leopard bucket hat and brass goggles, sucking a lollipop.',
    department: 'Mailroom',
    position: 'Unpaid Intern',
    tenureDays: 12,
    performance: 'Promising',
    performanceTone: 'good',
    specieEarned: 0,
    status: 'UNPAID',
    statusLabel: 'Unpaid',
  },
];

/**
 * The directory summary. `Total Associates` is deliberately absent — the page
 * renders it from COLLECTION_SIZE so the headcount tracks the mint size rather
 * than drifting from it here.
 */
export const DIRECTORY = {
  heading: 'ASSOCIATE DIRECTORY',
  totalLabel: 'Total Associates',
  fields: [
    { label: 'Employer', value: 'Monkey Business' },
    { label: 'Industry', value: 'Classified' },
    { label: 'Headquarters', value: 'Undisclosed' },
    { label: 'Compensation', value: '$SPECIE' },
    { label: 'Dress Code', value: 'Loosely enforced' },
    { label: 'Qualifications', value: 'Unverified' },
    { label: 'Conduct', value: 'Under review' },
  ],
} as const;

/**
 * Appendix B — the tease for the second collection.
 *
 * Deliberately withholds almost everything. The page above it is an internal
 * document, so the most natural way to hint at unannounced work is a file the
 * reader has no clearance for: every field redacted except the two that carry
 * the actual news — that it is not monkeys, and that it is incubating.
 *
 * This follows how the tease has been done before. Doodles shipped the
 * Dooplicator with no explanation and let it sit unexplained for months, and
 * RTFKT's Project Animus opened on an egg nursery inside a research facility
 * without naming what hatches. The object is shown; its meaning is not.
 *
 * The artwork used to be served deliberately tiny and upscaled with nearest-
 * neighbour so it degraded into blocks. That was removed at the user's
 * request: the plate now shows the render at full resolution, and the
 * withholding is carried entirely by the copy below — every field redacted
 * except the two that carry the actual news.
 */
export const APPENDIX_B = {
  label: 'APPENDIX B',
  docRef: 'MB-RD-002',
  clearance: 'Clearance: Denied',

  image: '/assets/rd/appendix-b.jpg',
  imageNote: 'SOURCE WITHHELD',
  imageAlt:
    'A horned, fur-legged figure with glowing red eyes sits in a lava-lit cavern beside a machine, watching a conveyor carry a chain of glowing pixel-art eggs past holographic readouts.',

  fields: [
    { label: 'Project', value: '[REDACTED]' },
    { label: 'Department', value: 'Research & Development' },
    { label: 'Species', value: 'Not monkeys' },
    { label: 'Status', value: 'Incubating' },
    { label: 'Supply', value: '[REDACTED]' },
    { label: 'Reveal', value: '[REDACTED]' },
  ],

  footer: 'NOT APPROVED FOR DISTRIBUTION · YOU HAVE NOT SEEN THIS',
} as const;
