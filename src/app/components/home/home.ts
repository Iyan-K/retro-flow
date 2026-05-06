import { Component, signal, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthComponent } from '../auth/auth';
import { BoardComponent } from '../board/board';
import {
  sanitizeUsername,
  sanitizeRoomCode,
} from '../../utils/sanitize';

/**
 * Default route — the existing auth + board experience.
 *
 * Logic was previously in `App`; extracted so we can host other routes
 * (e.g. /memory-lane) under <router-outlet>.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AuthComponent, BoardComponent],
  template: `
    @if (username() && roomCode()) {
      <app-board
        [username]="username()"
        [roomCode]="roomCode()"
        [isDarkMode]="isDarkMode()"
        (toggleThemeRequested)="toggleTheme()"
        (memoryLaneRequested)="onMemoryLane()"
      />
    } @else {
      <app-auth (joined)="onJoin()" />
    }

    @if (showRoomSwitchDialog()) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="glass-card rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl text-center">
          <p class="text-4xl mb-4">🚪</p>
          <h2 class="text-xl font-bold text-slate-800 mb-2">Andere kamer gevonden</h2>
          <p class="text-sm text-slate-500 mb-6">
            Wil je naar <span class="font-semibold text-purple-600">{{ roomCodeFromUrl() }}</span> kamer gaan?
          </p>
          <div class="flex justify-center gap-3">
            <button
              (click)="declineRoomSwitch()"
              class="px-5 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white/50 transition-all"
            >
              Nee, blijf hier
            </button>
            <button
              (click)="confirmRoomSwitch()"
              class="bg-purple-500/80 backdrop-blur-sm text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-purple-500 transition-all border border-purple-400/30"
            >
              Ja, ga naar kamer
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class HomeComponent implements OnInit, OnDestroy {
  private static readonly PENDING_ROOM_KEY = 'retro-pending-room';
  private static readonly PENDING_ROOM_WINDOW_KEY = '__retroPendingRoom';

  private readonly router = inject(Router);
  private readonly onVisibilityChange = this.handleVisibilityChange.bind(this);

  readonly username = signal(
    sanitizeUsername(localStorage.getItem('retro-user') ?? ''),
  );
  readonly roomCode = signal(
    sanitizeRoomCode(localStorage.getItem('retro-room') ?? ''),
  );
  readonly isDarkMode = signal(localStorage.getItem('retro-theme') === 'dark');
  readonly showRoomSwitchDialog = signal(false);
  readonly roomCodeFromUrl = signal('');

  constructor() {
    this.applyTheme(this.isDarkMode());
  }

  ngOnInit(): void {
    this.handleRoomQueryParam();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  onJoin(): void {
    this.username.set(
      sanitizeUsername(localStorage.getItem('retro-user') ?? ''),
    );
    this.roomCode.set(
      sanitizeRoomCode(localStorage.getItem('retro-room') ?? ''),
    );
  }

  toggleTheme(): void {
    const nextTheme = !this.isDarkMode();
    this.isDarkMode.set(nextTheme);
    localStorage.setItem('retro-theme', nextTheme ? 'dark' : 'light');
    this.applyTheme(nextTheme);
  }

  onMemoryLane(): void {
    this.router.navigate(['/memory-lane']);
  }

  confirmRoomSwitch(): void {
    const room = this.roomCodeFromUrl();
    if (room) {
      localStorage.setItem('retro-room', room);
      this.roomCode.set(room);
    }
    this.showRoomSwitchDialog.set(false);
    this.roomCodeFromUrl.set('');
    this.clearPendingRoom();
  }

  declineRoomSwitch(): void {
    this.showRoomSwitchDialog.set(false);
    this.roomCodeFromUrl.set('');
    this.clearPendingRoom();
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState !== 'visible') return;
    if (this.showRoomSwitchDialog()) return;

    // Re-read localStorage in case another tab changed the room or user
    const freshUser = sanitizeUsername(localStorage.getItem('retro-user') ?? '');
    const freshRoom = sanitizeRoomCode(localStorage.getItem('retro-room') ?? '');

    // Check for a ?room= query param that may have been added
    const urlRoom = sanitizeRoomCode(this.readPendingRoom());

    if (urlRoom && freshUser) {
      const activeRoom = freshRoom || this.roomCode();
      if (activeRoom && activeRoom !== urlRoom) {
        this.username.set(freshUser);
        this.roomCode.set(activeRoom);
        this.roomCodeFromUrl.set(urlRoom);
        this.showRoomSwitchDialog.set(true);
        this.clearPendingRoom();
        return;
      }
      if (!activeRoom || activeRoom === urlRoom) {
        localStorage.setItem('retro-room', urlRoom);
        this.username.set(freshUser);
        this.roomCode.set(urlRoom);
        this.clearPendingRoom();
        return;
      }
    }

    // Detect room changes made by another tab via localStorage
    if (freshUser && freshRoom && freshRoom !== this.roomCode()) {
      this.username.set(freshUser);
      this.roomCodeFromUrl.set(freshRoom);
      this.showRoomSwitchDialog.set(true);
    }
  }

  private handleRoomQueryParam(): void {
    // Angular's hash-based router may strip pre-hash query params before
    // this component loads. Fall back to the value captured in main.ts.
    const room = sanitizeRoomCode(this.readPendingRoom());
    if (!room) return;

    const currentUser = this.username();
    if (currentUser) {
      const currentRoom = this.roomCode();
      if (currentRoom && currentRoom !== room) {
        // User is in a different room — ask before switching
        this.roomCodeFromUrl.set(room);
        this.showRoomSwitchDialog.set(true);
        this.clearPendingRoom();
      } else {
        // No current room or same room — switch directly
        localStorage.setItem('retro-room', room);
        this.roomCode.set(room);
        this.clearPendingRoom();
      }
    }
    // If user is NOT logged in, leave pending room intact for AuthComponent to read
  }

  private clearRoomQueryParam(): void {
    const url = new URL(window.location.href);
    if (url.searchParams.has('room')) {
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.toString());
    }
  }

  /**
   * Read the pending room param from the URL, window global, or sessionStorage.
   * Does NOT consume/delete the value — call clearPendingRoom() separately
   * after the dialog is shown or the room is switched.
   */
  private readPendingRoom(): string {
    // 1. Try the URL search params (may still be present before router strips them)
    const params = new URLSearchParams(window.location.search);
    let raw = params.get('room') ?? '';

    // 2. Try the hash-based search params (#/?room=X)
    if (!raw) {
      const hashPart = window.location.hash.replace(/^#\/?/, '');
      const hashParams = new URLSearchParams(hashPart);
      raw = hashParams.get('room') ?? '';
    }

    // 3. Try the window global set by main.ts (survives router replaceState)
    if (!raw) {
      raw = ((window as unknown as Record<string, unknown>)[HomeComponent.PENDING_ROOM_WINDOW_KEY] as string) ?? '';
    }

    // 4. Try sessionStorage as last resort
    if (!raw) {
      raw = sessionStorage.getItem(HomeComponent.PENDING_ROOM_KEY) ?? '';
    }

    return raw;
  }

  /** Clear all pending-room storage locations. */
  private clearPendingRoom(): void {
    delete (window as unknown as Record<string, unknown>)[HomeComponent.PENDING_ROOM_WINDOW_KEY];
    sessionStorage.removeItem(HomeComponent.PENDING_ROOM_KEY);
    this.clearRoomQueryParam();
  }

  private applyTheme(isDarkMode: boolean): void {
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
  }
}
