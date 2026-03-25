import { Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-auth',
  standalone: true,
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class AuthComponent {
  readonly username = signal('');
  readonly joined = output<void>();

  onJoin(): void {
    const name = this.username().trim();
    if (name) {
      localStorage.setItem('retro-user', name);
      this.joined.emit();
    }
  }

  onUsernameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.username.set(input.value);
  }
}
