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
  setDoc,
  arrayUnion,
  arrayRemove,
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
  private static readonly MAX_VOTES_PER_USER = 3;

  private readonly app: FirebaseApp;
  private readonly db: Firestore;
  private unsubPosts: Unsubscribe | null = null;
  private unsubRoom: Unsubscribe | null = null;

  private readonly postItsSignal = signal<PostIt[]>([]);
  private roomId = '';

  readonly currentUser = signal('');
  readonly roomOwner = signal('');
  readonly votingActive = signal(false);

  readonly isOwner = computed(
    () =>
      this.currentUser() !== '' &&
      this.currentUser() === this.roomOwner(),
  );

  readonly remainingVotes = computed(() => {
    const user = this.currentUser();
    if (!user) return 0;
    return (
      RetroService.MAX_VOTES_PER_USER -
      this.postItsSignal().filter((p) => (p.voters ?? []).includes(user))
        .length
    );
  });

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

  async createRoom(roomId: string, owner: string): Promise<void> {
    const roomRef = doc(this.db, 'rooms', roomId);
    await setDoc(roomRef, { owner, votingActive: false });
  }

  listenToRoom(roomId: string): void {
    this.stopListening();
    this.roomId = roomId;

    // Listen to room document for owner & voting state
    const roomRef = doc(this.db, 'rooms', roomId);
    this.unsubRoom = onSnapshot(
      roomRef,
      (snapshot) => {
        const data = snapshot.data();
        if (data) {
          this.roomOwner.set((data['owner'] as string) ?? '');
          this.votingActive.set((data['votingActive'] as boolean) ?? false);
        }
      },
      (error) => {
        console.error('Room listener error:', error);
      },
    );

    // Listen to posts
    const postsRef = collection(this.db, 'rooms', roomId, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'asc'));

    this.unsubPosts = onSnapshot(
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

  async startVoting(): Promise<void> {
    const roomRef = doc(this.db, 'rooms', this.roomId);
    await updateDoc(roomRef, { votingActive: true });
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
      voters: [],
      createdAt: Date.now(),
    });
  }

  async toggleVote(id: string): Promise<void> {
    const user = this.currentUser();
    if (!user) return;
    const post = this.postItsSignal().find((p) => p.id === id);
    const hasVoted = post && (post.voters ?? []).includes(user);
    const postRef = doc(this.db, 'rooms', this.roomId, 'posts', id);
    await updateDoc(postRef, {
      voters: hasVoted ? arrayRemove(user) : arrayUnion(user),
    });
  }

  async deletePostIt(id: string): Promise<void> {
    const postRef = doc(this.db, 'rooms', this.roomId, 'posts', id);
    await deleteDoc(postRef);
  }

  stopListening(): void {
    if (this.unsubPosts) {
      this.unsubPosts();
      this.unsubPosts = null;
    }
    if (this.unsubRoom) {
      this.unsubRoom();
      this.unsubRoom = null;
    }
  }
}

