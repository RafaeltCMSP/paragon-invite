-- Migration v2: adiciona token de convite individual por convidado
-- Execute no SQL Editor do Supabase

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_url   TEXT;

CREATE INDEX IF NOT EXISTS idx_guests_invite_token ON guests(invite_token);
