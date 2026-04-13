import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PostIt, RoomPhase } from '../../models/post-it.model';

@Component({
  selector: 'app-post-it',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './post-it.html',
  styleUrl: './post-it.css',
})
export class PostItComponent {
  readonly postIt = input.required<PostIt>();
  readonly votingActive = input(false);
  readonly phase = input<RoomPhase>('writing');
  readonly username = input('');
  readonly hasVotesLeft = input(false);
  readonly voted = output<string>();
  readonly deleted = output<string>();
  readonly edited = output<{ id: string; content: string }>();

  readonly editing = signal(false);
  editContent = '';

  readonly isOwnPost = computed(
    () => this.postIt().authorName === this.username(),
  );

  readonly isBlurred = computed(
    () => this.phase() === 'writing' && !this.isOwnPost(),
  );

  readonly canEdit = computed(
    () => this.phase() === 'writing' && this.isOwnPost(),
  );

  readonly canDelete = computed(() => {
    const phase = this.phase();
    if (phase === 'voting' || phase === 'discussing') return false;
    if (phase === 'writing') return this.isOwnPost();
    return true; // ranking phase: anyone can delete
  });

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

  onStartEdit(): void {
    this.editContent = this.postIt().content;
    this.editing.set(true);
  }

  onCancelEdit(): void {
    this.editing.set(false);
  }

  onSaveEdit(): void {
    const content = this.editContent.trim();
    if (content && content !== this.postIt().content) {
      this.edited.emit({ id: this.postIt().id, content });
    }
    this.editing.set(false);
  }
}
