-- Create maintenances table
CREATE TABLE IF NOT EXISTS maintenances (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('camiao', 'equipamento')),
  item_id TEXT NOT NULL,
  item_nome TEXT NOT NULL,
  descricao TEXT,
  data DATE NOT NULL,
  km_realizacao INTEGER,
  custo DECIMAL(10, 2) DEFAULT 0,
  realizado BOOLEAN DEFAULT FALSE,
  mecanico TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_maintenances_item_id ON maintenances(item_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_tipo ON maintenances(tipo);
CREATE INDEX IF NOT EXISTS idx_maintenances_realizado ON maintenances(realizado);

-- Enable Row Level Security
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security requirements)
CREATE POLICY "Allow all operations on maintenances" ON maintenances
  FOR ALL
  USING (true)
  WITH CHECK (true);
