"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { contactEmail, githubProfile, type HomeLocale } from "@/components/home/content";
import { TerminalCursor } from "@/components/home/ascii-motion";

type ArchiveAgentProps = {
  locale: HomeLocale;
  onSetLocale: (next: HomeLocale) => void;
};

const SECTION_IDS: Record<string, string> = {
  top: "top",
  work: "work",
  notes: "notes",
  contact: "contact"
};

function scrollToSection(section: string) {
  const id = SECTION_IDS[section];
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

function openExternalTarget(target: string) {
  if (target === "github") {
    window.open(githubProfile, "_blank", "noopener,noreferrer");
    return true;
  }
  if (target === "email") {
    const mailto = `mailto:${contactEmail}`;
    window.location.href = mailto;
    return true;
  }
  if (target === "blog") {
    window.location.href = "/blog";
    return true;
  }
  return false;
}

function extractText(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => {
      const part = p as { type?: string; text?: string };
      return part.type === "text" && typeof part.text === "string" ? part.text : "";
    })
    .join("");
}

function extractToolLabels(parts: unknown): string[] {
  if (!Array.isArray(parts)) return [];
  const labels: string[] = [];
  for (const p of parts) {
    const part = p as { type?: string; state?: string; input?: Record<string, unknown> };
    if (typeof part.type !== "string") continue;
    if (!part.type.startsWith("tool-")) continue;
    const name = part.type.replace(/^tool-/, "");
    const input = part.input ?? {};
    const arg = Object.values(input)[0];
    const value = typeof arg === "string" ? arg : "";
    labels.push(value ? `${name}(${value})` : name);
  }
  return labels;
}

export function ArchiveAgent({ locale, onSetLocale }: ArchiveAgentProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const chat = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent" }),
    onToolCall: async ({ toolCall }) => {
      const name = toolCall.toolName;
      const input = (toolCall.input ?? {}) as Record<string, unknown>;
      let output: Record<string, unknown> = { ok: false, error: "unhandled tool" };
      if (name === "navigate") {
        const ok = scrollToSection(String(input.section ?? ""));
        setOpen(false);
        output = ok ? { ok: true } : { ok: false, error: "section not found" };
      } else if (name === "setLocale") {
        const next = input.locale === "en" ? "en" : "es";
        onSetLocale(next);
        output = { ok: true, locale: next };
      } else if (name === "openPost") {
        const slug = String(input.slug ?? "").replace(/^\/+|\/+$/g, "");
        if (!slug) {
          output = { ok: false, error: "missing slug" };
        } else {
          window.location.href = `/blog/${slug}`;
          output = { ok: true };
        }
      } else if (name === "openExternal") {
        const ok = openExternalTarget(String(input.target ?? ""));
        output = ok ? { ok: true } : { ok: false, error: "unknown target" };
      }
      chat.addToolResult({
        tool: name,
        toolCallId: toolCall.toolCallId,
        output
      });
    }
  });
  const { messages, sendMessage, status, stop, setMessages } = chat;

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
    setOpen(true);
  };

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const clear = () => {
    stop();
    setMessages([]);
    setOpen(false);
  };

  const placeholder =
    locale === "es" ? "$ pregunta al archivo…" : "$ ask the archive…";
  const statusLabel =
    status === "streaming"
      ? locale === "es" ? "● streaming" : "● streaming"
      : status === "submitted"
        ? locale === "es" ? "▸ pensando" : "▸ thinking"
        : locale === "es" ? "idle" : "idle";

  return (
    <div
      className="archive-agent"
      data-open={open ? "true" : "false"}
      data-busy={busy ? "true" : "false"}
      data-focused={focused ? "true" : "false"}
      aria-live="polite"
    >
      {open && messages.length > 0 && (
        <div className="archive-agent__panel">
          <div className="archive-agent__panel-head">
            <span className="archive-agent__corner">┌</span>
            <span className="archive-agent__panel-title">
              ARCHIVE · AGENT · {locale.toUpperCase()}
            </span>
            <button
              type="button"
              className="archive-agent__close"
              onClick={() => setOpen(false)}
              aria-label={locale === "es" ? "minimizar" : "minimize"}
              title={locale === "es" ? "minimizar (⌘K para restaurar)" : "minimize (⌘K to restore)"}
            >
              ─
            </button>
            <button
              type="button"
              className="archive-agent__close"
              onClick={clear}
              aria-label={locale === "es" ? "cerrar y limpiar" : "close and clear"}
              title={locale === "es" ? "cerrar y limpiar" : "close and clear"}
            >
              ×
            </button>
          </div>
          <div className="archive-agent__transcript" ref={transcriptRef}>
            {messages.map((m) => {
              const text = extractText((m as { parts?: unknown }).parts);
              const tools = extractToolLabels((m as { parts?: unknown }).parts);
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className="archive-agent__turn"
                  data-role={m.role}
                >
                  <span className="archive-agent__glyph">
                    {isUser ? "◇" : "◆"}
                  </span>
                  <div className="archive-agent__body">
                    {tools.map((label, i) => (
                      <div key={`t-${i}`} className="archive-agent__tool">
                        ▸ {label}
                      </div>
                    ))}
                    {text && <div className="archive-agent__text">{text}</div>}
                  </div>
                </div>
              );
            })}
            {status === "streaming" && (
              <div className="archive-agent__turn" data-role="assistant">
                <span className="archive-agent__glyph">◆</span>
                <div className="archive-agent__body">
                  <TerminalCursor className="archive-agent__typing" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <form className="archive-agent__dock" onSubmit={onSubmit}>
        <span className="archive-agent__scanline" aria-hidden="true" />
        <span className="archive-agent__frame-top" aria-hidden="true">
          <span className="archive-agent__frame-corner">┌─</span>
          <span className="archive-agent__frame-label">
            ARCHIVE::STDIN
          </span>
          <span className="archive-agent__frame-dash" />
          <span className="archive-agent__frame-kbd">⌘K</span>
          <span className="archive-agent__frame-corner">─┐</span>
        </span>
        <div className="archive-agent__dock-body">
          <span className="archive-agent__dock-glyph">❯</span>
          <input
            ref={inputRef}
            className="archive-agent__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onInputKey}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            aria-label={placeholder}
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
          />
          <span className="archive-agent__status" data-status={status}>
            {statusLabel}
          </span>
          {messages.length > 0 && !open && (
            <button
              type="button"
              className="archive-agent__dock-restore"
              onClick={() => setOpen(true)}
              aria-label={locale === "es" ? "restaurar chat" : "restore chat"}
              title={locale === "es" ? "restaurar chat" : "restore chat"}
            >
              ▴ {messages.length}
            </button>
          )}
          {messages.length > 0 && (
            <button
              type="button"
              className="archive-agent__dock-clear"
              onClick={clear}
              aria-label={locale === "es" ? "limpiar" : "clear"}
            >
              ×
            </button>
          )}
        </div>
        <span className="archive-agent__frame-bottom" aria-hidden="true">
          <span className="archive-agent__frame-corner">└─</span>
          <span className="archive-agent__frame-dash" />
          <span className="archive-agent__frame-corner">─┘</span>
        </span>
      </form>
    </div>
  );
}
