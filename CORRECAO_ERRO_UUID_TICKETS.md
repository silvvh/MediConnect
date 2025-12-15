# Correção - Erro UUID "undefined" em Tickets

## Problema

Erro: `invalid input syntax for type uuid: "undefined"` ao tentar abrir um ticket como admin.

## Causa

O erro ocorria quando:
1. O `ticketId` estava sendo passado como a string "undefined" em vez de um UUID válido
2. O campo `assigned_to` estava sendo enviado como a string "undefined" em vez de `null` ou um UUID válido

## Soluções Implementadas

### 1. Validação de ticketId

Adicionada validação na API para garantir que o `ticketId` seja um UUID válido:

```typescript
if (!params.ticketId || typeof params.ticketId !== 'string' || params.ticketId === 'undefined') {
  return NextResponse.json(
    { error: "ID do ticket inválido" },
    { status: 400 }
  );
}
```

### 2. Tratamento Correto de assigned_to

Ajustado o tratamento de `assigned_to` para:
- Converter string "undefined" para `null`
- Validar se é um UUID válido antes de atualizar
- Retornar erro se não for um UUID válido

```typescript
if (assigned_to !== undefined) {
  if (assigned_to === null || assigned_to === "" || assigned_to === "undefined" || assigned_to === undefined) {
    updateData.assigned_to = null;
  } else {
    // Validar se é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(assigned_to)) {
      updateData.assigned_to = assigned_to;
    } else {
      return NextResponse.json(
        { error: "assigned_to deve ser um UUID válido ou null" },
        { status: 400 }
      );
    }
  }
}
```

## Arquivos Modificados

- `src/app/api/support/tickets/[ticketId]/route.ts`
  - Validação de `ticketId` no GET
  - Validação de `ticketId` no PATCH
  - Tratamento correto de `assigned_to` no PATCH

## Testes

Após a correção, verifique:
1. ✅ Abrir um ticket existente como admin
2. ✅ Atualizar status de um ticket
3. ✅ Atribuir um ticket a um atendente (com UUID válido)
4. ✅ Remover atribuição de um ticket (com null)

## Prevenção

Para evitar problemas similares no futuro:
- Sempre validar UUIDs antes de usar em queries
- Converter strings "undefined" para `null` antes de enviar ao banco
- Usar validação de tipos no TypeScript
- Adicionar validação de schema com Zod ou similar


