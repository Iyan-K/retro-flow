/**
 * Shared constants and helpers for the pending-room mechanism.
 *
 * When a URL contains a `?room=` query param, the value is captured
 * before Angular's hash-based router can strip it. The value is stored
 * in both `sessionStorage` and a `window` global so that components
 * can read it reliably regardless of router initialization timing.
 */

/** sessionStorage key used to persist the pending room across navigation. */
export const PENDING_ROOM_STORAGE_KEY = 'retro-pending-room';

/** window property key used for same-page access (survives router replaceState). */
export const PENDING_ROOM_WINDOW_KEY = '__retroPendingRoom';

/** Read the pending room value from the window global. */
export function readPendingRoomFromWindow(): string {
  return ((window as unknown as Record<string, unknown>)[PENDING_ROOM_WINDOW_KEY] as string) ?? '';
}

/** Store the pending room value on the window global. */
export function storePendingRoomOnWindow(value: string): void {
  (window as unknown as Record<string, unknown>)[PENDING_ROOM_WINDOW_KEY] = value;
}

/** Clear the pending room from both sessionStorage and the window global. */
export function clearPendingRoomStorage(): void {
  delete (window as unknown as Record<string, unknown>)[PENDING_ROOM_WINDOW_KEY];
  sessionStorage.removeItem(PENDING_ROOM_STORAGE_KEY);
}
