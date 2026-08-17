export const BRAND = {
  name: 'OOHDIE',
  nameFirst: 'OOHDIE',
  nameSecond: 'STACKERS',
  tagline: 'Eat Bananas. Build Your Stack.',
  description: 'A digital collectible ecosystem where eating bananas creates value. Acquire, activate, and stack Oohdies in an experimental Web3 experience.',
  year: new Date().getFullYear(),
} as const;

export const HERO = {
  subtitle: '1111 DIGITAL COLLECTIBLES · READY TO EAT',
  headingLine1: 'EAT BANANAS.',
  headingLine2: 'BUILD YOUR STACK.',
  description: 'Acquire an Oohdie, activate it by burning tokens, and watch your stack grow automatically. The asset lives inside the NFT — it travels with it if you sell. The cycle never stops.',
  primaryCta: 'Get an Oohdie',
  secondaryCta: 'Learn More',
} as const;

export const STATS_LABELS = {
  totalBananas: 'TOTAL BANANAS',
  destroyed: 'BANANAS EATEN',
  activeStacks: 'ACTIVE STACKS',
  collectionSize: 'COLLECTION SIZE',
} as const;

export const HOW_IT_WORKS = {
  heading: 'FOUR STEPS. THEN ACCUMULATION.',
  subheading: 'Set it up once. Your Oohdie works while you sleep.',
} as const;

export const FINAL_CTA = {
  heading: 'READY TO EAT?',
  buttonText: 'ACTIVATE OOHDIE',
} as const;

export const ACTIVATE_PAGE = {
  subtitle: 'WAKE YOUR OOHDIE',
  heading: 'ACTIVATE',
  description: 'Choose your tier, pick your stocks, split your earnings.',
} as const;

export const MY_STACK_PAGE = {
  subtitle: 'YOUR OOHDIES · YOUR STACK',
  heading: 'MY STACK',
  description: 'Everything you own and everything it makes you, on one page.',
  disconnectedMessage: 'Connect your wallet to view your Oohdie stack.',
  emptyTitle: 'No Oohdies Yet',
  emptyMessage: 'Your stack is empty. Activate your first Oohdie to start building.',
  emptyCta: 'ACTIVATE YOUR FIRST OOHDIE',
} as const;

export const DOCS_PAGE = {
  subtitle: 'EVERYTHING, PLAINLY',
  heading: 'DOCS',
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
  cta: 'START STACKING',
  mapAlt:
    'An illustrated map of the Oohdie trail: a jungle clearing where troops of Oohdies gather at scattered landmarks — a stone council table, a glowing wishing well, a rising chart on a plinth, a swirling portal, an armoured Oohdie with a lit sword, crates of gear, and a market stall — all linked by winding dotted paths meeting at a blank wooden signpost.',
  stopsHeading: 'THE STOPS',
  unchartedLabel: 'UNCHARTED TERRITORY',
  unchartedNote: 'Not plotted yet. The trail reveals itself as we walk it.',
} as const;

/*
 * ⚠️ PLACEHOLDER COPY — every `body` below is filler and must be rewritten
 * before this ships. Nothing here is a commitment.
 *
 * To reveal the next stop: change its `charted` to true and write real copy.
 * Uncharted entries intentionally carry no title or body — they render as
 * locked rows, so adding one costs a single line.
 */
export const TRAIL_STOPS = [
  {
    id: '01',
    title: 'Placeholder — First Stop',
    body: 'Filler text for the opening leg of the trail. Two or three lines is the right length here: enough to say what lands and roughly when, without committing to a date. Replace before launch.',
    charted: true,
  },
  {
    id: '02',
    title: 'Placeholder — Second Stop',
    body: 'More filler text. This stop follows on from the first and hints at what it unlocks. Keep the voice the same as the rest of the site — plain, short sentences, no roadmap jargon. Replace before launch.',
    charted: true,
  },
  { id: '03', charted: false },
  { id: '04', charted: false },
  { id: '05', charted: false },
] as const;

// TODO: replace with the real Oohdie X profile URL.
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
  badge: 'OOHDIE DOCS',
  badgeStatus: 'COMING SOON',
  heading: 'COMING SOON',
  signal: 'Signal scrambled · the manual is still being written',
  body: 'The full Oohdie manual — cycles, multipliers, tier burns, stock splits, and wallet safety — is being finished right now. We would rather hand you the whole thing at once than half a page. Check back soon.',
  primaryCta: 'FOLLOW US ON X',
  xUrl: X_URL,
  timerNote: 'No release date has been announced — the counter is decorative.',
} as const;

export const WALLET = {
  connectButton: 'Connect Wallet',
  disconnectButton: 'Disconnect',
  connecting: 'Connecting...',
  notConnected: 'not connected',
} as const;

export const SEO = {
  home: {
    title: 'Oohdie — Eat Bananas. Build Your Stack.',
    description: 'A digital collectible ecosystem where eating bananas creates value. Acquire, activate, and stack Oohdies.',
  },
  activate: {
    title: 'Activate — Oohdie',
    description: 'Activate your Oohdie by choosing a tier and burning tokens. Start accumulating today.',
  },
  myStack: {
    title: 'My Stack — Oohdie',
    description: 'View your Oohdie collection, stack level, and accumulated balance.',
  },
  theTrail: {
    title: 'The Trail — Oohdie',
    description: 'The road ahead, uncharted. A look at where the Oohdie troop is headed next.',
  },
  docs: {
    title: 'Docs — Oohdie',
    description: 'Complete documentation for Oohdie — how it works, activation, stacking, wallet safety, and FAQ.',
  },
} as const;
