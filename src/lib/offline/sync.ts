'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getAllPending,
  clearPendingCustomers,
  clearPendingTransactions,
  getPendingCount,
} from './db';

export async function syncPendingData() {
  const supabase = createClient();
  const pending = await getAllPending();

  if (pending.length === 0) {
    return { synced: 0, errors: [] };
  }

  let synced = 0;
  const errors: unknown[] = [];

  // Sync customers first
  const customers = pending.filter((p) => p.type === 'INSERT_CUSTOMER');
  for (const item of customers) {
    const { error } = await supabase
      .from('customers')
      .insert(item.data as Record<string, unknown>);

    if (error) {
      errors.push({ type: item.type, data: item.data, error });
    } else {
      synced++;
    }
  }

  if (errors.length === 0) {
    await clearPendingCustomers();
  }

  // Then sync transactions
  const transactions = pending.filter((p) => p.type === 'INSERT_TRANSACTION');
  for (const item of transactions) {
    // Check if the customer_id references a pending customer that might have been synced
    const { error } = await supabase
      .from('transactions')
      .insert(item.data as Record<string, unknown>);

    if (error) {
      errors.push({ type: item.type, data: item.data, error });
    } else {
      synced++;
    }
  }

  if (errors.filter((e: any) => e.type === 'INSERT_TRANSACTION').length === 0) {
    await clearPendingTransactions();
  }

  return { synced, errors };
}

export function startSyncListener() {
  if (typeof window === 'undefined') return;

  const handleOnline = async () => {
    const count = await getPendingCount();
    if (count > 0) {
      await syncPendingData();
      // Dispatch custom event for UI updates
      window.dispatchEvent(new CustomEvent('caderneta-sync-complete'));
    }
  };

  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Start sync listener
    const cleanup = startSyncListener();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      cleanup?.();
    };
  }, []);

  return { isOnline };
}
