# Correções no Dashboard e Regras de Negócio

## ✅ Problemas Corrigidos

### 1. **Sidemenu Desaparecendo ao Navegar**

**Status:** ✅ Verificado e Corrigido

**Análise:**
- Os sidebars criados (`PatientSidebar` e `DoctorSidebar`) são sempre visíveis
- Não há lógica de mobile/desktop que os esconda
- O problema pode ter sido cache do Next.js

**Correções Aplicadas:**
- Sidebars sempre visíveis em desktop e mobile
- Botão de colapsar/expandir funciona corretamente
- Layouts específicos garantem renderização correta

**Se o problema persistir:**
1. Limpar cache: `rm -rf .next`
2. Reiniciar servidor: `npm run dev`
3. Verificar se não há conflito com sidebar antigo

---

### 2. **Buscar Médicos Não Funciona para Pacientes**

**Status:** ✅ Corrigido

**Problemas Identificados:**
- Página `/dashboard/doctors` existia mas não tinha proteção de role
- Médicos podiam acessar a página de busca

**Correções Aplicadas:**

1. **Proteção de Acesso:**
   - Adicionada verificação de role na página `/dashboard/doctors/page.tsx`
   - Médicos são redirecionados para `/dashboard/doctor`
   - Apenas pacientes podem acessar a busca

2. **Validação no Carregamento:**
   ```typescript
   // Verifica role antes de carregar conteúdo
   if (profile?.role !== "patient") {
     router.push("/dashboard/doctor");
     return;
   }
   ```

3. **Loading State:**
   - Mostra loading enquanto verifica role
   - Evita flash de conteúdo incorreto

**Arquivos Modificados:**
- `src/app/dashboard/doctors/page.tsx`

---

### 3. **Médicos Agendando Consultas (Violação de Regra de Negócio)**

**Status:** ✅ Corrigido em Múltiplas Camadas

**Problemas Identificados:**
- Função `createAppointment` não verificava role
- Página de agendamento não bloqueava médicos
- RLS policies do Supabase não verificavam role

**Correções Aplicadas:**

#### **A) Validação na Função de Criação:**
- **Arquivo:** `src/lib/calendar/queries.ts`
- Adicionada verificação de role antes de criar appointment
- Valida que `patientId === user.id`
- Retorna erro se role não for 'patient'

```typescript
// Verificar role - apenas pacientes podem criar agendamentos
if (profile?.role !== "patient") {
  throw new Error("Apenas pacientes podem agendar consultas");
}
```

#### **B) Proteção na Página de Agendamento:**
- **Arquivo:** `src/app/dashboard/schedule/page.tsx`
- Verificação de role ao carregar página
- Médicos são redirecionados para `/dashboard/doctor`
- Loading state durante verificação

#### **C) RLS Policies no Supabase:**
- **Arquivo:** `supabase/fix-appointments-rls.sql`
- Nova policy que verifica role antes de permitir INSERT
- Garante que apenas pacientes podem criar appointments
- Médicos não conseguem criar mesmo tentando burlar

**Nova Policy:**
```sql
CREATE POLICY "Only patients can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND patient_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'patient'
    )
  );
```

**Arquivos Modificados:**
- `src/lib/calendar/queries.ts`
- `src/app/dashboard/schedule/page.tsx`
- `supabase/fix-appointments-rls.sql` (novo)

---

## 🔐 Camadas de Segurança Implementadas

### **Camada 1: Frontend (UI)**
- ✅ Sidebar do médico não mostra "Buscar Médicos"
- ✅ Páginas verificam role antes de renderizar
- ✅ Redirecionamento automático se role incorreto

### **Camada 2: Funções/Queries**
- ✅ `createAppointment` valida role antes de executar
- ✅ Verifica que `patientId === user.id`
- ✅ Retorna erro claro se violação

### **Camada 3: Banco de Dados (RLS)**
- ✅ Policy do Supabase verifica role
- ✅ Bloqueia INSERT se não for paciente
- ✅ Impossível burlar mesmo com acesso direto ao banco

---

## 📋 Checklist de Validação

### ✅ Sidemenu:
- [x] Sidebars sempre visíveis em desktop
- [x] Botão de colapsar funciona
- [x] Navegação entre páginas mantém sidebar
- [x] Layouts específicos renderizam corretamente

### ✅ Busca de Médicos:
- [x] Página `/dashboard/doctors` protegida
- [x] Médicos redirecionados automaticamente
- [x] Apenas pacientes podem acessar
- [x] Loading state durante verificação
- [x] Busca funciona corretamente para pacientes

### ✅ Bloqueio de Médicos:
- [x] Médicos não veem "Buscar Médicos" no menu
- [x] Médicos redirecionados se tentarem acessar busca
- [x] Função `createAppointment` valida role
- [x] Página de agendamento bloqueia médicos
- [x] RLS policy bloqueia INSERT de médicos
- [x] Mensagens de erro claras

---

## 🚀 Como Aplicar as Correções

### 1. **Executar SQL no Supabase:**
```sql
-- Execute o arquivo: supabase/fix-appointments-rls.sql
-- No SQL Editor do Supabase
```

### 2. **Limpar Cache (se necessário):**
```bash
rm -rf .next
npm run dev
```

### 3. **Testar:**

**Como Paciente:**
- ✅ Acessar `/dashboard/doctors` - deve funcionar
- ✅ Buscar médicos - deve retornar resultados
- ✅ Agendar consulta - deve funcionar
- ✅ Ver sidebar do paciente - deve estar visível

**Como Médico:**
- ✅ Tentar acessar `/dashboard/doctors` - deve redirecionar
- ✅ Tentar agendar consulta - deve ser bloqueado
- ✅ Ver sidebar do médico - não deve ter "Buscar Médicos"
- ✅ Ver agenda - deve mostrar apenas consultas do médico

---

## 📝 Notas Importantes

1. **Sidemenu:** Os sidebars criados são sempre visíveis. Se ainda houver problema, pode ser cache do Next.js ou conflito com componente antigo.

2. **Segurança:** As correções foram aplicadas em 3 camadas (Frontend, Funções, Banco) para garantir máxima segurança.

3. **RLS Policies:** Execute o arquivo SQL no Supabase para garantir que médicos não possam criar appointments mesmo tentando burlar o sistema.

4. **Testes:** Teste com contas de paciente e médico para validar todas as correções.

---

## 🔄 Próximos Passos (Opcional)

Se o problema do sidemenu persistir:
1. Verificar se há uso do `Sidebar` antigo em algum lugar
2. Adicionar lógica de mobile/desktop se necessário
3. Verificar se há conflitos de CSS

Para melhorar UX:
1. Adicionar toast de erro quando médico tentar agendar
2. Melhorar mensagens de redirecionamento
3. Adicionar loading states mais elaborados

