export type { IDataService } from './IDataService';
export { IndexedDBDataService } from './IndexedDBDataService';

import { IndexedDBDataService } from './IndexedDBDataService';

// Singleton service instance
export const dataService: import('./IDataService').IDataService = new IndexedDBDataService();
