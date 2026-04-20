export type RepoStats = {
  stars: number;
  forks: number;
  pushedAt: string;
};

export type GithubStats = {
  totalRepos: number;
  totalStars: number;
  mergedPrs: number | null;
  repos: Record<string, RepoStats>;
};

type GithubRepo = {
  name: string;
  fork: boolean;
  archived: boolean;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
};

const GITHUB_USER = "Dieg0Code";
const REPOS_URL = `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`;
const MERGED_PRS_URL = `https://api.github.com/search/issues?q=${encodeURIComponent(
  `author:${GITHUB_USER} type:pr is:merged`
)}&per_page=1`;

function buildHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchRepos(): Promise<GithubRepo[] | null> {
  try {
    const res = await fetch(REPOS_URL, {
      headers: buildHeaders(),
      next: { revalidate: 3600 }
    });
    if (!res.ok) return null;
    const data = (await res.json()) as GithubRepo[];
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

async function fetchMergedPrs(): Promise<number | null> {
  try {
    const res = await fetch(MERGED_PRS_URL, {
      headers: buildHeaders(),
      next: { revalidate: 3600 }
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { total_count?: number };
    return typeof data.total_count === "number" ? data.total_count : null;
  } catch {
    return null;
  }
}

export async function loadGithubStats(): Promise<GithubStats | null> {
  const [repos, mergedPrs] = await Promise.all([
    fetchRepos(),
    fetchMergedPrs()
  ]);

  if (!repos) return null;

  const ownRepos = repos.filter((r) => !r.fork);
  const map: Record<string, RepoStats> = {};
  let totalStars = 0;

  for (const repo of ownRepos) {
    totalStars += repo.stargazers_count;
    map[repo.name.toLowerCase()] = {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      pushedAt: repo.pushed_at
    };
  }

  return {
    totalRepos: ownRepos.length,
    totalStars,
    mergedPrs,
    repos: map
  };
}

export function extractRepoName(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.hostname !== "github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    if (parts[0].toLowerCase() !== GITHUB_USER.toLowerCase()) return null;
    const name = parts[1];
    if (!name || name.includes("?")) return null;
    return name;
  } catch {
    return null;
  }
}
