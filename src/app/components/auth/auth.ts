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
      localStorage.setItem('retro-is-creator', 'true');
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
    const len = chars.length;
    const limit = 256 - (256 % len);
    let code = '';
    while (code.length < 6) {
      const byte = crypto.getRandomValues(new Uint8Array(1))[0];
      if (byte < limit) {
        code += chars[byte % len];
      }
    }
    return code;
  }
}
