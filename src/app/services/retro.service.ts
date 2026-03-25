import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PostIt } from '../models/post-it.model';

@Injectable({
  providedIn: 'root',
})
export class RetroService {
  private readonly postItsSubject = new BehaviorSubject<PostIt[]>([]);
  private readonly postItsSignal = signal<PostIt[]>([]);

  readonly postIts = this.postItsSignal.asReadonly();

  readonly topPosts = computed(() =>
    this.postItsSignal().filter((p) => p.lane === 'top')
  );

  readonly tipPosts = computed(() =>
    this.postItsSignal().filter((p) => p.lane === 'tip')
  );

  readonly processPosts = computed(() =>
    this.postItsSignal().filter((p) => p.lane === 'process')
  );

  getPostIts(): Observable<PostIt[]> {
    return this.postItsSubject.asObservable();
  }

  addPostIt(content: string, lane: PostIt['lane'], author: string): void {
    const newPostIt: PostIt = {
      id: crypto.randomUUID(),
      authorName: author,
      content,
      lane,
      votes: 0,
      createdAt: new Date(),
    };

    const updated = [...this.postItsSignal(), newPostIt];
    this.postItsSignal.set(updated);
    this.postItsSubject.next(updated);
  }

  upvote(id: string): void {
    const updated = this.postItsSignal().map((p) =>
      p.id === id ? { ...p, votes: p.votes + 1 } : p
    );
    this.postItsSignal.set(updated);
    this.postItsSubject.next(updated);
  }

  deletePostIt(id: string): void {
    const updated = this.postItsSignal().filter((p) => p.id !== id);
    this.postItsSignal.set(updated);
    this.postItsSubject.next(updated);
  }
}
