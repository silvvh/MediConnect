# Correção - Recursão Infinita nas Políticas RLS

## Problema

Erro: `infinite recursion detected in policy for relation "profiles"`

A política RLS "Admins can view all profiles" estava causando recursão infinita porque:
- A política verifica se o usuário é admin consultando a tabela `profiles`
- Mas para consultar `profiles`, a própria política precisa ser verificada
- Isso cria um loop infinito

## Solução

### 1. Função SECURITY DEFINER

Criada função `check_user_role()` que:
- Usa `SECURITY DEFINER` para executar com privilégios elevados
- Não é afetada por RLS
- Verifica o role do usuário sem causar recursão

### 2. Política RLS Corrigida

A política agora usa a função `check_user_role()` em vez de fazer SELECT direto na tabela `profiles`.

## Como Aplicar a Correção

1. **Execute o SQL no Supabase**:
   - Abra o Supabase SQL Editor
   - Execute o conteúdo de `supabase/fix-profiles-rls-recursion.sql`
   - Isso criará a função e recriará as políticas

2. **Verifique se funcionou**:
   ```sql
   -- Verificar se a função foi criada
   SELECT * FROM pg_proc WHERE proname = 'check_user_role';
   
   -- Verificar se as políticas foram criadas
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

## Arquivos Criados

- `supabase/fix-profiles-rls-recursion.sql` - Script SQL para corrigir a recursão
- `CORRECAO_RECURSAO_RLS.md` - Esta documentação

## Explicação Técnica

### Por que a recursão acontecia?

```sql
-- ❌ Política que causa recursão
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p  -- ← Consulta profiles novamente!
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );
```

Quando um admin tenta ver todos os perfis:
1. A política verifica se o usuário é admin
2. Para isso, precisa consultar `profiles`
3. Mas consultar `profiles` aciona a política novamente
4. Loop infinito! 🔄

### Como a função resolve?

```sql
-- ✅ Função SECURITY DEFINER (não afetada por RLS)
CREATE OR REPLACE FUNCTION check_user_role(check_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Pega role do metadata ou profiles (sem acionar RLS recursivamente)
  SELECT COALESCE(
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
    (SELECT role FROM public.profiles WHERE id = auth.uid())
  ) INTO user_role;
  
  RETURN user_role = check_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

A função `SECURITY DEFINER`:
- Executa com privilégios do criador da função
- Não é afetada por RLS
- Pode consultar `profiles` sem acionar políticas recursivamente

## Teste

Após executar o SQL, teste:

```sql
-- Como admin, deve conseguir ver todos os perfis
SELECT * FROM profiles;

-- Deve retornar true se você for admin
SELECT check_user_role('admin');
```

## Notas Importantes

- ⚠️ A função `SECURITY DEFINER` deve ser usada com cuidado
- ✅ A função é `STABLE`, então pode ser otimizada pelo PostgreSQL
- ✅ A função primeiro tenta pegar o role do `auth.users` (mais rápido)
- ✅ Se não encontrar, consulta `profiles` (ainda sem recursão)


