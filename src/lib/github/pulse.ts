export type PulseItem = { date: string; project: string; note: string };

type GithubEvent = {
  type: string;
  created_at: string;
  repo: { name: string };
  payload: {
    ref?: string;
    ref_type?: string;
    action?: string;
    size?: number;
    commits?: unknown[];
    pull_request?: { title?: string; merged?: boolean };
    release?: { tag_name?: string; name?: string };
  };
};

const GITHUB_USER = "Dieg0Code";
const EVENTS_URL = `https://api.github.com/users/${GITHUB_USER}/events/public?per_page=30`;

type Locale = "es" | "en";

function shortRef(ref: string | undefined): string {
  if (!ref) return "";
  return ref.replace(/^refs\/heads\//, "").replace(/^refs\/tags\//, "");
}

function buildNote(event: GithubEvent, locale: Locale): string | null {
  const es = locale === "es";

  switch (event.type) {
    case "PushEvent": {
      const count =
        (event.payload.commits?.length ?? event.payload.size ?? 1) as number;
      const branch = shortRef(event.payload.ref);
      const word = count === 1 ? "commit" : "commits";
      return es
        ? `${count} ${word}${branch ? ` a ${branch}` : ""}`
        : `${count} ${word}${branch ? ` to ${branch}` : ""}`;
    }
    case "PullRequestEvent": {
      const title = event.payload.pull_request?.title ?? "";
      const merged = event.payload.pull_request?.merged === true;
      if (event.payload.action === "opened") {
        return es ? `PR abierto: ${title}` : `PR opened: ${title}`;
      }
      if (event.payload.action === "closed" && merged) {
        return es ? `PR mergeado: ${title}` : `PR merged: ${title}`;
      }
      return null;
    }
    case "CreateEvent": {
      const refType = event.payload.ref_type;
      const ref = shortRef(event.payload.ref);
      if (refType === "branch") {
        return es ? `nueva rama ${ref}` : `new branch ${ref}`;
      }
      if (refType === "tag") {
        return es ? `nuevo tag ${ref}` : `new tag ${ref}`;
      }
      if (refType === "repository") {
        return es ? `nuevo repositorio` : `new repository`;
      }
      return null;
    }
    case "ReleaseEvent": {
      const tag =
        event.payload.release?.tag_name ?? event.payload.release?.name ?? "";
      return es ? `release ${tag}` : `release ${tag}`;
    }
    default:
      return null;
  }
}

function formatDate(iso: string): string {
  return iso.slice(0, 7);
}

function projectFromRepo(repoName: string): string {
  const slash = repoName.indexOf("/");
  return slash >= 0 ? repoName.slice(slash + 1) : repoName;
}

export async function loadGithubPulse(
  locale: Locale,
  limit = 4
): Promise<PulseItem[] | null> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(EVENTS_URL, {
      headers,
      next: { revalidate: 3600 }
    });
    if (!res.ok) return null;
    const events = (await res.json()) as GithubEvent[];
    if (!Array.isArray(events) || events.length === 0) return null;

    type Draft = {
      date: string;
      project: string;
      type: string;
      branch: string;
      count: number;
      note: string;
      sortKey: string;
    };

    const drafts: Draft[] = [];
    const pushBucket = new Map<string, Draft>();

    for (const ev of events) {
      const project = projectFromRepo(ev.repo.name);
      const date = formatDate(ev.created_at);
      const sortKey = ev.created_at;

      if (ev.type === "PushEvent") {
        const branch = shortRef(ev.payload.ref);
        const key = `${date}|${project}|${branch}`;
        const count = (ev.payload.commits?.length ??
          ev.payload.size ??
          1) as number;
        const existing = pushBucket.get(key);
        if (existing) {
          existing.count += count;
          if (sortKey > existing.sortKey) existing.sortKey = sortKey;
        } else {
          const draft: Draft = {
            date,
            project,
            type: "push",
            branch,
            count,
            note: "",
            sortKey
          };
          pushBucket.set(key, draft);
          drafts.push(draft);
        }
        continue;
      }

      const note = buildNote(ev, locale);
      if (!note) continue;
      drafts.push({
        date,
        project,
        type: ev.type,
        branch: "",
        count: 1,
        note,
        sortKey
      });
    }

    for (const d of drafts) {
      if (d.type === "push") {
        const word = d.count === 1 ? "commit" : "commits";
        d.note =
          locale === "es"
            ? `${d.count} ${word}${d.branch ? ` a ${d.branch}` : ""}`
            : `${d.count} ${word}${d.branch ? ` to ${d.branch}` : ""}`;
      }
    }

    drafts.sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));

    const items: PulseItem[] = drafts
      .slice(0, limit)
      .map(({ date, project, note }) => ({ date, project, note }));

    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}
