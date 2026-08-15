export const BANANA_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function burn(uint256 value)",
  "function burnFrom(address account, uint256 value)",
] as const;

export const OOHDIES_NFT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function MAX_SUPPLY() view returns (uint256)",
  "function totalMinted() view returns (uint256)",
  "function mintPrice() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function mint(address to) payable",
  "function mintBatch(address to, uint256 count)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function earningEngine() view returns (address)",
  "function activationController() view returns (address)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
] as const;

export const ACTIVATION_CONTROLLER_ABI = [
  "function activationCost() view returns (uint256)",
  "function isActivated(uint256 tokenId) view returns (bool)",
  "function getActivatedAt(uint256 tokenId) view returns (uint256)",
  "function totalActivated() view returns (uint256)",
  "function activate(uint256 tokenId)",
  "function oohdiesNFT() view returns (address)",
  "function bananaToken() view returns (address)",
  "event NFTActivated(uint256 indexed tokenId, address indexed owner, uint256 bananaBurned, uint256 activatedAtTimestamp)",
] as const;

export const EARNING_ENGINE_ABI = [
  "function getRegisteredRewardAssets() view returns (address[])",
  "function getTotalClaimableReward(uint256 tokenId, address asset) view returns (uint256)",
  "function getPendingReward(uint256 tokenId, address asset) view returns (uint256)",
  "function getAccruedReward(uint256 tokenId, address asset) view returns (uint256)",
  "function rewardVault() view returns (address)",
  "function rewardAssets(address asset) view returns (bool isRegistered, uint8 decimals, uint256 rewardRate, uint256 lastUpdateTime, uint256 globalRewardIndex, uint256 periodFinish, uint256 totalFunded)",
  "function updateReward(uint256 tokenId)",
  "function isUserIndexInitialized(uint256 tokenId, address asset) view returns (bool)",
] as const;

export const REWARD_VAULT_ABI = [
  "function claimReward(uint256 tokenId, address asset)",
  "function claimAllRewards(uint256 tokenId)",
  "function getVaultBalance(address asset) view returns (uint256)",
  "function totalDeposited(address asset) view returns (uint256)",
  "function totalClaimed(address asset) view returns (uint256)",
  "event RewardClaimed(uint256 indexed tokenId, address indexed asset, address indexed recipient, uint256 amount)",
] as const;

export const MOCK_REWARD_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
] as const;
