-- Reciprocal Rank Fusion hybrid search sobre kb_documents.
-- Combina similitud coseno (pgvector) + FTS (tsvector) sin normalizar scores.
-- k=60 es el default canónico del paper de Cormack.

create or replace function hybrid_search_kb(
  query_text       text,
  query_embedding  vector(1536),
  query_locale     text    default 'es',
  source_filter    text[]  default null,
  match_count      int     default 6,
  rrf_k            int     default 60
) returns table (
  id          bigint,
  source_type text,
  source_id   text,
  title       text,
  content     text,
  url         text,
  metadata    jsonb,
  score       real
)
language sql
stable
as $$
  with vec as (
    select id,
           row_number() over (order by embedding <=> query_embedding) as rank
    from kb_documents
    where locale = query_locale
      and (source_filter is null or source_type = any(source_filter))
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
    select d.id,
           row_number() over (
             order by ts_rank_cd(d.content_tsv, (select q from fts_q)) desc
           ) as rank
    from kb_documents d, fts_q
    where fts_q.q is not null
      and d.content_tsv @@ fts_q.q
      and d.locale = query_locale
      and (source_filter is null or d.source_type = any(source_filter))
    limit greatest(match_count * 3, 12)
  ),
  fused as (
    select coalesce(vec.id, fts.id) as id,
           coalesce(1.0 / (rrf_k + vec.rank), 0) +
           coalesce(1.0 / (rrf_k + fts.rank), 0) as score
    from vec
    full outer join fts using (id)
  )
  select d.id, d.source_type, d.source_id, d.title,
         d.content, d.url, d.metadata, f.score::real
  from fused f
  join kb_documents d on d.id = f.id
  order by f.score desc
  limit match_count;
$$;
