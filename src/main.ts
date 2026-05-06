import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Capture the ?room= query param before Angular's hash-based router
// strips pre-hash search params via replaceState during initialization.
// Check both the standard search params (?room=X#/) and the hash-based
// search params (#/?room=X) to handle either URL format.
const preBootParams = new URLSearchParams(window.location.search);
let preBootRoom = preBootParams.get('room') ?? '';
if (!preBootRoom) {
  const hashPart = window.location.hash.replace(/^#\/?/, '');
  const hashParams = new URLSearchParams(hashPart);
  preBootRoom = hashParams.get('room') ?? '';
}
if (preBootRoom) {
  sessionStorage.setItem('retro-pending-room', preBootRoom);
  // Also store on window for same-page access — sessionStorage can be
  // lost if Angular recreates the root component during router init.
  (window as unknown as Record<string, unknown>)['__retroPendingRoom'] = preBootRoom;
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
