-- 1) Tabelle mit genau EINEM Datensatz für den kompletten JSON-State
create table if not exists public.plantafel_state (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- updated_at automatisch setzen
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_touch_plantafel_state on public.plantafel_state;
create trigger trg_touch_plantafel_state
before update on public.plantafel_state
for each row execute function public.touch_updated_at();

-- 2) Editors (nur diese dürfen schreiben)
create table if not exists public.editors (
  email text primary key
);

-- RLS an
alter table public.plantafel_state enable row level security;
alter table public.editors enable row level security;

-- Lesen: ALLE dürfen plantafel_state lesen (Ansicht ohne Login)
drop policy if exists "plantafel_state_read_all" on public.plantafel_state;
create policy "plantafel_state_read_all"
on public.plantafel_state
for select
to anon, authenticated
using (true);

-- Editors lesen: nur authenticated darf die eigene Rolle prüfen (oder alle authenticated)
drop policy if exists "editors_read_authed" on public.editors;
create policy "editors_read_authed"
on public.editors
for select
to authenticated
using (true);

-- Schreiben plantafel_state: nur wenn User in editors steht
drop policy if exists "plantafel_state_write_editors" on public.plantafel_state;
create policy "plantafel_state_write_editors"
on public.plantafel_state
for insert
to authenticated
with check (
  exists (
    select 1 from public.editors e
    where e.email = auth.jwt() ->> 'email'
  )
);

drop policy if exists "plantafel_state_update_editors" on public.plantafel_state;
create policy "plantafel_state_update_editors"
on public.plantafel_state
for update
to authenticated
using (
  exists (
    select 1 from public.editors e
    where e.email = auth.jwt() ->> 'email'
  )
)
with check (
  exists (
    select 1 from public.editors e
    where e.email = auth.jwt() ->> 'email'
  )
);
