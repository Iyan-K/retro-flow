import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Capture the ?room= query param before Angular's hash-based router
// strips pre-hash search params via replaceState during initialization.
const _preBootParams = new URLSearchParams(window.location.search);
const _preBootRoom = _preBootParams.get('room');
if (_preBootRoom) {
  sessionStorage.setItem('retro-pending-room', _preBootRoom);
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
