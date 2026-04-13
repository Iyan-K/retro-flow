import { Component, input, output, signal } from '@angular/core';
import { PostIt, RoomPhase } from '../../models/post-it.model';

@Component({
  selector: 'app-energy-lane',
  standalone: true,
  imports: [],
  templateUrl: './energy-lane.html',
  styleUrl: './energy-lane.css',
})
export class EnergyLaneComponent {
  readonly title = input.required<string>();
  readonly posts = input.required<PostIt[]>();
  readonly votingActive = input(false);
  readonly phase = input<RoomPhase>('writing');
  readonly username = input('');
  readonly hasVotesLeft = input(false);
  readonly voted = output<string>();
  readonly deleted = output<string>();
  readonly added = output<{
    content: string;
    lane: PostIt['lane'];
    energyLevel: number;
    icon: string;
  }>();

  readonly selectedEnergy = signal<number | null>(null);
  readonly selectedIcon = signal<string>('');

  readonly energyLevels = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  readonly icons: { emoji: string; label: string }[] = [
    { emoji: '😀', label: 'Blij' },
    { emoji: '😊', label: 'Tevreden' },
    { emoji: '😐', label: 'Neutraal' },
    { emoji: '😔', label: 'Somber' },
    { emoji: '😤', label: 'Gefrustreerd' },
    { emoji: '😴', label: 'Moe' },
    { emoji: '🤩', label: 'Enthousiast' },
    { emoji: '😰', label: 'Gestrest' },
    { emoji: '🤔', label: 'Nadenkend' },
    { emoji: '💪', label: 'Sterk' },
    { emoji: '🔥', label: 'Energiek' },
    { emoji: '😎', label: 'Relaxed' },
  ];

  selectEnergy(level: number): void {
    this.selectedEnergy.set(level);
    this.trySubmit();
  }

  selectIcon(emoji: string): void {
    this.selectedIcon.set(emoji);
    this.trySubmit();
  }

  private trySubmit(): void {
    const energy = this.selectedEnergy();
    const icon = this.selectedIcon();
    if (energy !== null && icon) {
      this.added.emit({
        content: `${icon} ${energy}%`,
        lane: 'energy',
        energyLevel: energy,
        icon,
      });
      this.selectedEnergy.set(null);
      this.selectedIcon.set('');
    }
  }

  getEnergyBarColor(level: number): string {
    if (level <= 20) return 'bg-red-400';
    if (level <= 40) return 'bg-orange-400';
    if (level <= 60) return 'bg-yellow-400';
    if (level <= 80) return 'bg-lime-400';
    return 'bg-emerald-400';
  }

  getEnergyColor(level: number): string {
    if (level <= 20) return 'bg-red-400/70 text-red-900';
    if (level <= 40) return 'bg-orange-400/70 text-orange-900';
    if (level <= 60) return 'bg-yellow-400/70 text-yellow-900';
    if (level <= 80) return 'bg-lime-400/70 text-lime-900';
    return 'bg-emerald-400/70 text-emerald-900';
  }

  onVote(id: string): void {
    this.voted.emit(id);
  }

  onDelete(id: string): void {
    this.deleted.emit(id);
  }
}
