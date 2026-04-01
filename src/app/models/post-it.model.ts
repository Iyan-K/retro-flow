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
  lane: 'top' | 'tip' | 'process';
  votes: number;
  voters: string[];
  comments: PostItComment[];
  createdAt: number;
}
