# Verificação de Variáveis de Ambiente

## ✅ Variáveis Já Configuradas

Baseado no seu `.env.local`, você já tem:

1. ✅ `NEXT_PUBLIC_SUPABASE_URL`
2. ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. ✅ `SUPABASE_SERVICE_ROLE_KEY`
4. ✅ `OPENAI_API_KEY`
5. ✅ `DAILY_API_KEY`
6. ✅ `NEXT_PUBLIC_DAILY_DOMAIN`
7. ✅ `STRIPE_SECRET_KEY`
8. ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
9. ✅ `STRIPE_WEBHOOK_SECRET`
10. ✅ `RESEND_API_KEY`
11. ✅ `RESEND_FROM_EMAIL`
12. ✅ `CRON_SECRET`

## ❌ Variáveis FALTANDO

### 🔴 OBRIGATÓRIA

**`NEXT_PUBLIC_APP_URL`** - **IMPORTANTE!**
- **Uso**: Links em emails, redirects após pagamento, URLs de callback
- **Onde é usado**:
  - `src/app/api/payments/create-checkout-products/route.ts` (redirects após pagamento)
  - `src/app/api/payments/create-checkout/route.ts` (redirects após pagamento)
  - `src/lib/email-templates.ts` (links em emails)
  - `src/lib/notifications.ts` (URLs de notificações)
- **Valor recomendado para desenvolvimento**: `http://localhost:3000`
- **Valor para produção**: `https://seu-dominio.com`

### ⚠️ OPCIONAIS (Recomendadas)

**`OPENAI_MODEL`** - Opcional mas recomendado
- **Uso**: Define qual modelo da OpenAI usar
- **Padrão**: `gpt-4-turbo-preview` (já está no código)
- **Onde é usado**: 
  - `src/app/api/ai/medical-record/route.ts`
  - `src/app/api/ai/medical-report/route.ts`

**`CLICKSIGN_API_KEY`** - Opcional (apenas se usar assinatura digital)
- **Uso**: Integração com ClickSign para assinatura digital
- **Onde é usado**: `src/lib/signature/clicksign.ts`

**`CLICKSIGN_BASE_URL`** - Opcional (tem valor padrão)
- **Uso**: URL base da API ClickSign
- **Padrão**: `https://app.clicksign.com/api/v1` (já está no código)

---

## 🔧 Como Adicionar as Variáveis Faltantes

Adicione ao seu `.env.local`:

```env
# App URL (OBRIGATÓRIA)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OpenAI Model (Opcional - já tem padrão)
OPENAI_MODEL=gpt-4-turbo-preview

# ClickSign (Opcional - apenas se usar)
CLICKSIGN_API_KEY=sua_chave_aqui
CLICKSIGN_BASE_URL=https://app.clicksign.com/api/v1
```

---

## 📝 Resumo

**Variável CRÍTICA faltando:**
- ❌ `NEXT_PUBLIC_APP_URL` - **Adicione esta imediatamente!**

**Variáveis opcionais:**
- `OPENAI_MODEL` - Tem padrão, mas pode ser útil customizar
- `CLICKSIGN_API_KEY` - Apenas se usar assinatura digital
- `CLICKSIGN_BASE_URL` - Tem padrão, raramente precisa mudar

---

## ⚠️ Impacto da Variável Faltante

Sem `NEXT_PUBLIC_APP_URL`:
- ❌ Redirects após pagamento podem falhar
- ❌ Links em emails podem estar incorretos
- ❌ Callbacks podem não funcionar corretamente

**Solução**: Adicione `NEXT_PUBLIC_APP_URL=http://localhost:3000` ao seu `.env.local`

