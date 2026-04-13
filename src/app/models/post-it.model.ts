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
  author: string;
  text: string;
  createdAt: number;
}
