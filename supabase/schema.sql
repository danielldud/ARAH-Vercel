-- Run once in Supabase Dashboard > SQL Editor.
create table if not exists public.spaces(id uuid primary key,name text not null);
create table if not exists public.members(id uuid primary key,space uuid not null references public.spaces(id) on delete cascade,user_id uuid not null,name text not null,role text not null check(role in ('admin','editor','viewer')),unique(space,user_id));
create table if not exists public.entries(id text primary key,owner uuid not null,kind text not null check(kind in ('transactions','projects','events')),body jsonb not null,fingerprint text,deleted_at timestamptz);
create unique index if not exists idx_entries_owner_fingerprint on public.entries(owner,fingerprint) where fingerprint is not null;
create index if not exists idx_entries_owner_kind on public.entries(owner,kind);
create table if not exists public.preferences(owner uuid primary key,body jsonb not null);
create table if not exists public.activity(id uuid primary key,space uuid not null,actor text not null,action text not null,created timestamptz not null default now());
create index if not exists idx_activity_space_created on public.activity(space,created desc);
create table if not exists public.invites(hash text primary key,space uuid not null,role text not null check(role in ('admin','editor','viewer')),expires timestamptz not null,used_by uuid);
create index if not exists idx_invites_space on public.invites(space);
create table if not exists public.receipts(id text primary key,owner uuid not null,name text not null,mime text not null,size bigint not null,object_key text not null unique,tx_id text,note text not null,direction text not null check(direction in ('income','expense','statement')),created timestamptz not null default now());
create index if not exists idx_receipts_owner on public.receipts(owner);

alter table public.spaces enable row level security;
alter table public.members enable row level security;
alter table public.entries enable row level security;
alter table public.preferences enable row level security;
alter table public.activity enable row level security;
alter table public.invites enable row level security;
alter table public.receipts enable row level security;
revoke all on public.spaces,public.members,public.entries,public.preferences,public.activity,public.invites,public.receipts from anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('receipts','receipts',false,4194304,array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
