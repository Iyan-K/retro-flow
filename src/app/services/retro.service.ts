import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  collectionGroup,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { PostIt, PostItComment, RoomPhase, MemoryLanePost } from '../models/post-it.model';
import {
  sanitizeUsername,
  sanitizeRoomCode,
  sanitizePostContent,
  sanitizeComment,
  sanitizeSuggestion,
} from '../utils/sanitize';
import { getRoomHistory } from '../utils/room-history';

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
  readonly roomCreatedAt = signal<number>(0);

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

  readonly energyPosts = computed(() =>
    this.filteredPosts().filter((p) => p.lane === 'energy'),
  );

  readonly geleerdPosts = computed(() =>
    this.filteredPosts().filter((p) => p.lane === 'geleerd'),
  );

  readonly rankedPosts = computed(() =>
    [...this.postItsSignal()]
      .filter((p) => p.lane !== 'energy')
      .sort(
        (a, b) => (b.voters?.length ?? 0) - (a.voters?.length ?? 0),
      ),
  );

  /**
   * Posts that have been added to the shared group TODO list.
   * Energy-lane posts are excluded — they aren't actionable items.
   * Ordered by vote count (most voted first) to mirror the ranking view.
   */
  readonly todoPosts = computed(() =>
    [...this.postItsSignal()]
      .filter((p) => p.inTodo && p.lane !== 'energy')
      .sort((a, b) => {
        // Uncompleted items first, then by votes (most voted first).
        const aDone = a.todoCompleted ? 1 : 0;
        const bDone = b.todoCompleted ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return (b.voters?.length ?? 0) - (a.voters?.length ?? 0);
      }),
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
    const safeId = sanitizeRoomCode(roomId);
    const safeOwner = sanitizeUsername(owner);
    if (!safeId || !safeOwner) return;

    const roomRef = doc(this.db, 'rooms', safeId);
    await setDoc(roomRef, {
      owner: safeOwner,
      phase: 'writing' as RoomPhase,
      members: [safeOwner],
      readyUsers: [],
      createdAt: Date.now(),
    });
  }

  listenToRoom(roomId: string): void {
    this.stopListening();
    const safeId = sanitizeRoomCode(roomId);
    if (!safeId) return;
    this.roomId = safeId;

    // Listen to room document for owner & voting state
    const roomRef = doc(this.db, 'rooms', safeId);
    this.unsubRoom = onSnapshot(
      roomRef,
      (snapshot) => {
        const data = snapshot.data();
        if (data) {
          this.roomOwner.set((data['owner'] as string) ?? '');
          this.roomMembers.set((data['members'] as string[]) ?? []);
          this.readyUsers.set((data['readyUsers'] as string[]) ?? []);
          if (typeof data['createdAt'] === 'number') {
            this.roomCreatedAt.set(data['createdAt']);
          }
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
    const postsRef = collection(this.db, 'rooms', safeId, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'));

    this.unsubPosts = onSnapshot(
      q,
      (snapshot) => {
        const posts: PostIt[] = snapshot.docs.map((d) => {
          const data = d.data() as Omit<PostIt, 'id'>;
          return {
            id: d.id,
            ...data,
            comments: data.comments ?? [],
          };
        });
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
    const user = sanitizeUsername(this.currentUser());
    if (!user || !this.roomId) return;
    const roomRef = doc(this.db, 'rooms', this.roomId);
    await setDoc(roomRef, { members: arrayUnion(user) }, { merge: true });
  }

  async markReady(): Promise<void> {
    const user = sanitizeUsername(this.currentUser());
    if (!user || !this.roomId) return;
    const roomRef = doc(this.db, 'rooms', this.roomId);
    await setDoc(
      roomRef,
      { readyUsers: arrayUnion(user) },
      { merge: true },
    );
  }

  async unmarkReady(): Promise<void> {
    const user = sanitizeUsername(this.currentUser());
    if (!user || !this.roomId) return;
    const roomRef = doc(this.db, 'rooms', this.roomId);
    await updateDoc(roomRef, { readyUsers: arrayRemove(user) });
  }

  async addPostIt(
    content: string,
    lane: PostIt['lane'],
    author: string,
    options?: { energyLevel?: number; icon?: string },
  ): Promise<void> {
    const safeContent = sanitizePostContent(content);
    const safeAuthor = sanitizeUsername(author);
    if (!safeAuthor) return;
    // For energy lane, content can be empty (icon-only post-its)
    if (lane !== 'energy' && !safeContent) return;

    // Limit one energy post per user
    if (lane === 'energy') {
      const existing = this.postItsSignal().find(
        (p) => p.lane === 'energy' && p.authorName === safeAuthor,
      );
      if (existing) return;
    }

    const postData: Record<string, unknown> = {
      authorName: safeAuthor,
      content: safeContent ?? '',
      lane,
      votes: 0,
      voters: [],
      createdAt: Date.now(),
    };
    if (options?.energyLevel !== undefined) {
      postData['energyLevel'] = options.energyLevel;
    }
    if (options?.icon) {
      postData['icon'] = options.icon;
    }

    const postsRef = collection(this.db, 'rooms', this.roomId, 'posts');
    await addDoc(postsRef, postData);
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

  async addComment(postId: string, text: string): Promise<void> {
    const user = sanitizeUsername(this.currentUser());
    const safeText = sanitizeComment(text);
    if (!user || !safeText) return;
    const comment: PostItComment = {
      author: user,
      text: safeText,
      createdAt: Date.now(),
    };
    const postRef = doc(this.db, 'rooms', this.roomId, 'posts', postId);
    await updateDoc(postRef, { comments: arrayUnion(comment) });
  }

  async updatePostIt(id: string, content: string): Promise<void> {
    const safeContent = sanitizePostContent(content);
    if (!safeContent) return;
    const postRef = doc(this.db, 'rooms', this.roomId, 'posts', id);
    await updateDoc(postRef, { content: safeContent });
  }

  async deletePostIt(id: string): Promise<void> {
    const postRef = doc(this.db, 'rooms', this.roomId, 'posts', id);
    await deleteDoc(postRef);
  }

  /**
   * Toggle whether a post belongs to the shared group TODO list.
   * The flag lives on the post document so every participant sees the
   * same TODO list in real-time through the existing posts listener.
   */
  async toggleTodo(id: string): Promise<void> {
    const post = this.postItsSignal().find((p) => p.id === id);
    if (!post) return;
    const nextInTodo = !post.inTodo;
    const postRef = doc(this.db, 'rooms', this.roomId, 'posts', id);
    // When removing from the TODO list, also clear the completion state so
    // it doesn't carry over if the item is re-added later.
    if (!nextInTodo) {
      await updateDoc(postRef, {
        inTodo: false,
        todoCompleted: false,
        todoCompletedBy: '',
      });
    } else {
      await updateDoc(postRef, { inTodo: true });
    }
  }

  /**
   * Mark a shared TODO item as completed (or un-complete it). The state is
   * stored on the post document so every participant sees the same status
   * in real-time through the existing posts listener.
   */
  async setTodoCompleted(id: string, completed: boolean): Promise<void> {
    const post = this.postItsSignal().find((p) => p.id === id);
    if (!post || !post.inTodo) return;
    const user = sanitizeUsername(this.currentUser());
    const postRef = doc(this.db, 'rooms', this.roomId, 'posts', id);
    await updateDoc(postRef, {
      todoCompleted: completed,
      todoCompletedBy: completed ? user : '',
    });
  }

  async addSuggestion(text: string): Promise<void> {
    const user = sanitizeUsername(this.currentUser());
    const safeText = sanitizeSuggestion(text);
    if (!user || !safeText || !this.roomId) return;
    const suggestionsRef = collection(this.db, 'suggestions');
    await addDoc(suggestionsRef, {
      roomCode: this.roomId,
      author: user,
      text: safeText,
      createdAt: Date.now(),
    });
  }

  /**
   * Returns every post the given user has ever authored across all rooms.
   *
   * One-shot read (no realtime listener) — Memory Lane is a snapshot-in-time
   * view. Does not touch the active room listener or the postItsSignal.
   *
   * Prefers the indexed query (authorName ASC, createdAt DESC). If the
   * required collection-group index hasn't been deployed yet, Firestore
   * raises `failed-precondition`; in that case we fall back to a query
   * without `orderBy` and sort client-side, so Memory Lane still works.
   *
   * Requires firestore.rules to permit collection-group reads on posts.
   */
  async getUserMemoryLane(username: string): Promise<MemoryLanePost[]> {
    const safeUser = sanitizeUsername(username);
    if (!safeUser) return [];

    const postsGroup = collectionGroup(this.db, 'posts');
    const filter = where('authorName', '==', safeUser);

    let snapshot;
    let needsClientSort = false;
    try {
      snapshot = await getDocs(
        query(postsGroup, filter, orderBy('createdAt', 'desc')),
      );
    } catch (e) {
      // Firestore throws `failed-precondition` when the composite
      // collection-group index for (authorName, createdAt) is missing.
      // Retry without the orderBy and sort client-side as a fallback.
      const code = (e as { code?: string } | null)?.code;
      if (code !== 'failed-precondition') throw e;
      console.warn(
        'Memory Lane: composite index missing, falling back to client-side sort. ' +
          'Deploy with `firebase deploy --only firestore:indexes` to remove this fallback.',
        e,
      );
      snapshot = await getDocs(query(postsGroup, filter));
      needsClientSort = true;
    }

    const posts = snapshot.docs.map((d) => {
      const data = d.data() as Omit<PostIt, 'id'>;
      // posts live at rooms/{roomId}/posts/{postId}; parent.parent is the room doc.
      const roomCode = d.ref.parent.parent?.id ?? '';
      return {
        id: d.id,
        ...data,
        comments: data.comments ?? [],
        roomCode,
      };
    });

    if (needsClientSort) {
      posts.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }
    return posts;
  }

  /**
   * Returns every group-TODO item from every room the given user has
   * been a member of. Used by the board "Mijn TODO" menu to give a
   * personal cross-room overview.
   *
   * One-shot read (no realtime listener). Strategy:
   *   1. Collect candidate room codes from two sources and union them:
   *        a. Firestore `rooms` where `members` array-contains the user
   *           (covers rooms joined on other devices).
   *        b. The local `retro-history` (covers rooms visited before the
   *           `members` field existed, or before `joinRoom` finished).
   *      If the Firestore rooms query fails for any reason we still fall
   *      back to the local history so the dialog can render.
   *   2. For each candidate room, query its `posts` subcollection where
   *      `inTodo == true`. We use `Promise.allSettled` so a single bad
   *      room (missing, permission-denied, transient network error)
   *      doesn't break the entire dialog.
   *
   * Per-room queries are used instead of a `collectionGroup('posts')`
   * query so we don't depend on a collection-group index for `inTodo`
   * (which has to be deployed separately and previously caused the
   * "Mijn TODO" dialog to fail to load).
   *
   * Energy-lane posts are excluded — they aren't actionable items
   * (mirroring `todoPosts`).
   */
  async getUserTodos(username: string): Promise<MemoryLanePost[]> {
    const safeUser = sanitizeUsername(username);
    if (!safeUser) return [];

    // 1a. Local room history — rooms visited from this device.
    const localRoomIds = getRoomHistory().map((e) => e.code);

    // 1b. Rooms the user is a recorded member of in Firestore. If this
    //     query fails we still fall back to the local history rather
    //     than throwing the whole dialog away.
    let remoteRoomIds: string[] = [];
    try {
      const roomsRef = collection(this.db, 'rooms');
      const roomSnap = await getDocs(
        query(roomsRef, where('members', 'array-contains', safeUser)),
      );
      remoteRoomIds = roomSnap.docs.map((d) => d.id);
    } catch (e) {
      console.warn(
        'Mijn TODO: rooms membership query failed, falling back to local room history.',
        e,
      );
    }

    const roomIds = Array.from(new Set([...remoteRoomIds, ...localRoomIds]));
    if (roomIds.length === 0) return [];

    // 2. Read TODO posts from each candidate room. allSettled makes
    //    the load resilient to a single failing room.
    const perRoomResults = await Promise.allSettled(
      roomIds.map((roomCode) =>
        getDocs(
          query(
            collection(this.db, 'rooms', roomCode, 'posts'),
            where('inTodo', '==', true),
          ),
        ).then((snap) => ({ roomCode, snap })),
      ),
    );

    // 3. Shape and merge the results.
    const posts: MemoryLanePost[] = [];
    for (const result of perRoomResults) {
      if (result.status === 'rejected') {
        console.warn('Mijn TODO: failed to load TODOs for a room.', result.reason);
        continue;
      }
      const { roomCode, snap } = result.value;
      for (const d of snap.docs) {
        const data = d.data() as Omit<PostIt, 'id'>;
        if (data.lane === 'energy') continue;
        posts.push({
          id: d.id,
          ...data,
          comments: data.comments ?? [],
          roomCode,
        });
      }
    }

    // Uncompleted items first, then by votes desc, then newest first.
    posts.sort((a, b) => {
      const aDone = a.todoCompleted ? 1 : 0;
      const bDone = b.todoCompleted ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const voteDiff =
        (b.voters?.length ?? 0) - (a.voters?.length ?? 0);
      if (voteDiff !== 0) return voteDiff;
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });
    return posts;
  }

  /**
   * Mark a TODO completed in any room (not necessarily the currently
   * listened-to one). Used by the cross-room "Mijn TODO" dialog.
   */
  async setTodoCompletedAt(
    roomCode: string,
    postId: string,
    completed: boolean,
  ): Promise<void> {
    const safeRoom = sanitizeRoomCode(roomCode);
    if (!safeRoom || !postId) return;
    const user = sanitizeUsername(this.currentUser());
    const postRef = doc(this.db, 'rooms', safeRoom, 'posts', postId);
    await updateDoc(postRef, {
      todoCompleted: completed,
      todoCompletedBy: completed ? user : '',
    });
  }

  /**
   * Remove a post from the shared group TODO in any room. Used by the
   * cross-room "Mijn TODO" dialog.
   */
  async removeFromTodoAt(roomCode: string, postId: string): Promise<void> {
    const safeRoom = sanitizeRoomCode(roomCode);
    if (!safeRoom || !postId) return;
    const postRef = doc(this.db, 'rooms', safeRoom, 'posts', postId);
    await updateDoc(postRef, {
      inTodo: false,
      todoCompleted: false,
      todoCompletedBy: '',
    });
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

