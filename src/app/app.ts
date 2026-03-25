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

  onJoin(): void {
    this.username.set(localStorage.getItem('retro-user') ?? '');
  }
}
