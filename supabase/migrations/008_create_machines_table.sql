-- Create machines table (máquinas, reboques, empilhadores, etc.)
CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  ano INTEGER NOT NULL,
  numero_serie TEXT,
  km_atual INTEGER,
  proxima_manutencao INTEGER,
  data_proxima_manutencao DATE,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'em_uso', 'manutencao', 'avaria')),
  responsavel TEXT,
  data_inspecao DATE NOT NULL,
  data_seguro DATE NOT NULL,
  em_avaria BOOLEAN DEFAULT FALSE,
  motivo_avaria TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_machines_nome ON machines(nome);
CREATE INDEX IF NOT EXISTS idx_machines_tipo ON machines(tipo);
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
CREATE INDEX IF NOT EXISTS idx_machines_data_inspecao ON machines(data_inspecao);
CREATE INDEX IF NOT EXISTS idx_machines_data_seguro ON machines(data_seguro);

-- Enable RLS
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on machines" ON machines
  FOR ALL
  USING (true)
  WITH CHECK (true);
