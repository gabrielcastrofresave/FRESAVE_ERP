-- Create vehicles table (viaturas - carros, vans, etc.)
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  matricula TEXT NOT NULL UNIQUE,
  modelo TEXT NOT NULL,
  marca TEXT NOT NULL,
  ano INTEGER NOT NULL,
  km_atual INTEGER DEFAULT 0,
  proxima_manutencao INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'em_uso', 'manutencao', 'avaria')),
  condutor TEXT,
  data_inspecao DATE NOT NULL,
  data_seguro DATE NOT NULL,
  em_avaria BOOLEAN DEFAULT FALSE,
  motivo_avaria TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_matricula ON vehicles(matricula);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_data_inspecao ON vehicles(data_inspecao);
CREATE INDEX IF NOT EXISTS idx_vehicles_data_seguro ON vehicles(data_seguro);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on vehicles" ON vehicles
  FOR ALL
  USING (true)
  WITH CHECK (true);
