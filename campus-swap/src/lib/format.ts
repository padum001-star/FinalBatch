export function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function discountPercent(original: number, discounted: number): number {
  if (original <= 0) return 0;
  return Math.round((1 - discounted / original) * 100);
}

export function formatTimeLeft(expiresAtIso: string): string {
  const diffMs = new Date(expiresAtIso).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';

  const minutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 1) return `${days}d left`;
  if (hours >= 1) return `${hours}h left`;
  return `${Math.max(minutes, 1)}m left`;
}

export function isExpired(expiresAtIso: string): boolean {
  return new Date(expiresAtIso).getTime() <= Date.now();
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
