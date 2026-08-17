import { SUPPORTED_REWARD_ASSETS, RewardAssetConfig } from '../constants/contracts';

// Draft of an NFT's stock selection, used only before it is activated. Once activated the picks
// live on-chain and are read back from EarningEngine.getChosenAssets.

const DEFAULT_PRESETS: Record<number, string[]> = {
  1: ['tsla', 'nvda', 'aapl'],
  2: ['msft', 'amzn', 'usdg'],
  3: ['googl', 'meta', 'pltr'],
  4: ['tsla', 'amd', 'aapl'],
  5: ['nvda', 'gme', 'usdg'],
};

export function getNFTChosenStockIds(tokenId: number): string[] {
  try {
    const raw = localStorage.getItem(`oohdies_selected_stocks_${tokenId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {

        const valid = parsed.filter((id) =>
          SUPPORTED_REWARD_ASSETS.some((a) => a.id === id)
        );
        if (valid.length > 0) {
          return valid.slice(0, 3);
        }
      }
    }
  } catch {}

  const presetKey = ((tokenId - 1) % 5) + 1;
  return DEFAULT_PRESETS[presetKey] || ['tsla', 'nvda', 'aapl'];
}

export function setNFTChosenStockIds(tokenId: number, stockIds: string[]) {
  const clean = stockIds.slice(0, 3);
  localStorage.setItem(`oohdies_selected_stocks_${tokenId}`, JSON.stringify(clean));
}

export function getNFTChosenAssets(tokenId: number): RewardAssetConfig[] {
  const ids = getNFTChosenStockIds(tokenId);
  return ids
    .map((id) => SUPPORTED_REWARD_ASSETS.find((a) => a.id === id))
    .filter((a): a is RewardAssetConfig => Boolean(a));
}
