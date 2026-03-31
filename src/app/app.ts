import { Component, signal } from '@angular/core';
import { AuthComponent } from './components/auth/auth';
import { BoardComponent } from './components/board/board';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AuthComponent, BoardComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly username = signal(localStorage.getItem('retro-user') ?? '');
  readonly roomCode = signal(localStorage.getItem('retro-room') ?? '');

  constructor() {
    this.handleRoomQueryParam();
  }

  onJoin(): void {
    this.username.set(localStorage.getItem('retro-user') ?? '');
    this.roomCode.set(localStorage.getItem('retro-room') ?? '');
  }

  private handleRoomQueryParam(): void {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room')?.trim().toUpperCase();
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
}
