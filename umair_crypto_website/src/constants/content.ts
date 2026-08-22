export const BRAND = {
  name: 'MONKEY BUSINESS',
  nameFirst: 'MONKEY',
  nameSecond: 'BUSINESS',
  tagline: 'Earn Specie. Build Your Holdings.',
  description: 'A digital collectible ecosystem where burning $SPECIE creates value. Acquire Executives, activate them, and build your holdings in an experimental Web3 experience.',
  year: new Date().getFullYear(),
} as const;

export const HERO = {
  subtitle: '1111 DIGITAL COLLECTIBLES · READY TO EARN',
  headingLine1: 'EARN SPECIE.',
  headingLine2: 'BUILD YOUR HOLDINGS.',
  description: 'Acquire an Executive, activate it by burning tokens, and watch your holdings grow automatically. The asset lives inside the NFT — it travels with it if you sell. The cycle never stops.',
  primaryCta: 'Get an Executive',
  secondaryCta: 'Learn More',
} as const;

export const STATS_LABELS = {
  totalBananas: 'REMAINING SUPPLY',
  destroyed: '$SPECIE BURNED',
  activeStacks: 'ACTIVE HOLDINGS',
  collectionSize: 'COLLECTION SIZE',
} as const;

export const HOW_IT_WORKS = {
  heading: 'FOUR STEPS. THEN ACCUMULATION.',
  subheading: 'Set it up once. Your Executive works while you sleep.',
} as const;

export const FINAL_CTA = {
  heading: 'READY TO EARN?',
  buttonText: 'ACTIVATE EXECUTIVE',
} as const;

export const ACTIVATE_PAGE = {
  subtitle: 'WAKE YOUR EXECUTIVE',
  heading: 'ACTIVATE',
  description: 'Choose your tier, pick your stocks, split your earnings.',
} as const;

export const MY_HOLDINGS_PAGE = {
  subtitle: 'YOUR EXECUTIVES · YOUR HOLDINGS',
  heading: 'MY HOLDINGS',
  description: 'Everything you own and everything it makes you, on one page.',
  disconnectedMessage: 'Connect your wallet to view your Executive holdings.',
  emptyTitle: 'No Executives Yet',
  emptyMessage: 'Your holdings are empty. Activate your first Executive to start building.',
  emptyCta: 'ACTIVATE YOUR FIRST EXECUTIVE',
} as const;

export const DOCS_PAGE = {
  subtitle: 'EVERYTHING, PLAINLY',
  heading: 'DOCS',
} as const;

// The gallery. Copy stays thin on purpose — the art is the argument here, so
// every string below is a label rather than a paragraph.
export const COLLECTION_PAGE = {
  subtitle: 'THE COLLECTION',
  heading: 'MEET THE EXECUTIVES',
  description:
    'Hand-drawn, none repeated. Every Executive carries its own traits into your holdings — and the rarer the build, the harder it works.',
  wallLabel: 'STAFF ON PREMISES',
  rosterHeading: 'MEET THE TEAM',
  rosterNote: 'Five of the workforce, on the record.',
  recordLabel: 'RECORD',
  cta: 'START BUILDING',
} as const;

// Roadmap tease. Deliberately says nothing about the individual stops — the map
// does the teasing, and the copy only sets the mood.
export const TRAIL_PAGE = {
  subtitle: 'THE ROAD AHEAD · UNCHARTED',
  heading: 'INTO THE WILD',
  description:
    'Join us on the uncharted trail. Every clearing on this map is somewhere the troop is headed — the signposts stay blank until we get there.',
  mapCaption: 'No dates. No promises. Just the trail.',
  marker: 'YOU ARE HERE',
  cta: 'START BUILDING',
  mapAlt:
    'An illustrated map of the Monkey Business trail: a jungle clearing where troops of primates gather at scattered landmarks — a stone council table, a glowing wishing well, a rising chart on a plinth, a swirling portal, an armoured primate with a lit sword, crates of gear, and a market stall — all linked by winding dotted paths meeting at a blank wooden signpost.',
  expeditionsHeading: 'THE EXPEDITIONS',
  unchartedLabel: 'UNCHARTED TERRITORY',
  unchartedNote: 'Not plotted yet. The trail reveals itself as we walk it.',
  scoutCaption: 'The scout is already out there. Catch up.',
  /* Sits under the list. Without it a blocked-out line is just as likely to
     read as a font that failed to load as it is to read as withheld. */
  redactionNote: 'Blocked-out lines are decided, not announced.',
  scoutAlt:
    'A tiger-striped primate in a leopard-print bucket hat and khaki fieldwear, rifle in hand, walking a sunlit dirt path deep into dense jungle.',
} as const;

/**
 * An expedition body is a segment list rather than a string so a withheld
 * phrase can sit mid-sentence.
 *
 * A redaction carries a length, never the words it covers. That is the whole
 * point: there is no hidden string to lift with devtools, because the words
 * were never written here. `length` is roughly how many characters the missing
 * phrase would run to — it only sets the width of the bar.
 */
export type ExpeditionSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'redaction'; readonly length: number };

/*
 * To reveal the next expedition: set `charted: true` and write the copy.
 * Uncharted entries deliberately carry no title or segments — they fall back to
 * TRAIL_PAGE.unchartedLabel / unchartedNote, so adding one costs a single line.
 *
 * Charted does not mean finished. Expeditions two and three are announced but
 * not specified, so their copy runs at two different depths of withholding:
 * the second gives up its shape and keeps back a couple of nouns, the third
 * keeps back nearly everything and lets the codename and the last clause carry
 * it. To reveal more of either, replace a redaction segment with the text it
 * stood in for — there is nothing else to unlock.
 */
export const TRAIL_EXPEDITIONS = [
  {
    id: '01',
    ordinal: 'FIRST EXPEDITION',
    title: 'GENESIS MINT',
    segments: [
      {
        kind: 'text',
        text: 'A cracked stone gate swings open and spits 1,111 apes onto an uncharted map. A free mint, and the immutable base layer everything after it grows from. Every genesis ape carries its own sovereign vault — token-bound ERC-6551 — so tokenized stock and crypto yield land straight in the NFT’s pocket while the tickers blink.',
      },
    ],
    charted: true,
  },
  {
    id: '02',
    ordinal: 'SECOND EXPEDITION',
    title: 'SECONDARY INCUBATION',
    segments: [
      { kind: 'text', text: 'The ecosystem splits open to admit ' },
      { kind: 'redaction', length: 13 },
      { kind: 'text', text: '. Burn through your accumulated utility tokens to fuel the furnace, spark ' },
      { kind: 'redaction', length: 10 },
      { kind: 'text', text: ', and call a secondary expansion collection into the world.' },
    ],
    charted: true,
  },
  {
    id: '03',
    ordinal: 'THIRD EXPEDITION',
    title: 'PHYGITAL MATRIX',
    segments: [
      { kind: 'text', text: 'The boundary between screen and reality dissolves. ' },
      { kind: 'redaction', length: 14 },
      { kind: 'text', text: ', ' },
      { kind: 'redaction', length: 17 },
      { kind: 'text', text: ', ' },
      { kind: 'redaction', length: 11 },
      { kind: 'text', text: ' and ' },
      { kind: 'redaction', length: 15 },
      { kind: 'text', text: ' ' },
      { kind: 'redaction', length: 16 },
      { kind: 'text', text: '. All ' },
      { kind: 'redaction', length: 13 },
      { kind: 'text', text: ' routed back to ' },
      { kind: 'redaction', length: 16 },
      { kind: 'text', text: ' for holders.' },
    ],
    charted: true,
  },
  { id: '04', ordinal: 'FOURTH EXPEDITION', charted: false },
  { id: '05', ordinal: 'FIFTH EXPEDITION', charted: false },
] as const;

// TODO: replace with the real Monkey Business X profile URL.
export const X_URL = 'https://x.com';

// Rail socials. Only X is listed because it is the only account we have a URL
// for — add entries here as the real links arrive rather than shipping guesses.
// `icon` is an SVG path drawn in a 24x24 viewBox.
export const SOCIALS = [
  {
    label: 'X',
    href: X_URL,
    icon: 'M18.9 2h3.3l-7.2 8.3L23.5 22h-6.6l-5.2-6.8L5.7 22H2.4l7.7-8.9L1.9 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.4 3.9H5.4L17.7 20Z',
  },
] as const;

// Temporary pre-launch tease. Set `enabled: false` to reveal the real docs page.
export const DOCS_TEASE = {
  enabled: true,
  badge: 'MONKEY BUSINESS DOCS',
  badgeStatus: 'COMING SOON',
  heading: 'COMING SOON',
  signal: 'Signal scrambled · the manual is still being written',
  body: 'The full Monkey Business manual — cycles, multipliers, tier burns, stock splits, and wallet safety — is being finished right now. We would rather hand you the whole thing at once than half a page. Check back soon.',
  primaryCta: 'FOLLOW US ON X',
  xUrl: X_URL,
  timerNote: 'No release date has been announced — the counter is decorative.',
} as const;

/*
 * The homepage stinger, teasing the phygitals release — physical Executive
 * collectibles alongside the digital ones. Unannounced, so nothing below names
 * it: no "physical", no product, no date. The picture is shown; its meaning is
 * not.
 *
 * Laid out as the same kind of document as APPENDIX_B in constants/firm.ts —
 * head, plate, redacted field list, stamp — because both are the Firm's own
 * paperwork and the Firm only has one stationery cupboard. Same form, different
 * department, and deliberately *not* the same story: Appendix B teases the
 * second collection, this teases a release with no announced connection to it.
 * Keep the two apart in copy, or the shared form starts implying a shared
 * timeline that nobody has decided on.
 *
 * Three fields carry news and three are struck out, which is the same three-
 * for-three split Appendix B runs. The news is all oblique: "Not tokens" says
 * what this is not, "Fragile" is a fact about handling that only makes sense
 * for an object, and "Fabrication" is a department that does not make JPEGs.
 * None of them says the word.
 *
 * The artwork ships as a single-channel greyscale JPEG rather than a colour
 * file dimmed with `filter: grayscale()`. A CSS filter is reversible by anyone
 * with devtools; a file with no colour channel is not.
 */
export const CRATE_TEASE = {
  label: 'RECEIVING BAY',
  docRef: 'MB-LOG-014',
  clearance: 'Clearance: Denied',

  image: '/assets/rd/crate-sealed.jpg',
  imageNote: 'BAY CAMERA · FRAME PULLED',
  /* Describes only what the held-back plate actually shows, so the alt text
     gives away nothing the picture does not. If the plate is ever brightened,
     this has to be rewritten to match — or it starts describing things a
     sighted reader cannot make out. */
  imageAlt:
    'A dim greyscale photograph of a cluttered workshop. A figure sits on the floor between shelves of small models, an open carton beside them.',

  fields: [
    { label: 'Consignment', value: '[REDACTED]' },
    { label: 'Department', value: 'Fabrication' },
    { label: 'Contents', value: 'Not tokens' },
    { label: 'Handling', value: 'Fragile' },
    { label: 'Quantity', value: '[REDACTED]' },
    { label: 'Arrival', value: '[REDACTED]' },
  ],

  manifest: 'A crate left the workshop. It is not going to a wallet.',
  footer: 'NOT APPROVED FOR DISTRIBUTION · DO NOT LOG THIS ARRIVAL',
} as const;

/*
 * The partner-collection alliance band on the home page.
 *
 * Every number here is read off the contracts rather than agreed in a call, so
 * check them against the chain before editing:
 *   - EarningEngine.getWeight() returns collectionQMultiplierBps for any
 *     Executive whose *current owner* holds a balance of the partner
 *     collection, and BASE_WEIGHT otherwise. Deployed at 20,000 vs 10,000 bps
 *     — hence 2.0x.
 *   - The weight is added to activeWeightForAsset once per chosen asset, so it
 *     applies to all of ActivationController.requiredPicks (3), not one.
 *   - getWeight() only checks balanceOf > 0, so a second NFT does nothing.
 *
 * ONE COLLECTION IS LIVE, FOUR ARE LISTED. getWeight() reads a single address —
 * CONTRACT_ADDRESSES.COLLECTION_Q, which is StonkBrokers. The other three in
 * `partners` below are shown ahead of the contract work that would recognise
 * them, the same way TEASER_REWARD_ASSETS front-runs its tokens.
 *
 * The band presents all four as equals on purpose, so `onChain` is bookkeeping
 * for us and is deliberately NOT rendered: no badge, no ordering, no wording
 * singles one out. Order below is by collection size. Flip the flag when the
 * engine actually checks that address.
 *
 * The claim is a *share* claim, not an absolute one: a boosted Executive takes
 * twice the slice of a stream that an unboosted one takes. Do not restate it as
 * "double your rewards" — that is a different and untrue statement.
 */
export const ALLIANCE = {
  mark: 'PARTNER COLLECTIONS × MONKEY BUSINESS',
  ref: 'FOUR COLLECTIONS · ROBINHOOD CHAIN',
  headingLine1: 'HOLD ONE OF THESE.',
  headingLine2: 'EVERY EXECUTIVE GETS A 1.2X BOOST.',
  tagline: 'THE ALLIANCE · READ STRAIGHT OFF YOUR WALLET',
  body:
    'Every partner NFT is a wallet with something sealed inside it. So is every Executive. Before the engine settles a stream it looks at the holder’s wallet — find one of these there, and that Executive is counted at 1.2x weight against every stream it picked: a +20% boost over an Executive without one.',
  /*
   * The recognised collections. `supply` is each collection's own mint size, not
   * anything of ours. `onChain` is the honest bit: only the entry with it set is
   * actually read by EarningEngine.getWeight() today — see the note above.
   */
  partners: [
    { key: 'bayc', glyph: '🐵', name: 'Bored Ape YC', supply: '10,000', onChain: false },
    { key: 'punks', glyph: '👾', name: 'CryptoPunks', supply: '10,000', onChain: false },
    { key: 'pudgy', glyph: '🐧', name: 'Pudgy Penguins', supply: '8,888', onChain: false },
    { key: 'stonkbrokers', glyph: '📈', name: 'StonkBrokers', supply: '4,444', onChain: true },
  ],
  perks: [
    { value: '1.2x', label: 'weight on every activated Executive in that wallet' },
    { value: '1', label: 'partner NFT is enough — a tenth one changes nothing' },
    { value: '3 / 3', label: 'picks carry it, not just the first' },
    { value: '0', label: 'to stake, lock, or sign up for' },
  ],
  note:
    'Nothing is retroactive. The boost starts the moment the NFT lands and stops when it leaves — and whatever was earned at 1.2x before that stays banked in the Executive’s own wallet either way.',
  cta: 'GET A PARTNER NFT',
  href: 'https://opensea.io',
  strip: 'HOLD ONE PARTNER NFT · EVERY ACTIVATED EXECUTIVE EARNS AT 1.2x',
  imageAlt:
    'A pixel-art ape in a pinstriped suit working a laptop beside a blocky suited broker wearing a headset, standing in front of a rising green and gold candlestick chart with Bitcoin and Ethereum coins tumbling around them.',
} as const;

/*
 * The distribution band on the homepage. The Firm's joke is that it is a
 * company, so the one place the site makes a financial promise is filed as a
 * numbered clause rather than a marketing banner.
 *
 * `fine` is not decoration. The Stage 7 package still lists the fee model and
 * the acquisition route as open decisions (D-04, D-05), so the heading states
 * the intent and the fine print says plainly that the parameters are not
 * settled. `strip` is the opposite — every clause in it is something the
 * contracts enforce today: RewardVault has no admin withdrawal path, accrued
 * rewards never expire, and a claim is paid straight into the Executive's own
 * token-bound account.
 *
 * `steps` is the real pipeline out of the Stage 7 specs, cut to four nodes.
 * Adding a fifth means retuning the connector inset in Home.css — it is a
 * percentage sized for four columns.
 */
export const PROFIT_LOOP = {
  mark: 'CLAUSE 7.0 · DISTRIBUTION',
  ref: 'MB-FIN-007',
  value: '100%',
  valueLabel: 'OF ALL FIRM\nPROFITS',
  heading: 'EVERY DOLLAR MONKEY BUSINESS MAKES COMES BACK TO HOLDERS',
  subheading: "Your earnings aren't just tied to volume.",
  body:
    'Most projects pay holders a cut of trading volume and stop there. Monkey Business goes further: profit from every venture the Firm launches — not just this collection or token — is routed to the treasury and paid out to holders. Your earnings scale with the whole business, not just the chart.',
  steps: [
    { ordinal: '01', label: 'ALL REVENUE', caption: 'Every Firm venture, pooled' },
    { ordinal: '02', label: 'TREASURY', caption: 'Multisig custody, timelocked' },
    { ordinal: '03', label: 'ASSETS BOUGHT', caption: 'Converted into reward assets' },
    { ordinal: '04', label: 'HOLDER EARNINGS', caption: 'Distributed pro-rata, on-chain' },
  ],
  strip: 'NON-WITHDRAWABLE BY FIRM   ·   NEVER EXPIRES   ·   PAID ON-CHAIN',
} as const;

export const WALLET = {
  connectButton: 'Connect Wallet',
  disconnectButton: 'Disconnect',
  connecting: 'Connecting...',
  notConnected: 'not connected',
} as const;

export const SEO = {
  home: {
    title: 'Monkey Business — Earn Specie. Build Your Holdings.',
    description: 'A digital collectible ecosystem where burning $SPECIE creates value. Acquire and activate Executives, and build your holdings.',
  },
  collection: {
    title: 'The Collection — Monkey Business',
    description: 'Meet The Firm. The lore behind Monkey Business, and five of the 1,111 Executives on the record.',
  },
  activate: {
    title: 'Activate — Monkey Business',
    description: 'Activate your Executive by choosing a tier and burning tokens. Start accumulating today.',
  },
  myHoldings: {
    title: 'My Holdings — Monkey Business',
    description: 'View your Executive collection, tier, and accumulated balance.',
  },
  theTrail: {
    title: 'The Trail — Monkey Business',
    description: 'The road ahead, uncharted. A look at where the Monkey Business troop is headed next.',
  },
  docs: {
    title: 'Docs — Monkey Business',
    description: 'Complete documentation for Monkey Business — how it works, activation, holdings, wallet safety, and FAQ.',
  },
} as const;
