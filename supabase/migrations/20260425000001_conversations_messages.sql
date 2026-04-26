-- Fase 2: Persistence substrate for conversations + messages.
-- Server-side conversation state, replaces client-localStorage rolling summary.

create table agent_conversations (
  id                     uuid primary key default gen_random_uuid(),
  visitor_id             uuid not null,
  locale                 text not null default 'es',
  summary                text not null default '',
  summary_covers_msg_id  bigint,
  message_count          int  not null default 0,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now(),
  last_active_at         timestamptz default now()
);

create index agent_conversations_visitor_idx
  on agent_conversations (visitor_id, last_active_at desc);

create table agent_messages (
  id              bigserial primary key,
  conversation_id uuid not null
                    references agent_conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant','tool','system')),
  content         text not null default '',
  parts           jsonb,
  tool_calls      jsonb,
  token_count     int,
  created_at      timestamptz default now()
);

create index agent_messages_conv_idx
  on agent_messages (conversation_id, created_at);
