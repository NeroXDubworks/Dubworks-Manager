alter table public.entregas_producao
  add column if not exists comentario_lider text;

notify pgrst, 'reload schema';
