# Variáveis de Ambiente - Guia Completo

## 📋 Checklist de Variáveis de Ambiente

### ✅ OBRIGATÓRIAS (Sistema não funciona sem elas)

#### Supabase

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - URL do projeto Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave pública/anônima do Supabase
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço do Supabase (para operações privilegiadas)

#### OpenAI (para funcionalidades de IA)

- [ ] `OPENAI_API_KEY` - Chave da API OpenAI
- [ ] `OPENAI_MODEL` - (Opcional) Modelo a usar (padrão: `gpt-4-turbo-preview`)

#### Daily.co (para videochamadas)

- [ ] `DAILY_API_KEY` - Chave da API Daily.co
- [ ] `NEXT_PUBLIC_DAILY_DOMAIN` - Domínio do Daily.co

#### Stripe (para pagamentos)

- [ ] `STRIPE_SECRET_KEY` - Chave secreta do Stripe
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Chave pública do Stripe
- [ ] `STRIPE_WEBHOOK_SECRET` - Secret do webhook do Stripe

#### App Configuration

- [ ] `NEXT_PUBLIC_APP_URL` - URL base da aplicação

---

### ⚠️ OPCIONAIS (Funcionalidades específicas)

#### Resend (para envio de emails)

- [ ] `RESEND_API_KEY` - Chave da API Resend
- [ ] `RESEND_FROM_EMAIL` - Email remetente (padrão: `noreply@mediconnect.com`)

#### ClickSign (para assinatura digital)

- [ ] `CLICKSIGN_API_KEY` - Chave da API ClickSign
- [ ] `CLICKSIGN_BASE_URL` - (Opcional) URL base da API (padrão: `https://app.clicksign.com/api/v1`)

#### Cron Jobs (para tarefas agendadas)

- [ ] `CRON_SECRET` - String secreta para proteger endpoints de cron

---

## 🔍 Onde Cada Variável é Usada

### Supabase

- **NEXT_PUBLIC_SUPABASE_URL**: Cliente Supabase (client e server), middleware
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Cliente Supabase (client e server), middleware
- **SUPABASE_SERVICE_ROLE_KEY**: Webhooks, notificações, cron jobs

### OpenAI

- **OPENAI_API_KEY**: Geração de prontuários, laudos, resumos de documentos
- **OPENAI_MODEL**: Modelo usado para geração de conteúdo (padrão: `gpt-4-turbo-preview`)

### Daily.co

- **DAILY_API_KEY**: Criação de salas de vídeo, geração de tokens
- **NEXT_PUBLIC_DAILY_DOMAIN**: Cliente de vídeo no navegador

### Stripe

- **STRIPE_SECRET_KEY**: Criação de checkout sessions, processamento de webhooks
- **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**: Cliente Stripe no navegador (checkout)
- **STRIPE_WEBHOOK_SECRET**: Verificação de assinatura de webhooks

### Resend

- **RESEND_API_KEY**: Envio de emails (confirmações, lembretes)
- **RESEND_FROM_EMAIL**: Email remetente (padrão: `noreply@mediconnect.com`)

### ClickSign

- **CLICKSIGN_API_KEY**: Criação de documentos para assinatura
- **CLICKSIGN_BASE_URL**: URL base da API (padrão já configurado)

### App Configuration

- **NEXT_PUBLIC_APP_URL**: Links em emails, redirects após pagamento, URLs de callback

### Cron

- **CRON_SECRET**: Proteção de endpoints de cron jobs

---

## 📝 Exemplo de .env.local Completo

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# Daily.co
DAILY_API_KEY=e1c421c50da3119855acbbaff629573a9fca4425f7e3c9dbcb695c69620ca093
NEXT_PUBLIC_DAILY_DOMAIN=reinvdev.daily.co

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@mediconnect.com

# ClickSign
CLICKSIGN_API_KEY=...
CLICKSIGN_BASE_URL=https://app.clicksign.com/api/v1

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron
CRON_SECRET=minha_string_secreta_super_segura
```

---

## ⚠️ Variáveis que PODEM estar faltando no seu .env.local

Baseado na análise do código, verifique se você tem:

1. **STRIPE_WEBHOOK_SECRET** - Necessário para webhooks do Stripe funcionarem
2. **NEXT_PUBLIC_APP_URL** - Necessário para redirects e links em emails
3. **OPENAI_MODEL** - Opcional, mas recomendado (padrão: `gpt-4-turbo-preview`)
4. **RESEND_FROM_EMAIL** - Opcional, mas recomendado se usar Resend
5. **CRON_SECRET** - Opcional, mas recomendado se usar cron jobs
6. **CLICKSIGN_API_KEY** - Opcional, apenas se usar assinatura digital
7. **CLICKSIGN_BASE_URL** - Opcional, tem valor padrão

---

## 🔐 Segurança

### Variáveis Públicas (NEXT*PUBLIC*\*)

- Expostas ao cliente (navegador)
- Podem ser vistas no código JavaScript
- Use apenas para dados não sensíveis

### Variáveis Privadas (sem NEXT*PUBLIC*)

- Apenas no servidor
- Nunca expostas ao cliente
- Use para chaves secretas e tokens

---

## 🚀 Como Obter as Credenciais

### Supabase

1. Acesse https://supabase.com
2. Vá em Settings > API
3. Copie Project URL e anon/public key
4. Copie service_role key (mantenha segura!)

### OpenAI

1. Acesse https://platform.openai.com
2. Vá em API Keys
3. Crie uma nova chave

### Daily.co

1. Acesse https://dashboard.daily.co
2. Vá em Developers > API Keys
3. Copie a API Key
4. Copie o Domain

### Stripe

1. Acesse https://dashboard.stripe.com
2. Vá em Developers > API Keys
3. Copie Secret key e Publishable key
4. Para webhook: Developers > Webhooks > Add endpoint > Copie Signing secret

### Resend

1. Acesse https://resend.com
2. Vá em API Keys
3. Crie uma nova chave
4. Verifique um domínio para usar como remetente

---

## ✅ Verificação Rápida

Execute este comando para verificar variáveis faltantes:

```bash
# No terminal, dentro do projeto
node -e "
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'DAILY_API_KEY',
  'NEXT_PUBLIC_DAILY_DOMAIN',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_APP_URL'
];
const missing = required.filter(v => !process.env[v]);
if (missing.length) {
  console.log('❌ Variáveis faltando:', missing.join(', '));
} else {
  console.log('✅ Todas as variáveis obrigatórias estão configuradas!');
}
"
```

---

## 📚 Referências

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)
- [Stripe Environment Variables](https://stripe.com/docs/keys)
- [Daily.co API Keys](https://docs.daily.co/reference/rest-api/authentication)
