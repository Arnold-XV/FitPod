/**
 * Draft store implementation (L5)
 * Stores draft session in IndexedDB for auto-checkpoint
 * AR-04: Infrastructure layer, uses browser APIs
 */

import type { SessionDraft } from '../../domain/workout/entities';
import type { DraftStore } from '../../domain/workout/ports';

const DB_NAME = 'fitpod-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'workout-drafts';
const DRAFT_KEY = 'current-session';

export class IndexedDBDraftStore implements DraftStore {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  /**
   * Save draft (overwrites existing)
   */
  async save(draft: SessionDraft): Promise<void> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(draft, DRAFT_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Load draft
   */
  async load(): Promise<SessionDraft | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(DRAFT_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as SessionDraft | undefined;
        resolve(result || null);
      };
    });
  }

  /**
   * Clear draft
   */
  async clear(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(DRAFT_KEY);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Check if draft exists
   */
  async hasDraft(): Promise<boolean> {
    const draft = await this.load();
    return draft !== null;
  }
}

/**
 * Singleton instance
 */
export const draftStore = new IndexedDBDraftStore();
