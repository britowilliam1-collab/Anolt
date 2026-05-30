import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { PendingItem } from '@/lib/types';

interface CadernetaDB extends DBSchema {
  'pending-transactions': {
    key: number;
    value: PendingItem;
    autoIncrement: true;
  };
  'pending-customers': {
    key: number;
    value: PendingItem;
    autoIncrement: true;
  };
}

let dbPromise: Promise<IDBPDatabase<CadernetaDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<CadernetaDB>('caderneta-offline', 1, {
      upgrade(db) {
        db.createObjectStore('pending-transactions', {
          keyPath: 'id',
          autoIncrement: true,
        });
        db.createObjectStore('pending-customers', {
          keyPath: 'id',
          autoIncrement: true,
        });
      },
    });
  }
  return dbPromise;
}

export async function savePendingTransaction(data: Record<string, unknown>) {
  const db = await getDB();
  const item: Omit<PendingItem, 'id'> = {
    type: 'INSERT_TRANSACTION',
    data,
    createdAt: new Date().toISOString(),
  };
  return db.add('pending-transactions', item as PendingItem);
}

export async function savePendingCustomer(data: Record<string, unknown>) {
  const db = await getDB();
  const item: Omit<PendingItem, 'id'> = {
    type: 'INSERT_CUSTOMER',
    data,
    createdAt: new Date().toISOString(),
  };
  return db.add('pending-customers', item as PendingItem);
}

export async function getAllPending(): Promise<PendingItem[]> {
  const db = await getDB();
  const customers = await db.getAll('pending-customers');
  const transactions = await db.getAll('pending-transactions');
  return [...customers, ...transactions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function clearPendingCustomers() {
  const db = await getDB();
  await db.clear('pending-customers');
}

export async function clearPendingTransactions() {
  const db = await getDB();
  await db.clear('pending-transactions');
}

export async function clearAllPending() {
  await clearPendingCustomers();
  await clearPendingTransactions();
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  const customers = await db.getAll('pending-customers');
  const transactions = await db.getAll('pending-transactions');
  return customers.length + transactions.length;
}
