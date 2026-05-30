'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/auth-provider';
import { useOnlineStatus } from '@/lib/offline/sync';
import { syncPendingData } from '@/lib/offline/sync';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, MessageCircle, TrendingUp, ArrowDownRight, WifiOff, LogOut } from 'lucide-react';
import { NewSaleSheet } from '@/components/sales/new-sale-sheet';
import type { CustomerBalance } from '@/lib/types';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function DashboardPage() {
  const { user, profile, signOut } = useAuth();
  const { isOnline } = useOnlineStatus();
  const [balances, setBalances] = useState<CustomerBalance[]>([]);
  const [totalToReceive, setTotalToReceive] = useState(0);
  const [totalReceivedToday, setTotalReceivedToday] = useState(0);
  const [saleSheetOpen, setSaleSheetOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user]);

  // Sync pending data when coming back online
  useEffect(() => {
    if (isOnline) {
      syncPendingData().then(() => {
        loadDashboard();
      });
    }
  }, [isOnline]);

  async function loadDashboard() {
    if (!user) return;

    // Load customer balances
    const { data: balanceData } = await supabase
      .from('customer_balances')
      .select('*')
      .eq('user_id', user.id)
      .order('balance', { ascending: false });

    if (balanceData) {
      setBalances(balanceData as CustomerBalance[]);
      const total = balanceData.reduce((sum: number, b: CustomerBalance) => sum + (b.balance > 0 ? b.balance : 0), 0);
      setTotalToReceive(total);
    }

    // Load today's payments
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

    const { data: todayPayments } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'PAYMENT')
      .gte('created_at', startOfDay);

    if (todayPayments) {
      const total = todayPayments.reduce((sum, t) => sum + Number(t.amount), 0);
      setTotalReceivedToday(total);
    }
  }

  function openWhatsApp(phone: string | null, name: string, balance: number) {
    if (!phone) return;
    const cleaned = phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${name}! Aqui é da Caderneta Digital. Segue o resumo da sua caderneta: O valor pendente é ${formatCurrency(balance)}. Pode combinar o pagamento comigo por aqui! 😊`
    );
    window.open(`https://wa.me/55${cleaned}?text=${message}`, '_blank');
  }

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caderneta Digital</h1>
          <p className="text-base text-gray-500">Olá, {profile?.full_name?.split(' ')[0] || 'Lojista'}!</p>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-600">
              <ArrowDownRight className="h-5 w-5" />
              <span className="text-sm font-medium">A Receber</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-orange-700">
              {formatCurrency(totalToReceive)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">Recebido Hoje</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-green-700">
              {formatCurrency(totalReceivedToday)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
      <div className="mb-4">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Clientes com Fiado</h2>
        {balances.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-lg text-gray-500">Nenhum cliente cadastrado</p>
              <p className="text-sm text-gray-400">Toque no botão abaixo para lançar sua primeira venda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {balances
              .filter((b) => b.balance > 0)
              .map((balance) => (
                <Card
                  key={balance.customer_id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => router.push(`/dashboard/clientes/${balance.customer_id}`)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold text-gray-900">
                        {balance.customer_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {balance.phone_number || 'Sem telefone'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                          {formatCurrency(balance.balance)}
                        </p>
                      </div>
                      {balance.phone_number && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0 text-green-600 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            openWhatsApp(balance.phone_number, balance.customer_name, balance.balance);
                          }}
                        >
                          <MessageCircle className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* FAB - Nova Venda Fiado */}
      <button
        onClick={() => setSaleSheetOpen(true)}
        className="fixed bottom-24 right-4 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 md:right-8"
      >
        <Plus className="h-8 w-8" />
      </button>

      {/* New Sale Sheet */}
      <NewSaleSheet
        open={saleSheetOpen}
        onOpenChange={setSaleSheetOpen}
        onSaleCreated={loadDashboard}
      />
    </div>
  );
}
