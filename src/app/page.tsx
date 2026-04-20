import { HomePage } from "@/components/home/home-page";
import { loadSelectedMicrographics } from "@/lib/micrographics/selected-assets";
import { loadGithubPulse } from "@/lib/github/pulse";
import { loadGithubStats } from "@/lib/github/stats";
import { getAllPostMeta } from "@/lib/blog/posts";

export default async function Page() {
  const assets = loadSelectedMicrographics();
  const [pulseEs, pulseEn, stats, posts] = await Promise.all([
    loadGithubPulse("es"),
    loadGithubPulse("en"),
    loadGithubStats(),
    getAllPostMeta()
  ]);
  const latestPost = posts[0] ?? null;

  return (
    <HomePage
      assets={assets}
      pulse={{ es: pulseEs, en: pulseEn }}
      stats={stats}
      latestPost={latestPost}
    />
  );
}
