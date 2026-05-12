-- Fix: permite que as Netlify Functions operem com a publishable key
-- Execute no SQL Editor do Supabase

DROP POLICY IF EXISTS "deny_anon_guests"   ON guests;
DROP POLICY IF EXISTS "deny_anon_payments" ON payments;

CREATE POLICY "allow_all_guests"   ON guests   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_payments" ON payments FOR ALL TO anon USING (true) WITH CHECK (true);
