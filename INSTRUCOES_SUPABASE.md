# Instruções para Configuração do Supabase

## Passos para Aplicar as Migrations

Para que os dados sejam atualizados corretamente no Supabase, é necessário executar as migrations SQL que criam as tabelas necessárias.

### Opção 1: Através do Dashboard do Supabase (Recomendado)

1. Aceda ao Dashboard do Supabase: https://supabase.com/dashboard
2. Selecione o seu projeto
3. No menu lateral, vá a **SQL Editor**
4. Clique em **New Query**
5. Copie e cole o conteúdo de cada ficheiro de migration na seguinte ordem:

#### Migration 1: Tabela de Manutenções
```sql
-- Copie e cole o conteúdo de: /supabase/migrations/001_create_maintenances_table.sql
```

#### Migration 2: Tabela de Camiões
```sql
-- Copie e cole o conteúdo de: /supabase/migrations/002_create_trucks_table.sql
```

#### Migration 3: Tabela de Equipamentos
```sql
-- Copie e cole o conteúdo de: /supabase/migrations/003_create_equipment_table.sql
```

#### Migration 4: Tabelas Restantes (Users, Calendar Events, Tickets)
```sql
-- Copie e cole o conteúdo de: /supabase/migrations/004_create_remaining_tables.sql
```

#### Migration 5: Tabela de Inspeções ⚠️ NOVA
```sql
-- Copie e cole o conteúdo de: /supabase/migrations/005_create_inspections_table.sql
```

#### Migration 6: Tabela de Seguros ⚠️ NOVA
```sql
-- Copie e cole o conteúdo de: /supabase/migrations/006_create_insurances_table.sql
```

#### Migration 7: Tabela de Viaturas ⚠️ NOVA
```sql
-- Copie e cole o conteúdo de: /supabase/migrations/007_create_vehicles_table.sql
```

#### Migration 8: Tabela de Máquinas ⚠️ NOVA
```sql
-- Copie e cole o conteúdo de: /supabase/migrations/008_create_machines_table.sql
```

6. Depois de colar cada SQL, clique em **Run** para executar
7. Verifique se não há erros na execução

### Opção 2: Usando o Supabase CLI

Se tiver o Supabase CLI instalado:

```bash
supabase db push
```

Isto irá aplicar automaticamente todas as migrations na pasta `/supabase/migrations/`.

## Verificação

Após aplicar as migrations, verifique se as tabelas foram criadas:

1. No Dashboard do Supabase, vá a **Table Editor**
2. Deverá ver as seguintes tabelas:
   - `maintenances`
   - `trucks`
   - `vehicles` ⚠️ NOVA
   - `machines` ⚠️ NOVA
   - `equipment`
   - `users`
   - `calendar_events`
   - `tickets`
   - `inspections` ⚠️ NOVA
   - `insurances` ⚠️ NOVA

## Estrutura das Tabelas

### Trucks (Camiões)
- `id` - ID único
- `matricula` - Matrícula do camião
- `marca`, `modelo`, `ano` - Detalhes do veículo
- `km_atual` - Quilometragem atual
- `proxima_manutencao` - KM da próxima manutenção
- `status` - Status atual (disponivel, em_uso, manutencao, avaria)
- `inspection_validity` - Data de validade da inspeção
- `insurance_validity` - Data de validade do seguro
- `em_avaria` - Se está em avaria (boolean)
- `motivo_avaria` - Descrição da avaria

### Vehicles (Viaturas - Carros, Vans, etc.) ⚠️ NOVA
- `id` - ID único
- `matricula` - Matrícula da viatura
- `marca`, `modelo`, `ano` - Detalhes do veículo
- `km_atual` - Quilometragem atual
- `proxima_manutencao` - KM da próxima manutenção
- `status` - Status atual (disponivel, em_uso, manutencao, avaria)
- `condutor` - Nome do condutor
- `data_inspecao` - Data de validade da inspeção
- `data_seguro` - Data de validade do seguro
- `em_avaria` - Se está em avaria (boolean)
- `motivo_avaria` - Descrição da avaria

### Machines (Máquinas, Reboques, Empilhadores, etc.) ⚠️ NOVA
- `id` - ID único
- `nome` - Nome/Identificação da máquina
- `tipo` - Tipo (reboque, empilhador, etc.)
- `marca`, `modelo`, `ano` - Detalhes da máquina
- `numero_serie` - Número de série (opcional)
- `km_atual` - Quilometragem atual (opcional, para máquinas com odómetro)
- `proxima_manutencao` - KM da próxima manutenção (para máquinas com KM)
- `data_proxima_manutencao` - Data da próxima manutenção (para máquinas sem KM)
- `status` - Status atual (disponivel, em_uso, manutencao, avaria)
- `responsavel` - Nome do responsável
- `data_inspecao` - Data de validade da inspeção
- `data_seguro` - Data de validade do seguro
- `em_avaria` - Se está em avaria (boolean)
- `motivo_avaria` - Descrição da avaria

### Equipment (Equipamentos)
- `id` - ID único
- `nome`, `tipo`, `marca` - Detalhes do equipamento
- `data_aquisicao` - Data de aquisição
- `proxima_revisao` - Data da próxima revisão
- `status` - Status atual
- `tem_inspecao` - Se requer inspeção (boolean)
- `tem_seguro` - Se requer seguro (boolean)
- `data_inspecao` - Data de validade da inspeção (se aplicável)
- `data_seguro` - Data de validade do seguro (se aplicável)
- `em_avaria` - Se está em avaria (boolean)
- `motivo_avaria` - Descrição da avaria

### Maintenances (Manutenções)
- `id` - ID único
- `tipo` - Tipo (camiao ou equipamento)
- `item_id` - ID do camião/equipamento
- `item_nome` - Nome do item
- `descricao` - Descrição da manutenção
- `data` - Data da manutenção
- `km_realizacao` - KM de realização (para camiões)
- `custo` - Custo da manutenção
- `realizado` - Se foi realizada (boolean)
- `mecanico` - Nome do mecânico responsável

### Inspections (Inspeções) ⚠️ NOVA
- `id` - ID único
- `truck_id` - ID do camião
- `truck_name` - Nome do camião
- `tipo_inspecao` - Tipo de inspeção
- `data_realizacao` - Data em que foi realizada
- `proxima_inspecao` - Data da próxima inspeção
- `resultado` - Resultado da inspeção
- `observacoes` - Observações
- `realizado` - Se foi realizada (boolean)

### Insurances (Seguros) ⚠️ NOVA
- `id` - ID único
- `truck_id` - ID do camião
- `truck_name` - Nome do camião
- `segurado` - Nome do segurado
- `numero_apolice` - Número da apólice
- `data_inicio` - Data de início do seguro
- `data_fim` - Data de fim do seguro
- `preco` - Preço do seguro
- `descricao` - Descrição

## Resolução de Problemas

### Se as tabelas já existem
Se receber erro de que as tabelas já existem, pode:
1. Eliminar as tabelas existentes (⚠️ isto apaga todos os dados!)
2. Ou modificar as migrations para usar `CREATE TABLE IF NOT EXISTS`

### Dados não aparecem
1. Verifique se as migrations foram aplicadas com sucesso
2. Confirme que as Row Level Security policies estão corretas
3. Verifique a consola do navegador para erros de API
4. Confirme que o projeto Supabase está ligado corretamente

## Notas Importantes

- **Inspeções e Seguros**: Os camiões sempre têm inspeção e seguro. Os equipamentos têm toggles `tem_inspecao` e `tem_seguro` para ativar/desativar.
- **Validação Automática**: Quando uma data de inspeção ou seguro vence, o status deve ser mudado manualmente para "manutencao".
- **Avarias**: Use o botão de avaria para registar problemas não programados. Isto coloca o item em status "avaria" automaticamente.
- **Manutenções**: As manutenções dos camiões são baseadas em KM, e as dos equipamentos em datas.