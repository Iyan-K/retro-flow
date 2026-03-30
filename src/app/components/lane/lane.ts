import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PostIt } from '../../models/post-it.model';
import { PostItComponent } from '../post-it/post-it';

@Component({
  selector: 'app-lane',
  standalone: true,
  imports: [PostItComponent, FormsModule],
  templateUrl: './lane.html',
  styleUrl: './lane.css',
})
export class LaneComponent {
  readonly title = input.required<string>();
  readonly posts = input.required<PostIt[]>();
  readonly laneType = input.required<PostIt['lane']>();
  readonly votingActive = input(false);
  readonly username = input('');
  readonly hasVotesLeft = input(false);
  readonly voted = output<string>();
  readonly deleted = output<string>();
  readonly added = output<{ content: string; lane: PostIt['lane'] }>();

  newContent = '';

  get headerColor(): string {
    switch (this.laneType()) {
      case 'top':
        return 'bg-emerald-400/60';
      case 'tip':
        return 'bg-sky-400/60';
      case 'process':
        return 'bg-purple-400/60';
    }
  }

  get emptyMessage(): string {
    switch (this.laneType()) {
      case 'top':
        return 'Nog geen notities. Wat ging er goed? Bijvoorbeeld: \'De samenwerking in het team was top!\', \'De demo aan de stakeholders ging soepel.\', \'We hebben de sprint op tijd afgerond.\'';
      case 'tip':
        return 'Nog geen notities. Heb je tips? Bijvoorbeeld: \'Meer pair programming sessies plannen.\', \'Vaker korte feedback-momenten inlassen.\', \'User stories beter opsplitsen voor de sprint.\'';
      case 'process':
        return 'Nog geen notities. Wat kan beter in het proces? Bijvoorbeeld: \'Stand-ups korter en meer to-the-point houden.\', \'Duidelijkere Definition of Done afspreken.\', \'Minder context-switching tussen taken.\'';
    }
  }

  onAdd(): void {
    const content = this.newContent.trim();
    if (content) {
      this.added.emit({ content, lane: this.laneType() });
      this.newContent = '';
    }
  }

  onVote(id: string): void {
    this.voted.emit(id);
  }

  onDelete(id: string): void {
    this.deleted.emit(id);
  }
}
