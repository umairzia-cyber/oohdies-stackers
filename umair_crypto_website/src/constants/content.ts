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
  docs: {
    title: 'Docs — Oohdie',
    description: 'Complete documentation for Oohdie — how it works, activation, stacking, wallet safety, and FAQ.',
  },
} as const;
