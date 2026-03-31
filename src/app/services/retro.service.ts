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
  query,
  orderBy,
  arrayUnion,
  arrayRemove,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { PostIt, RoomPhase } from '../models/post-it.model';

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
  readonly phase = signal<RoomPhase>('writing');
  readonly roomMembers = signal<string[]>([]);
  readonly readyUsers = signal<string[]>([]);

  readonly votingActive = computed(() => this.phase() === 'voting');

  readonly isOwner = computed(
    () =>
      this.currentUser() !== '' &&
      this.currentUser() === this.roomOwner(),
  );

  readonly isCurrentUserReady = computed(() =>
    this.readyUsers().includes(this.currentUser()),
  );

  readonly allUsersReady = computed(() => {
    const members = this.roomMembers();
    const ready = this.readyUsers();
    const owner = this.roomOwner();
    const nonOwnerMembers = members.filter((m) => m !== owner);
    return (
      nonOwnerMembers.length > 0 &&
      nonOwnerMembers.every((m) => ready.includes(m))
    );
  });

  readonly remainingVotes = computed(() => {
    const user = this.currentUser();
    if (!user) return 0;
    const totalVotesCast = this.postItsSignal().reduce(
      (sum, p) => sum + (p.voters ?? []).filter((v) => v === user).length,
      0,
    );
    return RetroService.MAX_VOTES_PER_USER - totalVotesCast;
  });

  readonly postIts = this.postItsSignal.asReadonly();
  readonly filterAuthor = signal('');

  readonly uniqueAuthors = computed(() =>
    [...new Set(this.postItsSignal().map((p) => p.authorName))],
  );

  private readonly filteredPosts = computed(() => {
    const author = this.filterAuthor();
    const posts = this.postItsSignal();
    const filtered = author
      ? posts.filter((p) => p.authorName === author)
      : posts;

    // Sort so the current user's post-its always appear first
    const user = this.currentUser();
    if (!user) return filtered;
    return [...filtered].sort((a, b) => {
      const aIsOther = a.authorName === user ? 0 : 1;
      const bIsOther = b.authorName === user ? 0 : 1;
      return aIsOther - bIsOther;
    });
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
    await setDoc(roomRef, {
      owner,
      phase: 'writing' as RoomPhase,
      members: [owner],
      readyUsers: [],
    });
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
          this.roomMembers.set((data['members'] as string[]) ?? []);
          this.readyUsers.set((data['readyUsers'] as string[]) ?? []);
          if (data['phase']) {
            this.phase.set(data['phase'] as RoomPhase);
          } else {
            // Backward compatibility: map old votingActive boolean to phase
            this.phase.set(data['votingActive'] ? 'voting' : 'discussing');
          }
        }
      },
      (error) => {
        console.error('Room listener error:', error);
      },
    );

    // Listen to posts
    const postsRef = collection(this.db, 'rooms', roomId, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'));

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

  async setPhase(phase: RoomPhase): Promise<void> {
    const roomRef = doc(this.db, 'rooms', this.roomId);
    await updateDoc(roomRef, { phase, readyUsers: [] });
  }

  async joinRoom(): Promise<void> {
    const user = this.currentUser();
    if (!user || !this.roomId) return;
    const roomRef = doc(this.db, 'rooms', this.roomId);
    await setDoc(roomRef, { members: arrayUnion(user) }, { merge: true });
  }

  async markReady(): Promise<void> {
    const user = this.currentUser();
    if (!user || !this.roomId) return;
    const roomRef = doc(this.db, 'rooms', this.roomId);
    await setDoc(
      roomRef,
      { readyUsers: arrayUnion(user) },
      { merge: true },
    );
  }

  async unmarkReady(): Promise<void> {
    const user = this.currentUser();
    if (!user || !this.roomId) return;
    const roomRef = doc(this.db, 'rooms', this.roomId);
    await updateDoc(roomRef, { readyUsers: arrayRemove(user) });
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
    if (!post) return;

    let voters = [...(post.voters ?? [])];
    const hasVoted = voters.includes(user);

    if (this.remainingVotes() > 0) {
      voters.push(user);
    } else if (hasVoted) {
      voters = voters.filter((v) => v !== user);
    } else {
      return;
    }

    const postRef = doc(this.db, 'rooms', this.roomId, 'posts', id);
    await updateDoc(postRef, { voters });
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

