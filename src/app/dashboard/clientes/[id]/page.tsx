'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/auth-provider';
import { useOnlineStatus } from '@/lib/offline/sync';
import { syncPendingData } from '@/lib/offline/sync';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MessageCircle, Banknote, Loader2 } from 'lucide-react';
import { RegisterPaymentDialog } from '@/components/sales/register-payment-dialog';
import type { Customer, Transaction } from '@/lib/types';

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
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const supabase = createClient();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const customerId = params.id as string;

  useEffect(() => {
    if (user && customerId) {
      loadData();
    }
  }, [user, customerId]);

  useEffect(() => {
    if (isOnline) {
      syncPendingData().then(() => loadData());
    }
  }, [isOnline]);

  async function loadData() {
    if (!user) return;
    setLoading(true);

    // Load customer info
    const { data: customerData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('user_id', user.id)
      .single();

    if (customerData) setCustomer(customerData as Customer);

    // Load transactions
    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .eq('customer_id', customerId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (txData) {
      setTransactions(txData as Transaction[]);
      const totalDebt = txData
        .filter((t) => t.type === 'DEBT')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const totalPaid = txData
        .filter((t) => t.type === 'PAYMENT')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      setBalance(totalDebt - totalPaid);
    }

    setLoading(false);
  }

  function handleCobrarNoZap() {
    if (!customer?.phone_number) return;
    const cleaned = customer.phone_number.replace(/\D/g, '');
    const debtDescriptions = transactions
      .filter((t) => t.type === 'DEBT')
      .map((t) => t.description || `R$ ${Number(t.amount).toFixed(2)}`)
      .join(', ');
    const message = encodeURIComponent(
      `Olá ${customer.name}! Aqui é da Caderneta Digital. Segue o resumo da sua caderneta: Você comprou ${debtDescriptions || 'itens'} e o valor pendente é ${formatCurrency(balance)}. Pode combinar o pagamento comigo por aqui! 😊`
    );
    window.open(`https://wa.me/55${cleaned}?text=${message}`, '_blank');
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="px-4 pt-4 text-center">
        <p className="text-lg text-gray-500">Cliente não encontrado</p>
        <Button variant="link" onClick={() => router.push('/dashboard/clientes')}>
          Voltar para Clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/clientes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          <p className="text-base text-gray-500">{customer.phone_number || 'Sem telefone'}</p>
        </div>
      </div>

      {/* Balance Card */}
      <Card className={`mb-4 ${balance > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
        <CardContent className="p-6 text-center">
          <p className="text-base text-gray-600">Valor Devido</p>
          <p className={`text-4xl font-bold ${balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {formatCurrency(Math.abs(balance))}
          </p>
          {balance <= 0 && (
            <p className="mt-1 text-sm text-green-600">Cliente em dia!</p>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="mb-4 flex gap-3">
        {balance > 0 && (
          <>
            <Button
              className="h-14 flex-1 gap-2 bg-green-600 text-lg font-semibold hover:bg-green-700"
              onClick={() => setPaymentDialogOpen(true)}
            >
              <Banknote className="h-5 w-5" />
              Registrar Pagamento
            </Button>
            {customer.phone_number && (
              <Button
                className="h-14 gap-2 bg-green-500 text-lg font-semibold hover:bg-green-600"
                onClick={handleCobrarNoZap}
              >
                <MessageCircle className="h-5 w-5" />
                Cobrar no Zap
              </Button>
            )}
          </>
        )}
      </div>

      <Separator className="mb-4" />

      {/* Transaction History */}
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Histórico</h2>
      <div className="space-y-2">
        {transactions.length === 0 ? (
          <p className="text-center text-gray-500">Nenhuma transação registrada</p>
        ) : (
          transactions.map((tx) => (
            <Card key={tx.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-base font-medium text-gray-900">
                    {tx.type === 'DEBT' ? '🛒 Venda' : '💰 Pagamento'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {tx.description || 'Sem descrição'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(tx.created_at)}
                  </p>
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
          ))
        )}
      </div>

      {/* Payment Dialog */}
      <RegisterPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        customerId={customerId}
        customerName={customer.name}
        currentBalance={balance}
        onPaymentRegistered={loadData}
      />
    </div>
  );
}
