import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

type DocData = Record<string, any>;

function localDbPath(): string {
  return process.env.LOCAL_DB_PATH
    || path.resolve(process.cwd(), 'data', 'local-db.json');
}

function persistEnabled(): boolean {
  return process.env.NODE_ENV !== 'test';
}

class MockDocRef {
  private store: Map<string, DocData>;
  readonly id: string;
  readonly path: string;
  readonly firestore: LocalFirestore;

  constructor(store: Map<string, DocData>, id: string, docPath: string, fsDb: LocalFirestore) {
    this.store = store;
    this.id = id;
    this.path = docPath;
    this.firestore = fsDb;
  }
  async get() {
    const data = this.store.get(this.id);
    return { exists: !!data, data: () => data, id: this.id };
  }
  async set(data: DocData) {
    this.store.set(this.id, { ...data });
    this.firestore.persist();
  }
  async update(data: DocData) {
    const existing = this.store.get(this.id) || {};
    this.store.set(this.id, { ...existing, ...data });
    this.firestore.persist();
  }
  async delete() {
    this.store.delete(this.id);
    this.firestore.persist();
  }
}

class MockQuery {
  protected docs: { id: string; data: DocData }[];
  constructor(docs: { id: string; data: DocData }[]) {
    this.docs = docs;
  }
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
  orderBy(_field: string, _dir?: string): MockQuery {
    return this;
  }
  limit(n: number): MockQuery {
    return new MockQuery(this.docs.slice(0, n));
  }
  offset(n: number): MockQuery {
    return new MockQuery(this.docs.slice(n));
  }
  async get() {
    return {
      docs: this.docs.map(d => ({ id: d.id, data: () => d.data, exists: true })),
      empty: this.docs.length === 0,
      size: this.docs.length,
    };
  }
}

class MockBatch {
  private ops: (() => Promise<void> | void)[] = [];
  set(ref: MockDocRef, data: DocData) {
    this.ops.push(() => ref.set(data));
    return this;
  }
  update(ref: MockDocRef, data: DocData) {
    this.ops.push(() => ref.update(data));
    return this;
  }
  delete(ref: MockDocRef) {
    this.ops.push(() => ref.delete());
    return this;
  }
  async commit() {
    for (const op of this.ops) await op();
  }
}

class MockCollection extends MockQuery {
  private store: Map<string, DocData>;
  readonly firestore: LocalFirestore;

  constructor(store: Map<string, DocData>, fsDb: LocalFirestore) {
    super(Array.from(store.entries()).map(([id, data]) => ({ id, data })));
    this.store = store;
    this.firestore = fsDb;
  }

  doc(id?: string): MockDocRef {
    const docId = id || Math.random().toString(36).slice(2);
    return new MockDocRef(this.store, docId, docId, this.firestore);
  }

  where(field: string, op: string, value: any): MockQuery {
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
    this.firestore.persist();
    return { id };
  }
}

class LocalFirestore {
  private stores = new Map<string, Map<string, DocData>>();
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  private getStore(name: string) {
    if (!this.stores.has(name)) this.stores.set(name, new Map());
    return this.stores.get(name)!;
  }

  collection(name: string): MockCollection {
    return new MockCollection(this.getStore(name), this);
  }

  batch(): MockBatch {
    return new MockBatch();
  }

  settings(_opts: any) { /* no-op */ }

  private load() {
    if (!persistEnabled()) return;
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as Record<string, Record<string, DocData>>;
      for (const [collection, docs] of Object.entries(raw || {})) {
        this.stores.set(collection, new Map(Object.entries(docs || {})));
      }
    } catch (err) {
      console.warn('Local DB load failed, starting empty:', (err as Error).message);
    }
  }

  persist() {
    if (!persistEnabled()) return;
    const payload: Record<string, Record<string, DocData>> = {};
    for (const [name, store] of this.stores.entries()) {
      payload[name] = Object.fromEntries(store.entries());
    }
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(payload, null, 2));
  }
}

let db: any;
let usingLocal = false;

function useLocalDatabase(): boolean {
  const driver = (process.env.DATABASE_DRIVER || 'local').toLowerCase();
  if (driver === 'firestore') return false;
  return true;
}

export function initializeDatabase(): any {
  if (db) return db;

  if (!useLocalDatabase() && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      const admin = require('firebase-admin');
      admin.initializeApp({
        credential: admin.credential.cert(process.env.FIREBASE_SERVICE_ACCOUNT_PATH),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      db = admin.firestore();
      db.settings({ ignoreUndefinedProperties: true });
      usingLocal = false;
      console.log('Connected to Firebase Firestore');
      return db;
    } catch (err) {
      console.warn('Firebase init failed, falling back to local JSON DB:', (err as Error).message);
    }
  }

  const filePath = localDbPath();
  db = new LocalFirestore(filePath);
  usingLocal = true;
  console.log(`Using local JSON database at ${filePath}`);
  return db;
}

export function getDatabase(): any {
  if (!db) return initializeDatabase();
  return db;
}

export function isUsingMockDatabase(): boolean {
  return usingLocal;
}

export const collections = {
  players:            () => getDatabase().collection('players'),
  cards:              () => getDatabase().collection('cards'),
  cardTemplates:      () => getDatabase().collection('card_templates'),
  packConfigurations: () => getDatabase().collection('pack_configurations'),
  galleries:          () => getDatabase().collection('galleries'),
  galleryInteractions:() => getDatabase().collection('gallery_interactions'),
  marketListings:     () => getDatabase().collection('market_listings'),
  marketTransactions: () => getDatabase().collection('market_transactions'),
  achievements:       () => getDatabase().collection('achievements'),
  seasons:            () => getDatabase().collection('seasons'),
  activeEvents:       () => getDatabase().collection('active_events'),
  missions:           () => getDatabase().collection('missions'),
};
