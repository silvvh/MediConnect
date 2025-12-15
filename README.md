# 🏥 MediConnect - Plataforma de Telemedicina

<div align="center">

![MediConnect](https://img.shields.io/badge/MediConnect-Telemedicina-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=for-the-badge&logo=supabase)

**Plataforma completa de telemedicina moderna e segura para o mercado brasileiro**

[Funcionalidades](#-funcionalidades) • [Instalação](#-instalação) • [Arquitetura](#-arquitetura) • [Documentação](#-documentação)

</div>

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Stack Tecnológica](#-stack-tecnológica)
- [Arquitetura](#-arquitetura)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Segurança](#-segurança)
- [Deploy](#-deploy)

---

## 🎯 Sobre o Projeto

O **MediConnect** é uma plataforma completa de telemedicina desenvolvida especificamente para o mercado brasileiro, oferecendo uma solução moderna, segura e em conformidade com a LGPD para consultas médicas online.

### Principais Diferenciais

- ✅ **Design Mobile-First**: Interface totalmente responsiva e otimizada para dispositivos móveis
- ✅ **Inteligência Artificial**: Geração automática de prontuários e resumos de documentos
- ✅ **Videochamadas HD**: Integração com Daily.co para consultas em alta qualidade
- ✅ **Pagamentos Integrados**: Checkout seguro com Stripe
- ✅ **Conformidade LGPD**: Logs de auditoria e proteção de dados

---

## 🚀 Funcionalidades

### 🔐 Autenticação e Perfis

- Login/Registro com email e senha
- Recuperação de senha
- Onboarding diferenciado para médicos e pacientes
- Sistema de roles (patient, doctor, admin, attendant)
- Perfis completos com informações médicas

### 📊 Dashboards Personalizados

- **Dashboard do Paciente**: Próximas consultas, documentos, histórico médico
- **Dashboard do Médico**: Agenda, estatísticas, receitas e laudos
- **Dashboard do Admin**: Gestão completa da plataforma, relatórios e analytics
- **Dashboard do Atendente**: Gestão de tickets e suporte

### 📅 Sistema de Agendamento

- Calendário interativo com seleção de horários
- Seleção de médico por especialidade
- Verificação de disponibilidade em tempo real
- Confirmação e lembretes automáticos via email
- Reagendamento e cancelamento com políticas definidas

### 🎥 Videochamadas

- Integração com Daily.co
- Sala de espera virtual
- Controles de áudio/vídeo
- Compartilhamento de tela
- Anotações durante a consulta

### 🤖 Inteligência Artificial

- **Resumo Automático**: Análise e resumo de documentos médicos
- **Prontuário Eletrônico**: Geração automática no formato SOAP
- **Laudos Médicos**: Elaboração assistida de laudos com IA

### 📄 Gestão de Documentos

- Upload com drag & drop
- Integração com Supabase Storage
- Categorização automática
- Busca full-text
- Resumo inteligente com IA

### 💳 Sistema de Pagamentos

- Checkout integrado com Stripe
- Pagamento de consultas e produtos
- Métodos de pagamento salvos
- Histórico de transações
- Webhooks para atualização automática

### ⭐ Sistema de Avaliações

- Avaliação de médicos pelos pacientes
- Sistema de ratings (1-5 estrelas)
- Comentários e reviews
- Cálculo automático de médias

### 🛒 Loja de Produtos

- Catálogo de serviços médicos
- Carrinho de compras
- Checkout seguro
- Histórico de pedidos

### 🎫 Suporte ao Cliente

- Sistema de tickets
- Chat em tempo real
- Base de conhecimento/FAQ
- Atribuição automática de atendentes

### 👨‍💼 Área Administrativa

- Gestão completa de usuários (CRUD)
- Aprovação de médicos
- Gestão de produtos
- Relatórios financeiros e de usuários
- Logs de auditoria (LGPD)
- Configurações da plataforma
- Base de conhecimento

---

## 🛠️ Stack Tecnológica

### Frontend

- **Framework**: Next.js 16.0 (App Router)
- **Linguagem**: TypeScript 5.0
- **Estilização**: Tailwind CSS 4.0
- **Componentes**: shadcn/ui (Radix UI)
- **Ícones**: Lucide React
- **Formulários**: React Hook Form + Zod
- **Estado**: Zustand
- **Queries**: TanStack Query

### Backend

- **Runtime**: Node.js (Next.js API Routes)
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Storage**: Supabase Storage
- **Realtime**: Supabase Realtime

### Integrações

- **IA**: OpenAI GPT-4
- **Videochamadas**: Daily.co
- **Pagamentos**: Stripe
- **Email**: Resend
- **Assinatura Digital**: ClickSign (preparado)

---

## 🏗️ Arquitetura

### Visão Geral

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Landing    │  │  Dashboard   │  │   Auth       │  │
│  │    Page      │  │  (Por Role)  │  │   Pages      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              API Routes (Next.js Server)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │   AI     │  │ Payments │  │  Video   │  │ Support │ │
│  │ Endpoints│  │ Endpoints│  │ Endpoints│  │Endpoints│ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL + Auth)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Database │  │   Auth   │  │ Storage  │  │Realtime │ │
│  │ (RLS)    │  │  (JWT)   │  │ (Files)  │  │ (Chat)  │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   OpenAI     │  │   Daily.co   │  │    Stripe    │
│   (GPT-4)    │  │  (Video)     │  │  (Payments)  │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Camadas da Aplicação

#### 1. **Camada de Apresentação (Frontend)**
- Componentes React reutilizáveis
- Páginas Server e Client Components
- Hooks customizados
- Utilitários de formatação

#### 2. **Camada de API (Backend)**
- API Routes do Next.js
- Validação de entrada (Zod)
- Autenticação e autorização
- Integração com serviços externos

#### 3. **Camada de Dados**
- Supabase PostgreSQL
- Row Level Security (RLS)
- Triggers e funções SQL
- Storage para arquivos

#### 4. **Camada de Integrações**
- OpenAI para IA
- Daily.co para vídeo
- Stripe para pagamentos
- Resend para emails

### Fluxo de Dados

```
Usuário → Frontend → API Route → Supabase → Resposta → Frontend → Usuário
                │
                └──→ Serviços Externos (OpenAI, Stripe, Daily.co)
```

### Segurança

- **Row Level Security (RLS)**: Políticas granulares por tabela
- **Autenticação JWT**: Tokens seguros do Supabase
- **Validação de Entrada**: Zod schemas
- **HTTPS**: Obrigatório em produção
- **Auditoria**: Logs de todas as ações (LGPD)

---

## 📦 Instalação

### Pré-requisitos

- Node.js 18+ e npm
- Conta no Supabase
- Chaves de API (OpenAI, Stripe, Daily.co, Resend - opcionais)

### Passo a Passo

1. **Clone o repositório**

```bash
git clone <repo-url>
cd telemed
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure as variáveis de ambiente**

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=seu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# OpenAI (Opcional - para funcionalidades de IA)
OPENAI_API_KEY=sua_chave_openai

# Daily.co (Opcional - para videochamadas)
DAILY_API_KEY=sua_chave_daily
NEXT_PUBLIC_DAILY_DOMAIN=seu_dominio.daily.co

# Stripe (Opcional - para pagamentos)
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# Resend (Opcional - para emails)
RESEND_API_KEY=sua_chave_resend
RESEND_FROM_EMAIL=noreply@seudominio.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron (Opcional - para lembretes automáticos)
CRON_SECRET=seu_secret_aqui
```

4. **Configure o banco de dados**

Execute os seguintes arquivos SQL no Supabase SQL Editor (nesta ordem):

```sql
-- 1. Schema principal
supabase/schema.sql

-- 2. Schemas adicionais
supabase/missing-schemas.sql
supabase/add-stripe-customer-id.sql

-- 3. RLS Policies
supabase/rls-policies.sql
supabase/fix-profiles-rls-recursion.sql
```

5. **Configure o Storage**

No Supabase Dashboard:
- Crie o bucket `medical-documents` (privado)
- Configure as políticas RLS conforme necessário

6. **Inicie o servidor de desenvolvimento**

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Configuração

### Variáveis de Ambiente Obrigatórias

| Variável | Descrição | Onde Obter |
|----------|-----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública do Supabase | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (privada) | Supabase Dashboard > Settings > API |

### Variáveis Opcionais

- **OpenAI**: Para funcionalidades de IA (resumos, prontuários, laudos)
- **Daily.co**: Para videochamadas
- **Stripe**: Para pagamentos
- **Resend**: Para envio de emails
- **CRON_SECRET**: Para lembretes automáticos

### Configuração de Cron Job (Lembretes)

Configure um cron job (ex: Vercel Cron) para chamar:

```
GET /api/cron/send-reminders
Authorization: Bearer {CRON_SECRET}
```

**Configurado**: Executa 2 vezes por dia (9:00 e 18:00 - horário do servidor)

---

## 📁 Estrutura do Projeto

```
telemed/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Rotas públicas de autenticação
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   ├── (dashboard)/              # Rotas protegidas
│   │   │   ├── dashboard/
│   │   │   │   ├── admin/            # Dashboard administrativo
│   │   │   │   ├── doctor/           # Dashboard do médico
│   │   │   │   ├── patient/          # Dashboard do paciente
│   │   │   │   └── attendant/        # Dashboard do atendente
│   │   │   ├── schedule/             # Agendamento
│   │   │   └── appointments/        # Consultas
│   │   ├── api/                      # API Routes
│   │   │   ├── ai/                   # Endpoints de IA
│   │   │   ├── payments/             # Endpoints de pagamento
│   │   │   ├── video/                 # Endpoints de vídeo
│   │   │   ├── support/               # Endpoints de suporte
│   │   │   └── ...
│   │   ├── onboarding/               # Onboarding
│   │   └── page.tsx                  # Landing page
│   ├── components/                   # Componentes React
│   │   ├── ui/                       # Componentes shadcn/ui
│   │   ├── dashboard/                # Componentes do dashboard
│   │   ├── consultations/            # Componentes de consultas
│   │   ├── documents/                # Componentes de documentos
│   │   └── landing/                  # Componentes da landing page
│   ├── lib/                          # Bibliotecas e utilitários
│   │   ├── supabase/                 # Clientes Supabase
│   │   ├── ai/                       # Integração OpenAI
│   │   ├── video/                    # Integração Daily.co
│   │   ├── calendar/                 # Utilitários de calendário
│   │   └── utils.ts                  # Funções utilitárias
│   ├── hooks/                        # Custom hooks
│   │   ├── use-swipe.ts              # Hook para gestos de swipe
│   │   ├── use-toast.ts              # Hook para notificações
│   │   └── use-user-role.ts          # Hook para verificar role
│   ├── types/                        # TypeScript types
│   │   └── index.ts                  # Tipos globais
│   └── middleware.ts                 # Middleware de autenticação
├── supabase/                         # Scripts SQL
│   ├── schema.sql                    # Schema principal
│   ├── missing-schemas.sql           # Schemas adicionais
│   ├── rls-policies.sql              # Políticas RLS
│   └── ...
├── public/                           # Arquivos estáticos
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

### Principais Diretórios

- **`src/app/`**: Rotas e páginas do Next.js
- **`src/components/`**: Componentes React reutilizáveis
- **`src/lib/`**: Utilitários, helpers e integrações
- **`src/hooks/`**: Custom hooks React
- **`supabase/`**: Scripts SQL e migrações

---

## 🔐 Segurança

### Implementações de Segurança

- ✅ **Row Level Security (RLS)**: Políticas granulares em todas as tabelas
- ✅ **Autenticação JWT**: Tokens seguros do Supabase Auth
- ✅ **Validação de Entrada**: Schemas Zod em todas as APIs
- ✅ **HTTPS Obrigatório**: Em produção (Vercel fornece por padrão)
- ✅ **Logs de Auditoria**: Todas as ações são registradas (LGPD)
- ✅ **Proteção de Rotas**: Middleware verifica autenticação
- ✅ **Validação de Roles**: Verificação de permissões por role

### Conformidade LGPD

- Logs de auditoria completos
- Políticas de privacidade
- Controle de acesso granular
- Exclusão de dados conforme solicitação

---

## 🚀 Deploy

### Vercel (Recomendado)

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Configure o cron job para lembretes (opcional)
4. Deploy automático a cada push

### Outras Plataformas

O projeto pode ser deployado em qualquer plataforma que suporte Next.js:
- Netlify
- AWS Amplify
- Railway
- Render

---

## 📚 Documentação Adicional

- [SETUP.md](./SETUP.md) - Guia de configuração detalhado
- [PROJETO_STATUS.md](./PROJETO_STATUS.md) - Status do projeto
- [IMPLEMENTACOES_CONCLUIDAS.md](./IMPLEMENTACOES_CONCLUIDAS.md) - Funcionalidades implementadas
- [VARIAVEIS_AMBIENTE_COMPLETO.md](./VARIAVEIS_AMBIENTE_COMPLETO.md) - Lista completa de variáveis

---

## 🤝 Contribuindo

Este é um projeto interno. Para sugestões e melhorias, entre em contato com a equipe de desenvolvimento.

---

## 📝 Licença

Este projeto é privado e proprietário.

---

<div align="center">

**Desenvolvido com ❤️ para revolucionar a telemedicina no Brasil**

[⬆ Voltar ao topo](#-mediconnect---plataforma-de-telemedicina)

</div>
