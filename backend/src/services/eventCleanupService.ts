import { collections } from '../config/database';
import { ActiveEvent } from '@shared/types/event';

/**
 * EventCleanupService - Background job for cleaning up expired events
 * 
 * This service periodically checks for expired events (particularly Lucky Moment events
 * with 10-minute duration) and removes them from the database.
 * 
 * Validates Requirements:
 * - 3.6: Lucky Moment event expires after 10 minutes
 */
export class EventCleanupService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60 * 1000; // Run every 1 minute
  private isRunning = false;

  /**
   * Starts the background cleanup job
   * @param intervalMs - Optional custom interval in milliseconds (default: 60000)
   */
  start(intervalMs: number = this.CLEANUP_INTERVAL_MS): void {
    if (this.isRunning) {
      console.warn('Event cleanup service is already running');
      return;
    }

    console.log(`Starting event cleanup service (interval: ${intervalMs}ms)`);
    this.isRunning = true;

    // Run cleanup immediately on start
    this.cleanupExpiredEvents().catch(error => {
      console.error('Error during initial event cleanup:', error);
    });

    // Schedule periodic cleanup
    this.intervalId = setInterval(() => {
      this.cleanupExpiredEvents().catch(error => {
        console.error('Error during scheduled event cleanup:', error);
      });
    }, intervalMs);
  }

  /**
   * Stops the background cleanup job
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('Event cleanup service is not running');
      return;
    }

    console.log('Stopping event cleanup service');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
  }

  /**
   * Checks if the cleanup service is currently running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Performs the actual cleanup of expired events
   * Removes events from the database where expiresAt <= current time
   * 
   * @returns Number of events cleaned up
   */
  async cleanupExpiredEvents(): Promise<number> {
    try {
      const now = new Date();
      let cleanedCount = 0;

      // Query all active events
      const eventsSnapshot = await collections.activeEvents().get();

      // Batch delete expired events
      const batch = collections.activeEvents().firestore.batch();
      let hasDeletions = false;

      eventsSnapshot.forEach(doc => {
        const event = doc.data() as ActiveEvent;

        // Check if event has an expiration time
        if (event.expiresAt) {
          const expiresAt = new Date(event.expiresAt);

          // If event has expired, mark it for deletion
          if (expiresAt <= now) {
            batch.delete(doc.ref);
            cleanedCount++;
            hasDeletions = true;

            console.log(
              `Cleaning up expired ${event.eventType} event: ${event.id} ` +
              `(expired at ${event.expiresAt})`
            );
          }
        }
      });

      // Commit the batch deletion
      if (hasDeletions) {
        await batch.commit();
        console.log(`Cleaned up ${cleanedCount} expired event(s)`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired events:', error);
      throw error;
    }
  }
}

// Singleton instance
let cleanupServiceInstance: EventCleanupService | null = null;

/**
 * Gets the singleton instance of the EventCleanupService
 */
export function getEventCleanupService(): EventCleanupService {
  if (!cleanupServiceInstance) {
    cleanupServiceInstance = new EventCleanupService();
  }
  return cleanupServiceInstance;
}
