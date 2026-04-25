-- Fase 1: Knowledge base del portfolio con hybrid search (vector + FTS).
-- Fuente de verdad sobre Diego: posts del blog, proyectos, bio, resumen GitHub.
-- Se regenera vía `npm run embed:kb` desde scripts/embed-kb.ts.

create extension if not exists vector;
create extension if not exists pg_trgm;

create table kb_documents (
  id              bigserial primary key,
  source_type     text not null check (source_type in
                    ('post','project','bio','faq','github_summary')),
  source_id       text not null,
  chunk_index     int  not null default 0,
  title           text not null,
  content         text not null,
  url             text,
  locale          text not null default 'es',
  metadata        jsonb not null default '{}'::jsonb,
  content_tsv     tsvector generated always as
                    (to_tsvector('simple',
                      coalesce(title,'') || ' ' || coalesce(content,'')
                    )) stored,
  embedding       vector(1536) not null,
  content_hash    text not null,
  created_at      timestamptz default now(),
  unique (source_type, source_id, chunk_index, locale)
);

create index kb_documents_embedding_idx
  on kb_documents using hnsw (embedding vector_cosine_ops);
create index kb_documents_tsv_idx
  on kb_documents using gin (content_tsv);
create index kb_documents_source_idx
  on kb_documents (source_type, locale);
