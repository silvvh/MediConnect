-- Schema para avaliações de médicos
CREATE TABLE IF NOT EXISTS consultation_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(appointment_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_consultation_reviews_doctor ON consultation_reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultation_reviews_appointment ON consultation_reviews(appointment_id);

-- Atualizar tabela doctors com campos de avaliação
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Schema para configurações da plataforma
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schema para base de conhecimento/FAQ
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  views INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON knowledge_base USING GIN(tags);

-- Schema para métodos de pagamento salvos
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('card')),
  last4 TEXT,
  brand TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);

-- RLS Policies para consultation_reviews
ALTER TABLE consultation_reviews ENABLE ROW LEVEL SECURITY;

-- Remover política se já existir
DROP POLICY IF EXISTS "Users can view reviews" ON consultation_reviews;

CREATE POLICY "Users can view reviews"
  ON consultation_reviews FOR SELECT
  USING (
    -- Paciente pode ver avaliações de suas consultas
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = consultation_reviews.appointment_id
      AND appointments.patient_id = auth.uid()
    )
    OR
    -- Médico pode ver avaliações sobre ele
    consultation_reviews.doctor_id = auth.uid()
    OR
    -- Revisor pode ver sua própria avaliação
    consultation_reviews.reviewer_id = auth.uid()
  );

-- Remover política se já existir
DROP POLICY IF EXISTS "Patients can create reviews for their appointments" ON consultation_reviews;

CREATE POLICY "Patients can create reviews for their appointments"
  ON consultation_reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = consultation_reviews.appointment_id
      AND appointments.patient_id = auth.uid()
      AND appointments.status = 'completed'
    )
  );

-- Remover política se já existir
DROP POLICY IF EXISTS "Users can update their own reviews" ON consultation_reviews;

CREATE POLICY "Users can update their own reviews"
  ON consultation_reviews FOR UPDATE
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

-- RLS Policies para platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
  ON platform_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies para knowledge_base
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view knowledge base"
  ON knowledge_base FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage knowledge base"
  ON knowledge_base FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies para payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own payment methods"
  ON payment_methods FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Função para atualizar média de avaliações do médico (INSERT/UPDATE)
CREATE OR REPLACE FUNCTION update_doctor_rating()
RETURNS TRIGGER AS $$
DECLARE
  doctor_uuid UUID;
BEGIN
  doctor_uuid := NEW.doctor_id;
  
  UPDATE doctors
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0)
      FROM consultation_reviews
      WHERE consultation_reviews.doctor_id = doctor_uuid
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM consultation_reviews
      WHERE consultation_reviews.doctor_id = doctor_uuid
    )
  WHERE doctors.id = doctor_uuid;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar média de avaliações do médico (DELETE)
CREATE OR REPLACE FUNCTION update_doctor_rating_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  doctor_uuid UUID;
BEGIN
  doctor_uuid := OLD.doctor_id;
  
  UPDATE doctors
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0)
      FROM consultation_reviews
      WHERE consultation_reviews.doctor_id = doctor_uuid
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM consultation_reviews
      WHERE consultation_reviews.doctor_id = doctor_uuid
    )
  WHERE doctors.id = doctor_uuid;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Remover triggers se já existirem
DROP TRIGGER IF EXISTS update_doctor_rating_on_insert ON consultation_reviews;
DROP TRIGGER IF EXISTS update_doctor_rating_on_update ON consultation_reviews;
DROP TRIGGER IF EXISTS update_doctor_rating_on_delete ON consultation_reviews;

CREATE TRIGGER update_doctor_rating_on_insert
  AFTER INSERT ON consultation_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_doctor_rating();

CREATE TRIGGER update_doctor_rating_on_update
  AFTER UPDATE ON consultation_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_doctor_rating();

CREATE TRIGGER update_doctor_rating_on_delete
  AFTER DELETE ON consultation_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_doctor_rating_on_delete();

