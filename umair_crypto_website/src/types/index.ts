export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface CollectionItem {
  readonly id: string;
  readonly name: string;
  readonly image: string;
  readonly rarity: Rarity;
  readonly tier: number;
  readonly isActivated: boolean;
  readonly description: string;
}

export interface StockItem {
  readonly id: string;
  readonly symbol: string;
  readonly name: string;
  readonly icon: string;
  readonly category?: string;
  readonly isSelected?: boolean;
}

export interface PlatformStats {
  readonly totalBananas: number;
  readonly destroyed: number;
  readonly activeStacks: number;
  readonly collectionSize: number;
  readonly paidToHolders: string;
  readonly supplyAlive: number;
  readonly nftsBurnedCount: number;
  readonly nftsBurnedPercent: string;
  readonly supplyBurnedPercent: string;
  readonly supplyBurnedTokens: string;
}

export interface StatItem {
  readonly label: string;
  readonly value: string | number;
  readonly suffix?: string;
  readonly isAccent?: boolean;
}

export interface TierInfo {
  readonly id: string;
  readonly multiplier: string;
  readonly name: string;
  readonly burnCost: number;
  readonly isActive?: boolean;
}

export type WalletConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WalletState {
  readonly status: WalletConnectionStatus;
  readonly address: string | null;
  readonly displayName: string | null;
  readonly chainId: number | null;
  readonly isCorrectNetwork: boolean;
  readonly error: string | null;
}

export interface StackInfo {
  readonly totalOwned: number;
  readonly activeStacks: number;
  readonly stackLevel: number;
  readonly accumulatedBalance: string;
  readonly items: readonly CollectionItem[];
}

export type ActivityType = 'activation' | 'destruction' | 'upgrade' | 'transfer' | 'accumulation';

export interface ActivityRecord {
  readonly id: string;
  readonly type: ActivityType;
  readonly description: string;
  readonly timestamp: string;
  readonly amount?: string;
}

export interface DocSection {
  readonly id: string;
  readonly title: string;
  readonly content: string;
}

export interface StepInfo {
  readonly number: string;
  readonly title: string;
  readonly description: string;
}

export interface FeatureInfo {
  readonly title: string;
  readonly description: string;
  readonly image: string;
  readonly stat?: string;
  readonly statLabel?: string;
}
