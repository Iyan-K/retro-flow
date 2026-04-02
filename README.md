# RetroFlow

A collaborative retrospective board built with [Angular](https://angular.dev) and [Firebase](https://firebase.google.com). Multiple users can join a shared room and add, vote on, and delete sticky-note post-its in real time.

**GitHub:** [https://github.com/Iyan-K/retro-flow](https://github.com/Iyan-K/retro-flow)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Angular 21](https://angular.dev) (standalone components) |
| Backend / Database | [Firebase Firestore](https://firebase.google.com/docs/firestore) (real-time, serverless) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Language | TypeScript 5.9 |
| Package Manager | npm |

## Project Structure

```
src/
├── environments/
│   └── environment.ts          # Firebase config (API keys, project ID)
├── app/
│   ├── app.ts                  # Root component (standalone)
│   ├── app.html                # Root template
│   ├── app.config.ts           # App-level providers
│   ├── components/
│   │   ├── auth/               # Login & room join/create screen
│   │   ├── board/              # Main retro board (hosts lanes)
│   │   ├── lane/               # A single column (e.g. "What Went Well")
│   │   └── post-it/            # Individual sticky-note card
│   ├── models/
│   │   └── post-it.model.ts    # PostIt data interface
│   └── services/
│       └── retro.service.ts    # Firestore CRUD, real-time listeners, signals
├── index.html
├── main.ts
└── styles.css                  # Global styles (Tailwind directives)

firebase.json                   # Firebase project config (Firestore rules path)
.firebaserc                     # Default Firebase project alias
firestore.rules                 # Firestore security rules
firestore.indexes.json          # Firestore composite indexes
```

### Key Architecture Decisions

- **Firebase SDK (not @angular/fire)** — the app uses the plain `firebase` JS SDK directly for full control over Firestore initialization.
- **Offline persistence** — `initializeFirestore` is configured with `persistentLocalCache` and `persistentMultipleTabManager`, so data is cached in IndexedDB and the app works offline.
- **Angular Signals** — UI state (posts, votes, room owner) is managed with Angular signals and computed values instead of RxJS observables.
- **Firestore data model** — data lives under `rooms/{roomCode}` (room metadata) and `rooms/{roomCode}/posts/{postId}` (sticky notes).

## Code Walkthrough

### Component Tree & Data Flow

```
App (app.ts)
 ├─ AuthComponent (auth/)     ← shown when no user/room
 └─ BoardComponent (board/)   ← shown after joining a room
      ├─ LaneComponent × 3    ← one per column (top / tip / process)
      │    └─ PostItComponent  ← one per sticky note
      └─ Ranking view          ← inline in board template (ranking phase)
```

The root `App` component holds three signals — `username`, `roomCode`, and `isDarkMode` — all persisted in `localStorage`.

- When both `username` and `roomCode` are set, the template swaps `AuthComponent` out for `BoardComponent`; otherwise the login screen is shown.
- Deep-linking is supported via a `?room=CODE` query parameter. If a user is already logged in the room code is applied immediately; if not, it is pre-filled on the auth screen.

`BoardComponent` injects the singleton `RetroService` and wires its signals directly to the template (e.g. `topPosts`, `votingActive`, `remainingVotes`). User actions (add, vote, delete, comment) call thin methods on the board that delegate to `RetroService`.

### RetroService — the central state & data layer

`RetroService` (`src/app/services/retro.service.ts`) is the only service in the app. It owns:

| Responsibility | How |
|---|---|
| **Firebase initialisation** | `initializeApp` + `initializeFirestore` with `persistentLocalCache` and `persistentMultipleTabManager` for offline-first IndexedDB caching. |
| **Real-time listeners** | `onSnapshot` on the room document and the posts sub-collection. Firestore pushes changes to the client; the service writes them into Angular signals. |
| **Writable signals** | `currentUser`, `roomOwner`, `phase`, `roomMembers`, `readyUsers`, `filterAuthor`, and the private `postItsSignal`. |
| **Computed signals** | `topPosts`, `tipPosts`, `processPosts` (filter by lane), `rankedPosts` (sorted by vote count), `isOwner`, `votingActive`, `remainingVotes`, `isCurrentUserReady`, `allUsersReady`, `uniqueAuthors`, and `filteredPosts` (applies author filter + sorts own posts first). |
| **CRUD methods** | `createRoom`, `joinRoom`, `addPostIt`, `toggleVote`, `deletePostIt`, `addComment`, `markReady`/`unmarkReady`, `setPhase`. |
| **Cleanup** | `stopListening` unsubscribes both `onSnapshot` listeners; called from `BoardComponent.ngOnDestroy`. |

#### Voting Logic

Each user gets a maximum of **3 votes** (defined by `MAX_VOTES_PER_USER`). The `remainingVotes` computed signal counts how many votes the current user has already cast across all posts and subtracts from the limit. `toggleVote` either adds or removes the user from the post's `voters` array — a user can vote for the same post multiple times as long as they have votes remaining.

### The 4-Phase System

The room owner drives the retro through four sequential phases stored in the Firestore room document:

| Phase | What happens | Who can do what |
|---|---|---|
| **`writing`** | Participants add sticky notes. Other people's notes are **blurred** so you write without bias. | Everyone writes; non-owners can mark themselves as "ready". Owner sees a ✅ when all members are ready. |
| **`discussing`** | All notes are revealed. The team reads and discusses them. | Notes are visible to all; adding notes is still possible; voting and deleting are disabled. |
| **`voting`** | Each user distributes up to 3 votes across any notes. A vote counter badge appears on each card. | Voting buttons appear; hover tooltip shows who voted. Non-owners can mark themselves as "ready" when done voting. |
| **`ranking`** | All notes are shown in a **single ranked column** sorted by vote count. Comments can be added to each item. A "Print PDF" button is available. | Comments are enabled; the board layout switches from 3 columns to 1. |

Phase transitions are owner-only buttons in the header. The `readyUsers` array is cleared every time the phase changes. Backward compatibility with an older `votingActive` boolean field is handled automatically in the room snapshot listener.

### AuthComponent — Login & Room Management

`AuthComponent` (`src/app/components/auth/`) presents:

- A **name** input (pre-filled from `localStorage`).
- A **room code** input + **Join** button — enters an existing room.
- A **Create new room** button:
  - Generates a cryptographically random 6-character room code using `crypto.getRandomValues` with modulo-bias rejection from the charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
  - Stores the code and username in `localStorage`.
  - Sets a `retro-is-creator` flag so that `BoardComponent.ngOnInit` knows to call `createRoom` on Firestore.

On join the component saves `retro-user` and `retro-room` to `localStorage`, clears any `?room=` query parameter, and emits a `joined` event to `App`.

### BoardComponent — The Retro Board

`BoardComponent` (`src/app/components/board/`) is the main view after authentication. Key features:

- **Header bar**: shows room code, a share/copy-link button, member avatars (with a green border when a member is "ready"), the current user's name, phase-transition buttons (owner only), ready toggle (non-owner), remaining-votes badge (voting phase), a gear menu with dark-mode toggle and leave button.
- **Three-column layout** (writing / discussing / voting phases): renders three `LaneComponent` instances — _What Went Well_, _Tips & Ideas_, _Process Optimization_ — in a responsive CSS grid (`grid-cols-1 md:grid-cols-3`).
- **Ranking layout** (ranking phase): replaces the three columns with a single centred list of all posts sorted by vote count, showing rank numbers, lane badges, author names, vote counts, existing comments, and a comment input.
- **Author filter widget**: a floating button (bottom-right) that opens a list of all post authors; clicking one filters the board to only that author's posts.
- **Share link**: copies the current URL with `?room=CODE` to the clipboard.
- **Leave**: clears `localStorage` and reloads the page.
- **Print PDF**: calls `window.print()`; print-specific CSS strips glassmorphism effects and hides interactive elements.

### LaneComponent — A Single Column

`LaneComponent` (`src/app/components/lane/`) receives its lane type (`top`, `tip`, or `process`), list of posts, and phase/voting state as inputs. It renders:

- A coloured header bar (emerald for _top_, sky for _tip_, purple for _process_).
- A text input + add button to create new notes.
- A list of `PostItComponent` instances.
- A contextual empty-state message with example prompts when no notes exist yet.

Adding a note emits an `added` event (with `content` and `lane`) up to `BoardComponent`, which delegates to `RetroService.addPostIt`.

### PostItComponent — Individual Sticky Note

`PostItComponent` (`src/app/components/post-it/`) displays a single card with:

- **Content text** — blurred (`filter: blur(5px)`) during the writing phase if the post belongs to someone else, so participants write independently.
- **Author name**.
- **Vote button** (voting phase only) — shows the current vote count; highlighted purple if the current user already voted; disabled when no votes remain. A hover tooltip lists all voters.
- **Delete button** — visible during the writing phase (own posts only) and the ranking phase (any post). Hidden during discussing and voting to prevent accidental removal.

Visibility rules are driven by computed signals: `isBlurred`, `canDelete`, `canVote`, and `alreadyVoted`.

### Data Model

Defined in `src/app/models/post-it.model.ts`:

```typescript
type RoomPhase = 'writing' | 'discussing' | 'voting' | 'ranking';

interface PostItComment {
  author: string;
  text: string;
  createdAt: number;
}

interface PostIt {
  id: string;
  authorName: string;
  content: string;
  lane: 'top' | 'tip' | 'process';
  votes: number;
  voters: string[];
  comments: PostItComment[];
  createdAt: number;
}
```

In Firestore, each room document (`rooms/{roomCode}`) stores `owner`, `phase`, `members`, and `readyUsers`. Each post is a sub-document under `rooms/{roomCode}/posts/{postId}`.

### Styling & Theming

The app uses a **glassmorphism** design with three CSS utility classes defined in `src/styles.css`:

| Class | Purpose |
|---|---|
| `.glass` | Semi-transparent white background with heavy blur — used for the header and general containers. |
| `.glass-light` | More opaque white — used for elevated panels like the auth card and dropdowns. |
| `.glass-card` | Lighter transparency — used for individual post-it cards. |

An **animated gradient background** (`bg-animated-gradient`) shifts colours on a 15-second loop.

**Dark mode** is toggled via a `dark-mode` class on `<html>`. CSS overrides swap the gradient to dark blues and adjust text/border/background colours. The preference is saved in `localStorage` under `retro-theme`.

**Print styles** (`@media print`) remove backdrop filters, fix backgrounds to white, and hide interactive elements (filter widget, print button) so the ranking view exports cleanly to PDF.

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

5. Update `.firebaserc` with your own project ID (replace `retro-flow` with your Firebase project ID).
6. **Deploy Firestore rules** using the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore
```

This deploys the `firestore.rules` file included in the repository. Alternatively, you can paste the rules manually via the [Firestore Console](https://console.firebase.google.com/) under **Rules**.

> **Note:** The test-mode rules (`allow read, write: if true`) are suitable for development. For production use, add authentication and more restrictive rules.

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
2. **Create a new room** to get a unique 6-character room code, or **join an existing room** by entering its code.
3. Share the room code (or the auto-generated `?room=CODE` link) with your team — everyone who joins the same room sees the same board in real time.
4. The room owner drives the retro through four phases:
   - **Writing** — add post-its to any of the three lanes. Other people's notes are blurred.
   - **Discussing** — all notes are revealed for the team to read and talk about.
   - **Voting** — each person distributes up to 3 votes across any notes.
   - **Ranking** — notes are shown in a single column sorted by votes. Add comments and print to PDF.
5. All changes sync instantly across all connected browsers via Firestore real-time listeners.

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
