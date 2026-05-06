export type RoomPhase = 'writing' | 'discussing' | 'voting' | 'ranking';

export interface PostItComment {
  author: string;
  text: string;
  createdAt: number;
}

export interface PostIt {
  id: string;
  authorName: string;
  content: string;
  lane: 'top' | 'tip' | 'process' | 'energy' | 'geleerd';
  votes: number;
  voters: string[];
  comments: PostItComment[];
  createdAt: number;
  energyLevel?: number;
  icon?: string;
}

export interface Suggestion {
  id: string;
  roomCode: string;
  author: string;
  text: string;
  createdAt: number;
}

export type Lane = PostIt['lane'];

export interface MemoryLanePost extends PostIt {
  roomCode: string;
}

/**
 * Display labels for each lane. Kept in sync with the badges used in
 * BoardComponent.getLaneBadge so Memory Lane uses the same vocabulary.
 */
export const LANE_LABELS: Record<Lane, string> = {
  top: '👍 Wat ging goed',
  tip: '💡 Tips',
  process: '⚙️ Procesverbetering',
  energy: '⚡ Energie & Gevoel',
  geleerd: '📚 Geleerd',
};

/**
 * Order in which lanes are displayed in Memory Lane (matches the board layout).
 */
export const LANE_ORDER: readonly Lane[] = [
  'energy',
  'top',
  'tip',
  'process',
  'geleerd',
] as const;
