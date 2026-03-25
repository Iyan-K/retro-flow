export interface PostIt {
  id: string;
  authorName: string;
  content: string;
  lane: 'top' | 'tip' | 'process';
  votes: number;
  createdAt: number;
}
