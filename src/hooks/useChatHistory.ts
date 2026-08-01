import { openDB, type IDBPDatabase } from 'idb';

interface ChatMessage {
  id?: number;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB('kairos-chat', 1, {
    upgrade(upgradeDB) {
      const store = upgradeDB.createObjectStore('messages', {
        keyPath: 'id',
        autoIncrement: true,
      });
      store.createIndex('sessionId', 'sessionId');
    },
  });
  return dbInstance;
}

export function useChatHistory() {
  async function saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    const db = await getDB();
    await db.add('messages', { sessionId, role, content, timestamp: Date.now() });
  }

  async function getMessages(sessionId: string): Promise<ChatMessage[]> {
    const db = await getDB();
    return db.getAllFromIndex('messages', 'sessionId', sessionId);
  }

  async function clearSession(sessionId: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('messages', 'readwrite');
    const index = tx.store.index('sessionId');
    let cursor = await index.openCursor(IDBKeyRange.only(sessionId));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  }

  async function getSessionIds(): Promise<string[]> {
    const db = await getDB();
    const all = await db.getAll('messages');
    return [...new Set(all.map(m => m.sessionId))];
  }

  return { saveMessage, getMessages, clearSession, getSessionIds };
}
