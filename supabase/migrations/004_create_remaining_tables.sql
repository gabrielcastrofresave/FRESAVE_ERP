-- Create users table (extended from Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'gestor', 'camionista', 'chefe_equipa', 'mecanico')),
  ativo BOOLEAN DEFAULT TRUE,
  data_criacao DATE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on users" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  data DATE NOT NULL,
  hora TEXT,
  recurso_id TEXT NOT NULL,
  utilizador TEXT,
  local TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('camiao', 'equipamento', 'event')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_data ON calendar_events(data);
CREATE INDEX IF NOT EXISTS idx_calendar_events_recurso_id ON calendar_events(recurso_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_tipo ON calendar_events(tipo);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on calendar_events" ON calendar_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  prioridade TEXT NOT NULL CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_progresso', 'resolvido', 'fechado')),
  categoria TEXT NOT NULL CHECK (categoria IN ('camiao', 'equipamento', 'outro')),
  criado_por TEXT NOT NULL,
  criado_em DATE DEFAULT NOW(),
  atribuido_a TEXT,
  resolvido_em DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_prioridade ON tickets(prioridade);
CREATE INDEX IF NOT EXISTS idx_tickets_criado_por ON tickets(criado_por);
CREATE INDEX IF NOT EXISTS idx_tickets_atribuido_a ON tickets(atribuido_a);

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on tickets" ON tickets
  FOR ALL
  USING (true)
  WITH CHECK (true);
