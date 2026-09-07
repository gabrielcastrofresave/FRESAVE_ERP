import { useState } from 'react';
import { Button } from './ui/button';

const migrationSQL = `-- Create truck_schedules table
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

CREATE INDEX IF NOT EXISTS idx_truck_schedules_truck_id ON truck_schedules(truck_id);
CREATE INDEX IF NOT EXISTS idx_truck_schedules_user_id ON truck_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_truck_schedules_data ON truck_schedules(data);
CREATE INDEX IF NOT EXISTS idx_truck_schedules_status ON truck_schedules(status);

ALTER TABLE truck_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on truck_schedules" ON truck_schedules;
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

CREATE INDEX IF NOT EXISTS idx_vehicle_schedules_vehicle_id ON vehicle_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_schedules_user_id ON vehicle_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_schedules_data ON vehicle_schedules(data);
CREATE INDEX IF NOT EXISTS idx_vehicle_schedules_status ON vehicle_schedules(status);

ALTER TABLE vehicle_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on vehicle_schedules" ON vehicle_schedules;
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

CREATE INDEX IF NOT EXISTS idx_machine_schedules_machine_id ON machine_schedules(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_schedules_user_id ON machine_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_machine_schedules_data_inicio ON machine_schedules(data_inicio);
CREATE INDEX IF NOT EXISTS idx_machine_schedules_data_fim ON machine_schedules(data_fim);
CREATE INDEX IF NOT EXISTS idx_machine_schedules_status ON machine_schedules(status);

ALTER TABLE machine_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on machine_schedules" ON machine_schedules;
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

CREATE INDEX IF NOT EXISTS idx_equipment_schedules_equipment_id ON equipment_schedules(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_schedules_user_id ON equipment_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_schedules_data_inicio ON equipment_schedules(data_inicio);
CREATE INDEX IF NOT EXISTS idx_equipment_schedules_data_fim ON equipment_schedules(data_fim);
CREATE INDEX IF NOT EXISTS idx_equipment_schedules_status ON equipment_schedules(status);

ALTER TABLE equipment_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on equipment_schedules" ON equipment_schedules;
CREATE POLICY "Allow all operations on equipment_schedules" ON equipment_schedules
  FOR ALL
  USING (true)
  WITH CHECK (true);`;

export function RunMigration() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const runMigration = async () => {
    setStatus('running');
    setMessage('Executando migration...');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ sql_query: migrationSQL }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      setStatus('success');
      setMessage('✅ Migration executada com sucesso! As tabelas foram criadas. Recarregue a página.');
    } catch (error: any) {
      setStatus('error');
      setMessage(`❌ Erro: ${error.message}\n\nPor favor, execute o SQL manualmente no Supabase Dashboard (SQL Editor).`);
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(migrationSQL);
    alert('SQL copiado para a área de transferência!');
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-100 dark:bg-yellow-900 p-4 z-50 border-b-4 border-yellow-500">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-2">⚠️ Migration Necessária</h2>
        <p className="mb-4">
          As tabelas de agendamentos precisam ser criadas no banco de dados.
        </p>

        <div className="flex gap-2 mb-2">
          <Button onClick={runMigration} disabled={status === 'running'}>
            {status === 'running' ? 'Executando...' : 'Executar Migration Automaticamente'}
          </Button>
          <Button onClick={copySQL} variant="outline">
            Copiar SQL (Execução Manual)
          </Button>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded ${
            status === 'success' ? 'bg-green-100 dark:bg-green-900' :
            status === 'error' ? 'bg-red-100 dark:bg-red-900' :
            'bg-blue-100 dark:bg-blue-900'
          }`}>
            <pre className="whitespace-pre-wrap text-sm">{message}</pre>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <p className="font-bold mb-2">Instruções para execução manual:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Aceda ao Supabase Dashboard</li>
              <li>Vá para "SQL Editor"</li>
              <li>Clique em "Copiar SQL" acima</li>
              <li>Cole e execute o SQL no editor</li>
              <li>Recarregue esta página</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
