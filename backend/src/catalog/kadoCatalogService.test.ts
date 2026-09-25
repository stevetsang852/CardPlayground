import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('syncKadoCatalog', () => {
  const filePath = path.join(os.tmpdir(), `kado-${Date.now()}.json`);

  beforeEach(() => {
    process.env.DATABASE_DRIVER = 'local';
    process.env.LOCAL_DB_PATH = filePath;
    process.env.KADO_SYNC_MAX_SETS = '1';
    process.env.KADO_REQUEST_DELAY_MS = '0';
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('writes packs and cards from injected public HTML', async () => {
    jest.resetModules();
    const dbMod = require('../config/database');
    dbMod.resetDatabaseForTests();
    dbMod.initializeDatabase();
    const { syncKadoCatalog } = require('./kadoCatalogService');

    const result = await syncKadoCatalog({
      force: true,
      fetchHtml: async (url: string) => {
        if (url.endsWith('/database') || url.includes('/database/')) {
          return '* [Demo Set](/set/demo-id) · 2 張';
        }
        return '1. [001 DemoBird](/card/card-1)\n2. [002 DemoFish](/card/card-2)';
      },
    });

    expect(result.refreshed).toBe(true);
    expect(result.cards).toBeGreaterThanOrEqual(2);
    const snap = await dbMod.collections.cardTemplates().doc('card-1').get();
    expect(snap.exists).toBe(true);
    expect(snap.data().sourceUrl).toContain('/card/card-1');
  });
});
