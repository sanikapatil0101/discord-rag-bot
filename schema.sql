-- 1. Enable the pgvector extension
create extension if not exists vector;

-- 2. Guild Settings Table
create table if not exists guild_settings (
  guild_id text primary key,
  trusted_role_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Guild Channels Table
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

alter table guild_settings disable row level security;
alter table guild_channels disable row level security;

-- 4. Discord Logs Table
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

create index if not exists discord_logs_guild_id_idx on discord_logs(guild_id);
create index if not exists discord_logs_channel_id_idx on discord_logs(channel_id);
create index if not exists discord_logs_message_created_at_idx on discord_logs(message_created_at);

-- 5. Note: HNSW and IVFFlat indexes both have a 2000-dimension limit in pgvector.
-- gemini-embedding-001 produces 3072-dimension vectors so no approximate vector index can be used.
-- pgvector will use a sequential scan for similarity search, which is fast enough at community server scale.

alter table discord_logs disable row level security;

-- 6. Drop old function signatures to prevent conflicts
drop function if exists match_documents(vector, double precision, integer);
drop function if exists match_documents(vector, double precision, integer, text);
drop function if exists match_documents(vector, double precision, integer, text, text);

-- 7. Search function — filters by guild_id and channel_id
create or replace function match_documents (
  query_embedding vector(3072),
  match_threshold float,
  match_count int,
  target_guild_id text,
  target_channel_id text
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
    and discord_logs.channel_id = target_channel_id
    and 1 - (discord_logs.embedding <=> query_embedding) > match_threshold
  order by discord_logs.embedding <=> query_embedding
  limit match_count;
$$;
