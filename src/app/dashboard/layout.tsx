'use client';

import { AuthProvider } from '@/components/auth/auth-provider';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { BottomNav } from '@/components/layout/bottom-nav';
import { OfflineIndicator } from '@/components/layout/offline-indicator';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <div className="flex min-h-screen flex-col bg-gray-50">
          <OfflineIndicator />
          <main className="flex-1 pb-20">
            {children}
          </main>
          <BottomNav />
        </div>
      </ProtectedRoute>
    </AuthProvider>
  );
}
