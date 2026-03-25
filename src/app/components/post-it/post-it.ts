import { Component, input, output } from '@angular/core';
import { PostIt } from '../../models/post-it.model';

@Component({
  selector: 'app-post-it',
  standalone: true,
  templateUrl: './post-it.html',
  styleUrl: './post-it.css',
})
export class PostItComponent {
  readonly postIt = input.required<PostIt>();
  readonly voted = output<string>();
  readonly deleted = output<string>();

  onVote(): void {
    this.voted.emit(this.postIt().id);
  }

  onDelete(): void {
    this.deleted.emit(this.postIt().id);
  }
}
