import { Component, inject, input, OnInit, OnDestroy } from '@angular/core';
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

  ngOnInit(): void {
    this.retroService.listenToRoom(this.roomCode());
  }

  ngOnDestroy(): void {
    this.retroService.ngOnDestroy();
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
    window.location.reload();
  }
}
