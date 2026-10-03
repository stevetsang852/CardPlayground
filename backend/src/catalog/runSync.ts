import * as fs from 'fs';
import * as path from 'path';
import { initializeDatabase, collections, localDbPath } from '../config/database';
import { initializeRedis } from '../config/redis';
import { syncKadoCatalog } from './kadoCatalogService';

async function main() {
  initializeDatabase();
  try {
    await initializeRedis();
  } catch (err) {
    console.warn('Redis optional:', (err as Error).message);
  }

  const result = await syncKadoCatalog({ force: true });
  console.log(JSON.stringify(result));

  const packsSnap = await collections.packConfigurations().get();
  const cardsSnap = await collections.cardTemplates().get();
  const snapshot = {
    generatedAt: new Date().toISOString(),
    result,
    packs: packsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
    cards: cardsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })),
  };

  const outDir = path.resolve(process.cwd(), 'data');
  fs.mkdirSync(outDir, { recursive: true });
  const snapshotPath = path.join(outDir, 'catalog-snapshot.json');
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log('Wrote', snapshotPath, 'bytes', fs.statSync(snapshotPath).size);
  console.log('Local DB', localDbPath());
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
