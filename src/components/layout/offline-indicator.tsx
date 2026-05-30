'use client';

import { useOnlineStatus } from '@/lib/offline/sync';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-semibold text-white">
      <WifiOff className="h-4 w-4" />
      <span>Sem conexão. Dados salvos localmente.</span>
    </div>
  );
}
