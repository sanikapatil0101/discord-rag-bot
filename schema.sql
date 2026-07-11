create extension if not exists vector;

create table if not exists guild_settings (
  guild_id text primary key,
  trusted_role_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists guild_channels (
  id bigint generated always as identity primary key,
  guild_id text not null references guild_settings(guild_id) on delete cascade,
  channel_id text not null,
  last_synced_message_id text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique(guild_id, channel_id)
);

create index if not exists guild_channels_guild_id_idx on guild_channels(guild_id);

ALTER TABLE guild_channels DISABLE ROW LEVEL SECURITY;

create table if not exists discord_logs (
  id text primary key,
  content text not null,
  guild_id text not null,
  channel_id text not null,
  author_id text,
  author_username text,
  message_created_at timestamptz,
  embedding vector(3072) not null,
  created_at timestamptz not null default now()
);

alter table discord_logs
  add column if not exists guild_id text;

alter table discord_logs
  add column if not exists author_id text;

alter table discord_logs
  add column if not exists author_username text;

alter table discord_logs
  add column if not exists message_created_at timestamptz;

create index if not exists discord_logs_guild_id_idx
  on discord_logs(guild_id);

create index if not exists discord_logs_channel_id_idx
  on discord_logs(channel_id);

create index if not exists discord_logs_message_created_at_idx
  on discord_logs(message_created_at);

drop index if exists discord_logs_embedding_idx;

drop function if exists match_documents(vector, double precision, integer);
drop function if exists match_documents(vector, double precision, integer, text);

create or replace function match_documents (
  query_embedding vector(3072),
  match_threshold float,
  match_count int,
  target_guild_id text
)
returns table (
  id text,
  content text,
  guild_id text,
  channel_id text,
  similarity float
)
language sql stable
as $$
  select
    discord_logs.id,
    discord_logs.content,
    discord_logs.guild_id,
    discord_logs.channel_id,
    1 - (discord_logs.embedding <=> query_embedding) as similarity
  from discord_logs
  where discord_logs.guild_id = target_guild_id
    and 1 - (discord_logs.embedding <=> query_embedding) > match_threshold
  order by discord_logs.embedding <=> query_embedding
  limit match_count;
$$;

-- This tells Supabase to turn off the strict Row Level Security (RLS) 
-- for your new table, allowing your bot to insert and update data freely.

ALTER TABLE guild_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE discord_logs DISABLE ROW LEVEL SECURITY;