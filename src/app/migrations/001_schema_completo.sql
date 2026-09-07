-- ============================================================
-- MIGRATION COMPLETA - INTRANET ELECTROMINHO
-- Colar no Supabase > SQL Editor e clicar "Run"
-- ============================================================

-- Extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS (ligada ao Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  nome        TEXT        NOT NULL,
  telefone    TEXT,
  numero      TEXT,
  pin         TEXT,
  role        TEXT        NOT NULL DEFAULT 'colaborador',
  ativo       BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TRUCKS (Camiões)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trucks (
  id                            TEXT PRIMARY KEY,
  matricula                     TEXT NOT NULL,
  marca                         TEXT,
  modelo                        TEXT,
  ano                           INTEGER,
  km_atual                      NUMERIC DEFAULT 0,
  proxima_manutencao_km         NUMERIC DEFAULT 0,
  inspection_validity           DATE,
  insurance_validity            DATE,
  status                        TEXT DEFAULT 'disponivel',
  tipo                          TEXT,
  n_lugares                     INTEGER,
  n_quadro                      TEXT,
  datamatricula                 DATE,
  aprovisionamento              TEXT,
  responsaveloperacional        TEXT,
  centrocusto                   TEXT,
  n_internoelectrominho         TEXT,
  seguradora                    TEXT,
  n_apolice                     TEXT,
  tem_autorizacao_especial      BOOLEAN DEFAULT false,
  nome_autorizacao_especial     TEXT,
  validade_autorizacao_especial DATE,
  especificacoes                TEXT,
  tem_gps                       BOOLEAN DEFAULT false,
  identificador_via_verde       TEXT,
  em_avaria                     BOOLEAN DEFAULT false,
  motivo_avaria                 TEXT,
  created_at                    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. VEHICLES (Viaturas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vehicles (
  id                        TEXT PRIMARY KEY,
  matricula                 TEXT NOT NULL,
  marca                     TEXT,
  modelo                    TEXT,
  ano                       INTEGER,
  tipo                      TEXT,
  status                    TEXT DEFAULT 'disponivel',
  n_lugares                 INTEGER,
  n_quadro                  TEXT,
  datamatricula             DATE,
  n_internoelectrominho     TEXT,
  responsaveloperacional    TEXT,
  centrocusto               TEXT,
  aprovisionamento          TEXT,
  condutor                  TEXT,
  km_atual                  NUMERIC DEFAULT 0,
  proxima_manutencao_km     NUMERIC DEFAULT 0,
  horas_atual               NUMERIC DEFAULT 0,
  proxima_manutencao_horas  NUMERIC DEFAULT 0,
  proxima_manutencao_data   DATE,
  data_inspecao             DATE,
  insurance_validity        DATE,
  seguradora                TEXT,
  n_apolice                 TEXT,
  tem_gps                   BOOLEAN DEFAULT false,
  identificador_via_verde   TEXT,
  especificacoes            TEXT,
  em_avaria                 BOOLEAN DEFAULT false,
  motivo_avaria             TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. GRUAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gruas (
  id               TEXT PRIMARY KEY,
  marca            TEXT,
  veiculoid        TEXT,
  anoconstrucao    INTEGER,
  n_serie          TEXT,
  datainspecao     DATE,
  inspecionargruaem DATE,
  inspecaogruan    TEXT,
  status           TEXT DEFAULT 'disponivel',
  em_avaria        BOOLEAN DEFAULT false,
  motivo_avaria    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. TACOGRAFOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tacografos (
  id           TEXT PRIMARY KEY,
  camioid      TEXT,
  dataaferacao DATE,
  aferirem     DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. MACHINES (Máquinas / Reboques)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.machines (
  id                       TEXT PRIMARY KEY,
  nome                     TEXT NOT NULL,
  tipo                     TEXT,
  marca                    TEXT,
  modelo                   TEXT,
  ano                      INTEGER,
  numero_serie             TEXT,
  km_atual                 NUMERIC,
  proxima_manutencao_km    NUMERIC,
  horas_atual              NUMERIC,
  proxima_manutencao_horas NUMERIC,
  proxima_revisao_horas    NUMERIC,
  proxima_manutencao_data  DATE,
  status                   TEXT DEFAULT 'disponivel',
  responsavel              TEXT,
  data_inspecao            DATE,
  data_seguro              DATE,
  em_avaria                BOOLEAN DEFAULT false,
  motivo_avaria            TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. EQUIPMENT (Equipamentos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.equipment (
  id             TEXT PRIMARY KEY,
  identificacao  TEXT,
  nome           TEXT NOT NULL,
  tipo           TEXT,
  marca          TEXT,
  modelo         TEXT,
  numero_serie   TEXT,
  categoria      TEXT,
  data_aquisicao DATE,
  proxima_revisao DATE,
  status         TEXT DEFAULT 'disponivel',
  area           TEXT,
  observacoes    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. EQUIPMENT_SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.equipment_schedules (
  id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id TEXT,
  user_id      UUID    REFERENCES public.users(id) ON DELETE SET NULL,
  data_inicio  DATE    NOT NULL,
  data_fim     DATE,
  indefinido   BOOLEAN DEFAULT false,
  notas        TEXT,
  destinatario TEXT,
  status       TEXT    DEFAULT 'ativo',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. MACHINE_SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.machine_schedules (
  id             UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id     TEXT,
  user_id        UUID    REFERENCES public.users(id) ON DELETE SET NULL,
  data_inicio    DATE    NOT NULL,
  data_fim       DATE,
  indefinido     BOOLEAN DEFAULT false,
  notas          TEXT,
  destinatario   TEXT,
  status         TEXT    DEFAULT 'ativo',
  ordem_trabalho TEXT,
  centro_custo   TEXT,
  periodo        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. TRUCK_SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.truck_schedules (
  id             UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  truck_id       TEXT,
  user_id        UUID    REFERENCES public.users(id) ON DELETE SET NULL,
  data_inicio    DATE    NOT NULL,
  data_fim       DATE,
  indefinido     BOOLEAN DEFAULT false,
  notas          TEXT,
  destinatario   TEXT,
  status         TEXT    DEFAULT 'ativo',
  ordem_trabalho TEXT,
  centro_custo   TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. VEHICLE_SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vehicle_schedules (
  id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id   TEXT,
  user_id      UUID    REFERENCES public.users(id) ON DELETE SET NULL,
  data_inicio  DATE    NOT NULL,
  data_fim     DATE,
  indefinido   BOOLEAN DEFAULT false,
  notas        TEXT,
  destinatario TEXT,
  status       TEXT    DEFAULT 'ativo',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. CALENDAR_EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id         TEXT PRIMARY KEY,
  titulo     TEXT,
  data       DATE,
  hora       TIME,
  recurso_id TEXT,
  utilizador TEXT,
  local      TEXT,
  tipo       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tickets (
  id            TEXT PRIMARY KEY,
  titulo        TEXT NOT NULL,
  descricao     TEXT,
  prioridade    TEXT DEFAULT 'media',
  status        TEXT DEFAULT 'aberto',
  categoria     TEXT,
  criado_por    TEXT,
  criado_em     DATE DEFAULT CURRENT_DATE,
  atribuido_a   TEXT,
  resolvido_em  DATE,
  resposta_admin TEXT,
  respondido_em  DATE,
  respondido_por TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. MAINTENANCES (Manutenções)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.maintenances (
  id            TEXT PRIMARY KEY,
  tipo          TEXT,
  item_id       TEXT,
  item_nome     TEXT,
  descricao     TEXT,
  data          DATE,
  km_realizacao NUMERIC,
  custo         NUMERIC DEFAULT 0,
  realizado     BOOLEAN DEFAULT false,
  mecanico      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. INSPECTIONS (Inspeções)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inspections (
  id               TEXT PRIMARY KEY,
  truck_id         TEXT,
  truck_name       TEXT,
  tipo_inspecao    TEXT,
  data_realizacao  DATE,
  proxima_inspecao DATE,
  resultado        TEXT,
  observacoes      TEXT,
  realizado        BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 16. INSURANCES (Seguros)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.insurances (
  id             TEXT PRIMARY KEY,
  truck_id       TEXT,
  truck_name     TEXT,
  segurado       TEXT,
  numero_apolice TEXT,
  data_inicio    DATE,
  data_fim       DATE,
  preco          NUMERIC DEFAULT 0,
  descricao      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. AVARIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.avarias (
  id            TEXT PRIMARY KEY,
  tipo          TEXT,
  item_id       TEXT,
  item_nome     TEXT,
  motivo_avaria TEXT,
  data_registo  DATE DEFAULT CURRENT_DATE,
  data_resolucao DATE,
  resolucao     TEXT,
  status        TEXT DEFAULT 'aberta',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18. TEAMS (Equipas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome       TEXT NOT NULL,
  descricao  TEXT,
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 19. TEAM_MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.team_members (
  team_id      UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.users(id) ON DELETE CASCADE,
  papel        TEXT DEFAULT 'Membro',
  adicionado_em TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- ============================================================
-- 20. DOCUMENTOS_ENTREGA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documentos_entrega (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_ficheiro  TEXT NOT NULL,
  url_ficheiro   TEXT NOT NULL,
  destinatario   TEXT,
  user_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  categoria      TEXT,
  data_criacao   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 21. CINTAS_ESTROPOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cintas_estropos (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero         TEXT,
  designacao     TEXT,
  marca_modelo   TEXT,
  numero_serie   TEXT,
  data_aquisicao DATE,
  area           TEXT,
  responsavel    TEXT,
  data_entrega   DATE,
  status         TEXT DEFAULT 'ativo',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 22. STOCK_ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stock_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome           TEXT NOT NULL,
  identificacao  TEXT,
  quantidade     NUMERIC DEFAULT 0,
  data_aquisicao DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 23. STOCK_MOVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id     UUID REFERENCES public.stock_items(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  veiculo_id  TEXT,
  tipo        TEXT NOT NULL,
  quantidade  NUMERIC NOT NULL,
  data        DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 24. PRODUCTION_TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.production_tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  titulo      TEXT,
  descricao   TEXT,
  data        DATE DEFAULT CURRENT_DATE,
  status      TEXT DEFAULT 'pendente',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 25. PRODUCTION_TASK_IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.production_task_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID REFERENCES public.production_tasks(id) ON DELETE CASCADE,
  imagem_url  TEXT NOT NULL,
  descricao   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 26. PUSH_SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT,
  auth       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- ============================================================
-- DESATIVAR RLS EM TODAS AS TABELAS
-- (Para funcionamento imediato; adicionar políticas depois)
-- ============================================================
ALTER TABLE public.users               DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles            DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gruas               DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tacografos          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines            DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_schedules   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_schedules     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_schedules   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets             DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenances        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurances          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.avarias             DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams               DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_entrega  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cintas_estropos     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_tasks    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_task_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions  DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- TRIGGER: Criar perfil em public.users ao registar via Auth
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, nome, role, ativo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'colaborador'),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STORAGE BUCKETS (criar manualmente no Supabase > Storage)
-- Bucket 1: "documentacao"       (público)
-- Bucket 2: "production-attachments" (público)
-- ============================================================
