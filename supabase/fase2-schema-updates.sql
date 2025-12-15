-- ============================================
-- FASE 2: Atualizações de Schema
-- IA, Assinatura Digital, Receitas, Laudos
-- ============================================

-- Atualizar tabela medical_records para suportar SOAP estruturado
ALTER TABLE medical_records 
  ADD COLUMN IF NOT EXISTS soap_content JSONB,
  ADD COLUMN IF NOT EXISTS reviewed_by_doctor BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_model TEXT,
  ADD COLUMN IF NOT EXISTS signature_provider TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Criar trigger para updated_at em medical_records
CREATE TRIGGER update_medical_records_updated_at 
  BEFORE UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Criar tabela para receitas médicas
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  medications JSONB NOT NULL, -- Array de medicamentos
  instructions TEXT,
  valid_until DATE,
  signed BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMPTZ,
  signature_id TEXT,
  signature_provider TEXT,
  qr_code TEXT, -- QR Code para validação
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela para laudos médicos
CREATE TABLE IF NOT EXISTS medical_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL, -- Raio-X, ECG, Lab, etc
  report_content JSONB NOT NULL, -- {tecnica, achados, comparacao, conclusao, recomendacoes}
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_model TEXT,
  reviewed_by_doctor BOOLEAN DEFAULT FALSE,
  signed BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMPTZ,
  signature_id TEXT,
  signature_provider TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela para assinaturas digitais
CREATE TABLE IF NOT EXISTS digital_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_type TEXT NOT NULL, -- 'medical_record', 'prescription', 'medical_report', 'certificate'
  document_id UUID NOT NULL, -- ID do documento assinado
  signer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'clicksign', 'docusign'
  provider_signature_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'rejected', 'expired')),
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB, -- Dados adicionais do provedor
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela para histórico médico (timeline)
CREATE TABLE IF NOT EXISTS medical_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('consultation', 'prescription', 'exam', 'report', 'vaccination', 'allergy', 'condition')),
  event_id UUID, -- ID do evento (appointment_id, prescription_id, etc)
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_prescriptions_appointment ON prescriptions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_medical_reports_patient ON medical_reports(patient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_medical_reports_doctor ON medical_reports(doctor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_medical_reports_appointment ON medical_reports(appointment_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_document ON digital_signatures(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_signer ON digital_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_patient ON medical_history(patient_id, date DESC);

-- Triggers para updated_at
CREATE TRIGGER update_prescriptions_updated_at 
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_reports_updated_at 
  BEFORE UPDATE ON medical_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_digital_signatures_updated_at 
  BEFORE UPDATE ON digital_signatures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies para prescriptions
CREATE POLICY "Patients can view their own prescriptions"
  ON prescriptions FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view prescriptions they created"
  ON prescriptions FOR SELECT
  USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can create prescriptions"
  ON prescriptions FOR INSERT
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Doctors can update unsigned prescriptions"
  ON prescriptions FOR UPDATE
  USING (doctor_id = auth.uid() AND signed = FALSE);

-- RLS Policies para medical_reports
CREATE POLICY "Patients can view their own reports"
  ON medical_reports FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view reports they created"
  ON medical_reports FOR SELECT
  USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can create reports"
  ON medical_reports FOR INSERT
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Doctors can update unsigned reports"
  ON medical_reports FOR UPDATE
  USING (doctor_id = auth.uid() AND signed = FALSE);

-- RLS Policies para digital_signatures
CREATE POLICY "Users can view their own signatures"
  ON digital_signatures FOR SELECT
  USING (signer_id = auth.uid());

CREATE POLICY "Doctors can view signatures on their documents"
  ON digital_signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM medical_records
      WHERE medical_records.id::text = digital_signatures.document_id::text
      AND medical_records.doctor_id = auth.uid()
      AND digital_signatures.document_type = 'medical_record'
    )
    OR EXISTS (
      SELECT 1 FROM prescriptions
      WHERE prescriptions.id::text = digital_signatures.document_id::text
      AND prescriptions.doctor_id = auth.uid()
      AND digital_signatures.document_type = 'prescription'
    )
    OR EXISTS (
      SELECT 1 FROM medical_reports
      WHERE medical_reports.id::text = digital_signatures.document_id::text
      AND medical_reports.doctor_id = auth.uid()
      AND digital_signatures.document_type = 'medical_report'
    )
  );

-- RLS Policies para medical_history
CREATE POLICY "Patients can view their own history"
  ON medical_history FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view history of their patients"
  ON medical_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.patient_id = medical_history.patient_id
      AND appointments.doctor_id = auth.uid()
    )
  );

-- Atualizar RLS para medical_records (permitir update se não assinado)
DROP POLICY IF EXISTS "Doctors can update medical records" ON medical_records;
CREATE POLICY "Doctors can update unsigned medical records"
  ON medical_records FOR UPDATE
  USING (doctor_id = auth.uid() AND signed = FALSE);

-- ============================================
-- FIM DO SCRIPT
-- ============================================
-- 
-- Este script cria todas as tabelas e políticas necessárias para:
-- - Prontuários médicos com formato SOAP estruturado
-- - Receitas médicas digitais
-- - Laudos médicos com IA
-- - Assinaturas digitais
-- - Histórico médico do paciente
--
-- Execute este script no SQL Editor do Supabase após executar o schema.sql principal
-- ============================================

