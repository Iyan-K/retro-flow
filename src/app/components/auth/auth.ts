import { Component, output, signal, OnInit } from '@angular/core';
import { sanitizeUsername, sanitizeRoomCode } from '../../utils/sanitize';

@Component({
  selector: 'app-auth',
  standalone: true,
  templateUrl: './auth.html',
  styleUrl: './auth.css',
})
export class AuthComponent implements OnInit {
  readonly username = signal('');
  readonly roomCode = signal('');
  readonly rememberUsername = signal(true);
  readonly joined = output<void>();

  ngOnInit(): void {
    const rememberPref = localStorage.getItem('retro-remember-username');
    this.rememberUsername.set(rememberPref !== 'false');

    if (this.rememberUsername()) {
      const savedUser = localStorage.getItem('retro-user');
      if (savedUser) {
        this.username.set(savedUser);
      }
    }

    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      this.roomCode.set(sanitizeRoomCode(room));
    }
  }

  onJoin(): void {
    const name = sanitizeUsername(this.username());
    const room = sanitizeRoomCode(this.roomCode());
    if (name && room) {
      this.persistUsernamePreference(name);
      localStorage.setItem('retro-room', room);
      this.clearRoomQueryParam();
      this.joined.emit();
    }
  }

  private clearRoomQueryParam(): void {
    const url = new URL(window.location.href);
    if (url.searchParams.has('room')) {
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url.toString());
    }
  }

  onCreateRoom(): void {
    const name = sanitizeUsername(this.username());
    if (name) {
      const room = this.generateRoomCode();
      this.persistUsernamePreference(name);
      localStorage.setItem('retro-room', room);
      localStorage.setItem('retro-is-creator', 'true');
      this.joined.emit();
    }
  }

  onRememberUsernameChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.rememberUsername.set(checked);
    localStorage.setItem('retro-remember-username', String(checked));
    if (!checked) {
      localStorage.removeItem('retro-user');
    }
  }

  private persistUsernamePreference(name: string): void {
    if (this.rememberUsername()) {
      localStorage.setItem('retro-user', name);
    } else {
      localStorage.removeItem('retro-user');
    }
    localStorage.setItem('retro-remember-username', String(this.rememberUsername()));
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
