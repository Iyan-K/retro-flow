# RetroFlow

A collaborative retrospective board built with [Angular](https://angular.dev) and [Firebase](https://firebase.google.com). Multiple users can join a shared room and add, vote on, and delete sticky-note post-its in real time.

## Firebase Setup (Required)

RetroFlow uses Firebase Firestore as a free real-time backend with offline persistence. Follow these steps to connect your own Firebase project:

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (no billing required).
2. In your project, go to **Build → Firestore Database** and click **Create database**. Choose **Start in test mode** for development.
3. Go to **Project settings → General**, scroll down to **Your apps**, and click the web icon (**</>**) to register a web app.
4. Copy the Firebase config object and paste the values into `src/environments/environment.ts`:

```typescript
export const environment = {
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
  },
};
```

5. **Deploy Firestore rules** using the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore
```

This deploys the `firestore.rules` file included in the repository. Alternatively, you can paste the rules manually via the [Firestore Console](https://console.firebase.google.com/) under **Rules**.

> **Note:** The test-mode rules are suitable for development. For production use, add more restrictive rules.

### Offline Persistence

Firestore offline persistence is enabled by default. This means data is cached locally in IndexedDB so the app works even when the network is temporarily unavailable. Changes made offline are automatically synced when the connection is restored.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## How It Works

1. Open the app and enter your name.
2. **Create a new room** to get a unique room code, or **join an existing room** by entering its code.
3. Share the room code with your team — everyone who joins the same room sees the same board in real time.
4. Add post-its to any of the three lanes: _What Went Well_, _Tips & Ideas_, or _Process Optimization_.
5. Upvote or delete post-its. All changes sync instantly across all connected browsers.

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
