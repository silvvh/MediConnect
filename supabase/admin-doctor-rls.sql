-- RLS Policies para Admins visualizarem todos os médicos
-- Execute este arquivo no Supabase SQL Editor

-- Policy para admins visualizarem todos os médicos
DROP POLICY IF EXISTS "Admins can view all doctors" ON doctors;
CREATE POLICY "Admins can view all doctors"
  ON doctors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policy para admins atualizarem médicos
DROP POLICY IF EXISTS "Admins can update all doctors" ON doctors;
CREATE POLICY "Admins can update all doctors"
  ON doctors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Nota: A policy "Admins can view all profiles" já existe no schema.sql
-- Se não existir, descomente as linhas abaixo:
-- DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
-- CREATE POLICY "Admins can view all profiles"
--   ON profiles FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles p
--       WHERE p.id = auth.uid() 
--       AND p.role = 'admin'
--     )
--   );

