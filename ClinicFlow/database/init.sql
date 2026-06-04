CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  senha VARCHAR(120) NOT NULL,
  perfil VARCHAR(30) NOT NULL DEFAULT 'admin',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pacientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  cpf VARCHAR(20) UNIQUE NOT NULL,
  telefone VARCHAR(30) NOT NULL,
  email VARCHAR(160),
  nascimento DATE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medicos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  especialidade VARCHAR(80) NOT NULL,
  crm VARCHAR(30) UNIQUE NOT NULL,
  sala VARCHAR(20) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultas (
  id SERIAL PRIMARY KEY,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  medico_id INTEGER NOT NULL REFERENCES medicos(id) ON DELETE RESTRICT,
  data_hora TIMESTAMP NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'agendada',
  observacoes TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultas_data_hora ON consultas(data_hora);
CREATE INDEX IF NOT EXISTS idx_consultas_status ON consultas(status);

INSERT INTO usuarios (nome, email, senha, perfil)
VALUES ('Administrador ClinicFlow', 'admin@clinicflow.local', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO pacientes (nome, cpf, telefone, email, nascimento)
VALUES
  ('Mariana Alves', '111.222.333-44', '(11) 98888-1001', 'mariana@email.com', '1991-04-12'),
  ('Carlos Henrique', '222.333.444-55', '(21) 97777-2002', 'carlos@email.com', '1984-09-28'),
  ('Beatriz Lima', '333.444.555-66', '(31) 96666-3003', 'beatriz@email.com', '2000-02-18')
ON CONFLICT (cpf) DO NOTHING;

INSERT INTO medicos (nome, especialidade, crm, sala)
VALUES
  ('Dra. Helena Duarte', 'Cardiologia', 'CRM-SP 102030', 'A-12'),
  ('Dr. Rafael Nogueira', 'Clinica Geral', 'CRM-RJ 908070', 'B-04'),
  ('Dra. Sofia Martins', 'Pediatria', 'CRM-MG 554433', 'C-02')
ON CONFLICT (crm) DO NOTHING;

INSERT INTO consultas (paciente_id, medico_id, data_hora, status, observacoes)
SELECT p.id, m.id, NOW() + INTERVAL '1 day', 'agendada', 'Consulta inicial'
FROM pacientes p, medicos m
WHERE p.cpf = '111.222.333-44' AND m.crm = 'CRM-SP 102030'
ON CONFLICT DO NOTHING;

INSERT INTO consultas (paciente_id, medico_id, data_hora, status, observacoes)
SELECT p.id, m.id, NOW() + INTERVAL '2 days', 'confirmada', 'Retorno com exames'
FROM pacientes p, medicos m
WHERE p.cpf = '222.333.444-55' AND m.crm = 'CRM-RJ 908070'
ON CONFLICT DO NOTHING;

