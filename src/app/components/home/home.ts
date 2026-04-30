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

  private handleRoomQueryParam(): void {
    const params = new URLSearchParams(window.location.search);
    const room = sanitizeRoomCode(params.get('room') ?? '');
    if (!room) return;

    const currentUser = this.username();
    if (currentUser) {
      // User is already logged in — switch to the new room
      localStorage.setItem('retro-room', room);
      this.roomCode.set(room);

      // Clear the query param so the board doesn't re-read it
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.toString());
    }
    // If user is NOT logged in, leave ?room= intact for AuthComponent to read
  }

  private applyTheme(isDarkMode: boolean): void {
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
  }
}
