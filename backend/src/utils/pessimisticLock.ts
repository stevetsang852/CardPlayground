/**
 * PessimisticLock — exclusive document lock using a lock field in Firestore.
 *
 * Validates Requirement: 12.3
 *
 * Prevents double-sale of market listings by acquiring an exclusive lock
 * before the purchase operation and releasing it afterwards.
 */

export class LockAcquisitionError extends Error {
  constructor(message = 'Could not acquire lock — resource is currently locked') {
    super(message);
    this.name = 'LockAcquisitionError';
  }
}

const LOCK_TIMEOUT_MS = 10_000; // 10 seconds max lock duration

export class PessimisticLock {
  /**
   * Acquire an exclusive lock on a document, run the operation, then release.
   *
   * The lock is stored as a `_lock` field on the document:
   *   { lockedAt: ISO string, lockedBy: string }
   *
   * If the document is already locked (and the lock has not expired), throws
   * LockAcquisitionError.
   *
   * @param docRef  Firestore DocumentReference to lock
   * @param operation  Async operation to run while the lock is held
   * @returns The result of the operation
   */
  async withLock<T>(
    docRef: FirebaseFirestore.DocumentReference,
    operation: () => Promise<T>
  ): Promise<T> {
    const lockId = `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Acquire lock inside a transaction
    await docRef.firestore.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);

      if (!snap.exists) {
        throw new Error(`Document ${docRef.path} not found`);
      }

      const data = snap.data() as any;
      const existingLock = data._lock;

      if (existingLock) {
        const lockedAt = new Date(existingLock.lockedAt).getTime();
        const elapsed = Date.now() - lockedAt;

        // Allow acquiring if the existing lock has expired
        if (elapsed < LOCK_TIMEOUT_MS) {
          throw new LockAcquisitionError();
        }
      }

      transaction.update(docRef, {
        _lock: { lockedAt: now, lockedBy: lockId },
      });
    });

    // Run the operation and always release the lock
    try {
      const result = await operation();
      return result;
    } finally {
      await this._releaseLock(docRef, lockId);
    }
  }

  private async _releaseLock(
    docRef: FirebaseFirestore.DocumentReference,
    lockId: string
  ): Promise<void> {
    try {
      await docRef.firestore.runTransaction(async (transaction) => {
        const snap = await transaction.get(docRef);
        if (!snap.exists) return;

        const data = snap.data() as any;
        // Only release if we still own the lock
        if (data._lock?.lockedBy === lockId) {
          transaction.update(docRef, { _lock: null });
        }
      });
    } catch {
      // Best-effort release; lock will expire via LOCK_TIMEOUT_MS
    }
  }
}
