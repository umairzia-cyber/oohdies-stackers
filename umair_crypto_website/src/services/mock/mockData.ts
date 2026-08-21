import type {
  CollectionItem,
  PlatformStats,
  StackInfo,
  ActivityRecord,
  TierInfo,
  StepInfo,
  FeatureInfo,
  StockItem,
} from '../../types';

/*
 * Everything an Executive can be pointed at, in the order the pickers show it:
 * the tokenized stocks and USDG first, then the crypto tokens.
 *
 * `category` is what the UI groups and counts on. The crypto entries are
 * teasers with no contract behind them yet — that fact is tracked properly by
 * TEASER_REWARD_ASSETS in constants/contracts.ts. Keep the ids here identical
 * to the ids there, because isTeaserAssetId() matches on them.
 */
export const MOCK_STOCKS: readonly StockItem[] = [
  { id: 'aapl', symbol: 'AAPLx', name: 'Apple', icon: '', category: 'stock' },
  { id: 'msft', symbol: 'MSFTx', name: 'Microsoft', icon: '⊞', category: 'stock' },
  { id: 'nvda', symbol: 'NVDAx', name: 'Nvidia', icon: '⚡', category: 'stock' },
  { id: 'amzn', symbol: 'AMZNx', name: 'Amazon', icon: 'a', category: 'stock' },
  { id: 'googl', symbol: 'GOOGLx', name: 'Alphabet', icon: 'G', category: 'stock' },
  { id: 'meta', symbol: 'METAx', name: 'Meta', icon: '∞', category: 'stock' },
  { id: 'tsla', symbol: 'TSLAx', name: 'Tesla', icon: 'T', category: 'stock' },
  { id: 'pltr', symbol: 'PLTRx', name: 'Palantir', icon: '👁', category: 'stock' },
  { id: 'amd', symbol: 'AMDx', name: 'AMD', icon: '❖', category: 'stock' },
  { id: 'gme', symbol: 'GMEx', name: 'GameStop', icon: 'GS', category: 'stock' },
  { id: 'spcx', symbol: 'SPCXx', name: 'SpaceX', icon: '🚀', category: 'stock' },
  { id: 'usdg', symbol: 'USDG', name: 'Stable dollar', icon: '$', category: 'stock' },
  { id: 'stonk', symbol: 'STONK', name: 'StonkBrokers', icon: '📈', category: 'crypto' },
  { id: 'specie', symbol: 'SPECIE', name: 'Monkey Business', icon: '🪙', category: 'crypto' },
  { id: 'doge', symbol: 'DOGE', name: 'Dogecoin', icon: '🐕', category: 'crypto' },
  { id: 'pepe', symbol: 'PEPE', name: 'Pepe', icon: '🐸', category: 'crypto' },
  { id: 'wif', symbol: 'WIF', name: 'dogwifhat', icon: '🧢', category: 'crypto' },
  { id: 'sui', symbol: 'SUI', name: 'Sui', icon: '💧', category: 'crypto' },
];

export const MOCK_COLLECTION: readonly CollectionItem[] = [
  {
    id: 'executive-001',
    name: 'Executive #001 — Street Cap',
    description: 'Ash-grey Executive in a backwards snapback and cat-eye shades. Says nothing, signs everything.',
    rarity: 'UNCOMMON',
    image: '/assets/collection/mb-street-cap.jpg',
    tier: 1,
    isActivated: true,
  },
  {
    id: 'executive-002',
    name: 'Executive #002 — Steel Jaw',
    description: 'Leopard-hide Executive running a hydraulic jaw brace under a captain’s cap. Bites down and does not let go.',
    rarity: 'RARE',
    image: '/assets/collection/mb-steel-jaw-captain.jpg',
    tier: 3,
    isActivated: true,
  },
  {
    id: 'executive-003',
    name: 'Executive #003 — Brain Dome',
    description: 'Exposed hyper-brain sealed under glass. Half-lidded, and entirely unimpressed.',
    rarity: 'EPIC',
    image: '/assets/collection/mb-brain-dome.jpg',
    tier: 4,
    isActivated: true,
  },
  {
    id: 'executive-004',
    name: 'Executive #004 — Dragon Skull',
    description: 'A wyrm skull helm over a red dress coat, with the rubble still hanging in the air.',
    rarity: 'LEGENDARY',
    image: '/assets/collection/mb-dragon-skull-officer.jpg',
    tier: 5,
    isActivated: true,
  },
  {
    id: 'executive-005',
    name: 'Executive #005 — Samurai Ronin',
    description: 'Gold-crested kabuto, red domino mask, and a plaster on one cheek. Still standing.',
    rarity: 'EPIC',
    image: '/assets/collection/mb-samurai-ronin.jpg',
    tier: 2,
    isActivated: false,
  },
  {
    id: 'executive-006',
    name: 'Executive #006 — Camo Special',
    description: 'Camo helm and brass goggles, working a drifting cloud of blue crystals.',
    rarity: 'UNCOMMON',
    image: '/assets/collection/mb-camo-crystals.jpg',
    tier: 1,
    isActivated: false,
  },
];

export const MOCK_STATS: PlatformStats = {
  totalBananas: 100000000,
  destroyed: 0,
  activeStacks: 0,
  collectionSize: 1111,
  paidToHolders: '$0.00',
  supplyAlive: 1111,
  nftsBurnedCount: 0,
  nftsBurnedPercent: '0%',
  supplyBurnedPercent: '0%',
  supplyBurnedTokens: '0 $SPECIE',
};

export const MOCK_STACK: StackInfo = {
  totalOwned: 0,
  activeStacks: 0,
  accumulatedBalance: '0.00',
  stackLevel: 0,
  items: [],
};

export const MOCK_ACTIVITY: readonly ActivityRecord[] = [];

export const MOCK_TIERS: readonly TierInfo[] = [
  { id: 'tier-1', name: 'ACTIVE', multiplier: '1x', burnCost: 25000 },
  { id: 'tier-2', name: 'TIER TWO', multiplier: '1.4x', burnCost: 75000 },
  { id: 'tier-3', name: 'TIER THREE', multiplier: '1.9x', burnCost: 150000 },
  { id: 'tier-4', name: 'TIER FOUR', multiplier: '2.5x', burnCost: 300000 },
  { id: 'tier-5', name: 'TOP TIER', multiplier: '3.5x', burnCost: 850000 },
];

export const MOCK_STEPS: readonly StepInfo[] = [
  {
    number: '01',
    title: 'ACQUIRE',
    description: 'Get an Executive digital collectible. Each has unique attributes and base accumulation stats.',
  },
  {
    number: '02',
    title: 'ACTIVATE',
    description: 'Burn 100 $SPECIE tokens to activate your Executive and pick 3 reward assets.',
  },
  {
    number: '03',
    title: 'EARN',
    description: 'Your Executive earns streaming rewards automatically. The assets live inside the NFT Token-Bound Account.',
  },
  {
    number: '04',
    title: 'TRADE / CLAIM',
    description: 'Claim your rewards to your wallet at any time or trade the loaded NFT on secondary markets.',
  },
];

export const MOCK_FEATURES: readonly FeatureInfo[] = [
  {
    title: 'BURNING CREATES VALUE',
    description:
      'Every activation burns 100 $SPECIE tokens permanently, reducing circulating supply while unlocking streaming rewards for your Executive.',
    stat: '0%',
    statLabel: 'INITIAL SUPPLY BURNED',
    image: '/assets/collection/mb-steel-jaw-captain.jpg',
  },
  {
    title: 'TOKEN BOUND ACCOUNT (TBA)',
    description:
      'The accumulated value is bound directly to your Executive NFT via ERC-6551. If you trade or transfer the NFT, the accumulated balance moves with it.',
    stat: '1,111',
    statLabel: 'TOTAL EXECUTIVES',
    image: '/assets/collection/mb-brain-dome.jpg',
  },
  {
    title: 'PARTNER MULTIPLIER',
    description:
      'Hold any verified partner NFT collection to automatically unlock a 1.2x boost on your reward streaming rate.',
    stat: '1.2x',
    statLabel: 'PARTNER BOOST',
    image: '/assets/collection/mb-dragon-skull-officer.jpg',
  },
];
