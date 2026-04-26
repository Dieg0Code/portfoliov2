import type { UIMessage } from "ai";
import { summarizeTurns } from "../summarize";
import {
  getMessagesAfter,
  updateConversationSummary
} from "./conversation";
import { getSupabaseAdmin } from "./client";

const SUMMARY_TRIGGER_MSGS = 6;

type Row = { id: number; role: string; content: string; parts: unknown };

function toUIMessage(row: Row): UIMessage {
  // Prefer raw parts if we stored them; otherwise wrap content as a single
  // text part. summarizeTurns reads parts via extractText.
  const parts = Array.isArray(row.parts)
    ? row.parts
    : [{ type: "text", text: row.content }];
  return {
    id: `db-${row.id}`,
    role: (row.role === "user" ? "user" : "assistant") as UIMessage["role"],
    parts
  } as UIMessage;
}

export async function summarizeIfNeeded(conversationId: string): Promise<void> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("agent_conversations")
    .select("summary, summary_covers_msg_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!data) return;
  const conv = data as { summary: string; summary_covers_msg_id: number | null };

  const newRows = await getMessagesAfter(conversationId, conv.summary_covers_msg_id);
  if (newRows.length < SUMMARY_TRIGGER_MSGS) return;

  const turns = newRows.map(toUIMessage);
  const updated = await summarizeTurns(conv.summary ?? "", turns);
  if (!updated || updated === conv.summary) return;

  const lastId = newRows[newRows.length - 1].id;
  await updateConversationSummary(conversationId, updated, lastId);
}
