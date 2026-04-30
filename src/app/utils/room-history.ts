/**
 * Local room-history storage.
 *
 * Tracks the rooms a user has created or joined on this device so that we
 * can show them in a history dialog. The history is kept in `localStorage`
 * under the `retro-history` key as a JSON-encoded array of entries.
 */

import { sanitizeRoomCode } from './sanitize';

const STORAGE_KEY = 'retro-history';
const MAX_ENTRIES = 50;

export interface RoomHistoryEntry {
  /** Sanitized room code. */
  code: string;
  /** Epoch milliseconds when this room was first added to the local history. */
  createdAt: number;
}

function readRaw(): RoomHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is RoomHistoryEntry =>
          !!e &&
          typeof e === 'object' &&
          typeof (e as RoomHistoryEntry).code === 'string' &&
          typeof (e as RoomHistoryEntry).createdAt === 'number',
      )
      .map((e) => ({
        code: sanitizeRoomCode(e.code),
        createdAt: e.createdAt,
      }))
      .filter((e) => e.code !== '');
  } catch {
    return [];
  }
}

/** Returns history entries sorted by `createdAt` descending (newest first). */
export function getRoomHistory(): RoomHistoryEntry[] {
  return readRaw().sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Record that the user has interacted with the given room. If an entry for
 * the room already exists, the existing entry is left untouched (its
 * timestamp is not refreshed).
 */
export function addRoomToHistory(code: string): void {
  const safe = sanitizeRoomCode(code);
  if (!safe) return;

  const entries = readRaw();
  if (entries.some((e) => e.code === safe)) return;

  entries.push({ code: safe, createdAt: Date.now() });

  // Cap the history to avoid unbounded growth.
  const trimmed = entries
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_ENTRIES);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* localStorage write failed (quota / disabled) — silently ignore */
  }
}
