-- Tabla de auditoría para registrar todas las eliminaciones
create table if not exists audit_log (
  id           uuid primary key default gen_random_uuid(),
  action       text not null,           -- 'delete'
  entity_type  text not null,           -- 'contact' | 'client' | 'prospect' | 'followup'
  entity_id    uuid not null,
  entity_data  jsonb,                   -- snapshot completo del registro
  performed_by text,                    -- nombre del usuario
  performed_at timestamptz default now()
);

-- Índices para consultas frecuentes
create index if not exists audit_log_entity_type_idx on audit_log(entity_type);
create index if not exists audit_log_performed_by_idx on audit_log(performed_by);
create index if not exists audit_log_performed_at_idx on audit_log(performed_at desc);

-- RLS: solo lectura/escritura para usuarios autenticados
alter table audit_log enable row level security;

create policy "Authenticated users can insert audit_log"
  on audit_log for insert
  to authenticated
  with check (true);

create policy "Authenticated users can read audit_log"
  on audit_log for select
  to authenticated
  using (true);
