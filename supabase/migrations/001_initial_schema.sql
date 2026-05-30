-- ============================================================
-- Caderneta Digital - Schema Inicial
-- Execute este SQL no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela de Perfis
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver apenas o próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar apenas o próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir apenas o próprio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger para criar perfil automaticamente ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lojistas podem ver apenas seus clientes"
  ON public.customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Lojistas podem criar apenas seus clientes"
  ON public.customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Lojistas podem atualizar apenas seus clientes"
  ON public.customers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Lojistas podem deletar apenas seus clientes"
  ON public.customers FOR DELETE
  USING (auth.uid() = user_id);

-- Índice para busca rápida por usuário
CREATE INDEX idx_customers_user_id ON public.customers(user_id);

-- 3. Tabela de Transações
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('DEBT', 'PAYMENT')),
  description TEXT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lojistas podem ver apenas suas transações"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Lojistas podem criar apenas suas transações"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Lojistas podem atualizar apenas suas transações"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Lojistas podem deletar apenas suas transações"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Índices para consultas frequentes
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_customer_id ON public.transactions(customer_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);

-- 4. View para resumo de saldo por cliente
CREATE OR REPLACE VIEW public.customer_balances AS
SELECT
  c.id AS customer_id,
  c.user_id,
  c.name AS customer_name,
  c.phone_number,
  COALESCE(SUM(CASE WHEN t.type = 'DEBT' THEN t.amount ELSE 0 END), 0) AS total_debt,
  COALESCE(SUM(CASE WHEN t.type = 'PAYMENT' THEN t.amount ELSE 0 END), 0) AS total_paid,
  COALESCE(SUM(CASE WHEN t.type = 'DEBT' THEN t.amount ELSE -t.amount END), 0) AS balance
FROM public.customers c
LEFT JOIN public.transactions t ON t.customer_id = c.id
GROUP BY c.id, c.user_id, c.name, c.phone_number;

-- Habilitar RLS na view (views usam as policies das tabelas base)
