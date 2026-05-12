-- Migration v5: tabela de acompanhantes com convite individual
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS companions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id      UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  wants_to_gift BOOLEAN DEFAULT FALSE,
  invite_token  UUID DEFAULT gen_random_uuid(),
  invite_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE companions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_companions" ON companions
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
