import { Component, inject, input, signal, OnInit, OnDestroy } from '@angular/core';
import { RetroService } from '../../services/retro.service';
import { LaneComponent } from '../lane/lane';
import { PostIt } from '../../models/post-it.model';

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
  readonly remainingVotes = this.retroService.remainingVotes;

  readonly filterOpen = signal(false);

  ngOnInit(): void {
    this.retroService.currentUser.set(this.username());

    const isCreator = localStorage.getItem('retro-is-creator') === 'true';
    if (isCreator) {
      localStorage.removeItem('retro-is-creator');
      this.retroService.createRoom(this.roomCode(), this.username());
    }

    this.retroService.listenToRoom(this.roomCode());
  }

  ngOnDestroy(): void {
    this.retroService.stopListening();
  }

  onAdd(event: { content: string; lane: PostIt['lane'] }): void {
    this.retroService.addPostIt(event.content, event.lane, this.username());
  }

  onVote(id: string): void {
    this.retroService.upvote(id);
  }

  onDelete(id: string): void {
    this.retroService.deletePostIt(id);
  }

  onLeave(): void {
    localStorage.removeItem('retro-user');
    localStorage.removeItem('retro-room');
    localStorage.removeItem('retro-is-creator');
    window.location.reload();
  }

  onStartVoting(): void {
    this.retroService.startVoting();
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
