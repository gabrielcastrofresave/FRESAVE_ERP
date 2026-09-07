-- Create inspections table
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  truck_id TEXT NOT NULL,
  truck_name TEXT NOT NULL,
  tipo_inspecao TEXT NOT NULL,
  data_realizacao DATE,
  proxima_inspecao DATE NOT NULL,
  resultado TEXT,
  observacoes TEXT DEFAULT '',
  realizado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_inspections_truck_id ON inspections(truck_id);
CREATE INDEX IF NOT EXISTS idx_inspections_proxima_inspecao ON inspections(proxima_inspecao);
CREATE INDEX IF NOT EXISTS idx_inspections_realizado ON inspections(realizado);

-- Enable RLS
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on inspections" ON inspections
  FOR ALL
  USING (true)
  WITH CHECK (true);
