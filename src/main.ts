import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { capturePendingRoomCode } from './app/utils/room-deep-link';

// Capture the ?room= query param before Angular's hash-based router
// strips pre-hash search params via replaceState during initialization.
capturePendingRoomCode();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
