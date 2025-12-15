-- Script para inserir usuários administradores
-- Execute este arquivo no Supabase SQL Editor
-- IMPORTANTE: Você precisará criar os usuários no Supabase Auth primeiro
-- e depois atualizar seus perfis para role 'admin'

-- Exemplo de como criar um admin:
-- 1. Crie o usuário no Supabase Auth (Authentication > Users > Add User)
-- 2. Copie o UUID do usuário criado
-- 3. Execute o UPDATE abaixo substituindo 'USER_UUID_AQUI' pelo UUID real

-- Exemplo 1: Atualizar perfil existente para admin
-- UPDATE profiles
-- SET role = 'admin'
-- WHERE id = 'USER_UUID_AQUI';

-- Exemplo 2: Criar perfil admin (se o perfil não existir)
-- INSERT INTO profiles (id, role, full_name, email)
-- VALUES (
--   'USER_UUID_AQUI',
--   'admin',
--   'Nome do Administrador',
--   'admin@mediconnect.com'
-- )
-- ON CONFLICT (id) DO UPDATE
-- SET role = 'admin';

-- ============================================
-- INSTRUÇÕES PARA CRIAR ADMINS:
-- ============================================

-- OPÇÃO 1: Via Supabase Dashboard
-- 1. Vá em Authentication > Users
-- 2. Clique em "Add User"
-- 3. Preencha email e senha
-- 4. Copie o UUID do usuário criado
-- 5. Execute o SQL abaixo substituindo USER_UUID_AQUI

-- OPÇÃO 2: Via SQL (criar usuário e perfil)
-- Execute os comandos abaixo substituindo os valores:

/*
-- Criar usuário no auth.users (requer permissões especiais)
-- Normalmente isso é feito via Supabase Dashboard ou API

-- Depois, criar/atualizar perfil:
INSERT INTO profiles (id, role, full_name, email)
VALUES (
  'USER_UUID_AQUI',  -- Substitua pelo UUID do usuário
  'admin',
  'Administrador Principal',
  'admin@mediconnect.com'
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin', full_name = 'Administrador Principal';
*/

-- ============================================
-- EXEMPLO PRÁTICO:
-- ============================================

-- Se você já tem um usuário criado e quer torná-lo admin:
-- 1. Vá em Authentication > Users no Supabase Dashboard
-- 2. Encontre o usuário e copie o ID (UUID)
-- 3. Execute:

-- UPDATE profiles
-- SET role = 'admin'
-- WHERE id = 'COLE_O_UUID_AQUI';

-- ============================================
-- CRIAR MÚLTIPLOS ADMINS:
-- ============================================

-- Para criar múltiplos admins, repita o processo acima para cada usuário
-- ou use múltiplos UPDATEs:

/*
UPDATE profiles
SET role = 'admin'
WHERE email IN (
  'admin1@mediconnect.com',
  'admin2@mediconnect.com',
  'admin3@mediconnect.com'
);
*/

-- ============================================
-- VERIFICAR ADMINS EXISTENTES:
-- ============================================

-- Para ver todos os admins:
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.created_at
FROM profiles p
WHERE p.role = 'admin'
ORDER BY p.created_at DESC;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================

-- 1. Sempre crie usuários via Supabase Auth primeiro
-- 2. O perfil é criado automaticamente pelo trigger, mas com role 'patient'
-- 3. Use UPDATE para alterar a role para 'admin'
-- 4. Admins têm acesso total ao sistema
-- 5. Mantenha o número de admins limitado por segurança

