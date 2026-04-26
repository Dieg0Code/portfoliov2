"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { contactEmail, githubProfile, type HomeLocale } from "@/components/home/content";
import { AgentThinking } from "@/components/home/agent-thinking";
import { collectClientTelemetry } from "@/lib/agent/telemetry/client";
import type { ClientTelemetry } from "@/lib/agent/telemetry/types";

type ArchiveAgentProps = {
  locale: HomeLocale;
  onSetLocale: (next: HomeLocale) => void;
};

type Thread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
  conversationId?: string;   // server-side conversation ref (Fase 2 substrate)
};

const STORAGE_KEY = "archive-agent-threads-v2";
const ACTIVE_KEY = "archive-agent-active-v2";

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
    window.location.href = `mailto:${contactEmail}`;
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

type ToolInvocation = {
  name: string;
  arg: string;
};

function extractToolInvocations(parts: unknown): ToolInvocation[] {
  if (!Array.isArray(parts)) return [];
  const out: ToolInvocation[] = [];
  for (const p of parts) {
    const part = p as { type?: string; state?: string; input?: Record<string, unknown> };
    if (typeof part.type !== "string") continue;
    if (!part.type.startsWith("tool-")) continue;
    const name = part.type.replace(/^tool-/, "");
    const input = part.input ?? {};
    const arg = Object.values(input)[0];
    out.push({ name, arg: typeof arg === "string" ? arg : "" });
  }
  return out;
}

// Tool glyph map. UI tools show the arg (it's contextually meaningful: scroll
// to "work", open post "slug-x"). Cognitive tools are opaque — only glyph,
// no name and no arg, so visitors can't reverse-engineer Mira's capabilities
// or attempt prompt injection against specific tool names.
type ToolGlyphMeta = { icon: string; showArg: boolean; aria: string };
const TOOL_GLYPHS: Record<string, ToolGlyphMeta> = {
  navigate:               { icon: "↳", showArg: true,  aria: "scroll" },
  openPost:               { icon: "▤", showArg: true,  aria: "open" },
  openExternal:           { icon: "↗", showArg: true,  aria: "external" },
  setLocale:              { icon: "⇄", showArg: true,  aria: "toggle" },
  listProjects:           { icon: "≡", showArg: false, aria: "index" },
  recall_kb:              { icon: "⌕", showArg: false, aria: "look up" },
  recall_about_visitor:   { icon: "⊙", showArg: false, aria: "consult" },
  remember_about_visitor: { icon: "◈", showArg: false, aria: "note" }
};
const FALLBACK_GLYPH: ToolGlyphMeta = { icon: "·", showArg: false, aria: "tool" };

function deriveTitle(messages: UIMessage[], fallback: string): string {
  for (const m of messages) {
    if (m.role !== "user") continue;
    const text = extractText((m as { parts?: unknown }).parts).trim();
    if (text) return text.length > 42 ? `${text.slice(0, 42)}…` : text;
  }
  return fallback;
}

function makeId(): string {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Thread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadActiveId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function ArchiveAgent({ locale, onSetLocale }: ArchiveAgentProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());
  const freshIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const isSwitchingRef = useRef(false);

  // Refs read by the transport's prepareSendMessagesRequest — we need the
  // latest thread context at send-time, not whatever was in scope when the
  // transport was constructed.
  const activeThreadIdRef = useRef<string | null>(null);
  const threadsRef = useRef<Thread[]>([]);
  const clientTelemetryRef = useRef<ClientTelemetry | null>(null);
  const localeRef = useRef<HomeLocale>(locale);
  activeThreadIdRef.current = activeThreadId;
  threadsRef.current = threads;
  localeRef.current = locale;

  // Passive client telemetry — collected once per mount and reused in every
  // request body. No PII, no fingerprinting — just navigator/Intl/screen
  // values any page can read.
  useEffect(() => {
    if (clientTelemetryRef.current) return;
    clientTelemetryRef.current = collectClientTelemetry();
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        prepareSendMessagesRequest: ({ messages, body }) => {
          const tid = activeThreadIdRef.current;
          const thread = tid
            ? threadsRef.current.find((t) => t.id === tid)
            : undefined;
          return {
            body: {
              ...(body ?? {}),
              messages,
              conversationId: thread?.conversationId,
              locale: localeRef.current,
              clientTelemetry: clientTelemetryRef.current ?? undefined
            }
          };
        }
      }),
    []
  );

  const chat = useChat({
    transport,
    onData: (part) => {
      if (part.type !== "data-conversation") return;
      const data = (part as { data?: { id?: string } }).data;
      if (!data?.id) return;
      const tid = activeThreadIdRef.current;
      if (!tid) return;
      setThreads((prev) =>
        prev.map((t) =>
          t.id === tid && t.conversationId !== data.id
            ? { ...t, conversationId: data.id, updatedAt: Date.now() }
            : t
        )
      );
    },
    onToolCall: async ({ toolCall }) => {
      const name = toolCall.toolName;
      const input = (toolCall.input ?? {}) as Record<string, unknown>;
      let output: Record<string, unknown> = { ok: false, error: "unhandled tool" };
      if (name === "navigate") {
        const ok = scrollToSection(String(input.section ?? ""));
        if (ok) {
          setOpen(false);
          setExpanded(false);
        }
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

  // hydrate from localStorage — run ONCE on mount only.
  // setMessages identity is unstable across renders, so excluding it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const stored = loadThreads();
    const storedActive = loadActiveId();
    if (stored.length === 0) {
      const blank: Thread = {
        id: makeId(),
        title: locale === "es" ? "nueva conversación" : "new conversation",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      };
      setThreads([blank]);
      setActiveThreadId(blank.id);
    } else {
      setThreads(stored);
      const active = storedActive && stored.some((t) => t.id === storedActive)
        ? storedActive
        : stored[0].id;
      setActiveThreadId(active);
      const found = stored.find((t) => t.id === active);
      if (found) {
        isSwitchingRef.current = true;
        setMessages(found.messages);
        queueMicrotask(() => { isSwitchingRef.current = false; });
      }
    }
    setHydrated(true);
  }, []);

  // persist threads
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    } catch {
      /* quota / privacy mode — ignore */
    }
  }, [threads, hydrated]);

  // persist active id
  useEffect(() => {
    if (!hydrated || !activeThreadId) return;
    try {
      window.localStorage.setItem(ACTIVE_KEY, activeThreadId);
    } catch {
      /* ignore */
    }
  }, [activeThreadId, hydrated]);

  // sync chat messages → active thread.
  // Only after the stream settles (status idle or error) — syncing on every
  // streaming token re-allocates threads each frame and triggers a re-render
  // storm that eventually trips React's update-depth guard.
  useEffect(() => {
    if (!hydrated || !activeThreadId) return;
    if (isSwitchingRef.current) return;
    if (status === "streaming" || status === "submitted") return;
    setThreads((prev) => {
      let changed = false;
      const next = prev.map((t) => {
        if (t.id !== activeThreadId) return t;
        if (t.messages === messages) return t;
        changed = true;
        const fallback = locale === "es" ? "nueva conversación" : "new conversation";
        return {
          ...t,
          messages,
          updatedAt: Date.now(),
          title: t.title === fallback || !t.title
            ? deriveTitle(messages, fallback)
            : t.title
        };
      });
      return changed ? next : prev;
    });
  }, [messages, activeThreadId, hydrated, locale, status]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // capture which assistant message id is "freshly streaming" so we know
  // which one deserves the scramble-reveal once the stream settles.
  useEffect(() => {
    if (status === "streaming" || status === "submitted") {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "assistant") {
          freshIdRef.current = messages[i].id;
          break;
        }
      }
    }
  }, [status, messages]);

  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    if (!busy) {
      const id = window.requestAnimationFrame(() => inputRef.current?.focus());
      return () => window.cancelAnimationFrame(id);
    }
  }, [busy]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        if (expanded) {
          setExpanded(false);
        } else if (open) {
          setOpen(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, expanded]);

  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status, expanded]);

  // lock body scroll while expanded
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const sortedThreads = useMemo(
    () => [...threads].sort((a, b) => b.updatedAt - a.updatedAt),
    [threads]
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
    setOpen(true);
  };

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (expanded) setExpanded(false);
      else if (open) setOpen(false);
    }
  };

  const switchThread = (id: string) => {
    if (id === activeThreadId) return;
    stop();
    const target = threads.find((t) => t.id === id);
    if (!target) return;
    isSwitchingRef.current = true;
    setActiveThreadId(id);
    setMessages(target.messages);
    queueMicrotask(() => { isSwitchingRef.current = false; });
  };

  const newThread = () => {
    stop();
    const t: Thread = {
      id: makeId(),
      title: locale === "es" ? "nueva conversación" : "new conversation",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };
    isSwitchingRef.current = true;
    setThreads((prev) => [t, ...prev]);
    setActiveThreadId(t.id);
    setMessages([]);
    queueMicrotask(() => { isSwitchingRef.current = false; });
    inputRef.current?.focus();
  };

  const deleteThread = (id: string) => {
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (id === activeThreadId) {
        if (next.length === 0) {
          const blank: Thread = {
            id: makeId(),
            title: locale === "es" ? "nueva conversación" : "new conversation",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: []
          };
          isSwitchingRef.current = true;
          setActiveThreadId(blank.id);
          setMessages([]);
          queueMicrotask(() => { isSwitchingRef.current = false; });
          return [blank];
        }
        const fallback = next[0];
        isSwitchingRef.current = true;
        setActiveThreadId(fallback.id);
        setMessages(fallback.messages);
        queueMicrotask(() => { isSwitchingRef.current = false; });
      }
      return next;
    });
  };

  const clearActive = () => {
    stop();
    isSwitchingRef.current = true;
    setMessages([]);
    setThreads((prev) => prev.map((t) => t.id === activeThreadId
      ? { ...t, messages: [], conversationId: undefined, title: locale === "es" ? "nueva conversación" : "new conversation", updatedAt: Date.now() }
      : t
    ));
    queueMicrotask(() => { isSwitchingRef.current = false; });
    setOpen(false);
    setExpanded(false);
  };

  const placeholder =
    locale === "es" ? "$ pregunta al archivo…" : "$ ask the archive…";
  const statusLabel =
    status === "streaming"
      ? "● streaming"
      : status === "submitted"
        ? locale === "es" ? "▸ pensando" : "▸ thinking"
        : "idle";

  const transcript = (
    <div className="archive-agent__transcript" ref={transcriptRef}>
      {messages.length === 0 && (
        <div className="archive-agent__empty">
          {locale === "es"
            ? "Hola. Soy Mira, agente del archivo. ¿Qué quieres ver?"
            : "Hi. I'm Mira, archive agent. What would you like to see?"}
        </div>
      )}
      {messages.map((m) => {
        const text = extractText((m as { parts?: unknown }).parts);
        const tools = extractToolInvocations((m as { parts?: unknown }).parts);
        const isUser = m.role === "user";
        const isFresh = !isUser && m.id === freshIdRef.current && !revealedIds.has(m.id);
        const isStillStreaming = isFresh && (status === "streaming" || status === "submitted");
        const justArrived = isFresh && !isStillStreaming;
        return (
          <div key={m.id} className="archive-agent__turn" data-role={m.role}>
            <span className="archive-agent__glyph">{isUser ? "◇" : "◆"}</span>
            <div className="archive-agent__body">
              <span
                className="archive-agent__role"
                data-role={m.role}
                aria-hidden="true"
              >
                {isUser ? "you" : "mira"}
              </span>
              {tools.length > 0 && (
                <div className="archive-agent__tools-row">
                  {tools.map((tool, i) => {
                    const meta = TOOL_GLYPHS[tool.name] ?? FALLBACK_GLYPH;
                    return (
                      <span
                        key={`t-${i}`}
                        className="archive-agent__tool"
                        title={meta.aria}
                        aria-label={meta.aria}
                      >
                        <span className="archive-agent__tool-glyph">{meta.icon}</span>
                        {meta.showArg && tool.arg && (
                          <span className="archive-agent__tool-arg">{tool.arg}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
              {isStillStreaming && (
                <AgentThinking locale={locale} />
              )}
              {text && !isStillStreaming && (
                isUser ? (
                  <div className="archive-agent__text">{text}</div>
                ) : (
                  <div
                    className="archive-agent__text archive-agent__text--md"
                    data-reveal={justArrived ? "true" : undefined}
                    onAnimationEnd={justArrived ? (e) => {
                      if (e.animationName !== "archive-agent-text-reveal") return;
                      setRevealedIds((prev) => {
                        if (prev.has(m.id)) return prev;
                        const next = new Set(prev);
                        next.add(m.id);
                        return next;
                      });
                      if (freshIdRef.current === m.id) freshIdRef.current = null;
                    } : undefined}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ children, href }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        )
                      }}
                    >
                      {text}
                    </ReactMarkdown>
                  </div>
                )
              )}
            </div>
          </div>
        );
      })}
      {status === "submitted" && messages[messages.length - 1]?.role === "user" && (
        <div className="archive-agent__turn" data-role="assistant">
          <span className="archive-agent__glyph">◆</span>
          <div className="archive-agent__body">
            <AgentThinking locale={locale} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="archive-agent"
      data-open={open ? "true" : "false"}
      data-busy={busy ? "true" : "false"}
      data-focused={focused ? "true" : "false"}
      data-expanded={expanded ? "true" : "false"}
      aria-live="polite"
    >
      {expanded && (
        <div
          className="archive-agent__backdrop"
          onClick={() => setExpanded(false)}
          aria-hidden="true"
        />
      )}

      {expanded && (
        <div className="archive-agent__shell" role="dialog" aria-modal="true">
          <aside className="archive-agent__sidebar">
            <div className="archive-agent__sidebar-head">
              <span className="archive-agent__sidebar-title">
                {locale === "es" ? "HILOS" : "THREADS"}
              </span>
              <button
                type="button"
                className="archive-agent__sidebar-new"
                onClick={newThread}
                title={locale === "es" ? "nuevo hilo" : "new thread"}
                aria-label={locale === "es" ? "nuevo hilo" : "new thread"}
              >
                + {locale === "es" ? "nuevo" : "new"}
              </button>
            </div>
            <ul className="archive-agent__thread-list">
              {sortedThreads.map((t) => (
                <li
                  key={t.id}
                  className="archive-agent__thread"
                  data-active={t.id === activeThreadId ? "true" : "false"}
                >
                  <button
                    type="button"
                    className="archive-agent__thread-pick"
                    onClick={() => switchThread(t.id)}
                  >
                    <span className="archive-agent__thread-glyph">
                      {t.id === activeThreadId ? "◆" : "◇"}
                    </span>
                    <span className="archive-agent__thread-title">{t.title}</span>
                  </button>
                  <button
                    type="button"
                    className="archive-agent__thread-del"
                    onClick={() => deleteThread(t.id)}
                    aria-label={locale === "es" ? "eliminar hilo" : "delete thread"}
                    title={locale === "es" ? "eliminar hilo" : "delete thread"}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="archive-agent__main">
            <header className="archive-agent__main-head">
              <span className="archive-agent__corner">┌</span>
              <span className="archive-agent__panel-title">
                MIRA · ARCHIVE · {locale.toUpperCase()}
              </span>
              <button
                type="button"
                className="archive-agent__close"
                onClick={() => setExpanded(false)}
                aria-label={locale === "es" ? "contraer" : "collapse"}
                title={locale === "es" ? "contraer" : "collapse"}
              >
                ⊡
              </button>
              <button
                type="button"
                className="archive-agent__close"
                onClick={() => { setExpanded(false); setOpen(false); }}
                aria-label={locale === "es" ? "cerrar" : "close"}
                title={locale === "es" ? "cerrar" : "close"}
              >
                ×
              </button>
            </header>
            {transcript}
            <form className="archive-agent__inline-dock" onSubmit={onSubmit}>
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
                size={1}
              />
              <span className="archive-agent__status" data-status={status}>
                {statusLabel}
              </span>
            </form>
          </section>
        </div>
      )}

      {!expanded && open && messages.length > 0 && (
        <div className="archive-agent__panel">
          <div className="archive-agent__panel-head">
            <span className="archive-agent__corner">┌</span>
            <span className="archive-agent__panel-title">
              MIRA · ARCHIVE · {locale.toUpperCase()}
            </span>
            <button
              type="button"
              className="archive-agent__close"
              onClick={() => setExpanded(true)}
              aria-label={locale === "es" ? "expandir" : "expand"}
              title={locale === "es" ? "expandir" : "expand"}
            >
              ⛶
            </button>
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
              onClick={clearActive}
              aria-label={locale === "es" ? "limpiar" : "clear"}
              title={locale === "es" ? "limpiar hilo" : "clear thread"}
            >
              ×
            </button>
          </div>
          {transcript}
        </div>
      )}

      {!expanded && (
        <form className="archive-agent__dock" onSubmit={onSubmit}>
          <span className="archive-agent__scanline" aria-hidden="true" />
          <span className="archive-agent__frame-top" aria-hidden="true">
            <span className="archive-agent__frame-corner">┌─</span>
            <span className="archive-agent__frame-label">ARCHIVE::STDIN</span>
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
              size={1}
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
            <button
              type="button"
              className="archive-agent__dock-clear"
              onClick={() => setExpanded(true)}
              aria-label={locale === "es" ? "expandir" : "expand"}
              title={locale === "es" ? "expandir (hilos)" : "expand (threads)"}
            >
              ⛶
            </button>
          </div>
          <span className="archive-agent__frame-bottom" aria-hidden="true">
            <span className="archive-agent__frame-corner">└─</span>
            <span className="archive-agent__frame-dash" />
            <span className="archive-agent__frame-corner">─┘</span>
          </span>
        </form>
      )}
    </div>
  );
}
