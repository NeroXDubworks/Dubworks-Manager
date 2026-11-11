-- Diferencia minutas geradas dos PDFs efetivamente assinados.
-- PDFs anteriores continuam como categoria 'gerado'.
alter table public.crm_documentos_gerados
  add column if not exists categoria text not null default 'gerado';
alter table public.crm_documentos_gerados
  add constraint crm_documentos_categoria_valida check (
    categoria = 'gerado' or (categoria = 'assinado' and tipo = 'contrato')
  );
comment on column public.crm_documentos_gerados.categoria is
  'gerado: proposta/minuta oficial; assinado: documento final fornecido após assinatura.';
