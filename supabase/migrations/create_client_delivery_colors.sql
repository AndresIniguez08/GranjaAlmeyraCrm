-- Color fijo por distribuidor para los marcadores del mapa de zonas de reparto
create table if not exists client_delivery_colors (
  client_id  uuid primary key references commercial_clients(id) on delete cascade,
  color      text not null,
  created_at timestamptz default now()
);

alter table client_delivery_colors enable row level security;

create policy "Authenticated users can read client_delivery_colors"
  on client_delivery_colors for select
  to authenticated
  using (true);

create policy "Authenticated users can insert client_delivery_colors"
  on client_delivery_colors for insert
  to authenticated
  with check (true);
