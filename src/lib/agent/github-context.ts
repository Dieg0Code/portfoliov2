const GH_USER = "Dieg0Code";
const TTL_MS = 60 * 60 * 1000;
const REPO_LANG_LIMIT = 12;
const TOP_REPO_LIMIT = 8;
const EVENT_LIMIT = 12;

type Repo = {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
  updated_at: string;
  fork: boolean;
  archived: boolean;
  size: number;
};

type Event = {
  type: string;
  repo: { name: string };
  created_at: string;
  payload: {
    commits?: Array<{ message: string }>;
    ref?: string;
    ref_type?: string;
    action?: string;
    pull_request?: { title: string; merged?: boolean };
    release?: { name: string | null; tag_name: string };
  };
};

export type GitHubContext = {
  profile: {
    name: string | null;
    bio: string | null;
    publicRepos: number;
    followers: number;
    createdAt: string;
  };
  languages: Array<{ name: string; pct: number }>;
  topRepos: Array<{
    name: string;
    description: string | null;
    language: string | null;
    stars: number;
    pushedAt: string;
  }>;
  recentEvents: Array<{ kind: string; repo: string; at: string; detail?: string }>;
  generatedAt: string;
};

let cache: { data: GitHubContext; at: number } | null = null;
let inflight: Promise<GitHubContext | null> | null = null;
const FETCH_TIMEOUT_MS = 4500;

export function getGitHubContext(): GitHubContext | null {
  const fresh = cache && Date.now() - cache.at < TTL_MS;
  if (!fresh && !inflight) {
    inflight = refresh().finally(() => {
      inflight = null;
    });
  }
  return cache?.data ?? null;
}

async function refresh(): Promise<GitHubContext | null> {
  try {
    const data = await fetchAll();
    cache = { data, at: Date.now() };
    return data;
  } catch (err) {
    console.warn("[github-context] refresh failed:", err);
    return cache?.data ?? null;
  }
}

async function gh<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "portfolio-agent",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  const token = process.env.GITHUB_MODELS_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.github.com${path}`, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`gh ${path} ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAll(): Promise<GitHubContext> {
  const [profile, repos, events] = await Promise.all([
    gh<{
      name: string | null;
      bio: string | null;
      public_repos: number;
      followers: number;
      created_at: string;
    }>(`/users/${GH_USER}`),
    gh<Repo[]>(`/users/${GH_USER}/repos?sort=pushed&per_page=60&type=owner`),
    gh<Event[]>(`/users/${GH_USER}/events/public?per_page=40`)
  ]);

  const liveRepos = repos.filter((r) => !r.fork && !r.archived);

  const langTargets = liveRepos
    .slice()
    .sort((a, b) => b.stargazers_count - a.stargazers_count || b.size - a.size)
    .slice(0, REPO_LANG_LIMIT);

  const langTotals = new Map<string, number>();
  await Promise.all(
    langTargets.map(async (r) => {
      try {
        const langs = await gh<Record<string, number>>(`/repos/${GH_USER}/${r.name}/languages`);
        for (const [name, bytes] of Object.entries(langs)) {
          langTotals.set(name, (langTotals.get(name) ?? 0) + bytes);
        }
      } catch {
        /* ignore single-repo failure */
      }
    })
  );

  const totalBytes = Array.from(langTotals.values()).reduce((a, b) => a + b, 0) || 1;
  const languages = Array.from(langTotals.entries())
    .map(([name, bytes]) => ({ name, pct: Math.round((bytes / totalBytes) * 100) }))
    .filter((l) => l.pct >= 1)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);

  const topRepos = liveRepos
    .slice()
    .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
    .slice(0, TOP_REPO_LIMIT)
    .map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      pushedAt: r.pushed_at
    }));

  const recentEvents = events
    .map((e) => formatEvent(e))
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .slice(0, EVENT_LIMIT);

  return {
    profile: {
      name: profile.name,
      bio: profile.bio,
      publicRepos: profile.public_repos,
      followers: profile.followers,
      createdAt: profile.created_at
    },
    languages,
    topRepos,
    recentEvents,
    generatedAt: new Date().toISOString()
  };
}

function formatEvent(e: Event): { kind: string; repo: string; at: string; detail?: string } | null {
  const repo = e.repo.name.replace(`${GH_USER}/`, "");
  switch (e.type) {
    case "PushEvent": {
      const n = e.payload.commits?.length ?? 0;
      const branch = e.payload.ref?.replace("refs/heads/", "");
      const last = e.payload.commits?.[e.payload.commits.length - 1]?.message?.split("\n")[0];
      return {
        kind: "push",
        repo,
        at: e.created_at,
        detail: `${n} commit${n === 1 ? "" : "s"}${branch ? ` → ${branch}` : ""}${last ? ` · "${truncate(last, 60)}"` : ""}`
      };
    }
    case "CreateEvent":
      return {
        kind: "create",
        repo,
        at: e.created_at,
        detail: `${e.payload.ref_type}${e.payload.ref ? ` ${e.payload.ref}` : ""}`
      };
    case "PullRequestEvent":
      return {
        kind: e.payload.pull_request?.merged ? "pr-merged" : `pr-${e.payload.action ?? "x"}`,
        repo,
        at: e.created_at,
        detail: e.payload.pull_request?.title
      };
    case "ReleaseEvent":
      return {
        kind: "release",
        repo,
        at: e.created_at,
        detail: e.payload.release?.tag_name ?? e.payload.release?.name ?? undefined
      };
    case "IssuesEvent":
      return { kind: `issue-${e.payload.action ?? "x"}`, repo, at: e.created_at };
    case "WatchEvent":
      return null;
    default:
      return null;
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

export function formatGitHubBlock(ctx: GitHubContext): string {
  const created = ctx.profile.createdAt.slice(0, 10);
  const langLine = ctx.languages.map((l) => `${l.name} ${l.pct}%`).join(" · ");
  const repoLines = ctx.topRepos
    .map((r) => {
      const ago = relativeAgo(r.pushedAt);
      const lang = r.language ? ` [${r.language}]` : "";
      const desc = r.description ? ` — ${truncate(r.description, 90)}` : "";
      return `  - ${r.name}${lang} · push ${ago}${desc}`;
    })
    .join("\n");
  const eventLines = ctx.recentEvents
    .map((e) => `  - ${e.kind} @ ${e.repo} · ${relativeAgo(e.at)}${e.detail ? ` · ${e.detail}` : ""}`)
    .join("\n");

  return `## Perspectiva GitHub (cache 1h · generado ${ctx.generatedAt.slice(0, 16).replace("T", " ")}Z)

Cuenta activa desde ${created}. ${ctx.profile.publicRepos} repos públicos · ${ctx.profile.followers} followers.${ctx.profile.bio ? `\nBio: "${ctx.profile.bio}"` : ""}

Lenguajes (bytes agregados sobre repos top):
  ${langLine || "(sin datos)"}

Repos con push más reciente:
${repoLines || "  (sin datos)"}

Eventos públicos recientes:
${eventLines || "  (sin actividad pública reciente)"}

Lectura para Mira: esto es la huella real, no el discurso. Si te preguntan
"qué hace últimamente" o "en qué está", úsalo. Si el lenguaje top no es Go,
no inventes — refleja lo que indique la data. La info ya viene resumida;
no la cites cruda, conviértela a prosa cuando la uses.`;
}

function relativeAgo(iso: string): string {
  const diffMs = Date.now() - Date.parse(iso);
  const min = Math.round(diffMs / 60000);
  if (min < 60) return `hace ${min}m`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.round(h / 24);
  if (d < 14) return `hace ${d}d`;
  const w = Math.round(d / 7);
  if (w < 8) return `hace ${w}sem`;
  const mo = Math.round(d / 30);
  return `hace ${mo}mes`;
}
