-- ============================================================
-- ASSISTÊNCIAS: quem foi (técnicos) e vários ficheiros por assistência
-- Executar uma vez no Supabase > SQL Editor
-- É seguro voltar a executar (não duplica nada).
-- ============================================================

-- 1) Quem foi: lista de ids de utilizadores
ALTER TABLE public.service_reports
  ADD COLUMN IF NOT EXISTS technician_ids TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_service_reports_technicians
  ON public.service_reports USING GIN (technician_ids);

-- 2) Vários ficheiros: uma linha por ficheiro (o tipo da coluna id acompanha o da tabela service_reports)
DO $$
DECLARE
  id_type TEXT;
BEGIN
  SELECT data_type INTO id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'service_reports' AND column_name = 'id';

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS public.service_report_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_id %s NOT NULL REFERENCES public.service_reports(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      url TEXT NOT NULL,
      size BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )$f$, CASE WHEN id_type = 'uuid' THEN 'UUID' ELSE 'TEXT' END);
END $$;

CREATE INDEX IF NOT EXISTS idx_service_report_documents_report
  ON public.service_report_documents (report_id);

ALTER TABLE public.service_report_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on service_report_documents" ON public.service_report_documents;
CREATE POLICY "Allow all operations on service_report_documents"
  ON public.service_report_documents
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3) Os ficheiros que já existiam (um por assistência) passam para a nova tabela
INSERT INTO public.service_report_documents (report_id, name, path, url, created_at)
SELECT r.id,
       COALESCE(r.document_name, 'Documento'),
       r.document_path,
       r.document_url,
       COALESCE(r.updated_at, NOW())
FROM public.service_reports r
WHERE r.document_url IS NOT NULL
  AND r.document_path IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.service_report_documents d
    WHERE d.report_id = r.id AND d.path = r.document_path
  );
