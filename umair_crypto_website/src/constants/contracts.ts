export const ROBINHOOD_MAINNET_CONFIG = {
  chainId: 4663,
  chainIdHex: '0x1237',
  chainName: 'Robinhood Chain Mainnet',
  rpcUrl: 'https://rpc.mainnet.chain.robinhood.com',
  blockExplorerUrl: 'https://robinhoodchain.blockscout.com',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
};

/** Active Network Configuration for Monkey Business */
export const ROBINHOOD_CHAIN_CONFIG = ROBINHOOD_MAINNET_CONFIG;

/** Backward-compatible alias */
export const ROBINHOOD_TESTNET_CONFIG = ROBINHOOD_MAINNET_CONFIG;

export const CONTRACT_ADDRESSES = {
  BANANA_TOKEN: '0x749A38Db8EC1eB88c39d159595805d3BeE4E0AA1',
  OOHDIES_NFT: '0xf5AB3DC05cCa7FB47b4129DfA7713a89dc85476A',
  ACTIVATION_CONTROLLER: '0x739536FD3fCa15f0ef19c32FCA03fE6510650eD7',
  EARNING_ENGINE: '0x623283c4b68d91ffCea057E6dd6084824E269Fa1',
  REWARD_VAULT: '0x2FB7E3F8e0DB58eBa1B38B79Dcfd54DA99cf3A8C',
  MOCK_USDG: '0xF25905f4ba33706ab2C064da2e786bc33d21cf0f',
  MOCK_AAPL: '0xd38EAB6b104950b0443d3c6FB432e89631BDbC88',
  ERC6551_REGISTRY: '0x000000006551c19487814612e58FE06813775758',
  OOHDIES_ACCOUNT_IMPL: '0xFEd0429452592011C4e4c6C92560Bc2DB558CbE8',
  COLLECTION_Q: '0x65eAf7036fa72E8e4094Dd9f06Dcb6A43c530AD7',
};

/** Must match RewardVault.accountSalt. */
export const ACCOUNT_SALT = '0x0000000000000000000000000000000000000000000000000000000000000000';

export interface RewardAssetConfig {
  id: string;
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  icon?: string;
  /**
   * True for assets that are shown in the UI but have no contract behind them
   * yet. Never present on anything in SUPPORTED_REWARD_ASSETS — see the note on
   * TEASER_REWARD_ASSETS below for why the two lists stay separate.
   */
  comingSoon?: boolean;
}

export const SUPPORTED_REWARD_ASSETS: readonly RewardAssetConfig[] = [
  {
    id: 'usdg',
    symbol: 'USDG',
    name: 'Stable Dollar',
    address: '0xF25905f4ba33706ab2C064da2e786bc33d21cf0f',
    decimals: 6,
    icon: '$',
  },
  {
    id: 'aapl',
    symbol: 'AAPLx',
    name: 'Apple Stock',
    address: '0xd38EAB6b104950b0443d3c6FB432e89631BDbC88',
    decimals: 18,
    icon: '',
  },
  {
    id: 'tsla',
    symbol: 'TSLAx',
    name: 'Tesla Stock',
    address: '0xD774e7426625B7b2022eC114608EA9730e83a9ad',
    decimals: 18,
    icon: '⚡',
  },
  {
    id: 'nvda',
    symbol: 'NVDAx',
    name: 'Nvidia Stock',
    address: '0xAd23D6260be7f28Fb7E5EEb4Df0Ed7192B5F0A95',
    decimals: 18,
    icon: '🟩',
  },
  {
    id: 'msft',
    symbol: 'MSFTx',
    name: 'Microsoft Stock',
    address: '0xc2560228A2FA28BF004EC20E57EfD9fb1Ec60F9f',
    decimals: 18,
    icon: '🪟',
  },
  {
    id: 'amzn',
    symbol: 'AMZNx',
    name: 'Amazon Stock',
    address: '0x6944d8f62a41924A9d43eDdcFFDc3E3081D58057',
    decimals: 18,
    icon: '📦',
  },
  {
    id: 'googl',
    symbol: 'GOOGLx',
    name: 'Google Stock',
    address: '0x27B8f21ec684807899dBecCeC531bcD48F26C565',
    decimals: 18,
    icon: '🔍',
  },
  {
    id: 'meta',
    symbol: 'METAx',
    name: 'Meta Stock',
    address: '0x0B6cAe5cD868F0Ea5D36f911F18Ba49AD9bE52A2',
    decimals: 18,
    icon: '♾️',
  },
  {
    id: 'pltr',
    symbol: 'PLTRx',
    name: 'Palantir Stock',
    address: '0x6648AdFd30fe39D3722Cc7D8211517a7f0d00850',
    decimals: 18,
    icon: '👁️',
  },
  {
    id: 'amd',
    symbol: 'AMDx',
    name: 'AMD Stock',
    address: '0x54338e6EE49F58e7E6814437600E921F60243058',
    decimals: 18,
    icon: '🔴',
  },
  {
    id: 'gme',
    symbol: 'GMEx',
    name: 'GameStop Stock',
    address: '0x2AD89Af86FD287421F4C6091Cee6021c333b21c8',
    decimals: 18,
    icon: '🎮',
  },
  {
    id: 'spcx',
    symbol: 'SPCXx',
    name: 'SpaceX Mock Stock',
    address: '0xd213294D9981734675d6719Dc97Fb6C484a5Ce00',
    decimals: 18,
    icon: '🚀',
  },
] as const;

/**
 * Crypto tokens teased in the UI ahead of the contracts that will back them.
 *
 * These are deliberately a SEPARATE list from SUPPORTED_REWARD_ASSETS rather
 * than entries with a placeholder address, because SUPPORTED_REWARD_ASSETS is
 * the on-chain list: every entry in it is fed to balanceOf, claimable and
 * activation calls in hooks/useContract.ts. A fake address in there would send
 * real RPC calls to a contract that does not exist. Keeping them apart means
 * the working testnet flow cannot see them at all.
 *
 * WIRING ONE UP — give it its deployed address and decimals, then move the
 * entry into SUPPORTED_REWARD_ASSETS and drop `comingSoon`. Nothing else needs
 * to change: the display surfaces all read ALL_REWARD_ASSETS.
 */
export const TEASER_REWARD_ASSETS: readonly RewardAssetConfig[] = [
  {
    id: 'stonk',
    symbol: 'STONK',
    name: 'StonkBrokers',
    address: '',
    decimals: 18,
    icon: '📈',
    comingSoon: true,
  },
  {
    id: 'specie',
    symbol: 'SPECIE',
    name: 'Monkey Business',
    address: '',
    decimals: 18,
    icon: '🪙',
    comingSoon: true,
  },
  {
    id: 'doge',
    symbol: 'DOGE',
    name: 'Dogecoin',
    address: '',
    decimals: 18,
    icon: '🐕',
    comingSoon: true,
  },
  {
    id: 'pepe',
    symbol: 'PEPE',
    name: 'Pepe',
    address: '',
    decimals: 18,
    icon: '🐸',
    comingSoon: true,
  },
  {
    id: 'wif',
    symbol: 'WIF',
    name: 'dogwifhat',
    address: '',
    decimals: 18,
    icon: '🧢',
    comingSoon: true,
  },
  {
    id: 'sui',
    symbol: 'SUI',
    name: 'Sui',
    address: '',
    decimals: 18,
    icon: '💧',
    comingSoon: true,
  },
] as const;

/**
 * What the UI shows. Display surfaces (the home earn grid, the global rewards
 * strip, the activate picker) read this; anything that touches the chain must
 * keep reading SUPPORTED_REWARD_ASSETS instead.
 */
export const ALL_REWARD_ASSETS: readonly RewardAssetConfig[] = [
  ...SUPPORTED_REWARD_ASSETS,
  ...TEASER_REWARD_ASSETS,
];

/** True for ids with no contract behind them yet. */
export function isTeaserAssetId(id: string): boolean {
  return TEASER_REWARD_ASSETS.some((a) => a.id === id);
}
