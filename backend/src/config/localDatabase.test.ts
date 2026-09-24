import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('local JSON database', () => {
  it('persists a document across reload when LOCAL_DB_PATH is set', () => {
    const filePath = path.join(os.tmpdir(), `cardplayground-${Date.now()}.json`);
    process.env.DATABASE_DRIVER = 'local';
    process.env.LOCAL_DB_PATH = filePath;
    process.env.NODE_ENV = 'development';

    jest.resetModules();
    const first = require('./database');
    const db = first.initializeDatabase();
    return db.collection('players').doc('p1').set({ name: 'yin' }).then(() => {
      expect(fs.existsSync(filePath)).toBe(true);
      jest.resetModules();
      process.env.LOCAL_DB_PATH = filePath;
      process.env.DATABASE_DRIVER = 'local';
      process.env.NODE_ENV = 'development';
      const second = require('./database');
      const db2 = second.initializeDatabase();
      return db2.collection('players').doc('p1').get().then((snap: any) => {
        expect(snap.exists).toBe(true);
        expect(snap.data().name).toBe('yin');
      });
    });
  });
});
