import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  increment,
  query,
  orderBy,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { PostIt } from '../models/post-it.model';

@Injectable({
  providedIn: 'root',
})
export class RetroService implements OnDestroy {
  private readonly app: FirebaseApp;
  private readonly db: Firestore;
  private unsubscribe: Unsubscribe | null = null;

  private readonly postItsSignal = signal<PostIt[]>([]);
  private roomId = '';

  readonly postIts = this.postItsSignal.asReadonly();
  readonly filterAuthor = signal('');

  readonly uniqueAuthors = computed(() =>
    [...new Set(this.postItsSignal().map((p) => p.authorName))],
  );

  private readonly filteredPosts = computed(() => {
    const author = this.filterAuthor();
    const posts = this.postItsSignal();
    return author ? posts.filter((p) => p.authorName === author) : posts;
  });

  readonly topPosts = computed(() =>
    this.filteredPosts().filter((p) => p.lane === 'top'),
  );

  readonly tipPosts = computed(() =>
    this.filteredPosts().filter((p) => p.lane === 'tip'),
  );

  readonly processPosts = computed(() =>
    this.filteredPosts().filter((p) => p.lane === 'process'),
  );

  constructor() {
    this.app = initializeApp(environment.firebase);
    this.db = initializeFirestore(this.app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  }

  ngOnDestroy(): void {
    this.stopListening();
  }

  listenToRoom(roomId: string): void {
    this.stopListening();
    this.roomId = roomId;

    const postsRef = collection(this.db, 'rooms', roomId, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'asc'));

    this.unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const posts: PostIt[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PostIt, 'id'>),
        }));
        this.postItsSignal.set(posts);
      },
      (error) => {
        console.error('Firestore listener error:', error);
      },
    );
  }

  async addPostIt(
    content: string,
    lane: PostIt['lane'],
    author: string,
  ): Promise<void> {
    const postsRef = collection(this.db, 'rooms', this.roomId, 'posts');
    await addDoc(postsRef, {
      authorName: author,
      content,
      lane,
      votes: 0,
      createdAt: Date.now(),
    });
  }

  async upvote(id: string): Promise<void> {
    const postRef = doc(this.db, 'rooms', this.roomId, 'posts', id);
    await updateDoc(postRef, { votes: increment(1) });
  }

  async deletePostIt(id: string): Promise<void> {
    const postRef = doc(this.db, 'rooms', this.roomId, 'posts', id);
    await deleteDoc(postRef);
  }

  stopListening(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

