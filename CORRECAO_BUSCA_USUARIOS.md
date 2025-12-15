# Correção - Erro ao Buscar Usuários no Dashboard Admin

## Problema

A página `/dashboard/admin/users` estava apresentando erro `{}` ao tentar buscar usuários. O problema estava relacionado a:

1. **Join aninhado com `doctors`**: A query tentava fazer um join aninhado `doctor:doctors(...)` dentro de `profiles`, o que pode causar problemas com RLS ou recursão
2. **Políticas RLS**: A política de admin pode não estar funcionando corretamente para o join aninhado

## Solução Implementada

### 1. Separação das Queries

A query foi separada em duas etapas:
1. Buscar todos os perfis de `profiles`
2. Buscar dados de médicos separadamente e combinar no frontend

### 2. Tratamento de Erros Melhorado

- Adicionado logging detalhado de erros
- Verificação de dados vazios
- Continuação mesmo se houver erro ao buscar médicos

### 3. Arquivo SQL para RLS

Criado `supabase/admin-profiles-rls.sql` para garantir que as políticas RLS de admin estejam corretas.

## Mudanças no Código

**Arquivo**: `src/app/dashboard/admin/users/page.tsx`

**Antes**:
```typescript
const { data: profilesData, error: profilesError } = await supabase
  .from("profiles")
  .select(`
    id,
    full_name,
    phone,
    role,
    created_at,
    doctor:doctors(crm, specialty, is_approved)
  `)
  .order("created_at", { ascending: false });
```

**Depois**:
```typescript
// Buscar perfis
const { data: profilesData, error: profilesError } = await supabase
  .from("profiles")
  .select("id, full_name, phone, role, created_at")
  .order("created_at", { ascending: false});

// Buscar médicos separadamente
const doctorIds = filtered.filter((u) => u.role === "doctor").map((u) => u.id);
const { data: doctorsData } = await supabase
  .from("doctors")
  .select("id, crm, specialty, is_approved")
  .in("id", doctorIds);

// Combinar dados no frontend
```

## Próximos Passos

1. **Executar SQL de RLS** (se necessário):
   - Execute `supabase/admin-profiles-rls.sql` no Supabase SQL Editor se a política não estiver funcionando

2. **Verificar Permissões**:
   - Certifique-se de que o usuário logado tem role `admin`
   - Verifique se as políticas RLS estão ativas

3. **Testar**:
   - Acesse `/dashboard/admin/users`
   - Verifique se os usuários são listados corretamente
   - Teste os filtros por role

## Notas

- A separação das queries evita problemas de recursão nas políticas RLS
- O tratamento de erros melhorado ajuda a identificar problemas específicos
- A combinação de dados no frontend é mais flexível e evita problemas de join aninhado


