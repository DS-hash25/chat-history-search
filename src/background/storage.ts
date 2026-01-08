import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, STORES } from '../shared/constants';
import type { Account, Chat } from '../shared/types';

interface ChatSearchDB {
  accounts: {
    key: string;
    value: Account;
    indexes: { 'by-service': string };
  };
  chats: {
    key: string;
    value: Chat;
    indexes: {
      'by-account': string;
      'by-service': string;
      'by-updated': number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<ChatSearchDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<ChatSearchDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Accounts store
        if (!db.objectStoreNames.contains(STORES.ACCOUNTS)) {
          const accountStore = db.createObjectStore(STORES.ACCOUNTS, {
            keyPath: 'id',
          });
          accountStore.createIndex('by-service', 'service');
        }

        // Chats store
        if (!db.objectStoreNames.contains(STORES.CHATS)) {
          const chatStore = db.createObjectStore(STORES.CHATS, {
            keyPath: 'id',
          });
          chatStore.createIndex('by-account', 'accountId');
          chatStore.createIndex('by-service', 'service');
          chatStore.createIndex('by-updated', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
};

// Account operations
export const getAllAccounts = async (): Promise<Account[]> => {
  const db = await getDB();
  return db.getAll(STORES.ACCOUNTS);
};

export const getAccount = async (id: string): Promise<Account | undefined> => {
  const db = await getDB();
  return db.get(STORES.ACCOUNTS, id);
};

export const saveAccount = async (account: Account): Promise<void> => {
  const db = await getDB();
  await db.put(STORES.ACCOUNTS, account);
};

export const deleteAccount = async (id: string): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction([STORES.ACCOUNTS, STORES.CHATS], 'readwrite');

  // Delete account
  await tx.objectStore(STORES.ACCOUNTS).delete(id);

  // Delete all chats for this account
  const chatStore = tx.objectStore(STORES.CHATS);
  const index = chatStore.index('by-account');
  let cursor = await index.openCursor(IDBKeyRange.only(id));

  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
};

// Chat operations
export const getAllChats = async (): Promise<Chat[]> => {
  const db = await getDB();
  return db.getAll(STORES.CHATS);
};

export const getChatsByAccount = async (accountId: string): Promise<Chat[]> => {
  const db = await getDB();
  return db.getAllFromIndex(STORES.CHATS, 'by-account', accountId);
};

export const getChat = async (id: string): Promise<Chat | undefined> => {
  const db = await getDB();
  return db.get(STORES.CHATS, id);
};

export const saveChat = async (chat: Chat): Promise<void> => {
  const db = await getDB();
  await db.put(STORES.CHATS, chat);
};

export const saveChats = async (chats: Chat[]): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(STORES.CHATS, 'readwrite');
  await Promise.all([
    ...chats.map((chat) => tx.store.put(chat)),
    tx.done,
  ]);
};

export const deleteChat = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete(STORES.CHATS, id);
};
