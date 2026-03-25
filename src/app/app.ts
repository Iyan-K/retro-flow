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

  onJoin(): void {
    this.username.set(localStorage.getItem('retro-user') ?? '');
    this.roomCode.set(localStorage.getItem('retro-room') ?? '');
  }
}
