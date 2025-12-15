# Correção - Coluna Email em Profiles

## Problema

A tabela `profiles` não possui a coluna `email`. O email está armazenado na tabela `auth.users` do Supabase, que não é acessível diretamente via queries normais.

## Soluções Implementadas

### Opção 1: Remover Email da Query (Implementado)

**Arquivos Corrigidos:**
- ✅ `src/app/dashboard/admin/doctors/page.tsx` - Removido email da query
- ✅ `src/app/dashboard/admin/users/page.tsx` - Removido email da query e ajustado interface

**Mudanças:**
- Interface `Doctor` atualizada para não incluir email
- Interface `User` atualizada para email opcional (`email: string | null`)
- Queries ajustadas para não buscar email de `profiles`
- UI ajustada para mostrar email apenas se disponível

### Opção 2: Adicionar Coluna Email à Tabela Profiles (Opcional)

**Arquivo Criado:** `supabase/add-email-to-profiles.sql`

Este script:
- Adiciona coluna `email` à tabela `profiles`
- Cria trigger para sincronizar email de `auth.users` para `profiles`
- Sincroniza emails existentes

**Para usar esta opção:**
1. Execute `supabase/add-email-to-profiles.sql` no Supabase SQL Editor
2. Atualize as queries para incluir `email` novamente

## Recomendação

**Opção 1 (Atual):** Mais simples, não requer mudanças no banco
- Email não será exibido na lista de médicos/usuários
- Funciona imediatamente sem executar SQL adicional

**Opção 2 (Opcional):** Mais completo, requer execução de SQL
- Email será exibido após sincronização
- Mantém email sincronizado automaticamente

## Status Atual

✅ **Correção Aplicada:**
- Queries corrigidas para não buscar email
- Interfaces atualizadas
- UI ajustada para lidar com email opcional
- Erro "Column profiles.email does not exist" resolvido

## Próximos Passos (Opcional)

Se você quiser exibir emails:
1. Execute `supabase/add-email-to-profiles.sql`
2. Atualize as queries para incluir `email` novamente
3. Atualize as interfaces para tornar `email` obrigatório novamente


