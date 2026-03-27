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
    () => this.votingActive() && (this.hasVotesLeft() || this.alreadyVoted()),
  );

  readonly voterNames = computed(() => this.postIt().voters ?? []);

  readonly voteCount = computed(() => this.voterNames().length);

  readonly uniqueVoterSummary = computed(() => {
    const voters = this.voterNames();
    const counts = new Map<string, number>();
    for (const v of voters) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) =>
      count > 1 ? `${name} (×${count})` : name,
    );
  });

  onVote(): void {
    if (this.canVote()) {
      this.voted.emit(this.postIt().id);
    }
  }

  onDelete(): void {
    this.deleted.emit(this.postIt().id);
  }
}
