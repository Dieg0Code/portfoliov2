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
};

const STORAGE_KEY = "archive-agent-threads-v1";
const ACTIVE_KEY = "archive-agent-active-v1";

const SCRAMBLE_GLYPHS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#@%=+/<>[]";
function randomGlyph() {
  return SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)] ?? "#";
}

function ScrambleReveal({ text, onDone }: { text: string; onDone?: () => void }) {
  const [revealed, setRevealed] = useState(0);
  const [tick, setTick] = useState(0);
  const rafRef = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(text.length);
      onDoneRef.current?.();
      return;
    }
    // target ~1.6s reveal regardless of length, capped at 2.4s for very long
    const totalFrames = Math.min(144, Math.max(48, Math.round(text.length * 0.9)));
    const charsPerFrame = Math.max(1, Math.ceil(text.length / totalFrames));
    let cur = 0;
    const step = () => {
      cur = Math.min(text.length, cur + charsPerFrame);
      setRevealed(cur);
      setTick((n) => (n + 1) & 0xff);
      if (cur < text.length) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        onDoneRef.current?.();
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [text]);

  // Render the FULL text from frame 0: revealed prefix as real chars,
  // unrevealed suffix as random glyphs, but preserve whitespace so the
  // wrapped layout matches the final paragraph exactly (no reflow).
  void tick; // ensure re-render refreshes glyphs
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (i < revealed) {
      out += ch;
    } else if (ch === " " || ch === "\n" || ch === "\t") {
      out += ch;
    } else {
      out += randomGlyph();
    }
  }
  return <>{out}</>;
}

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

  const chat = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent" }),
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
      ? { ...t, messages: [], title: locale === "es" ? "nueva conversación" : "new conversation", updatedAt: Date.now() }
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
        const tools = extractToolLabels((m as { parts?: unknown }).parts);
        const isUser = m.role === "user";
        const isFresh = !isUser && m.id === freshIdRef.current && !revealedIds.has(m.id);
        const isStillStreaming = isFresh && (status === "streaming" || status === "submitted");
        const shouldReveal = isFresh && !isStillStreaming;
        return (
          <div key={m.id} className="archive-agent__turn" data-role={m.role}>
            <span className="archive-agent__glyph">{isUser ? "◇" : "◆"}</span>
            <div className="archive-agent__body">
              {tools.map((label, i) => {
                const m = label.match(/^([^(]+)(?:\((.*)\))?$/);
                const name = m?.[1] ?? label;
                const arg = m?.[2];
                return (
                  <div key={`t-${i}`} className="archive-agent__tool">
                    <span className="archive-agent__tool-glyph">▸</span>
                    <span className="archive-agent__tool-name">{name}</span>
                    {arg && (
                      <>
                        <span className="archive-agent__tool-paren">(</span>
                        <span className="archive-agent__tool-arg">{arg}</span>
                        <span className="archive-agent__tool-paren">)</span>
                      </>
                    )}
                  </div>
                );
              })}
              {isStillStreaming && (
                <AgentThinking locale={locale} />
              )}
              {text && !isStillStreaming && (
                isUser ? (
                  <div className="archive-agent__text">{text}</div>
                ) : shouldReveal ? (
                  <div className="archive-agent__text" data-revealing="true">
                    <ScrambleReveal
                      text={text}
                      onDone={() => {
                        setRevealedIds((prev) => {
                          if (prev.has(m.id)) return prev;
                          const next = new Set(prev);
                          next.add(m.id);
                          return next;
                        });
                        if (freshIdRef.current === m.id) freshIdRef.current = null;
                      }}
                    />
                  </div>
                ) : (
                  <div className="archive-agent__text archive-agent__text--md">
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
      {(status === "submitted" || status === "streaming") && (
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
