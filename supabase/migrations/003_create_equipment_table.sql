-- Create equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT,
  data_aquisicao DATE,
  proxima_revisao DATE,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'em_uso', 'manutencao', 'avaria')),
  responsavel TEXT,
  tem_inspecao BOOLEAN DEFAULT FALSE,
  tem_seguro BOOLEAN DEFAULT FALSE,
  data_inspecao DATE,
  data_seguro DATE,
  em_avaria BOOLEAN DEFAULT FALSE,
  motivo_avaria TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_equipment_nome ON equipment(nome);
CREATE INDEX IF NOT EXISTS idx_equipment_tipo ON equipment(tipo);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_em_avaria ON equipment(em_avaria);

-- Enable Row Level Security
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security requirements)
CREATE POLICY "Allow all operations on equipment" ON equipment
  FOR ALL
  USING (true)
  WITH CHECK (true);
