import { Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-auth',
  standalone: true,
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class AuthComponent {
  readonly username = signal('');
  readonly roomCode = signal('');
  readonly joined = output<void>();

  onJoin(): void {
    const name = this.username().trim();
    const room = this.roomCode().trim().toUpperCase();
    if (name && room) {
      localStorage.setItem('retro-user', name);
      localStorage.setItem('retro-room', room);
      this.joined.emit();
    }
  }

  onCreateRoom(): void {
    const name = this.username().trim();
    if (name) {
      const room = this.generateRoomCode();
      localStorage.setItem('retro-user', name);
      localStorage.setItem('retro-room', room);
      this.joined.emit();
    }
  }

  onUsernameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.username.set(input.value);
  }

  onRoomCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.roomCode.set(input.value);
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    const values = crypto.getRandomValues(new Uint8Array(6));
    for (const v of values) {
      code += chars[v % chars.length];
    }
    return code;
  }
}
