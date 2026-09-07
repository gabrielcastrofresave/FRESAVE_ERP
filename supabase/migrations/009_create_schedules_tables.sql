-- Create truck_schedules table
CREATE TABLE IF NOT EXISTS truck_schedules (
  id TEXT PRIMARY KEY,
  truck_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  utilizador TEXT NOT NULL,
  local TEXT,
  descricao TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'cancelado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for truck_schedules
CREATE INDEX IF NOT EXISTS idx_truck_schedules_truck_id ON truck_schedules(truck_id);
CREATE INDEX IF NOT EXISTS idx_truck_schedules_user_id ON truck_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_truck_schedules_data ON truck_schedules(data);
CREATE INDEX IF NOT EXISTS idx_truck_schedules_status ON truck_schedules(status);

-- Enable RLS
ALTER TABLE truck_schedules ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on truck_schedules" ON truck_schedules
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create vehicle_schedules table
CREATE TABLE IF NOT EXISTS vehicle_schedules (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  utilizador TEXT NOT NULL,
  local TEXT,
  descricao TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'cancelado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for vehicle_schedules
CREATE INDEX IF NOT EXISTS idx_vehicle_schedules_vehicle_id ON vehicle_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_schedules_user_id ON vehicle_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_schedules_data ON vehicle_schedules(data);
CREATE INDEX IF NOT EXISTS idx_vehicle_schedules_status ON vehicle_schedules(status);

-- Enable RLS
ALTER TABLE vehicle_schedules ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on vehicle_schedules" ON vehicle_schedules
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create machine_schedules table
CREATE TABLE IF NOT EXISTS machine_schedules (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  indefinido BOOLEAN DEFAULT TRUE,
  destinatario TEXT,
  notas TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'cancelado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for machine_schedules
CREATE INDEX IF NOT EXISTS idx_machine_schedules_machine_id ON machine_schedules(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_schedules_user_id ON machine_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_machine_schedules_data_inicio ON machine_schedules(data_inicio);
CREATE INDEX IF NOT EXISTS idx_machine_schedules_data_fim ON machine_schedules(data_fim);
CREATE INDEX IF NOT EXISTS idx_machine_schedules_status ON machine_schedules(status);

-- Enable RLS
ALTER TABLE machine_schedules ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on machine_schedules" ON machine_schedules
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create equipment_schedules table
CREATE TABLE IF NOT EXISTS equipment_schedules (
  id TEXT PRIMARY KEY,
  equipment_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  indefinido BOOLEAN DEFAULT FALSE,
  destinatario TEXT,
  notas TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'cancelado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for equipment_schedules
CREATE INDEX IF NOT EXISTS idx_equipment_schedules_equipment_id ON equipment_schedules(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_schedules_user_id ON equipment_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_schedules_data_inicio ON equipment_schedules(data_inicio);
CREATE INDEX IF NOT EXISTS idx_equipment_schedules_data_fim ON equipment_schedules(data_fim);
CREATE INDEX IF NOT EXISTS idx_equipment_schedules_status ON equipment_schedules(status);

-- Enable RLS
ALTER TABLE equipment_schedules ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on equipment_schedules" ON equipment_schedules
  FOR ALL
  USING (true)
  WITH CHECK (true);
