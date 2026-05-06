import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Capture the ?room= query param before Angular's hash-based router
// strips pre-hash search params via replaceState during initialization.
const preBootParams = new URLSearchParams(window.location.search);
const preBootRoom = preBootParams.get('room');
if (preBootRoom) {
  sessionStorage.setItem('retro-pending-room', preBootRoom);
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
