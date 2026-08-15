import type { CollectionItem, PlatformStats, StackInfo, ActivityRecord, TierInfo } from '../../types';
import {
  MOCK_COLLECTION,
  MOCK_STATS,
  MOCK_STACK,
  MOCK_ACTIVITY,
  MOCK_TIERS,
} from '../mock/mockData';

const NETWORK_DELAY = 300;

function delay<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), NETWORK_DELAY));
}

export async function fetchCollection(): Promise<readonly CollectionItem[]> {

  return delay(MOCK_COLLECTION);
}

export async function fetchStats(): Promise<PlatformStats> {

  return delay(MOCK_STATS);
}

export async function fetchUserStack(): Promise<StackInfo> {

  return delay(MOCK_STACK);
}

export async function fetchActivity(): Promise<readonly ActivityRecord[]> {

  return delay(MOCK_ACTIVITY);
}

export async function fetchTiers(): Promise<readonly TierInfo[]> {

  return delay(MOCK_TIERS);
}
