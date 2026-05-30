'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowDownRight, TrendingUp, Scale } from 'lucide-react';
import type { Transaction } from '@/lib/types';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function groupByDate(transactions: Transaction[]) {
  const groups: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    const date = formatDate(tx.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(tx);
  }
  return groups;
}

export default function RelatoriosPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [period, setPeriod] = useState<'today' | 'month' | 'all'>('today');

  useEffect(() => {
    if (user) loadTransactions();
  }, [user]);

  async function loadTransactions() {
    if (!user) return;
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setAllTransactions(data as Transaction[]);
  }

  function getFilteredTransactions() {
    const now = new Date();
    switch (period) {
      case 'today': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return allTransactions.filter((t) => new Date(t.created_at) >= start);
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return allTransactions.filter((t) => new Date(t.created_at) >= start);
      }
      case 'all':
        return allTransactions;
    }
  }

  const filtered = getFilteredTransactions();
  const totalSold = filtered
    .filter((t) => t.type === 'DEBT')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalReceived = filtered
    .filter((t) => t.type === 'PAYMENT')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const pending = totalSold - totalReceived;
  const grouped = groupByDate(filtered);

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Relatórios</h1>

      {/* Period Tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)} className="mb-4">
        <TabsList className="w-full">
          <TabsTrigger value="today" className="flex-1">Hoje</TabsTrigger>
          <TabsTrigger value="month" className="flex-1">Este Mês</TabsTrigger>
          <TabsTrigger value="all" className="flex-1">Todo Período</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-3">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <ArrowDownRight className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-orange-600">Total Vendido (Fiado)</p>
              <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalSold)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-600">Total Recebido</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(totalReceived)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`${pending > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${pending > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <Scale className={`h-6 w-6 ${pending > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <div>
              <p className={`text-sm ${pending > 0 ? 'text-red-600' : 'text-green-600'}`}>Saldo Pendente</p>
              <p className={`text-2xl font-bold ${pending > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {formatCurrency(pending)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction List */}
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Transações</h2>
      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-lg text-gray-500">Nenhuma transação no período</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([date, txs]) => (
          <div key={date} className="mb-4">
            <p className="mb-2 text-sm font-semibold text-gray-500">{date}</p>
            <div className="space-y-1">
              {txs.map((tx) => (
                <Card key={tx.id}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-base font-medium text-gray-900">
                        {tx.type === 'DEBT' ? '🛒 Venda' : '💰 Pagamento'}
                      </p>
                      <p className="text-sm text-gray-500">{tx.description || '—'}</p>
                    </div>
                    <p
                      className={`text-lg font-bold ${
                        tx.type === 'DEBT' ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {tx.type === 'DEBT' ? '-' : '+'}
                      {formatCurrency(Number(tx.amount))}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
