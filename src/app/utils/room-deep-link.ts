const PENDING_ROOM_KEY = 'retro-pending-room';

export function capturePendingRoomCode(): void {
  const room = readRoomCodeFromUrl();
  if (room) {
    sessionStorage.setItem(PENDING_ROOM_KEY, room);
  }
}

export function readPendingRoomCode(): string {
  const room = readRoomCodeFromUrl();
  if (room) {
    sessionStorage.setItem(PENDING_ROOM_KEY, room);
    return room;
  }

  return sessionStorage.getItem(PENDING_ROOM_KEY) || '';
}

export function clearRoomDeepLink(): void {
  sessionStorage.removeItem(PENDING_ROOM_KEY);

  const url = new URL(window.location.href);
  url.searchParams.delete('room');

  if (url.hash.includes('?')) {
    const hashWithoutPrefix = url.hash.slice(1);
    const [hashPath, hashQuery = ''] = hashWithoutPrefix.split('?');
    const hashParams = new URLSearchParams(hashQuery);
    hashParams.delete('room');
    const query = hashParams.toString();
    url.hash = query ? `${hashPath}?${query}` : hashPath;
  }

  window.history.replaceState({}, '', url.toString());
}

function readRoomCodeFromUrl(): string {
  const preHashRoom = new URLSearchParams(window.location.search).get('room');
  if (preHashRoom) return preHashRoom;

  if (!window.location.hash.includes('?')) return '';

  const hashQuery = window.location.hash.slice(1).split('?')[1] ?? '';
  return new URLSearchParams(hashQuery).get('room') ?? '';
}
