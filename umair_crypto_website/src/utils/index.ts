const ALLOWED_PROTOCOLS = ['https:', 'http:'] as const;

export function validateUrl(input: string): string | null {
  if (!input || typeof input !== 'string') return null;

  try {
    const url = new URL(input, window.location.origin);
    if (ALLOWED_PROTOCOLS.includes(url.protocol as typeof ALLOWED_PROTOCOLS[number])) {
      return url.href;
    }
    return null;
  } catch {
    return null;
  }
}

export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

export function formatWalletAddress(address: string | null): string {
  if (!address || typeof address !== 'string') return '';
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {

  }
}
