import { openDB, type IDBPDatabase } from 'idb';

import type { QueuedRequest } from 'shared/types';

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB('kairos-offline', 1, {
    upgrade(upgradeDB) {
      upgradeDB.createObjectStore('pending-requests', {
        keyPath: 'id',
        autoIncrement: true,
      });
    },
  });
  return dbInstance;
}

export function useOfflineQueue() {
  async function queueRequest(url: string, method: string, body: any): Promise<void> {
    const db = await getDB();
    await db.add('pending-requests', { url, method, body, timestamp: Date.now() });
  }

  async function processQueue(): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('pending-requests', 'readwrite');
    const requests = await tx.store.getAll();

    for (const req of requests) {
      try {
        await $fetch(req.url, { method: req.method, body: req.body });
        await tx.store.delete(req.id!);
      } catch {
        // Failed, will retry on next online event
      }
    }
  }

  async function getQueueSize(): Promise<number> {
    const db = await getDB();
    const all = await db.getAll('pending-requests');
    return all.length;
  }

  return { queueRequest, processQueue, getQueueSize };
}

// Auto-process queue when back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    const { processQueue } = useOfflineQueue();
    await processQueue();
  });
}
