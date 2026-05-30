'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageCircle, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CustomerBalance } from '@/lib/types';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function ClientesPage() {
  const { user } = useAuth();
  const [balances, setBalances] = useState<CustomerBalance[]>([]);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (user) loadClientes();
  }, [user]);

  async function loadClientes() {
    if (!user) return;
    const { data } = await supabase
      .from('customer_balances')
      .select('*')
      .eq('user_id', user.id)
      .order('customer_name');

    if (data) setBalances(data as CustomerBalance[]);
  }

  const filtered = balances.filter((b) =>
    b.customer_name.toLowerCase().includes(search.toLowerCase())
  );

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
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 text-lg"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-8 text-center">
            <p className="text-lg text-gray-500">Nenhum cliente encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => (
            <Card
              key={b.customer_id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/dashboard/clientes/${b.customer_id}`)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold text-gray-900">
                    {b.customer_name}
                  </p>
                  <p className="text-sm text-gray-500">{b.phone_number || 'Sem telefone'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-lg font-bold ${b.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(Math.abs(b.balance))}
                    </p>
                    <p className="text-xs text-gray-500">
                      {b.balance > 0 ? 'deve' : 'em dia'}
                    </p>
                  </div>
                  {b.phone_number && b.balance > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 text-green-600 hover:bg-green-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        openWhatsApp(b.phone_number, b.customer_name, b.balance);
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
  );
}
