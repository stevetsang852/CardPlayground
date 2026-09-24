import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('local JSON database', () => {
  const filePath = path.join(os.tmpdir(), `cardplayground-${Date.now()}.json`);

  beforeEach(() => {
    process.env.DATABASE_DRIVER = 'local';
    process.env.LOCAL_DB_PATH = filePath;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  afterEach(() => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('writes and reloads a document from disk', async () => {
    jest.resetModules();
    const first = require('./database');
    first.resetDatabaseForTests();
    const db = first.initializeDatabase();
    await db.collection('players').doc('p1').set({ name: 'yin' });
    expect(fs.existsSync(filePath)).toBe(true);

    jest.resetModules();
    process.env.DATABASE_DRIVER = 'local';
    process.env.LOCAL_DB_PATH = filePath;
    const second = require('./database');
    second.resetDatabaseForTests();
    const db2 = second.initializeDatabase();
    const snap = await db2.collection('players').doc('p1').get();
    expect(snap.exists).toBe(true);
    expect(snap.data().name).toBe('yin');
    expect(second.isUsingMockDatabase()).toBe(true);
  });
});
