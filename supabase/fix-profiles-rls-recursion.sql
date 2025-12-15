-- Corrigir recursão infinita nas políticas RLS de profiles
-- Execute este arquivo no Supabase SQL Editor

-- Remover política que causa recursão
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Criar função SECURITY DEFINER para verificar se usuário é admin
-- Esta função não é afetada por RLS, evitando recursão
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Alternativa: Função que verifica role diretamente sem recursão
-- Usando uma abordagem que não consulta profiles dentro da política
CREATE OR REPLACE FUNCTION check_user_role(check_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Tentar pegar do metadata primeiro (mais rápido, sem RLS)
  SELECT COALESCE(
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
    (SELECT role FROM public.profiles WHERE id = auth.uid())
  ) INTO user_role;
  
  RETURN user_role = check_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recriar política usando a função (evita recursão)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (check_user_role('admin'));

-- Também criar política para admins atualizarem perfis
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (check_user_role('admin'));

-- Política para admins deletarem perfis (cuidado: isso deleta o usuário do auth também devido ao CASCADE)
DROP POLICY IF EXISTS "Admins can delete all profiles" ON profiles;
CREATE POLICY "Admins can delete all profiles"
  ON profiles FOR DELETE
  USING (check_user_role('admin'));

-- Verificar se as políticas foram criadas
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

