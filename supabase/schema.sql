-- Pool Service App schema
-- Run in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  pool_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  technician_id uuid,
  visited_at timestamptz not null default now(),
  ph numeric(4,2) not null check (ph >= 0 and ph <= 14),
  chlorine numeric(6,2) not null check (chlorine >= 0),
  notes text,
  status text not null default 'normal'
    check (status in ('normal','check','needs_attention')),
  created_at timestamptz not null default now()
);

create table if not exists public.visit_chemicals (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  chemical text not null,
  amount numeric(10,2) not null check (amount >= 0),
  unit text not null default 'lbs'
    check (unit in ('lbs','oz','gal','other'))
);

create table if not exists public.visit_photos (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  photo_type text not null
    check (photo_type in ('test_strip','pool','filter','equipment','other')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists visits_visited_at_idx
  on public.visits (visited_at desc);

create index if not exists visit_chemicals_visit_id_idx
  on public.visit_chemicals (visit_id);

create index if not exists visit_photos_visit_id_idx
  on public.visit_photos (visit_id);

alter table public.customers enable row level security;
alter table public.visits enable row level security;
alter table public.visit_chemicals enable row level security;
alter table public.visit_photos enable row level security;

-- Private storage bucket. The browser only receives the publishable key.
insert into storage.buckets (id, name, public)
values ('pool-photos', 'pool-photos', false)
on conflict (id) do update set public = false;

-- Owner authorization must be assigned in Supabase Auth app_metadata, e.g.
-- { "role": "admin" }. Never use user_metadata for authorization.
create policy "admin reads customers" on public.customers for select to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "technician creates visits" on public.visits for insert to anon, authenticated
  with check (true);
create policy "admin reads visits" on public.visits for select to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "technician creates chemicals" on public.visit_chemicals for insert to anon, authenticated
  with check (true);
create policy "admin reads chemicals" on public.visit_chemicals for select to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "technician creates photo metadata" on public.visit_photos for insert to anon, authenticated
  with check (true);
create policy "admin reads photo metadata" on public.visit_photos for select to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');

create policy "technician uploads pool photos" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'pool-photos' and name ~ '^[0-9a-f-]{36}/[a-z_]+/[0-9a-f-]{36}\.jpg$');
create policy "admin reads pool photos" on storage.objects for select to authenticated
  using (bucket_id = 'pool-photos' and (select auth.jwt()->'app_metadata'->>'role') = 'admin');
