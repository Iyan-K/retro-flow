import { Component, inject, input, signal, OnInit, OnDestroy } from '@angular/core';
import { RetroService } from '../../services/retro.service';
import { LaneComponent } from '../lane/lane';
import { PostIt, RoomPhase } from '../../models/post-it.model';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [LaneComponent],
  templateUrl: './board.html',
  styleUrl: './board.css',
})
export class BoardComponent implements OnInit, OnDestroy {
  private readonly retroService = inject(RetroService);
  readonly username = input.required<string>();
  readonly roomCode = input.required<string>();

  readonly topPosts = this.retroService.topPosts;
  readonly tipPosts = this.retroService.tipPosts;
  readonly processPosts = this.retroService.processPosts;
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

  ngOnInit(): void {
    this.retroService.currentUser.set(this.username());

    const isCreator = localStorage.getItem('retro-is-creator') === 'true';
    if (isCreator) {
      localStorage.removeItem('retro-is-creator');
      this.retroService.createRoom(this.roomCode(), this.username());
    }

    this.retroService.listenToRoom(this.roomCode());
    this.retroService.joinRoom();
  }

  ngOnDestroy(): void {
    this.retroService.stopListening();
  }

  onAdd(event: { content: string; lane: PostIt['lane'] }): void {
    this.retroService.addPostIt(event.content, event.lane, this.username());
  }

  onVote(id: string): void {
    this.retroService.toggleVote(id);
  }

  onDelete(id: string): void {
    this.retroService.deletePostIt(id);
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
    localStorage.removeItem('retro-user');
    localStorage.removeItem('retro-room');
    localStorage.removeItem('retro-is-creator');
    window.location.reload();
  }

  onSetPhase(phase: RoomPhase): void {
    this.retroService.setPhase(phase);
  }

  onMarkReady(): void {
    this.retroService.markReady();
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
  }

  clearFilter(): void {
    this.retroService.filterAuthor.set('');
  }

  toggleFilter(): void {
    this.filterOpen.update((v) => !v);
  }
}
