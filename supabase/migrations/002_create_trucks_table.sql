-- Create trucks table
CREATE TABLE IF NOT EXISTS trucks (
  id TEXT PRIMARY KEY,
  matricula TEXT NOT NULL UNIQUE,
  modelo TEXT NOT NULL,
  marca TEXT NOT NULL,
  ano INTEGER NOT NULL,
  km_atual INTEGER DEFAULT 0,
  proxima_manutencao INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'em_uso', 'manutencao', 'avaria')),
  condutor TEXT,
  inspection_validity DATE,
  insurance_validity DATE,
  em_avaria BOOLEAN DEFAULT FALSE,
  motivo_avaria TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trucks_matricula ON trucks(matricula);
CREATE INDEX IF NOT EXISTS idx_trucks_status ON trucks(status);
CREATE INDEX IF NOT EXISTS idx_trucks_em_avaria ON trucks(em_avaria);

-- Enable Row Level Security
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security requirements)
CREATE POLICY "Allow all operations on trucks" ON trucks
  FOR ALL
  USING (true)
  WITH CHECK (true);
