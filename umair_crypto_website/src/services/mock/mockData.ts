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
  totalBananas: 1000000,
  destroyed: 432850,
  activeStacks: 683,
  collectionSize: 1111,
  paidToHolders: '$32,818',
  supplyAlive: 428,
  nftsBurnedCount: 0,
  nftsBurnedPercent: '0%',
  supplyBurnedPercent: '14.08%',
  supplyBurnedTokens: '140,800,000 $SPECIE',
};

export const MOCK_STACK: StackInfo = {
  totalOwned: 3,
  activeStacks: 2,
  accumulatedBalance: '12,450.00',
  stackLevel: 4,
  items: [
    {
      id: 'executive-004',
      name: 'Executive #004 — Dragon Skull',
      description: 'A wyrm skull helm over a red dress coat, rubble still hanging in the air.',
      rarity: 'LEGENDARY',
      image: '/assets/collection/mb-dragon-skull-officer.jpg',
      tier: 5,
      isActivated: true,
    },
    {
      id: 'executive-002',
      name: 'Executive #002 — Steel Jaw',
      description: 'A hydraulic jaw brace under a naval captain’s cap.',
      rarity: 'RARE',
      image: '/assets/collection/mb-steel-jaw-captain.jpg',
      tier: 3,
      isActivated: true,
    },
    {
      id: 'executive-001',
      name: 'Executive #001 — Street Cap',
      description: 'A backwards snapback, cat-eye shades, and a stitched-shut mouth.',
      rarity: 'UNCOMMON',
      image: '/assets/collection/mb-street-cap.jpg',
      tier: 1,
      isActivated: false,
    },
  ],
};

export const MOCK_ACTIVITY: readonly ActivityRecord[] = [
  {
    id: 'act-001',
    type: 'upgrade',
    description: 'Executive #004 upgraded to Tier 5 (3.5x)',
    timestamp: '12 minutes ago',
    amount: '850,000 $SPECIE burned',
  },
  {
    id: 'act-002',
    type: 'accumulation',
    description: 'Cycle #1,428 accumulation distributed',
    timestamp: '1 hour ago',
    amount: '+$420.50 accumulated',
  },
  {
    id: 'act-003',
    type: 'activation',
    description: 'Executive #002 activated at Tier 3 (1.9x)',
    timestamp: '3 hours ago',
    amount: '150,000 $SPECIE burned',
  },
  {
    id: 'act-004',
    type: 'transfer',
    description: 'Acquired Executive #001 from primary mint',
    timestamp: '1 day ago',
  },
];

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
    description: 'Burn $SPECIE tokens to activate your Executive. Select your tier to set your multiplier.',
  },
  {
    number: '03',
    title: 'HOLD',
    description: 'Your Executive accumulates automatically every cycle. The asset lives inside the NFT.',
  },
  {
    number: '04',
    title: 'UPGRADE',
    description: 'Burn more tokens to increase your tier and boost your cycle multiplier up to 3.5x.',
  },
];

export const MOCK_FEATURES: readonly FeatureInfo[] = [
  {
    title: 'BURNING CREATES VALUE',
    description:
      'Every activation burns $SPECIE tokens permanently, reducing total supply while increasing your Executive’s accumulation rate. Burning and accumulation in perfect harmony.',
    stat: '43%',
    statLabel: 'OF TOTAL SUPPLY BURNED',
    image: '/assets/collection/mb-steel-jaw-captain.jpg',
  },
  {
    title: 'ON-CHAIN ACCUMULATION',
    description:
      'The accumulated value is bound directly to your Executive NFT. If you trade or transfer the NFT, the accumulated balance moves with it.',
    stat: '683',
    statLabel: 'ACTIVE EXECUTIVES',
    image: '/assets/collection/mb-brain-dome.jpg',
  },
  {
    title: 'TIERED MULTIPLIERS',
    description:
      'Choose from 5 activation tiers. Upgrade at any time by burning additional tokens. Top-tier Executives enjoy a massive 3.5x cycle multiplier.',
    stat: '3.5x',
    statLabel: 'MAXIMUM MULTIPLIER',
    image: '/assets/collection/mb-dragon-skull-officer.jpg',
  },
];
