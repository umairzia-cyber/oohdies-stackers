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

export const MOCK_STOCKS: readonly StockItem[] = [
  { id: 'aapl', symbol: 'AAPLx', name: 'Apple', icon: '' },
  { id: 'msft', symbol: 'MSFTx', name: 'Microsoft', icon: '⊞' },
  { id: 'nvda', symbol: 'NVDAx', name: 'Nvidia', icon: '⚡' },
  { id: 'amzn', symbol: 'AMZNx', name: 'Amazon', icon: 'a' },
  { id: 'googl', symbol: 'GOOGLx', name: 'Alphabet', icon: 'G' },
  { id: 'meta', symbol: 'METAx', name: 'Meta', icon: '∞' },
  { id: 'tsla', symbol: 'TSLAx', name: 'Tesla', icon: 'T' },
  { id: 'pltr', symbol: 'PLTRx', name: 'Palantir', icon: '👁' },
  { id: 'amd', symbol: 'AMDx', name: 'AMD', icon: '❖' },
  { id: 'gme', symbol: 'GMEx', name: 'GameStop', icon: 'GS' },
  { id: 'spcx', symbol: 'SPCXx', name: 'SpaceX', icon: '🚀' },
  { id: 'usdg', symbol: 'USDG', name: 'Stable dollar', icon: '$' },
];

export const MOCK_COLLECTION: readonly CollectionItem[] = [
  {
    id: 'oohdie-001',
    name: 'Oohdie #001 — Camo Tiger',
    description: 'Tiger-striped Oohdie in a leopard camo bucket hat. Keeps a low profile while stacking.',
    rarity: 'UNCOMMON',
    image: '/assets/collection/user_art_1.jpg',
    tier: 1,
    isActivated: true,
  },
  {
    id: 'oohdie-002',
    name: 'Oohdie #002 — Cyber Cowboy',
    description: 'Bionic red-eye sight under a classic leather cowboy hat. Never misses a target.',
    rarity: 'RARE',
    image: '/assets/collection/user_art_2.jpg',
    tier: 3,
    isActivated: true,
  },
  {
    id: 'oohdie-003',
    name: 'Oohdie #003 — Brain Dome',
    description: 'Exposed hyper-brain preserved in a glass dome. Pure tactical calculation.',
    rarity: 'EPIC',
    image: '/assets/collection/user_art_3.jpg',
    tier: 4,
    isActivated: true,
  },
  {
    id: 'oohdie-004',
    name: 'Oohdie #004 — Dragon Skull',
    description: 'Crowned with an ancient dragon skull helmet over cracked stone skin.',
    rarity: 'LEGENDARY',
    image: '/assets/collection/user_art_4.jpg',
    tier: 5,
    isActivated: true,
  },
  {
    id: 'oohdie-005',
    name: 'Oohdie #005 — Samurai Ronin',
    description: 'Honor-bound armored warrior equipped with a targeted scouter eyepiece.',
    rarity: 'EPIC',
    image: '/assets/collection/user_art_5.jpg',
    tier: 2,
    isActivated: false,
  },
  {
    id: 'oohdie-006',
    name: 'Oohdie #006 — Camo Special',
    description: 'Battle-tested tiger unit outfitted for high-yield banana stacking.',
    rarity: 'UNCOMMON',
    image: '/assets/collection/user_art_1.jpg',
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
  supplyBurnedTokens: '140,800,000 $BANANA',
};

export const MOCK_STACK: StackInfo = {
  totalOwned: 3,
  activeStacks: 2,
  accumulatedBalance: '12,450.00',
  stackLevel: 4,
  items: [
    {
      id: 'oohdie-004',
      name: 'Oohdie #004 — Dragon Skull',
      description: 'Crowned with an ancient dragon skull helmet over cracked stone skin.',
      rarity: 'LEGENDARY',
      image: '/assets/collection/user_art_4.jpg',
      tier: 5,
      isActivated: true,
    },
    {
      id: 'oohdie-002',
      name: 'Oohdie #002 — Cyber Cowboy',
      description: 'Bionic red-eye sight under a classic leather cowboy hat.',
      rarity: 'RARE',
      image: '/assets/collection/user_art_2.jpg',
      tier: 3,
      isActivated: true,
    },
    {
      id: 'oohdie-001',
      name: 'Oohdie #001 — Camo Tiger',
      description: 'Tiger-striped Oohdie in a leopard camo bucket hat.',
      rarity: 'UNCOMMON',
      image: '/assets/collection/user_art_1.jpg',
      tier: 1,
      isActivated: false,
    },
  ],
};

export const MOCK_ACTIVITY: readonly ActivityRecord[] = [
  {
    id: 'act-001',
    type: 'upgrade',
    description: 'Oohdie #004 upgraded to Tier 5 (3.5x)',
    timestamp: '12 minutes ago',
    amount: '850,000 $BANANA eaten',
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
    description: 'Oohdie #002 activated at Tier 3 (1.9x)',
    timestamp: '3 hours ago',
    amount: '150,000 $BANANA eaten',
  },
  {
    id: 'act-004',
    type: 'transfer',
    description: 'Acquired Oohdie #001 from primary mint',
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
    description: 'Get an Oohdie digital collectible. Each has unique attributes and base accumulation stats.',
  },
  {
    number: '02',
    title: 'ACTIVATE',
    description: 'Burn $BANANA tokens to activate your Oohdie. Select your tier to set your multiplier.',
  },
  {
    number: '03',
    title: 'STACK',
    description: 'Your Oohdie accumulates automatically every cycle. The asset lives inside the NFT.',
  },
  {
    number: '04',
    title: 'UPGRADE',
    description: 'Burn more tokens to increase your tier and boost your cycle multiplier up to 3.5x.',
  },
];

export const MOCK_FEATURES: readonly FeatureInfo[] = [
  {
    title: 'EATING CREATES VALUE',
    description:
      'Every activation burns $BANANA tokens permanently, reducing total supply while increasing your Oohdie’s accumulation rate. Eating and accumulation in perfect harmony.',
    stat: '43%',
    statLabel: 'OF TOTAL SUPPLY EATEN',
    image: '/assets/collection/user_art_2.jpg',
  },
  {
    title: 'ON-CHAIN ACCUMULATION',
    description:
      'The accumulated value is bound directly to your Oohdie NFT. If you trade or transfer the NFT, the stacked balance moves with it.',
    stat: '683',
    statLabel: 'ACTIVE STACKERS',
    image: '/assets/collection/user_art_3.jpg',
  },
  {
    title: 'TIERED MULTIPLIERS',
    description:
      'Choose from 5 activation tiers. Upgrade at any time by burning additional tokens. Top-tier Oohdies enjoy a massive 3.5x cycle multiplier.',
    stat: '3.5x',
    statLabel: 'MAXIMUM MULTIPLIER',
    image: '/assets/collection/user_art_4.jpg',
  },
];
