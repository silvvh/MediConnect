-- Schema para Disponibilidade do Médico
-- Execute este arquivo no Supabase SQL Editor

-- Tabela de disponibilidade semanal do médico
CREATE TABLE IF NOT EXISTS doctor_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Domingo, 6 = Sábado
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, day_of_week)
);

-- Tabela de datas bloqueadas (férias, feriados, etc)
CREATE TABLE IF NOT EXISTS blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, date)
);

-- Habilitar RLS
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policies para doctor_availability
DROP POLICY IF EXISTS "Doctors can manage their own availability" ON doctor_availability;
CREATE POLICY "Doctors can manage their own availability"
  ON doctor_availability FOR ALL
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- Pacientes podem visualizar disponibilidade de médicos aprovados
DROP POLICY IF EXISTS "Patients can view approved doctors availability" ON doctor_availability;
CREATE POLICY "Patients can view approved doctors availability"
  ON doctor_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doctors
      WHERE doctors.id = doctor_availability.doctor_id
      AND doctors.is_approved = TRUE
    )
  );

-- RLS Policies para blocked_dates
DROP POLICY IF EXISTS "Doctors can manage their own blocked dates" ON blocked_dates;
CREATE POLICY "Doctors can manage their own blocked dates"
  ON blocked_dates FOR ALL
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- Pacientes podem visualizar datas bloqueadas de médicos aprovados
DROP POLICY IF EXISTS "Patients can view approved doctors blocked dates" ON blocked_dates;
CREATE POLICY "Patients can view approved doctors blocked dates"
  ON blocked_dates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doctors
      WHERE doctors.id = blocked_dates.doctor_id
      AND doctors.is_approved = TRUE
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor ON doctor_availability(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_day ON doctor_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_doctor ON blocked_dates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_date ON blocked_dates(date);

-- Trigger para updated_at
CREATE TRIGGER update_doctor_availability_updated_at
  BEFORE UPDATE ON doctor_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


