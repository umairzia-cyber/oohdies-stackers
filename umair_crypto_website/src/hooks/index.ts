import { useEffect, useRef, useState } from 'react';

export function useScrollReveal<T extends HTMLElement>(
  threshold = 0.15,
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible];
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useCountdown(initialMinutes: number = 43): string {
  const [seconds, setSeconds] = useState(initialMinutes * 60 + 5);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => (prev <= 0 ? initialMinutes * 60 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [initialMinutes]);

  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export interface ScrambledUnit {
  readonly label: string;
  readonly value: string;
}

const SCRAMBLE_UNITS = [
  { label: 'D', range: 100 },
  { label: 'H', range: 24 },
  { label: 'M', range: 60 },
  { label: 'S', range: 60 },
] as const;

function rollScramble(): readonly ScrambledUnit[] {
  return SCRAMBLE_UNITS.map(({ label, range }) => ({
    label,
    value: Math.floor(Math.random() * range)
      .toString()
      .padStart(2, '0'),
  }));
}

/**
 * A countdown that never counts down — the digits re-roll at random forever.
 * Purely decorative, so it holds still when reduced motion is requested.
 */
export function useScrambledCountdown(intervalMs: number = 110): readonly ScrambledUnit[] {
  const [units, setUnits] = useState<readonly ScrambledUnit[]>(rollScramble);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const interval = setInterval(() => setUnits(rollScramble()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return units;
}

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}

export {
  useContract,
  type UserNFTItem,
  type UserActivityItem,
  type NFTRewardClaimable,
  type AssetClaimTotal,
  type RewardPeriodInfo,
} from './useContract';
