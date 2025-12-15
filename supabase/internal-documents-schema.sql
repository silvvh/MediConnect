-- Sistema de Documentos Internos
-- Execute este arquivo no Supabase SQL Editor

-- Tabela de documentos internos
CREATE TABLE IF NOT EXISTS internal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('general', 'financial', 'legal', 'hr', 'operations', 'marketing', 'other')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE internal_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies para documentos internos
-- Apenas admins e atendentes podem ver documentos internos
DROP POLICY IF EXISTS "Admins and attendants can view internal documents" ON internal_documents;
CREATE POLICY "Admins and attendants can view internal documents"
  ON internal_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'attendant')
    )
  );

-- Apenas admins podem criar documentos internos
DROP POLICY IF EXISTS "Admins can create internal documents" ON internal_documents;
CREATE POLICY "Admins can create internal documents"
  ON internal_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
    AND uploaded_by = auth.uid()
  );

-- Apenas admins podem atualizar documentos internos
DROP POLICY IF EXISTS "Admins can update internal documents" ON internal_documents;
CREATE POLICY "Admins can update internal documents"
  ON internal_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Apenas admins podem deletar documentos internos
DROP POLICY IF EXISTS "Admins can delete internal documents" ON internal_documents;
CREATE POLICY "Admins can delete internal documents"
  ON internal_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_internal_documents_category ON internal_documents(category);
CREATE INDEX IF NOT EXISTS idx_internal_documents_uploaded_by ON internal_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_internal_documents_created_at ON internal_documents(created_at);

-- Trigger para updated_at
CREATE TRIGGER update_internal_documents_updated_at
  BEFORE UPDATE ON internal_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

