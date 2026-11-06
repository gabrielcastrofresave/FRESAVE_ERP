-- ============================================================
-- ASSISTÊNCIAS: cliente, período, gastos livres e documentos
-- Executar uma vez no Supabase > SQL Editor
-- ============================================================

ALTER TABLE public.service_reports
  ADD COLUMN IF NOT EXISTS client_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS expenses_text TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS document_name TEXT,
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS document_path TEXT;

-- Os relatórios antigos continuam válidos e recebem a data do relatório
-- como início/fim até serem editados.
UPDATE public.service_reports
SET
  start_date = COALESCE(start_date, report_date::date),
  end_date = COALESCE(end_date, report_date::date)
WHERE start_date IS NULL OR end_date IS NULL;

ALTER TABLE public.service_reports
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN end_date SET NOT NULL,
  ALTER COLUMN job_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_reports_client_name
  ON public.service_reports (client_name);

CREATE INDEX IF NOT EXISTS idx_service_reports_period
  ON public.service_reports (start_date, end_date);

-- Bucket público, seguindo o modelo já usado pela aplicação para anexos.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('service-documents', 'service-documents', true, 15728640)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "service_documents_select" ON storage.objects;
CREATE POLICY "service_documents_select"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'service-documents');

DROP POLICY IF EXISTS "service_documents_insert" ON storage.objects;
CREATE POLICY "service_documents_insert"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'service-documents');

DROP POLICY IF EXISTS "service_documents_update" ON storage.objects;
CREATE POLICY "service_documents_update"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'service-documents')
WITH CHECK (bucket_id = 'service-documents');

DROP POLICY IF EXISTS "service_documents_delete" ON storage.objects;
CREATE POLICY "service_documents_delete"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'service-documents');
