export const ROBINHOOD_TESTNET_CONFIG = {
  chainId: 46630,
  chainIdHex: '0xb646',
  chainName: 'Robinhood Chain Testnet',
  rpcUrl: 'https://rpc.testnet.chain.robinhood.com',
  blockExplorerUrl: 'https://explorer.testnet.chain.robinhood.com',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
};

export const CONTRACT_ADDRESSES = {
  BANANA_TOKEN: '0x749A38Db8EC1eB88c39d159595805d3BeE4E0AA1',
  OOHDIES_NFT: '0xf5AB3DC05cCa7FB47b4129DfA7713a89dc85476A',
  ACTIVATION_CONTROLLER: '0xF5c391a42876a67007860c95a3FEaD6d6529Bf31',
  EARNING_ENGINE: '0xEAe891a47256dD688e6dc0C438Df313eE62c39Dc',
  REWARD_VAULT: '0x1A417a1bF0Cfd4c38bd3FB13B5EF81B45D2D1fF0',
  MOCK_USDG: '0xF25905f4ba33706ab2C064da2e786bc33d21cf0f',
  MOCK_AAPL: '0xd38EAB6b104950b0443d3c6FB432e89631BDbC88',
  ERC6551_REGISTRY: '0x000000006551c19487814612e58FE06813775758',
  // Set from the OohdiesAccount deployed by scripts/redeploy_upgrade.js.
  OOHDIES_ACCOUNT_IMPL: '0x0000000000000000000000000000000000000000',
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
