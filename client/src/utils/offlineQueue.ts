/**
 * OfflineQueue — queues operations when offline and replays them when connection is restored.
 *
 * Validates Requirements: 12.4, 12.5
 */

import { NetworkClient } from './networkClient';

export interface QueuedOperation {
  id: string;
  url: string;
  method: string;
  body?: any;
  timestamp: number;
}

export class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private monitoring = false;

  enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp'>): void {
    const queued: QueuedOperation = {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    this.queue.push(queued);
  }

  /**
   * Replay all queued operations in order.
   * Removes successfully replayed operations from the queue.
   */
  async replay(client: NetworkClient): Promise<void> {
    const toReplay = [...this.queue];
    this.queue = [];

    for (const op of toReplay) {
      try {
        const options: RequestInit = {
          method: op.method,
          headers: { 'Content-Type': 'application/json' },
        };
        if (op.body !== undefined) {
          options.body = JSON.stringify(op.body);
        }
        await client.fetchWithRetry(op.url, options);
      } catch {
        // Re-enqueue failed operations at the front
        this.queue.unshift(op);
      }
    }
  }

  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Start monitoring online/offline events and auto-replay when connection is restored.
   */
  startMonitoring(client: NetworkClient): void {
    if (this.monitoring || typeof window === 'undefined') return;
    this.monitoring = true;

    window.addEventListener('online', () => {
      this.replay(client);
    });
  }

  getQueue(): QueuedOperation[] {
    return [...this.queue];
  }

  clear(): void {
    this.queue = [];
  }
}
