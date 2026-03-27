import { Component, computed, input, output } from '@angular/core';
import { PostIt } from '../../models/post-it.model';

@Component({
  selector: 'app-post-it',
  standalone: true,
  templateUrl: './post-it.html',
  styleUrl: './post-it.css',
})
export class PostItComponent {
  readonly postIt = input.required<PostIt>();
  readonly votingActive = input(false);
  readonly username = input('');
  readonly hasVotesLeft = input(false);
  readonly voted = output<string>();
  readonly deleted = output<string>();

  readonly alreadyVoted = computed(() =>
    (this.postIt().voters ?? []).includes(this.username()),
  );

  readonly canVote = computed(
    () => this.votingActive() && this.hasVotesLeft() && !this.alreadyVoted(),
  );

  readonly voterNames = computed(() => this.postIt().voters ?? []);

  readonly voteCount = computed(() => this.voterNames().length);

  onVote(): void {
    if (this.canVote()) {
      this.voted.emit(this.postIt().id);
    }
  }

  onDelete(): void {
    this.deleted.emit(this.postIt().id);
  }
}
