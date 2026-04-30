import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  OnDestroy,
  output,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RetroService } from '../../services/retro.service';
import { LaneComponent } from '../lane/lane';
import { EnergyLaneComponent } from '../energy-lane/energy-lane';
import { PostIt, RoomPhase } from '../../models/post-it.model';
import { addRoomToHistory, getRoomHistory, RoomHistoryEntry } from '../../utils/room-history';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [LaneComponent, EnergyLaneComponent, FormsModule],
  templateUrl: './board.html',
  styleUrl: './board.css',
})
export class BoardComponent implements OnInit, OnDestroy {
  private readonly retroService = inject(RetroService);
  @ViewChild('optionsMenu') optionsMenu?: ElementRef<HTMLDetailsElement>;
  readonly username = input.required<string>();
  readonly roomCode = input.required<string>();
  readonly isDarkMode = input.required<boolean>();
  readonly toggleThemeRequested = output<void>();

  readonly topPosts = this.retroService.topPosts;
  readonly tipPosts = this.retroService.tipPosts;
  readonly processPosts = this.retroService.processPosts;
  readonly energyPosts = this.retroService.energyPosts;
  readonly geleerdPosts = this.retroService.geleerdPosts;
  readonly rankedPosts = this.retroService.rankedPosts;
  readonly uniqueAuthors = this.retroService.uniqueAuthors;
  readonly filterAuthor = this.retroService.filterAuthor;
  readonly isOwner = this.retroService.isOwner;
  readonly votingActive = this.retroService.votingActive;
  readonly phase = this.retroService.phase;
  readonly remainingVotes = this.retroService.remainingVotes;
  readonly roomMembers = this.retroService.roomMembers;
  readonly readyUsers = this.retroService.readyUsers;
  readonly isCurrentUserReady = this.retroService.isCurrentUserReady;
  readonly allUsersReady = this.retroService.allUsersReady;
  readonly filterOpen = signal(false);
  readonly copied = signal(false);
  readonly suggestionsOpen = signal(false);
  readonly suggestionSubmitted = signal(false);
  readonly historyOpen = signal(false);
  readonly roomHistory = signal<RoomHistoryEntry[]>([]);

  ngOnInit(): void {
    this.retroService.currentUser.set(this.username());

    const isCreator = localStorage.getItem('retro-is-creator') === 'true';
    if (isCreator) {
      localStorage.removeItem('retro-is-creator');
      this.retroService.createRoom(this.roomCode(), this.username());
    }

    addRoomToHistory(this.roomCode());

    this.retroService.listenToRoom(this.roomCode());
    this.retroService.joinRoom();
  }

  ngOnDestroy(): void {
    this.retroService.stopListening();
  }

  onAdd(event: { content: string; lane: PostIt['lane'] }): void {
    this.retroService.addPostIt(event.content, event.lane, this.username());
  }

  onAddEnergy(event: {
    content: string;
    lane: PostIt['lane'];
    energyLevel: number;
    icon: string;
  }): void {
    this.retroService.addPostIt(event.content, event.lane, this.username(), {
      energyLevel: event.energyLevel,
      icon: event.icon,
    });
  }

  onVote(id: string): void {
    this.retroService.toggleVote(id);
  }

  onDelete(id: string): void {
    this.retroService.deletePostIt(id);
  }

  onEdit(event: { id: string; content: string }): void {
    this.retroService.updatePostIt(event.id, event.content);
  }

  onShare(): void {
    const url = new URL(window.location.href);
    url.searchParams.set('room', this.roomCode());
    navigator.clipboard.writeText(url.toString()).then(
      () => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      },
      () => {
        /* clipboard write failed – silently ignore */
      },
    );
  }

  onLeave(): void {
    localStorage.removeItem('retro-room');
    localStorage.removeItem('retro-is-creator');
    window.location.reload();
  }

  onToggleTheme(): void {
    this.toggleThemeRequested.emit();
  }

  onSetPhase(phase: RoomPhase): void {
    this.retroService.setPhase(phase);
  }

  onToggleReady(): void {
    if (this.isCurrentUserReady()) {
      this.retroService.unmarkReady();
    } else {
      this.retroService.markReady();
    }
  }

  isUserReady(author: string): boolean {
    return this.readyUsers().includes(author);
  }

  getInitials(name: string): string {
    return (name || '??').slice(0, 2).toUpperCase();
  }

  toggleAuthorFilter(author: string): void {
    this.retroService.filterAuthor.set(
      this.retroService.filterAuthor() === author ? '' : author,
    );
    this.filterOpen.set(false);
  }

  clearFilter(): void {
    this.retroService.filterAuthor.set('');
  }

  toggleFilter(): void {
    this.filterOpen.update((v) => !v);
  }

  toggleSuggestions(): void {
    this.suggestionSubmitted.set(false);
    this.suggestionsOpen.update((v) => !v);
  }

  closeSuggestions(): void {
    this.suggestionsOpen.set(false);
    this.suggestionSubmitted.set(false);
  }

  openHistory(): void {
    this.roomHistory.set(getRoomHistory());
    this.historyOpen.set(true);
    // Close the options menu so the dialog isn't hidden behind it.
    this.optionsMenu?.nativeElement.removeAttribute('open');
  }

  closeHistory(): void {
    this.historyOpen.set(false);
  }

  goToRoom(code: string): void {
    if (!code || code === this.roomCode()) {
      this.closeHistory();
      return;
    }
    localStorage.setItem('retro-room', code);
    localStorage.removeItem('retro-is-creator');
    window.location.reload();
  }

  onAddSuggestion(inputEl: HTMLInputElement | HTMLTextAreaElement): void {
    const text = inputEl.value;
    if (!text.trim()) return;
    inputEl.value = '';
    this.retroService.addSuggestion(text);
    this.suggestionSubmitted.set(true);
    setTimeout(() => this.closeSuggestions(), 2000);
  }

  onAddComment(postId: string, inputEl: HTMLInputElement): void {
    const text = inputEl.value;
    if (!text.trim()) return;
    inputEl.value = '';
    this.retroService.addComment(postId, text);
  }

  onPrintPdf(): void {
    window.print();
  }

  formatHistoryDate(timestamp: number): string {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return '';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const menu = this.optionsMenu?.nativeElement;
    if (!menu?.hasAttribute('open')) return;

    const target = event.target as Node | null;
    if (target && !menu.contains(target)) {
      menu.removeAttribute('open');
    }
  }

  getLaneBadge(lane: PostIt['lane']): string {
    switch (lane) {
      case 'top':
        return '👍 Wat ging goed';
      case 'tip':
        return '💡 Tips';
      case 'process':
        return '⚙️ Procesverbetering';
      case 'energy':
        return '⚡ Energie & Gevoel';
      case 'geleerd':
        return '📚 Geleerd';
    }
  }

  getLaneBadgeColor(lane: PostIt['lane']): string {
    switch (lane) {
      case 'top':
        return 'bg-emerald-400/60 text-emerald-900';
      case 'tip':
        return 'bg-sky-400/60 text-sky-900';
      case 'process':
        return 'bg-purple-400/60 text-purple-900';
      case 'energy':
        return 'bg-rose-400/60 text-rose-900';
      case 'geleerd':
        return 'bg-amber-400/60 text-amber-900';
    }
  }

  getEnergyBarColor(level: number): string {
    if (level <= 20) return 'bg-red-400';
    if (level <= 40) return 'bg-orange-400';
    if (level <= 60) return 'bg-yellow-400';
    if (level <= 80) return 'bg-lime-400';
    return 'bg-emerald-400';
  }
}
