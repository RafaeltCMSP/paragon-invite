-- Migration v4: adiciona controle de check-in na entrada
-- Execute no SQL Editor do Supabase

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;
