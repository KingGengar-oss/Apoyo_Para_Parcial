-- Registro Compartido: esquema inicial para Supabase.
-- Ejecuta este archivo en Supabase SQL Editor.
-- Esta version arranca con un snapshot compartido para poder probar rapido.
-- Luego puedes migrar a las tablas normalizadas de abajo sin cambiar la UI.

create extension if not exists "pgcrypto";

create table if not exists public.workspace_snapshots (
  workspace_id text primary key,
  payload jsonb not null,
  source_client_id text,
  updated_at timestamptz not null default now()
);

alter table public.workspace_snapshots enable row level security;

drop policy if exists "demo_read_workspace_snapshots" on public.workspace_snapshots;
drop policy if exists "demo_write_workspace_snapshots" on public.workspace_snapshots;
drop policy if exists "demo_update_workspace_snapshots" on public.workspace_snapshots;

-- Politicas abiertas para DEMO. Sirven para probar en GitHub Pages sin login.
-- Antes de usar datos reales, reemplazalas por politicas con auth.uid().
create policy "demo_read_workspace_snapshots"
on public.workspace_snapshots
for select
using (true);

create policy "demo_write_workspace_snapshots"
on public.workspace_snapshots
for insert
with check (true);

create policy "demo_update_workspace_snapshots"
on public.workspace_snapshots
for update
using (true)
with check (true);

-- Base normalizada recomendada para la siguiente fase.
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('Administrador', 'Contador', 'Cliente')),
  status text not null default 'Activo',
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create table if not exists public.sheets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  columns jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.sheet_rows (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.sheets(id) on delete cascade,
  row_index int not null default 0,
  values jsonb not null default '[]'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.file_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_id uuid references public.profiles(id),
  shared_with uuid references public.profiles(id),
  name text not null,
  storage_path text,
  mime_type text,
  size_bytes bigint default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  detail text,
  created_at timestamptz not null default now()
);
