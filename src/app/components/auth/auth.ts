import { Component, output, signal, OnInit } from '@angular/core';
import { sanitizeUsername, sanitizeRoomCode } from '../../utils/sanitize';
import { clearRoomDeepLink, readPendingRoomCode } from '../../utils/room-deep-link';

@Component({
  selector: 'app-auth',
  standalone: true,
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class AuthComponent implements OnInit {
  readonly username = signal('');
  readonly roomCode = signal('');
  readonly joined = output<void>();

  ngOnInit(): void {
    const savedUser = localStorage.getItem('retro-user');
    if (savedUser) {
      this.username.set(savedUser);
    }

    // Fall back to the value captured before Angular's router stripped it.
    const rawRoom = readPendingRoomCode();
    if (rawRoom) {
      this.roomCode.set(sanitizeRoomCode(rawRoom));
    }
  }

  onJoin(): void {
    const name = sanitizeUsername(this.username());
    const room = sanitizeRoomCode(this.roomCode());
    if (name && room) {
      localStorage.setItem('retro-user', name);
      localStorage.setItem('retro-room', room);
      this.clearRoomQueryParam();
      this.joined.emit();
    }
  }

  private clearRoomQueryParam(): void {
    clearRoomDeepLink();
  }

  onCreateRoom(): void {
    const name = sanitizeUsername(this.username());
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
