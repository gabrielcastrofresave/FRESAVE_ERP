import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ler variáveis de ambiente do arquivo .env local se existir
const envPath = join(__dirname, '.env.local');
let SUPABASE_URL = process.env.SUPABASE_URL;
let SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

try {
  const envFile = readFileSync(envPath, 'utf-8');
  const lines = envFile.split('\n');
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      SUPABASE_URL = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) {
      SUPABASE_SERVICE_ROLE_KEY = line.split('=')[1].trim();
    }
  }
} catch (err) {
  console.log('Arquivo .env.local não encontrado, usando variáveis de ambiente');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessários');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
  try {
    console.log('📊 Executando migration 009_create_schedules_tables.sql...');

    const sql = readFileSync(
      join(__dirname, 'supabase/migrations/009_create_schedules_tables.sql'),
      'utf-8'
    );

    console.log('SQL completo a executar:');
    console.log(sql);

    // Tentar executar via função SQL se disponível
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Erro RPC:', error);
      console.log('\n⚠️  A função RPC não está disponível.');
      console.log('📋 Por favor, execute o SQL manualmente no Supabase Dashboard:');
      console.log('   1. Aceda ao Supabase Dashboard');
      console.log('   2. Vá para SQL Editor');
      console.log('   3. Cole e execute o conteúdo do arquivo:');
      console.log('      supabase/migrations/009_create_schedules_tables.sql');
      process.exit(1);
    }

    console.log('✅ Migration executada com sucesso!', data);
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    console.log('\n📋 Por favor, execute o SQL manualmente no Supabase Dashboard.');
    process.exit(1);
  }
}

runMigration();
