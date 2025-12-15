-- Seed de Produtos/Serviços para a Plataforma de Telemedicina
-- Execute este arquivo no Supabase SQL Editor

-- Inserir produtos/serviços iniciais
INSERT INTO products (name, description, price, category, active) VALUES
-- Consultas
('Consulta de Clínica Geral', 'Consulta médica geral com clínico geral para avaliação de sintomas e orientações de saúde', 150.00, 'consultation', true),
('Consulta de Cardiologia', 'Consulta especializada com cardiologista para avaliação cardiovascular e prevenção de doenças do coração', 250.00, 'consultation', true),
('Consulta de Dermatologia', 'Consulta com dermatologista para avaliação de pele, cabelos e unhas', 200.00, 'consultation', true),
('Consulta de Endocrinologia', 'Consulta com endocrinologista para avaliação de distúrbios hormonais e metabólicos', 220.00, 'consultation', true),
('Consulta de Ginecologia', 'Consulta ginecológica completa com avaliação da saúde da mulher', 200.00, 'consultation', true),
('Consulta de Neurologia', 'Consulta com neurologista para avaliação de distúrbios do sistema nervoso', 280.00, 'consultation', true),
('Consulta de Ortopedia', 'Consulta ortopédica para avaliação de lesões e problemas musculoesqueléticos', 230.00, 'consultation', true),
('Consulta de Pediatria', 'Consulta pediátrica para avaliação da saúde de crianças e adolescentes', 180.00, 'consultation', true),
('Consulta de Psiquiatria', 'Consulta psiquiátrica para avaliação e tratamento de transtornos mentais', 300.00, 'consultation', true),
('Consulta de Urologia', 'Consulta urológica para avaliação de problemas do trato urinário', 240.00, 'consultation', true),

-- Exames
('Hemograma Completo', 'Exame de sangue completo para avaliação geral da saúde', 45.00, 'exam', true),
('Glicemia de Jejum', 'Exame para medir os níveis de açúcar no sangue', 25.00, 'exam', true),
('Colesterol Total e Frações', 'Exame para avaliação do perfil lipídico', 50.00, 'exam', true),
('TSH e T4 Livre', 'Exames para avaliação da função tireoidiana', 60.00, 'exam', true),
('Eletrocardiograma', 'Exame para avaliação da atividade elétrica do coração', 80.00, 'exam', true),
('Raio-X de Tórax', 'Exame de imagem para avaliação dos pulmões e coração', 120.00, 'exam', true),
('Ultrassonografia Abdominal', 'Exame de imagem para avaliação de órgãos abdominais', 150.00, 'exam', true),
('Teste Ergométrico', 'Teste de esforço para avaliação cardiovascular', 350.00, 'exam', true),
('Holter 24h', 'Monitoramento contínuo da atividade cardíaca por 24 horas', 400.00, 'exam', true),
('MAPA 24h', 'Monitoramento ambulatorial da pressão arterial por 24 horas', 380.00, 'exam', true),

-- Pacotes
('Pacote Check-up Básico', 'Pacote completo com consulta de clínica geral, hemograma, glicemia e colesterol', 250.00, 'package', true),
('Pacote Check-up Completo', 'Pacote premium com consulta, hemograma, glicemia, colesterol, TSH, T4, ECG e raio-X de tórax', 550.00, 'package', true),
('Pacote Saúde da Mulher', 'Pacote com consulta ginecológica, ultrassonografia pélvica e exames laboratoriais', 420.00, 'package', true),
('Pacote Saúde do Homem', 'Pacote com consulta urológica, PSA, exames laboratoriais e ultrassonografia', 450.00, 'package', true),
('Pacote Cardíaco', 'Pacote com consulta de cardiologia, ECG, teste ergométrico e exames laboratoriais', 680.00, 'package', true),
('Pacote Pediátrico', 'Pacote com consulta pediátrica, hemograma infantil e vacinação', 280.00, 'package', true),

-- Outros Serviços
('Atestado Médico', 'Emissão de atestado médico para ausência ao trabalho', 80.00, 'other', true),
('Declaração de Saúde', 'Declaração médica para comprovação de estado de saúde', 100.00, 'other', true),
('Receita Médica Digital', 'Emissão de receita médica digital com assinatura eletrônica', 50.00, 'other', true),
('Laudo Médico', 'Elaboração de laudo médico detalhado com análise de exames', 150.00, 'other', true),
('Segunda Opinião Médica', 'Consulta para segunda opinião sobre diagnóstico ou tratamento', 300.00, 'other', true),
('Acompanhamento Nutricional', 'Consulta com nutricionista para plano alimentar personalizado', 180.00, 'other', true),
('Acompanhamento Psicológico', 'Sessão de terapia psicológica online', 200.00, 'other', true),
('Fisioterapia Online', 'Sessão de fisioterapia com exercícios guiados online', 120.00, 'other', true);

-- Verificar produtos inseridos
SELECT 
  id,
  name,
  category,
  price,
  active,
  created_at
FROM products
ORDER BY category, name;

