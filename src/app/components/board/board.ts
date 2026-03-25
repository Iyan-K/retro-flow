import { Component, inject, input } from '@angular/core';
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
export class BoardComponent {
  private readonly retroService = inject(RetroService);
  readonly username = input.required<string>();

  readonly topPosts = this.retroService.topPosts;
  readonly tipPosts = this.retroService.tipPosts;
  readonly processPosts = this.retroService.processPosts;

  onAdd(event: { content: string; lane: PostIt['lane'] }): void {
    this.retroService.addPostIt(event.content, event.lane, this.username());
  }

  onVote(id: string): void {
    this.retroService.upvote(id);
  }

  onDelete(id: string): void {
    this.retroService.deletePostIt(id);
  }
}
