import * as dotenv from 'dotenv';
dotenv.config();

// ── In-memory mock Firestore ──────────────────────────────────────────────────
// Used when FIREBASE_SERVICE_ACCOUNT_PATH is not set (demo / local dev mode).

type DocData = Record<string, any>;

class MockDocRef {
  private store: Map<string, DocData>;
  readonly id: string;
  readonly path: string;
  readonly firestore: MockFirestore;

  constructor(store: Map<string, DocData>, id: string, path: string, fs: MockFirestore) {
    this.store = store; this.id = id; this.path = path; this.firestore = fs;
  }
  async get() {
    const data = this.store.get(this.id);
    return { exists: !!data, data: () => data, id: this.id };
  }
  async set(data: DocData) { this.store.set(this.id, { ...data }); }
  async update(data: DocData) {
    const existing = this.store.get(this.id) || {};
    this.store.set(this.id, { ...existing, ...data });
  }
  async delete() { this.store.delete(this.id); }
}

class MockQuery {
  protected docs: { id: string; data: DocData }[];
  constructor(docs: { id: string; data: DocData }[]) { this.docs = docs; }
  where(field: string, op: string, value: any): MockQuery {
    return new MockQuery(this.docs.filter(d => {
      const v = d.data[field];
      if (op === '==') return v === value;
      if (op === '>') return v > value;
      if (op === '<') return v < value;
      if (op === '>=') return v >= value;
      if (op === 'array-contains') return Array.isArray(v) && v.includes(value);
      return true;
    }));
  }
  orderBy(_field: string, _dir?: string): MockQuery { return this; }
  limit(n: number): MockQuery { return new MockQuery(this.docs.slice(0, n)); }
  offset(n: number): MockQuery { return new MockQuery(this.docs.slice(n)); }
  async get() {
    return {
      docs: this.docs.map(d => ({ id: d.id, data: () => d.data, exists: true })),
      empty: this.docs.length === 0,
      size: this.docs.length,
    };
  }
}

class MockBatch {
  private ops: (() => void)[] = [];
  set(ref: MockDocRef, data: DocData) { this.ops.push(() => ref.set(data)); return this; }
  update(ref: MockDocRef, data: DocData) { this.ops.push(() => ref.update(data)); return this; }
  delete(ref: MockDocRef) { this.ops.push(() => ref.delete()); return this; }
  async commit() { for (const op of this.ops) await op(); }
}

class MockCollection extends MockQuery {
  private store: Map<string, DocData>;
  readonly firestore: MockFirestore;

  constructor(store: Map<string, DocData>, fs: MockFirestore) {
    super(Array.from(store.entries()).map(([id, data]) => ({ id, data })));
    this.store = store;
    this.firestore = fs;
  }

  doc(id?: string): MockDocRef {
    const docId = id || Math.random().toString(36).slice(2);
    return new MockDocRef(this.store, docId, docId, this.firestore);
  }

  where(field: string, op: string, value: any): MockQuery {
    // Refresh docs from store on each query
    const docs = Array.from(this.store.entries()).map(([id, data]) => ({ id, data }));
    return new MockQuery(docs).where(field, op, value);
  }

  async get() {
    const docs = Array.from(this.store.entries()).map(([id, data]) => ({
      id, data: () => data, exists: true,
    }));
    return { docs, empty: docs.length === 0, size: docs.length };
  }

  async add(data: DocData) {
    const id = Math.random().toString(36).slice(2);
    this.store.set(id, { ...data, id });
    return { id };
  }
}

class MockFirestore {
  private stores = new Map<string, Map<string, DocData>>();

  private getStore(name: string) {
    if (!this.stores.has(name)) this.stores.set(name, new Map());
    return this.stores.get(name)!;
  }

  collection(name: string): MockCollection {
    return new MockCollection(this.getStore(name), this);
  }

  batch(): MockBatch { return new MockBatch(); }

  settings(_opts: any) { /* no-op */ }
}

// ── Real Firebase (when credentials are available) ────────────────────────────
let db: any;
let usingMock = false;

export function initializeDatabase(): any {
  if (db) return db;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountPath) {
    console.warn('⚠️  No FIREBASE_SERVICE_ACCOUNT_PATH set — running with in-memory mock database (demo mode)');
    db = new MockFirestore();
    usingMock = true;
    return db;
  }

  try {
    const admin = require('firebase-admin');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    console.log('✅ Connected to Firebase Firestore');
    return db;
  } catch (err) {
    console.warn('⚠️  Firebase init failed, falling back to in-memory mock:', (err as Error).message);
    db = new MockFirestore();
    usingMock = true;
    return db;
  }
}

export function getDatabase(): any {
  if (!db) return initializeDatabase();
  return db;
}

export function isUsingMockDatabase(): boolean { return usingMock; }

// Collection references
export const collections = {
  players:           () => getDatabase().collection('players'),
  cards:             () => getDatabase().collection('cards'),
  cardTemplates:     () => getDatabase().collection('card_templates'),
  packConfigurations:() => getDatabase().collection('pack_configurations'),
  galleries:         () => getDatabase().collection('galleries'),
  galleryInteractions:()=> getDatabase().collection('gallery_interactions'),
  marketListings:    () => getDatabase().collection('market_listings'),
  marketTransactions:() => getDatabase().collection('market_transactions'),
  achievements:      () => getDatabase().collection('achievements'),
  seasons:           () => getDatabase().collection('seasons'),
  activeEvents:      () => getDatabase().collection('active_events'),
  missions:          () => getDatabase().collection('missions'),
};
