import { useEffect, useState } from 'react';
import { STATS_LABELS } from '../../constants/content';
import { MOCK_STATS } from '../../services/mock/mockData';
import { useContract } from '../../hooks';
import { formatNumber } from '../../utils';
import './Ticker.css';

/*
 * Running stats strip along the top of the content column.
 *
 * Deliberately writes no new copy: every label comes from the existing
 * STATS_LABELS and every value is one already shown on the Home stats section,
 * sourced the same way (live platform stats, falling back to MOCK_STATS while
 * the fetch is in flight) as Home.tsx does.
 */
export default function Ticker() {
  const { fetchPlatformStats } = useContract();
  const [burned, setBurned] = useState<string | null>(null);
  const [mintsLeft, setMintsLeft] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPlatformStats().then((stats) => {
      if (cancelled || !stats) return;
      setBurned(formatNumber(parseFloat(stats.burnedTokens)));
      setMintsLeft(String(stats.mintsLeft));
    });
    return () => { cancelled = true; };
  }, [fetchPlatformStats]);

  const items = [
    { label: STATS_LABELS.collectionSize, value: formatNumber(MOCK_STATS.collectionSize) },
    { label: STATS_LABELS.destroyed, value: burned ?? formatNumber(MOCK_STATS.destroyed) },
    { label: STATS_LABELS.activeStacks, value: formatNumber(MOCK_STATS.activeStacks) },
    { label: STATS_LABELS.totalBananas, value: mintsLeft ?? formatNumber(MOCK_STATS.supplyAlive) },
  ];

  // Two identical halves — @keyframes marquee translates by -50%, so an odd
  // number of copies would make the loop visibly jump.
  const track = [...items, ...items];

  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker__track">
        {track.map((item, i) => (
          <span key={i} className="ticker__item">
            <span className="ticker__label">{item.label}</span>
            <span className="ticker__value">{item.value}</span>
            <span className="ticker__sep">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
