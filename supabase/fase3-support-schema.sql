-- FASE 3: Sistema de Atendimento ao Cliente
-- Execute este arquivo no Supabase SQL Editor

-- Habilitar RLS nas tabelas de suporte (se ainda não estiver)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies para support_tickets
DROP POLICY IF EXISTS "Users can view their own tickets" ON support_tickets;
CREATE POLICY "Users can view their own tickets"
  ON support_tickets FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own tickets" ON support_tickets;
CREATE POLICY "Users can create their own tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Attendants can view all tickets" ON support_tickets;
CREATE POLICY "Attendants can view all tickets"
  ON support_tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('attendant', 'admin')
    )
  );

DROP POLICY IF EXISTS "Attendants can update tickets" ON support_tickets;
CREATE POLICY "Attendants can update tickets"
  ON support_tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('attendant', 'admin')
    )
  );

-- RLS Policies para support_messages
DROP POLICY IF EXISTS "Users can view messages of their tickets" ON support_messages;
CREATE POLICY "Users can view messages of their tickets"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_messages.ticket_id
      AND (support_tickets.user_id = auth.uid() OR 
           EXISTS (
             SELECT 1 FROM profiles
             WHERE profiles.id = auth.uid() 
             AND profiles.role IN ('attendant', 'admin')
           ))
    )
  );

DROP POLICY IF EXISTS "Users can create messages in their tickets" ON support_messages;
CREATE POLICY "Users can create messages in their tickets"
  ON support_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_messages.ticket_id
      AND (support_tickets.user_id = auth.uid() OR 
           EXISTS (
             SELECT 1 FROM profiles
             WHERE profiles.id = auth.uid() 
             AND profiles.role IN ('attendant', 'admin')
           ))
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status ON support_tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_created ON support_messages(ticket_id, created_at);

