-- Migration v6: liga pagamentos de acompanhantes à tabela companions
-- Execute no SQL Editor do Supabase

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS companion_id UUID REFERENCES companions(id);
