import { getSupabaseAdmin } from "./client";

export type ConversationState = {
  id: string;
  summary: string;
  summaryCoversMsgId: number | null;
  messageCount: number;
  locale: "es" | "en";
};

export type AppendMessageInput = {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  parts?: unknown;
  toolCalls?: unknown;
  tokenCount?: number;
};

type ConvRow = {
  id: string;
  visitor_id: string;
  locale: string;
  summary: string;
  summary_covers_msg_id: number | null;
  message_count: number;
};

function rowToState(row: ConvRow): ConversationState {
  return {
    id: row.id,
    summary: row.summary,
    summaryCoversMsgId: row.summary_covers_msg_id,
    messageCount: row.message_count,
    locale: row.locale === "en" ? "en" : "es"
  };
}

export async function getOrCreateConversation(args: {
  visitorId: string;
  conversationId?: string;
  locale: "es" | "en";
}): Promise<ConversationState> {
  const sb = getSupabaseAdmin();

  if (args.conversationId) {
    const { data, error } = await sb
      .from("agent_conversations")
      .select("id, visitor_id, locale, summary, summary_covers_msg_id, message_count")
      .eq("id", args.conversationId)
      .maybeSingle();
    if (error) {
      console.warn("[conversation] lookup failed:", error.message);
    }
    const row = data as ConvRow | null;
    if (row && row.visitor_id === args.visitorId) {
      return rowToState(row);
    }
  }

  const { data, error } = await sb
    .from("agent_conversations")
    .insert({ visitor_id: args.visitorId, locale: args.locale })
    .select("id, visitor_id, locale, summary, summary_covers_msg_id, message_count")
    .single();
  if (error || !data) {
    throw new Error(`failed to create conversation: ${error?.message ?? "no row"}`);
  }
  return rowToState(data as ConvRow);
}

export async function appendMessage(
  conversationId: string,
  msg: AppendMessageInput
): Promise<number | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("agent_messages")
    .insert({
      conversation_id: conversationId,
      role: msg.role,
      content: msg.content,
      parts: msg.parts ?? null,
      tool_calls: msg.toolCalls ?? null,
      token_count: msg.tokenCount ?? null
    })
    .select("id")
    .single();
  if (error || !data) {
    console.warn("[conversation] appendMessage failed:", error?.message);
    return null;
  }
  return (data as { id: number }).id;
}

export async function bumpConversationActivity(
  conversationId: string,
  messagesAdded: number
): Promise<void> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("agent_conversations")
    .select("message_count")
    .eq("id", conversationId)
    .maybeSingle();
  const current = (data as { message_count?: number } | null)?.message_count ?? 0;
  const now = new Date().toISOString();
  await sb
    .from("agent_conversations")
    .update({
      message_count: current + messagesAdded,
      updated_at: now,
      last_active_at: now
    })
    .eq("id", conversationId);
}

export async function getMessagesAfter(
  conversationId: string,
  afterMsgId: number | null
): Promise<Array<{ id: number; role: string; content: string; parts: unknown }>> {
  const sb = getSupabaseAdmin();
  let q = sb
    .from("agent_messages")
    .select("id, role, content, parts")
    .eq("conversation_id", conversationId)
    .order("id", { ascending: true });
  if (afterMsgId !== null) q = q.gt("id", afterMsgId);
  const { data, error } = await q;
  if (error) {
    console.warn("[conversation] getMessagesAfter failed:", error.message);
    return [];
  }
  return (data ?? []) as Array<{ id: number; role: string; content: string; parts: unknown }>;
}

export async function updateConversationSummary(
  conversationId: string,
  summary: string,
  coversMsgId: number
): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("agent_conversations")
    .update({
      summary,
      summary_covers_msg_id: coversMsgId,
      updated_at: new Date().toISOString()
    })
    .eq("id", conversationId);
  if (error) {
    console.warn("[conversation] updateSummary failed:", error.message);
  }
}
