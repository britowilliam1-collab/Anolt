'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOnlineStatus } from '@/lib/offline/sync';
import { savePendingTransaction } from '@/lib/offline/db';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Banknote } from 'lucide-react';

interface RegisterPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  currentBalance: number;
  onPaymentRegistered: () => void;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function RegisterPaymentDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  currentBalance,
  onPaymentRegistered,
}: RegisterPaymentDialogProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { isOnline } = useOnlineStatus();
  const supabase = createClient();

  async function handleSubmit() {
    if (!amount) return;
    setLoading(true);

    try {
      const paymentAmount = parseFloat(amount);

      const transactionData = {
        customer_id: customerId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        type: 'PAYMENT' as const,
        description: 'Pagamento recebido',
        amount: paymentAmount,
      };

      if (isOnline) {
        const { error } = await supabase
          .from('transactions')
          .insert(transactionData);

        if (error) throw error;
      } else {
        await savePendingTransaction(transactionData);
      }

      onPaymentRegistered();
      onOpenChange(false);
      setAmount('');
    } catch (err) {
      console.error('Error registering payment:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-green-600" />
            Registrar Pagamento
          </DialogTitle>
          <DialogDescription>
            {customerName} — Deve {formatCurrency(currentBalance)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-base">Valor do Pagamento (R$)</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-2xl font-bold"
              step="0.01"
              min="0"
              inputMode="decimal"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 text-base"
              onClick={() => setAmount(currentBalance.toString())}
            >
              Total
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-base"
              onClick={() => setAmount((currentBalance / 2).toFixed(2))}
            >
              Metade
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="h-12 w-full gap-2 bg-green-600 text-lg font-semibold hover:bg-green-700"
            onClick={handleSubmit}
            disabled={loading || !amount}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Banknote className="h-5 w-5" />
            )}
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
