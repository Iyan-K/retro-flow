import { Component, signal, inject } from '@angular/core';
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
export class HomeComponent {
  private readonly router = inject(Router);

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
    this.handleRoomQueryParam();
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
    this.clearRoomQueryParam();
  }

  declineRoomSwitch(): void {
    this.showRoomSwitchDialog.set(false);
    this.roomCodeFromUrl.set('');
    this.clearRoomQueryParam();
  }

  private handleRoomQueryParam(): void {
    const params = new URLSearchParams(window.location.search);
    const room = sanitizeRoomCode(params.get('room') ?? '');
    if (!room) return;

    const currentUser = this.username();
    if (currentUser) {
      const currentRoom = this.roomCode();
      if (currentRoom && currentRoom !== room) {
        // User is in a different room — ask before switching
        this.roomCodeFromUrl.set(room);
        this.showRoomSwitchDialog.set(true);
      } else {
        // No current room or same room — switch directly
        localStorage.setItem('retro-room', room);
        this.roomCode.set(room);
        this.clearRoomQueryParam();
      }
    }
    // If user is NOT logged in, leave ?room= intact for AuthComponent to read
  }

  private clearRoomQueryParam(): void {
    const url = new URL(window.location.href);
    if (url.searchParams.has('room')) {
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.toString());
    }
  }

  private applyTheme(isDarkMode: boolean): void {
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
  }
}
