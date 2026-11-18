-- Permite gravar as datas (service_days) das sub-assistências.
-- Corrige: new row violates row-level security policy for table "service_days"
-- Executar no Supabase > SQL Editor.

ALTER TABLE public.service_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on service_days" ON public.service_days;
CREATE POLICY "Allow all operations on service_days"
  ON public.service_days
  FOR ALL
  USING (true)
  WITH CHECK (true);
