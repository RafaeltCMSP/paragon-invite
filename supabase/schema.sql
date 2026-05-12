-- ==============================================
-- Paragon Invite — Schema Supabase
-- Execute este arquivo no SQL Editor do Supabase
-- ==============================================

CREATE TABLE guests (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  wants_to_gift BOOLEAN DEFAULT FALSE,
  confirmed_at  TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id        UUID REFERENCES guests(id) ON DELETE CASCADE,
  mp_payment_id   TEXT UNIQUE,
  amount          NUMERIC(10, 2) NOT NULL,
  status          TEXT DEFAULT 'pending',  -- pending | approved | rejected | cancelled
  qr_code         TEXT,
  qr_code_base64  TEXT,
  paid_at         TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para consultas de status
CREATE INDEX idx_payments_mp_payment_id ON payments(mp_payment_id);
CREATE INDEX idx_payments_guest_id      ON payments(guest_id);

-- Row Level Security: bloqueia acesso público direto
ALTER TABLE guests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- O service_role_key do backend bypass o RLS automaticamente.
-- Estas policies bloqueiam qualquer acesso via anon key.
CREATE POLICY "deny_anon_guests"   ON guests   FOR ALL TO anon USING (false);
CREATE POLICY "deny_anon_payments" ON payments FOR ALL TO anon USING (false);
