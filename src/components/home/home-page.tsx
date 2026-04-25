"use client";

import { Fragment, startTransition, useEffect, useRef, useState, type ReactNode } from "react";
import { ConcentricArcRadarScale } from "@/components/micrographics/ConcentricArcRadarScale";
import { DigitalOutputChannelPanel } from "@/components/micrographics/DigitalOutputChannelPanel";
import { EpochTransformVerificationPanel } from "@/components/micrographics/EpochTransformVerificationPanel";
import { GlobeGridBadge } from "@/components/micrographics/GlobeGridBadge";
import { AsciiDivider } from "@/components/home/ascii-divider";
import { RestartBandwidthProgressDial } from "@/components/micrographics/RestartBandwidthProgressDial";
import { TimeEngineSyncBanner } from "@/components/micrographics/TimeEngineSyncBanner";
import {
  githubProfile,
  homeContent,
  type HomeLocale
} from "@/components/home/content";
import { ExperimentalHero } from "@/components/home/experimental-hero";
import {
  ArchiveGlyph,
  type ArchiveGlyphName
} from "@/components/home/archive-glyph";
import { DataHeader } from "@/components/home/data-header";
import { FlowLayer } from "@/components/home/flow-layer";
import { MotionLink } from "@/components/home/motion-link";
import { MotionReveal } from "@/components/home/motion-reveal";
import { ScrambleText } from "@/components/home/scramble-text";
import { ContactEmailLink } from "@/components/shared/contact-email-link";
import { BreathingMarker, PulseDot, SignalTicker } from "@/components/home/ascii-motion";
import { ScrollProgressRail } from "@/components/home/scroll-progress-rail";
import { ArchiveAgent } from "@/components/home/archive-agent";
import type { SelectedMicrographicMarkup } from "@/lib/micrographics/selected-assets";
import type { PulseItem } from "@/lib/github/pulse";
import { extractRepoName, type GithubStats, type RepoStats } from "@/lib/github/stats";
import type { PostMeta } from "@/lib/blog/types";

type HomePageProps = {
  assets: SelectedMicrographicMarkup;
  pulse?: { es: PulseItem[] | null; en: PulseItem[] | null };
  stats?: GithubStats | null;
  latestPost?: PostMeta | null;
};

function formatRelativeDate(iso: string, locale: HomeLocale): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return locale === "es" ? "hoy" : "today";
  if (days === 1) return locale === "es" ? "ayer" : "yesterday";
  if (days < 30) return locale === "es" ? `hace ${days} días` : `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12)
    return locale === "es"
      ? `hace ${months} ${months === 1 ? "mes" : "meses"}`
      : `${months} ${months === 1 ? "month" : "months"} ago`;
  const years = Math.floor(days / 365);
  return locale === "es"
    ? `hace ${years} ${years === 1 ? "año" : "años"}`
    : `${years} ${years === 1 ? "year" : "years"} ago`;
}

function LiveMeta({
  stats,
  locale
}: {
  stats: RepoStats;
  locale: HomeLocale;
}) {
  return (
    <p className="project-card__live-meta micro-note">
      <BreathingMarker className="project-card__live-marker" intervalMs={880} />
      {` ★ ${stats.stars}`}
      {stats.forks > 0 ? ` · ⑂ ${stats.forks}` : ""}
      {` · ${formatRelativeDate(stats.pushedAt, locale)}`}
    </p>
  );
}

type HomeSectionId = "top" | "work" | "notes" | "contact";

const sectionToneMap: Record<HomeSectionId, "light" | "dark"> = {
  top: "light",
  work: "light",
  notes: "light",
  contact: "dark"
};

function joinClassNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

function renderSummary(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function resolveProjectGlyph(kicker: string): ArchiveGlyphName {
  const k = kicker.toLowerCase();
  if (k.includes("ml") || k.includes("investigación") || k.includes("research") || k.includes("nlp")) return "systems";
  if (k.includes("agent")) return "agents";
  if (k.includes("mobile") || k.includes("móvil")) return "mobile";
  if (k.includes("docencia") || k.includes("teaching")) return "teaching";
  if (k.includes("sdk") || k.includes("tooling") || k.includes("devsecops")) return "delivery";
  if (k.includes("serverless") || k.includes("rag")) return "communication";
  if (k.includes("producto") || k.includes("product")) return "process";
  return "software";
}

function renderCompactMicrographic(
  index: number,
  assets: SelectedMicrographicMarkup
) {
  const shellStyle = { bottom: "0.75rem", right: "0.5rem", transform: "scale(0.65)" };
  if (index % 2 === 0) {
    return (
      <div className="project-card__graphic-shell" style={shellStyle}>
        <div className="project-card__graphic-hover">
          <DigitalOutputChannelPanel
            assets={assets}
            className="project-card__graphic project-card__graphic--rail"
          />
        </div>
      </div>
    );
  }
  return (
    <div className="project-card__graphic-shell" style={shellStyle}>
      <div className="project-card__graphic-hover">
        <RestartBandwidthProgressDial
          assets={assets}
          className="project-card__graphic project-card__graphic--dial"
        />
      </div>
    </div>
  );
}

export function HomePage({ assets, pulse, stats, latestPost }: HomePageProps) {
  const shellRef = useRef<HTMLElement | null>(null);
  const [locale, setLocale] = useState<HomeLocale>("es");
  const [activeSection, setActiveSection] = useState<HomeSectionId>("top");
  const [scrolled, setScrolled] = useState(false);
  const content = homeContent[locale];
  const pulseItems = pulse?.[locale] ?? [];

  const heroContent = stats
    ? {
        ...content.hero,
        stats: content.hero.stats.map((stat, index) =>
          index === 0
            ? { ...stat, note: `${stats.totalRepos} repos · ★ ${stats.totalStars}` }
            : stat
        )
      }
    : content.hero;
  const activeTone = sectionToneMap[activeSection];

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    const cards = document.querySelectorAll<HTMLElement>(".project-card");
    if (!cards.length) return;
    const timeouts = new Set<number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.dataset.bloomed = "true";
          const id = window.setTimeout(() => {
            delete el.dataset.bloomed;
          }, 1500);
          timeouts.add(id);
          io.unobserve(el);
        }
      },
      { threshold: 0.35 }
    );
    cards.forEach((c) => io.observe(c));
    return () => {
      io.disconnect();
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    const shell = shellRef.current;

    if (!shell || typeof window === "undefined") {
      return;
    }

    const sections = Array.from(
      shell.querySelectorAll<HTMLElement>("[data-scroll-section]")
    );

    let frame = 0;

    const update = () => {
      frame = 0;
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
      const focusLine = Math.min(viewportHeight * 0.4, 320);
      let nextActive: HomeSectionId = "top";
      let bestDistance = Number.POSITIVE_INFINITY;
      const sectionStates: Array<{
        id: HomeSectionId;
        section: HTMLElement;
      }> = [];

      sections.forEach((section) => {
        const id = section.dataset.scrollSection as HomeSectionId | undefined;

        if (!id) {
          return;
        }

        const rect = section.getBoundingClientRect();
        const anchor = rect.top + Math.min(rect.height * 0.28, 180);
        const distance = Math.abs(anchor - focusLine);
        const isCandidate =
          rect.bottom >= focusLine * 0.28 && rect.top <= viewportHeight * 0.82;

        sectionStates.push({
          id,
          section
        });

        if (isCandidate && distance < bestDistance) {
          bestDistance = distance;
          nextActive = id;
        }
      });

      sectionStates.forEach(({ id, section }) => {
        const nextState = id === nextActive ? "active" : "idle";

        if (section.dataset.sectionState !== nextState) {
          section.dataset.sectionState = nextState;
        }
      });

      setActiveSection((current) =>
        current === nextActive ? current : nextActive
      );

      const isScrolled = window.scrollY > 16;
      setScrolled((current) =>
        current === isScrolled ? current : isScrolled
      );
    };

    const schedule = () => {
      if (frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const navItems = [
    { id: "work", label: content.nav.work },
    { id: "notes", label: content.nav.notes },
    { id: "contact", label: content.nav.contact }
  ] as const;

  return (
    <main
      ref={shellRef}
      className="shell shell--home"
      data-active-section={activeSection}
      data-active-tone={activeTone}
      data-scrolled={scrolled ? "true" : "false"}
    >
      <span className="page-corner page-corner--tl" aria-hidden>
        ┌ DO · 2026
      </span>
      <span className="page-corner page-corner--tr" aria-hidden>
        REV 03 ┐
      </span>
      <span className="page-corner page-corner--bl" aria-hidden>
        └ CH-04
      </span>
      <span className="page-corner page-corner--br" aria-hidden>
        TZ UTC-4 ┘
      </span>
      <ScrollProgressRail />

      <header className="section section--tight home-header">
        <MotionReveal as="div" className="home-topbar" delay={30} variant="rise">
          <a className="home-topbar__brand" href="#top" aria-label={content.brand.name}>
            <GlobeGridBadge assets={assets} className="home-topbar__badge" />
            <strong className="home-topbar__name">{content.brand.name}</strong>
          </a>

          <div className="home-topbar__nav">
            {navItems.map((item) => (
              <a
                key={item.id}
                aria-current={activeSection === item.id ? "page" : undefined}
                className={joinClassNames(
                  "ghost-link",
                  activeSection === item.id && "is-active"
                )}
                href={`#${item.id}`}
              >
                {item.label}
              </a>
            ))}

            <div className="locale-toggle" role="group" aria-label="Locale">
              {(["es", "en"] as const).map((nextLocale) => (
                <button
                  key={nextLocale}
                  type="button"
                  className={joinClassNames(
                    "locale-toggle__button",
                    locale === nextLocale && "is-active"
                  )}
                  aria-pressed={locale === nextLocale}
                  onClick={() => {
                    startTransition(() => {
                      setLocale(nextLocale);
                    });
                  }}
                >
                  {nextLocale.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </MotionReveal>
      </header>

      <ExperimentalHero
        assets={assets}
        content={heroContent}
        locale={locale}
        mergedPrs={stats?.mergedPrs ?? null}
      />

      <section
        className="section home-section home-section--work"
        data-scroll-section="work"
        data-section-tone="light"
        id="work"
      >
        <FlowLayer
          as="div"
          className="home-section__panel ambient-panel ambient-panel--light"
          x={8}
          y={12}
          rotate={0.4}
        >
          <AsciiDivider marker="§ 01" className="ascii-divider--section" />

          <MotionReveal as="div" className="section__heading" variant="rise">
            <ScrambleText
              as="p"
              className="eyebrow"
              text={content.work.eyebrow}
              trigger="hover"
              hoverDuration={260}
            />
            <h2>{content.work.title}</h2>
            <div className="section__deck">
              <p className="section-copy">{content.work.copy}</p>
              <DataHeader
                className="section__meta"
                location="/WORK/01"
                status="ACTIVE"
                stamp="2026.04.05"
              />
              <MotionReveal
                as="div"
                className="section__microcluster section__microcluster--work micrographic-scan-shell"
                delay={100}
                variant="slide-right"
              >
                <EpochTransformVerificationPanel
                  assets={assets}
                  className="section__micro section__micro--panel micrographic-idle-signal"
                />
                <TimeEngineSyncBanner
                  assets={assets}
                  className="section__micro section__micro--banner micrographic-idle-signal"
                />
              </MotionReveal>
            </div>
          </MotionReveal>

          <div className="project-grid">
            {content.work.projects.map((project, index) => {
              const isHero = project.bentoSize === "hero";
              const hasGallery = Boolean(project.imageGallery?.length);
              const hasImage = Boolean(project.imageSrc) || hasGallery;
              const isCompact = project.bentoSize === "compact";
              const repoName = extractRepoName(project.href);
              const repoStats = repoName
                ? stats?.repos[repoName.toLowerCase()]
                : undefined;

              return (
                <MotionReveal
                  as="article"
                  key={project.title}
                  className={joinClassNames(
                    "project-card",
                    `project-card--bento-${project.bentoSize}`,
                    hasImage && "project-card--has-image",
                    hasGallery && "project-card--has-gallery",
                    project.isLogo && "project-card--has-logo",
                    project.isExperiment && "project-card--experiment"
                  )}
                  delay={60 + index * 55}
                  hoverEffect="lift-md"
                  variant={isHero ? "rise" : index % 2 === 0 ? "slide-left" : "slide-right"}
                >
                  {/* ── HERO: split layout con imagen ── */}
                  {isHero && (
                    <>
                      <div className="project-card__content-side">
                        <div className="project-card__topline">
                          <span className="project-card__glyph">
                            <ArchiveGlyph name={resolveProjectGlyph(project.kicker)} />
                          </span>
                          <div className="project-card__meta">
                            <ScrambleText
                              as="span"
                              className="project-card__index"
                              text={`0${index + 1}`}
                              trigger="mount"
                              mountDuration={620 + index * 70}
                            />
                            <ScrambleText
                              as="p"
                              className="eyebrow project-card__kicker"
                              text={project.kicker}
                              trigger="hover"
                              hoverDuration={300}
                            />
                          </div>
                        </div>
                        <div className="project-card__body">
                          <h3>{project.title}</h3>
                          <p>{renderSummary(project.summary)}</p>
                          {repoStats && <LiveMeta stats={repoStats} locale={locale} />}
                        </div>
                        <div className="tag-list" aria-label={`${project.title} tags`}>
                          {project.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                        {project.modules && project.modules.length > 0 && (
                          <ul className="project-card__modules" aria-label={`${project.title} modules`}>
                            {project.modules.map((mod) => (
                              <li key={mod.code}>
                                <a href={mod.href} rel="noreferrer" target="_blank">
                                  <span className="project-card__module-code">{mod.code}</span>
                                  <span className="project-card__module-title">{mod.title}</span>
                                  <span className="project-card__module-arrow" aria-hidden>↗</span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                        <MotionLink
                          className="button button--secondary"
                          emphasis="secondary"
                          href={project.href}
                          rel="noreferrer"
                          target="_blank"
                          style={{ width: "fit-content" }}
                        >
                          {project.hrefLabel}
                        </MotionLink>
                      </div>
                      <div className="project-card__image-side">
                        <img
                          src={project.imageSrc}
                          alt={project.imageAlt ?? project.title}
                          loading="eager"
                        />
                      </div>
                    </>
                  )}

                  {/* ── CON IMAGEN: cover strip arriba ── */}
                  {!isHero && hasImage && (
                    <>
                      <div className="project-card__cover-strip">
                        {hasGallery ? (
                          <div className="project-card__gallery" aria-hidden={false}>
                            {project.imageGallery!.map((shot) => (
                              <div className="project-card__gallery-item" key={shot.src}>
                                <img src={shot.src} alt={shot.alt} loading="lazy" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <img
                            src={project.imageSrc}
                            alt={project.imageAlt ?? project.title}
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="project-card__body-padded">
                        <div className="project-card__topline">
                          <span className="project-card__glyph">
                            <ArchiveGlyph name={resolveProjectGlyph(project.kicker)} />
                          </span>
                          <div className="project-card__meta">
                            <ScrambleText
                              as="span"
                              className="project-card__index"
                              text={`0${index + 1}`}
                              trigger="mount"
                              mountDuration={620 + index * 70}
                            />
                            <ScrambleText
                              as="p"
                              className="eyebrow project-card__kicker"
                              text={project.kicker}
                              trigger="hover"
                              hoverDuration={300}
                            />
                          </div>
                        </div>
                        <div className="project-card__body">
                          <h3>{project.title}</h3>
                          <p>{renderSummary(project.summary)}</p>
                          {repoStats && <LiveMeta stats={repoStats} locale={locale} />}
                        </div>
                        <div className="tag-list" aria-label={`${project.title} tags`}>
                          {project.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                        <MotionLink
                          className="button button--secondary"
                          emphasis="secondary"
                          href={project.href}
                          rel="noreferrer"
                          target="_blank"
                          style={{ width: "100%", justifyContent: "center" }}
                        >
                          {project.hrefLabel}
                        </MotionLink>
                      </div>
                    </>
                  )}

                  {/* ── SIN IMAGEN: layout estándar ── */}
                  {!isHero && !hasImage && (
                    <>
                      <div className="project-card__topline">
                        <span className="project-card__glyph">
                          <ArchiveGlyph name={resolveProjectGlyph(project.kicker)} />
                        </span>
                        <div className="project-card__meta">
                          <ScrambleText
                              as="span"
                              className="project-card__index"
                              text={`0${index + 1}`}
                              trigger="mount"
                              mountDuration={620 + index * 70}
                            />
                          <ScrambleText
                            as="p"
                            className="eyebrow project-card__kicker"
                            text={project.kicker}
                            trigger="hover"
                            hoverDuration={300}
                          />
                        </div>
                      </div>

                      {project.isExperiment && (
                        <span className="project-card__experiment-badge">
                          <BreathingMarker
                            className="project-card__experiment-marker"
                            intervalMs={820}
                          />
                          {" experimento"}
                        </span>
                      )}

                      <div className="project-card__body">
                        <h3>{project.title}</h3>
                        <p>{renderSummary(project.summary)}</p>
                        {repoStats && <LiveMeta stats={repoStats} locale={locale} />}
                      </div>

                      <div className="tag-list" aria-label={`${project.title} tags`}>
                        {project.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>

                      {project.modules && project.modules.length > 0 && (
                        <ul className="project-card__modules" aria-label={`${project.title} modules`}>
                          {project.modules.map((mod) => (
                            <li key={mod.code}>
                              <a href={mod.href} rel="noreferrer" target="_blank">
                                <span className="project-card__module-code">{mod.code}</span>
                                <span className="project-card__module-title">{mod.title}</span>
                                <span className="project-card__module-arrow" aria-hidden>↗</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div style={{ marginTop: "auto" }}>
                        <MotionLink
                          className="button button--secondary"
                          emphasis="secondary"
                          href={project.href}
                          rel="noreferrer"
                          target="_blank"
                          style={{ width: "100%", justifyContent: "center" }}
                        >
                          {project.hrefLabel}
                        </MotionLink>
                      </div>

                      {isCompact && renderCompactMicrographic(index, assets)}
                    </>
                  )}
                </MotionReveal>
              );
            })}
          </div>
        </FlowLayer>
      </section>

      <section
        className="section home-section home-section--notes"
        data-scroll-section="notes"
        data-section-tone="light"
        id="notes"
      >
        <FlowLayer
          as="div"
          className="home-section__panel ambient-panel ambient-panel--light"
          x={-7}
          y={10}
          rotate={-0.35}
        >
          <AsciiDivider marker="§ 02" className="ascii-divider--section" />

          <MotionReveal as="div" className="section__heading" variant="rise">
            <ScrambleText
              as="p"
              className="eyebrow"
              text={content.blog.eyebrow}
              trigger="hover"
              hoverDuration={260}
            />
            <h2>{content.blog.title}</h2>
            <div className="section__deck">
              <p className="section-copy">{content.blog.copy}</p>
              <DataHeader
                className="section__meta"
                location="/NOTES/02"
                status="INDEXED"
                stamp="2026.04.19"
              />
            </div>
          </MotionReveal>

          <div className="blog-bento">
            <MotionReveal
              as="article"
              className="blog-bento__card blog-bento__card--hero"
              delay={60}
              hoverEffect="lift-md"
              variant="slide-left"
            >
              {latestPost ? (
                <a
                  className="blog-bento__hero-link"
                  href={`/blog/${latestPost.slug}`}
                >
                  <div className="blog-bento__hero-topline">
                    <span className="eyebrow blog-bento__hero-kicker">
                      {content.blog.latestKicker}
                    </span>
                    <span className="blog-bento__index">01</span>
                  </div>
                  <h3 className="blog-bento__hero-title">{latestPost.title}</h3>
                  <p className="blog-bento__excerpt">{latestPost.excerpt}</p>
                  <div className="blog-bento__meta">
                    <time dateTime={latestPost.date}>
                      {formatRelativeDate(latestPost.date, locale)}
                    </time>
                    <span aria-hidden>·</span>
                    <span>{`${latestPost.readingMinutes} ${content.blog.latestReadLabel}`}</span>
                  </div>
                  {latestPost.tags.length > 0 && (
                    <div className="tag-list" aria-label="tags">
                      {latestPost.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  )}
                  <span className="blog-bento__arrow" aria-hidden>
                    ↗
                  </span>
                </a>
              ) : (
                <div className="blog-bento__hero-empty">
                  <p className="eyebrow">{content.blog.latestKicker}</p>
                  <p className="blog-bento__excerpt">{content.blog.pulse.emptyLabel}</p>
                </div>
              )}
            </MotionReveal>

            <MotionReveal
              as="aside"
              className="blog-bento__card blog-bento__card--pulse"
              delay={260}
              hoverEffect="lift-sm"
              variant="rise"
            >
              <header className="blog-bento__pulse-head">
                <span className="eyebrow">{content.blog.pulse.kicker}</span>
                <h4 className="blog-bento__pulse-title">
                  {content.blog.pulse.title}
                </h4>
              </header>
              {pulseItems.length > 0 ? (
                <ul className="blog-bento__pulse-list">
                  {pulseItems.slice(0, 3).map((item, itemIndex) => (
                    <li key={`${item.date}-${item.project}-${itemIndex}`}>
                      <span className="blog-bento__pulse-lead">
                        <BreathingMarker
                          className="blog-bento__pulse-marker"
                          intervalMs={760 + itemIndex * 120}
                        />
                        <time className="blog-bento__pulse-date">{item.date}</time>
                      </span>
                      <span className="blog-bento__pulse-project">
                        {item.project}
                      </span>
                      <span className="blog-bento__pulse-note">{item.note}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="micro-note">{content.blog.pulse.emptyLabel}</p>
              )}
            </MotionReveal>
          </div>

          <MotionReveal
            as="div"
            className="blog-bento__cta"
            delay={300}
            variant="rise"
          >
            <MotionLink
              className="button button--secondary"
              emphasis="secondary"
              href={content.blog.ctaHref}
            >
              {content.blog.ctaLabel}
            </MotionLink>
          </MotionReveal>
        </FlowLayer>
      </section>

      <section
        className="section home-section"
        data-scroll-section="contact"
        data-section-tone="dark"
        id="contact"
      >
        <FlowLayer
          as="div"
          className="contact-panel ambient-panel ambient-panel--dark"
          x={-8}
          y={12}
          rotate={-0.4}
        >
          <span className="contact-panel__corner contact-panel__corner--tl" aria-hidden>
            ┌ A1
          </span>
          <span className="contact-panel__corner contact-panel__corner--tr" aria-hidden>
            B1 ┐
          </span>
          <span className="contact-panel__corner contact-panel__corner--bl" aria-hidden>
            └ A2
          </span>
          <span className="contact-panel__corner contact-panel__corner--br" aria-hidden>
            B2 ┘
          </span>

          <AsciiDivider marker="§ 03" className="ascii-divider--section" />

          <MotionReveal
            as="div"
            className="contact-panel__head"
            delay={40}
            variant="rise"
          >
            <ScrambleText
              as="p"
              className="eyebrow contact-panel__eyebrow"
              text={content.contact.eyebrow}
              trigger="hover"
              hoverDuration={260}
            />
            <DataHeader
              className="section__meta"
              location="/CONTACT/03"
              status="OPEN"
              stamp="2026.04.05"
            />
          </MotionReveal>

          <div className="contact-panel__grid">
            <MotionReveal
              as="aside"
              className="contact-panel__signal signal-surface signal-surface--dark"
              delay={60}
              hoverEffect="lift-sm"
              variant="slide-left"
            >
              <header className="contact-panel__signal-head">
                <span className="eyebrow contact-panel__signal-eyebrow">
                  {content.contact.signalTitle}
                </span>
                <span className="contact-panel__signal-stamp">LOG</span>
              </header>
              <ul className="contact-panel__signal-list">
                {content.contact.signals.map((entry, i) => (
                  <li key={`${entry.meta}-${entry.project}`}>
                    <BreathingMarker
                      className="contact-panel__signal-marker"
                      intervalMs={820 + i * 110}
                    />
                    <span className="contact-panel__signal-meta">[{entry.meta}]</span>
                    <span className="contact-panel__signal-kind">{entry.kind}</span>
                    <span className="contact-panel__signal-project">{entry.project}</span>
                  </li>
                ))}
              </ul>
            </MotionReveal>

            <MotionReveal
              as="div"
              className="contact-panel__main signal-surface signal-surface--dark"
              delay={90}
              hoverEffect="lift-sm"
              variant="slide-right"
            >
              <p className="contact-pill contact-pill--live">
                <PulseDot className="contact-pill__pulse" />
                {content.contact.availability}
              </p>

              <p className="contact-panel__response micro-note">
                {content.contact.responseTime}
              </p>

              <div className="contact-panel__actions" role="group" aria-label={content.contact.mailLabel}>
                <ContactEmailLink
                  className="contact-icon-action contact-icon-action--primary"
                  subject={content.contact.mailSubject}
                  aria-label={content.contact.primaryCta}
                >
                  <span className="contact-icon-action__icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter">
                      <rect x="3" y="5" width="18" height="14" />
                      <path d="M3 7l9 7 9-7" />
                    </svg>
                  </span>
                  <span className="contact-icon-action__label">{content.contact.primaryCta}</span>
                </ContactEmailLink>

                <a
                  className="contact-icon-action"
                  href={githubProfile}
                  rel="noreferrer"
                  target="_blank"
                  aria-label="GitHub"
                >
                  <span className="contact-icon-action__icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.04 1.53 1.04.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
                    </svg>
                  </span>
                  <span className="contact-icon-action__label">GitHub</span>
                </a>
              </div>

              <dl className="contact-panel__facts">
                {content.contact.facts.map((fact) => (
                  <div key={fact.label} className="contact-panel__fact">
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="contact-panel__scope" aria-hidden>
                <span className="contact-panel__scope-label">SIGNAL</span>
                <SignalTicker
                  className="contact-panel__scope-bar"
                  width={20}
                  intervalMs={140}
                />
                <span className="contact-panel__scope-stamp">LIVE</span>
                <span className="contact-panel__scope-meta">CH-04 · 128</span>
              </div>
            </MotionReveal>

          </div>
        </FlowLayer>
      </section>

      <FlowLayer
        as="footer"
        className="home-footer ambient-panel ambient-panel--light"
        x={6}
        y={8}
        rotate={0.22}
      >
        <div className="home-footer__masthead">
          <div className="home-footer__brand">
            <GlobeGridBadge assets={assets} className="home-footer__badge" />
            <div className="home-footer__brand-copy">
              <strong>{content.brand.name}</strong>
              <span className="micro-note">{content.brand.strapline}</span>
            </div>
          </div>
          <p className="home-footer__note">{content.footer.note}</p>
        </div>

        <div className="home-footer__contact">
          <p className="eyebrow">{content.contact.mailLabel}</p>
          <div className="home-footer__contact-links">
            <ContactEmailLink className="home-footer__mail">
              <span className="contact-icon-action__icon" aria-hidden style={{ marginRight: "0.4rem" }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter">
                  <rect x="3" y="5" width="18" height="14" />
                  <path d="M3 7l9 7 9-7" />
                </svg>
              </span>
              {content.contact.mailLabel}
            </ContactEmailLink>
            <MotionLink
              className="home-footer__github"
              emphasis="secondary"
              href={githubProfile}
              rel="noreferrer"
              target="_blank"
            >
              {content.footer.profileLabel}
            </MotionLink>
          </div>
        </div>

        <ul className="home-footer__list">
          {content.footer.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <FlowLayer
          as="div"
          className="home-footer__rail signal-surface signal-surface--light"
          x={10}
          y={4}
          rotate={0.18}
        >
          <div className="home-footer__bottom">
            <span>{`${content.brand.name} · © 2026`}</span>
            <SignalTicker className="home-footer__ticker" />
          </div>
        </FlowLayer>
      </FlowLayer>
      <ArchiveAgent
        locale={locale}
        onSetLocale={(next) => startTransition(() => setLocale(next))}
      />
    </main>
  );
}
