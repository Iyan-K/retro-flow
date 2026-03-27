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
  readonly voted = output<string>();
  readonly deleted = output<string>();
  readonly added = output<{ content: string; lane: PostIt['lane'] }>();

  newContent = '';

  get headerColor(): string {
    switch (this.laneType()) {
      case 'top':
        return 'bg-emerald-500/40';
      case 'tip':
        return 'bg-sky-500/40';
      case 'process':
        return 'bg-purple-500/40';
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
