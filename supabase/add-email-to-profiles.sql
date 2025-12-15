-- Adicionar coluna email à tabela profiles
-- Execute este arquivo no Supabase SQL Editor

-- Adicionar coluna email (opcional, pode ser null)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Criar função para sincronizar email de auth.users para profiles
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar email no profile quando o email do usuário mudar
  UPDATE profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para sincronizar email automaticamente
DROP TRIGGER IF EXISTS sync_email_trigger ON auth.users;
CREATE TRIGGER sync_email_trigger
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

-- Sincronizar emails existentes
UPDATE profiles
SET email = (
  SELECT email FROM auth.users WHERE auth.users.id = profiles.id
)
WHERE email IS NULL;


