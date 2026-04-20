import Link from "next/link";
import { GlobeGridBadge } from "@/components/micrographics/GlobeGridBadge";
import { loadSelectedMicrographics } from "@/lib/micrographics/selected-assets";

type NavItem = {
  href: string;
  label: string;
};

type SiteHeaderProps = {
  strapline?: string;
  nav: NavItem[];
  current?: string;
};

export function SiteHeader({ nav, current }: SiteHeaderProps) {
  const assets = loadSelectedMicrographics();

  return (
    <header className="section section--tight site-header">
      <div className="home-topbar">
        <Link className="home-topbar__brand" href="/" aria-label="Diego Obando">
          <GlobeGridBadge assets={assets} className="home-topbar__badge" />
          <strong className="home-topbar__name">Diego Obando</strong>
        </Link>

        <div className="home-topbar__nav">
          {nav.map((item) => {
            const isCurrent = current === item.href;
            return (
              <Link
                key={item.href}
                className={`ghost-link${isCurrent ? " is-active" : ""}`}
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
