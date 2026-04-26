-- Fase 3: Visitor memory — facts/preferences/interests/intents that
-- survive across sessions. Hybrid search (vector + FTS), TTL by kind.

create table agent_memory (
  id              bigserial primary key,
  visitor_id      uuid not null,
  kind            text not null check (kind in ('preference','interest','intent','fact')),
  content         text not null,
  salience        real not null default 0.5
                    check (salience between 0 and 1),
  source_conv_id  uuid references agent_conversations(id) on delete set null,
  expires_at      timestamptz,
  content_tsv     tsvector generated always as
                    (to_tsvector('simple', content)) stored,
  embedding       vector(1536) not null,
  created_at      timestamptz default now(),
  last_used_at    timestamptz default now(),
  use_count       int default 0,
  unique (visitor_id, kind, content)
);

create index agent_memory_visitor_idx
  on agent_memory (visitor_id, expires_at);
create index agent_memory_visitor_salience_idx
  on agent_memory (visitor_id, salience desc, last_used_at desc);
create index agent_memory_embedding_idx
  on agent_memory using hnsw (embedding vector_cosine_ops);
create index agent_memory_tsv_idx
  on agent_memory using gin (content_tsv);

create or replace function hybrid_search_memory(
  p_visitor_id    uuid,
  query_embedding vector(1536),
  query_text      text,
  match_count     int default 4,
  rrf_k           int default 60
) returns table (
  id        bigint,
  kind      text,
  content   text,
  salience  real,
  score     real
)
language sql
stable
as $$
  with vec as (
    select id,
           row_number() over (order by embedding <=> query_embedding) as rank
    from agent_memory
    where visitor_id = p_visitor_id
      and (expires_at is null or expires_at > now())
    order by embedding <=> query_embedding
    limit greatest(match_count * 3, 12)
  ),
  fts_q as (
    select case
      when coalesce(query_text, '') = '' then null
      else websearch_to_tsquery('simple', query_text)
    end as q
  ),
  fts as (
    select m.id,
           row_number() over (
             order by ts_rank_cd(m.content_tsv, (select q from fts_q)) desc
           ) as rank
    from agent_memory m, fts_q
    where fts_q.q is not null
      and m.content_tsv @@ fts_q.q
      and m.visitor_id = p_visitor_id
      and (m.expires_at is null or m.expires_at > now())
    limit greatest(match_count * 3, 12)
  ),
  fused as (
    select coalesce(vec.id, fts.id) as id,
           (coalesce(1.0 / (rrf_k + vec.rank), 0) +
            coalesce(1.0 / (rrf_k + fts.rank), 0)) as base
    from vec full outer join fts using (id)
  )
  select m.id, m.kind, m.content, m.salience,
         (f.base * (0.5 + m.salience))::real as score
  from fused f
  join agent_memory m on m.id = f.id
  order by score desc
  limit match_count;
$$;
