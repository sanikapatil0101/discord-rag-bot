create extension if not exists vector;

create table if not exists discord_logs (
  id text primary key,
  content text not null,
  channel_id text not null,
  embedding vector(3072) not null,
  created_at timestamptz default now()
);

drop function if exists match_documents(vector, double precision, integer);

create or replace function match_documents (
  query_embedding vector(3072),
  match_threshold float,
  match_count int
)
returns table (
  id text,
  content text,
  channel_id text,
  similarity float
)
language sql stable
as $$
  select
    discord_logs.id,
    discord_logs.content,
    discord_logs.channel_id,
    1 - (discord_logs.embedding <=> query_embedding) as similarity
  from discord_logs
  where 1 - (discord_logs.embedding <=> query_embedding) > match_threshold
  order by discord_logs.embedding <=> query_embedding
  limit match_count;
$$;