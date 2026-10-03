import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

describe('verifyClientAssets', () => {
  const filePath = path.join(os.tmpdir(), `assets-${Date.now()}.json`);

  beforeEach(() => {
    process.env.DATABASE_DRIVER = 'local';
    process.env.LOCAL_DB_PATH = filePath;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  afterEach(() => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('flags extra cards on the client as invalid', async () => {
    jest.resetModules();
    const dbMod = require('../config/database');
    dbMod.resetDatabaseForTests();
    const db = dbMod.initializeDatabase();
    await db.collection('players').doc('p1').set({ id: 'p1', cards: ['c1', 'c2'] });

    const { verifyClientAssets } = require('./assetVerificationService');
    const result = await verifyClientAssets('p1', ['c1', 'c2', 'hacked']);
    expect(result.valid).toBe(false);
    expect(result.extraOnClient).toEqual(['hacked']);
    expect(result.missingOnClient).toEqual([]);
    expect(result.serverCardIds).toEqual(['c1', 'c2']);
  });

  it('accepts a client list that is a subset of server assets', async () => {
    jest.resetModules();
    const dbMod = require('../config/database');
    dbMod.resetDatabaseForTests();
    const db = dbMod.initializeDatabase();
    await db.collection('players').doc('p1').set({ id: 'p1', cards: ['c1', 'c2'] });

    const { verifyClientAssets } = require('./assetVerificationService');
    const result = await verifyClientAssets('p1', ['c1']);
    expect(result.valid).toBe(true);
    expect(result.missingOnClient).toEqual(['c2']);
  });
});
