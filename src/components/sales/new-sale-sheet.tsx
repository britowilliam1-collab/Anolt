'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/auth-provider';
import { useOnlineStatus } from '@/lib/offline/sync';
import { savePendingCustomer } from '@/lib/offline/db';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Search, UserPlus, Loader2, ShoppingCart } from 'lucide-react';
import type { Customer } from '@/lib/types';

interface NewSaleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaleCreated: () => void;
}

export function NewSaleSheet({ open, onOpenChange, onSaleCreated }: NewSaleSheetProps) {
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const supabase = createClient();

  // Step 1: Select customer
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Step 2: Sale details
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadCustomers();
    }
  }, [open, user]);

  function loadCustomers() {
    if (!user) return;
    supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .ilike('name', `%${searchQuery}%`)
      .order('name')
      .then(({ data }) => {
        if (data) setCustomers(data as Customer[]);
      });
  }

  useEffect(() => {
    if (open) loadCustomers();
  }, [searchQuery]);

  function resetForm() {
    setSelectedCustomer(null);
    setShowNewCustomer(false);
    setSearchQuery('');
    setNewName('');
    setNewPhone('');
    setAmount('');
    setDescription('');
    setLoading(false);
  }

  async function handleSubmit() {
    if (!user) return;
    setLoading(true);

    try {
      let customerId = selectedCustomer?.id;

      // Create new customer if needed
      if (showNewCustomer && newName) {
        const newCustomerData = {
          user_id: user.id,
          name: newName,
          phone_number: newPhone || null,
        };

        if (isOnline) {
          const { data, error } = await supabase
            .from('customers')
            .insert(newCustomerData)
            .select()
            .single();

          if (error) throw error;
          customerId = data.id;
        } else {
          // Save offline - generate temp ID
          customerId = `temp-${Date.now()}`;
          await savePendingCustomer({
            ...newCustomerData,
            id: customerId,
          });
        }
      }

      if (!customerId || !amount) {
        setLoading(false);
        return;
      }

      // Create transaction
      const transactionData = {
        customer_id: customerId,
        user_id: user.id,
        type: 'DEBT' as const,
        description: description || null,
        amount: parseFloat(amount),
      };

      if (isOnline) {
        const { error } = await supabase
          .from('transactions')
          .insert(transactionData);

        if (error) throw error;
      } else {
        await savePendingCustomer(transactionData);
        // Use the correct function for transactions
        const { savePendingTransaction } = await import('@/lib/offline/db');
        await savePendingTransaction(transactionData);
      }

      onSaleCreated();
      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error('Error creating sale:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Drawer open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Nova Venda Fiado
            </DrawerTitle>
            <DrawerDescription>
              Selecione o cliente e registre a venda
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-4">
            {/* Step 1: Customer Selection */}
            {!selectedCustomer && !showNewCustomer && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-lg"
                  />
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-blue-50"
                    >
                      <span className="text-lg font-medium">{customer.name}</span>
                      <span className="text-sm text-gray-500">{customer.phone_number || ''}</span>
                    </button>
                  ))}
                </div>
                <Separator />
                <Button
                  variant="outline"
                  className="h-14 w-full gap-2 text-lg"
                  onClick={() => setShowNewCustomer(true)}
                >
                  <UserPlus className="h-5 w-5" />
                  Novo Cliente
                </Button>
              </div>
            )}

            {/* New Customer Form */}
            {showNewCustomer && !selectedCustomer && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base">Nome do Cliente</Label>
                  <Input
                    placeholder="Ex: Maria Silva"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">WhatsApp</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="text-lg"
                  />
                </div>
                <Button
                  className="h-12 w-full text-lg"
                  onClick={() => {
                    if (newName) {
                      setSelectedCustomer({
                        id: `new-${Date.now()}`,
                        user_id: user?.id || '',
                        name: newName,
                        phone_number: newPhone || null,
                        created_at: new Date().toISOString(),
                      });
                    }
                  }}
                  disabled={!newName}
                >
                  Continuar
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowNewCustomer(false)}
                >
                  Voltar
                </Button>
              </div>
            )}

            {/* Step 2: Sale Details */}
            {selectedCustomer && (
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-sm text-blue-600">Cliente selecionado</p>
                  <p className="text-lg font-semibold">{selectedCustomer.name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Valor (R$)</Label>
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
                <div className="space-y-2">
                  <Label className="text-base">Descrição</Label>
                  <Input
                    placeholder="Ex: 3 Camisetas"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="text-lg"
                  />
                </div>
                <Button
                  className="h-14 w-full gap-2 text-lg font-semibold"
                  onClick={handleSubmit}
                  disabled={loading || !amount}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ShoppingCart className="h-5 w-5" />
                  )}
                  Salvar Venda
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    if (showNewCustomer) {
                      setSelectedCustomer(null);
                    } else {
                      setSelectedCustomer(null);
                    }
                  }}
                >
                  Trocar Cliente
                </Button>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
