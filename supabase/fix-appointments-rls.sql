-- ============================================
-- Correção de RLS para Appointments
-- Bloquear médicos de criar agendamentos
-- ============================================

-- Remover policy antiga se existir
DROP POLICY IF EXISTS "Patients can create appointments" ON appointments;

-- Criar nova policy que verifica role
CREATE POLICY "Only patients can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (
    -- Verificar que o usuário está autenticado
    auth.uid() IS NOT NULL
    -- Verificar que o patient_id é o ID do usuário logado
    AND patient_id = auth.uid()
    -- Verificar que o usuário tem role 'patient'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'patient'
    )
  );

-- Garantir que médicos não podem criar appointments mesmo tentando burlar
-- A policy acima já bloqueia, mas vamos adicionar uma policy explícita de negação
-- (PostgreSQL não suporta políticas de negação diretamente, então a política acima é suficiente)

-- Atualizar policy de UPDATE para garantir que apenas pacientes podem atualizar seus próprios agendamentos
DROP POLICY IF EXISTS "Patients can update their own appointments" ON appointments;

CREATE POLICY "Patients can update their own appointments"
  ON appointments FOR UPDATE
  USING (
    patient_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'patient'
    )
  );

-- Médicos podem atualizar status de consultas deles (mas não criar)
-- Esta policy já existe, mas vamos garantir que está correta
DROP POLICY IF EXISTS "Doctors can update their appointments" ON appointments;

CREATE POLICY "Doctors can update their appointments"
  ON appointments FOR UPDATE
  USING (
    doctor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- 
-- Este script garante que:
-- - Apenas pacientes podem criar agendamentos
-- - Médicos não podem criar agendamentos mesmo tentando burlar
-- - Pacientes só podem atualizar seus próprios agendamentos
-- - Médicos podem atualizar status de consultas deles
-- ============================================

