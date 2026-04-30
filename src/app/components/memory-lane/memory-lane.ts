import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { RetroService } from '../../services/retro.service';
import { sanitizeUsername } from '../../utils/sanitize';
import {
  Lane,
  LANE_LABELS,
  LANE_ORDER,
  MemoryLanePost,
} from '../../models/post-it.model';

interface LaneGroup {
  lane: Lane;
  label: string;
  posts: MemoryLanePost[];
}

@Component({
  selector: 'app-memory-lane',
  standalone: true,
  templateUrl: './memory-lane.html',
  styleUrl: './memory-lane.css',
})
export class MemoryLaneComponent implements OnInit {
  private readonly retroService = inject(RetroService);
  private readonly router = inject(Router);

  readonly username = signal('');
  readonly posts = signal<MemoryLanePost[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  /** Current date in the user's locale; re-evaluated on each access so a long-lived view doesn't stale. */
  get today(): string {
    return new Date().toLocaleDateString();
  }

  readonly groups = computed<LaneGroup[]>(() => {
    const all = this.posts();
    const byLane = new Map<Lane, MemoryLanePost[]>();
    for (const p of all) {
      const list = byLane.get(p.lane) ?? [];
      list.push(p);
      byLane.set(p.lane, list);
    }
    // Posts arrive newest-first from the query; preserve that order.
    return LANE_ORDER.filter((lane) => (byLane.get(lane)?.length ?? 0) > 0).map(
      (lane) => ({
        lane,
        label: LANE_LABELS[lane],
        posts: byLane.get(lane) ?? [],
      }),
    );
  });

  readonly hasPosts = computed(() => this.posts().length > 0);

  async ngOnInit(): Promise<void> {
    const stored = sanitizeUsername(localStorage.getItem('retro-user') ?? '');
    if (!stored) {
      // Not logged in — bounce back to the home/auth screen.
      this.router.navigate(['/']);
      return;
    }
    this.username.set(stored);

    try {
      const results = await this.retroService.getUserMemoryLane(stored);
      this.posts.set(results);
    } catch (e) {
      console.error('Failed to load Memory Lane:', e);
      this.error.set(
        'Het laden van je geschiedenis is niet gelukt. Probeer het later opnieuw.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  onBack(): void {
    this.router.navigate(['/']);
  }

  onExportPdf(): void {
    window.print();
  }

  formatDate(timestamp: number): string {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toLocaleString();
  }

  laneBadgeColor(lane: Lane): string {
    switch (lane) {
      case 'top':
        return 'bg-emerald-400/60 text-emerald-900';
      case 'tip':
        return 'bg-sky-400/60 text-sky-900';
      case 'process':
        return 'bg-purple-400/60 text-purple-900';
      case 'energy':
        return 'bg-rose-400/60 text-rose-900';
      case 'geleerd':
        return 'bg-amber-400/60 text-amber-900';
    }
  }
}
