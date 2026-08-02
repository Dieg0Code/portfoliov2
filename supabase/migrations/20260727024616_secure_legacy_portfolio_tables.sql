-- The portfolio agent runtime was removed, but its historical tables remain.
-- Keep the data while closing the public Data API surface.

alter table public.kb_documents enable row level security;
alter table public.agent_conversations enable row level security;
alter table public.agent_messages enable row level security;
alter table public.agent_memory enable row level security;

revoke all on table public.kb_documents from anon, authenticated;
revoke all on table public.agent_conversations from anon, authenticated;
revoke all on table public.agent_messages from anon, authenticated;
revoke all on table public.agent_memory from anon, authenticated;

grant select, insert, update, delete on table public.kb_documents
  to service_role;
grant select, insert, update, delete on table public.agent_conversations
  to service_role;
grant select, insert, update, delete on table public.agent_messages
  to service_role;
grant select, insert, update, delete on table public.agent_memory
  to service_role;

alter function public.hybrid_search_kb(
  text,
  vector,
  text,
  text[],
  integer,
  integer
) set search_path = public, extensions;

alter function public.hybrid_search_memory(
  uuid,
  vector,
  text,
  integer,
  integer
) set search_path = public, extensions;

revoke execute on function public.hybrid_search_kb(
  text,
  vector,
  text,
  text[],
  integer,
  integer
) from public, anon, authenticated;

revoke execute on function public.hybrid_search_memory(
  uuid,
  vector,
  text,
  integer,
  integer
) from public, anon, authenticated;

grant execute on function public.hybrid_search_kb(
  text,
  vector,
  text,
  text[],
  integer,
  integer
) to service_role;

grant execute on function public.hybrid_search_memory(
  uuid,
  vector,
  text,
  integer,
  integer
) to service_role;
