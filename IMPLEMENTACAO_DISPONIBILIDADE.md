# Implementação - Edição de Disponibilidade do Médico

## ✅ Funcionalidades Implementadas

### 1. Schema do Banco de Dados

**Arquivo:** `supabase/doctor-availability-schema.sql`

**Tabelas Criadas:**
- `doctor_availability` - Horários semanais de atendimento
- `blocked_dates` - Datas bloqueadas (férias, feriados)

**Estrutura:**
```sql
doctor_availability (
  id, doctor_id, day_of_week (0-6),
  start_time, end_time, is_available,
  created_at, updated_at
)

blocked_dates (
  id, doctor_id, date, reason,
  created_at
)
```

**RLS Policies:**
- Médicos podem gerenciar sua própria disponibilidade
- Pacientes podem visualizar disponibilidade de médicos aprovados
- Mesmas regras para datas bloqueadas

### 2. API de Disponibilidade

**Arquivo:** `src/app/api/doctor/availability/route.ts`

**Endpoints:**
- `GET /api/doctor/availability` - Buscar disponibilidade do médico
- `POST /api/doctor/availability` - Salvar disponibilidade

**Funcionalidades:**
- Busca disponibilidade semanal e datas bloqueadas
- Salva/atualiza disponibilidade semanal
- Gerencia datas bloqueadas
- Validação de permissões (apenas médicos)

### 3. Interface de Usuário

**Arquivo:** `src/app/dashboard/doctor/availability/page.tsx`

**Funcionalidades:**
- ✅ Configuração de horários por dia da semana
- ✅ Checkbox para ativar/desativar dias
- ✅ Campos de horário (início e fim) para cada dia
- ✅ Gerenciamento de datas bloqueadas
- ✅ Adicionar datas bloqueadas com motivo
- ✅ Remover datas bloqueadas
- ✅ Salvar todas as configurações
- ✅ Validação de dados

**Componentes Utilizados:**
- Card, Button, Input, Label, Checkbox
- Dialog para adicionar datas bloqueadas
- Toast para feedback

### 4. Navegação

**Arquivo:** `src/components/dashboard/doctor-sidebar.tsx`

**Alterações:**
- ✅ Adicionado link "Disponibilidade" no menu do médico
- ✅ Ícone: CalendarDays
- ✅ Rota: `/dashboard/doctor/availability`

---

## 📋 Como Usar

### 1. Executar Schema SQL

Execute no Supabase SQL Editor:
```sql
-- Execute o conteúdo de supabase/doctor-availability-schema.sql
```

### 2. Acessar a Página

1. Faça login como médico
2. No menu lateral, clique em "Disponibilidade"
3. Configure seus horários de atendimento

### 3. Configurar Disponibilidade Semanal

1. Marque os dias da semana em que você atende
2. Defina horário de início e fim para cada dia
3. Clique em "Salvar Disponibilidade"

### 4. Bloquear Datas Específicas

1. Clique em "Bloquear Data"
2. Selecione a data no calendário
3. (Opcional) Adicione um motivo
4. Clique em "Adicionar"
5. Clique em "Salvar Disponibilidade"

---

## 🎯 Estrutura de Dados

### Disponibilidade Semanal

```typescript
interface Availability {
  day_of_week: number;  // 0 = Domingo, 6 = Sábado
  start_time: string;   // "09:00"
  end_time: string;     // "18:00"
  is_available: boolean;
}
```

### Datas Bloqueadas

```typescript
interface BlockedDate {
  date: string;         // "2024-01-15"
  reason: string | null; // "Férias"
}
```

---

## 🔒 Segurança

- ✅ Apenas médicos podem acessar a página
- ✅ Apenas médicos podem editar sua própria disponibilidade
- ✅ RLS policies no banco de dados
- ✅ Validação de permissões na API

---

## 📝 Notas Importantes

1. **Dias da Semana:**
   - 0 = Domingo
   - 1 = Segunda-feira
   - 2 = Terça-feira
   - 3 = Quarta-feira
   - 4 = Quinta-feira
   - 5 = Sexta-feira
   - 6 = Sábado

2. **Horários:**
   - Formato: HH:MM (24 horas)
   - Exemplo: "09:00", "18:00"

3. **Datas Bloqueadas:**
   - Apenas datas futuras podem ser bloqueadas
   - Datas passadas são automaticamente ignoradas

4. **Integração Futura:**
   - Esta disponibilidade pode ser usada para:
     - Validar agendamentos
     - Mostrar horários disponíveis para pacientes
     - Filtrar médicos por disponibilidade

---

## ✅ Checklist de Implementação

- [x] Schema SQL criado
- [x] Tabelas criadas (doctor_availability, blocked_dates)
- [x] RLS policies configuradas
- [x] API GET criada
- [x] API POST criada
- [x] Página de interface criada
- [x] Link no sidebar adicionado
- [x] Validação de permissões
- [x] Feedback visual (toasts)
- [x] Documentação criada

---

## 🚀 Próximos Passos (Opcional)

1. **Integração com Agendamento:**
   - Usar disponibilidade para validar agendamentos
   - Mostrar apenas horários disponíveis

2. **Visualização para Pacientes:**
   - Mostrar disponibilidade do médico no perfil
   - Filtrar médicos por disponibilidade

3. **Notificações:**
   - Notificar quando disponibilidade é alterada
   - Lembretes de datas bloqueadas

4. **Recorrência:**
   - Permitir copiar disponibilidade de uma semana para outra
   - Templates de disponibilidade

---

**Status: ✅ Implementação Completa!**

A funcionalidade de edição de disponibilidade do médico está totalmente implementada e pronta para uso.


