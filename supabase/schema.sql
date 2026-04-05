-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Profiles: extends auth.users with app-specific data
create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

-- Lists: each grocery list
create table lists (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- List members: who has access to which list
create table list_members (
  list_id   uuid not null references lists (id) on delete cascade,
  user_id   uuid not null references profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

-- Catalog: global pre-populated items + user-added custom items
create table catalog (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  category   text not null,
  icon       text not null,
  is_global  boolean not null default false,
  created_by uuid references profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- Items: items on a specific list
create table items (
  id           uuid primary key default gen_random_uuid(),
  list_id      uuid not null references lists (id) on delete cascade,
  catalog_id   uuid references catalog (id) on delete set null,
  name         text not null,
  category     text not null,
  icon         text not null,
  quantity     text,
  notes        text,
  status       text not null default 'active' check (status in ('active', 'purchased', 'cleared')),
  purchased_at timestamptz,
  added_at     timestamptz not null default now()
);

-- Share links: single-use tokens for joining a list
create table share_links (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references lists (id) on delete cascade,
  created_by uuid not null references profiles (id) on delete cascade default auth.uid(),
  token      text not null unique default gen_random_uuid()::text,
  claimed_by uuid references profiles (id),
  expires_at timestamptz not null default now() + interval '1 day',
  created_at timestamptz not null default now()
);
