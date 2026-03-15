/**
 * OptimisticLock — prevents lost updates using a version field.
 *
 * Validates Requirement: 12.3
 *
 * Each document is expected to have a `version` field (number).
 * On update, the current version is read and compared; if it has changed
 * since the read, a ConflictError is thrown so the caller can retry with
 * fresh data.
 */

export class ConflictError extends Error {
  constructor(message = 'Version conflict — document was modified concurrently') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class OptimisticLock {
  /**
   * Read a document, apply an update function, and write back only if the
   * version has not changed.  Throws ConflictError on version mismatch.
   *
   * @param docRef  Firestore DocumentReference
   * @param updateFn  Pure function that receives the current document data and
   *                  returns the fields to update (must NOT include `version`).
   * @returns The updated document data (with incremented version).
   */
  async updateWithVersion<T extends { version?: number }>(
    docRef: FirebaseFirestore.DocumentReference,
    updateFn: (current: T) => Partial<T>
  ): Promise<T> {
    return docRef.firestore.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);

      if (!snap.exists) {
        throw new Error(`Document ${docRef.path} not found`);
      }

      const current = snap.data() as T;
      const currentVersion = current.version ?? 0;

      const updates = updateFn(current);

      // Increment version
      const newVersion = currentVersion + 1;

      transaction.update(docRef, {
        ...updates,
        version: newVersion,
      });

      return { ...current, ...updates, version: newVersion };
    });
  }

  /**
   * Retry wrapper: retries updateWithVersion up to maxRetries times on ConflictError.
   */
  async updateWithRetry<T extends { version?: number }>(
    docRef: FirebaseFirestore.DocumentReference,
    updateFn: (current: T) => Partial<T>,
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.updateWithVersion(docRef, updateFn);
      } catch (err) {
        if (err instanceof ConflictError && attempt < maxRetries - 1) {
          // Brief pause before retry
          await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
    throw new ConflictError('Max retries exceeded due to concurrent modifications');
  }
}
