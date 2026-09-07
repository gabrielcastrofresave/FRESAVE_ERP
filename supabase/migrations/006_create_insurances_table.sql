-- Create insurances table
CREATE TABLE IF NOT EXISTS insurances (
  id TEXT PRIMARY KEY,
  truck_id TEXT NOT NULL,
  truck_name TEXT NOT NULL,
  segurado TEXT NOT NULL,
  numero_apolice TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  preco DECIMAL(10, 2),
  descricao TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_insurances_truck_id ON insurances(truck_id);
CREATE INDEX IF NOT EXISTS idx_insurances_data_fim ON insurances(data_fim);
CREATE INDEX IF NOT EXISTS idx_insurances_numero_apolice ON insurances(numero_apolice);

-- Enable RLS
ALTER TABLE insurances ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on insurances" ON insurances
  FOR ALL
  USING (true)
  WITH CHECK (true);
