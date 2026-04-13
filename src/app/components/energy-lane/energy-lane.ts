import { Component, computed, input, output, signal } from '@angular/core';
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
  readonly moreIconsOpen = signal(false);

  /** Whether the current user already submitted an energy post */
  readonly hasExistingPost = computed(() => {
    const user = this.username();
    return user
      ? this.posts().some((p) => p.lane === 'energy' && p.authorName === user)
      : false;
  });

  readonly energyLevels = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  /** Number of icons visible without opening the kebab menu (one row of 4) */
  private static readonly VISIBLE_ICON_COUNT = 8;

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
    { emoji: '😢', label: 'Verdrietig' },
    { emoji: '😡', label: 'Boos' },
    { emoji: '🥳', label: 'Feestelijk' },
    { emoji: '😇', label: 'Dankbaar' },
    { emoji: '🤯', label: 'Mind-blown' },
    { emoji: '🥱', label: 'Verveeld' },
    { emoji: '😬', label: 'Ongemakkelijk' },
    { emoji: '🫣', label: 'Onzeker' },
    { emoji: '🤗', label: 'Warm' },
    { emoji: '😵‍💫', label: 'Duizelig' },
    { emoji: '🫠', label: 'Overweldigd' },
    { emoji: '😅', label: 'Opgelucht' },
    { emoji: '🧘', label: 'Kalm' },
    { emoji: '🙃', label: 'Sarcastisch' },
    { emoji: '🤓', label: 'Leergierig' },
    { emoji: '🫡', label: 'Gemotiveerd' },
    { emoji: '😶‍🌫️', label: 'Afwezig' },
    { emoji: '🏃', label: 'Gehaast' },
    { emoji: '🎯', label: 'Gefocust' },
    { emoji: '☕', label: 'Koffie nodig' },
  ];

  get visibleIcons(): { emoji: string; label: string }[] {
    return this.icons.slice(0, EnergyLaneComponent.VISIBLE_ICON_COUNT);
  }

  get overflowIcons(): { emoji: string; label: string }[] {
    return this.icons.slice(EnergyLaneComponent.VISIBLE_ICON_COUNT);
  }

  toggleMoreIcons(): void {
    this.moreIconsOpen.update((v) => !v);
  }

  selectEnergy(level: number): void {
    if (this.hasExistingPost()) return;
    this.selectedEnergy.set(level);
    this.trySubmit();
  }

  selectIcon(emoji: string): void {
    if (this.hasExistingPost()) return;
    this.selectedIcon.set(emoji);
    this.moreIconsOpen.set(false);
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
