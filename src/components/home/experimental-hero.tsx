"use client";

import { GlobeGridBadge } from "@/components/micrographics/GlobeGridBadge";
import { TimeEngineSyncBanner } from "@/components/micrographics/TimeEngineSyncBanner";
import {
  ArchiveGlyph,
  type ArchiveGlyphName
} from "@/components/home/archive-glyph";
import { DataHeader } from "@/components/home/data-header";
import { FlowLayer } from "@/components/home/flow-layer";
import { MotionLink } from "@/components/home/motion-link";
import { MotionReveal } from "@/components/home/motion-reveal";
import { PretextHeadline } from "@/components/home/pretext-headline";
import { ScrambleText } from "@/components/home/scramble-text";
import { StreamArrows } from "@/components/home/ascii-motion";
import type { HomeContentBundle, HomeLocale } from "@/components/home/content";
import type { SelectedMicrographicMarkup } from "@/lib/micrographics/selected-assets";

type ExperimentalHeroProps = {
  assets: SelectedMicrographicMarkup;
  content: HomeContentBundle["hero"];
  locale: HomeLocale;
  mergedPrs?: number | null;
};

export function ExperimentalHero({
  assets,
  content,
  locale,
  mergedPrs
}: ExperimentalHeroProps) {
  const stageFacts = content.stats.slice(0, 2);
  const asideFacts = content.stats.slice(2);
  const signalIcons: ArchiveGlyphName[] = [
    "process",
    "communication",
    "delivery"
  ];

  return (
    <section
      className="section home-hero"
      data-scroll-section="top"
      data-section-tone="light"
      id="top"
    >
      <MotionReveal
        as="div"
        className="home-hero__banner signal-surface signal-surface--light"
        delay={40}
        variant="slide-left"
      >
        <div className="home-hero__banner-meta">
          <p className="eyebrow">{content.eyebrow}</p>
          <ScrambleText
            as="span"
            className="micro-note"
            text={content.bannerNote}
            trigger="hover"
            hoverDuration={340}
          />
        </div>

        <FlowLayer
          as="div"
          className="home-hero__banner-graphic-shell"
          x={12}
          y={8}
          rotate={0.9}
        >
          <TimeEngineSyncBanner
            assets={assets}
            className="home-hero__banner-graphic"
          />
        </FlowLayer>
      </MotionReveal>

      <div className="home-hero__grid">
        <MotionReveal
          as="div"
          className="home-hero__stage ambient-panel ambient-panel--light"
          delay={110}
          variant="rise"
        >
          <DataHeader
            className="home-hero__data-header"
            location="/INDEX/HOME"
            status="LIVE"
            stamp="2026.04.05"
          />

          <PretextHeadline
            assets={assets}
            headline={content.headline}
            locale={locale}
          />

          <div className="home-hero__status">
            <span className="home-hero__status-kicker">
              <StreamArrows className="home-hero__status-stream" />
              {` // ${content.statusLabel}`}
            </span>
            <span className="home-hero__status-note">
              {content.statusNote}
            </span>
            <span className="home-hero__status-loc">{content.location}</span>
          </div>

          <div className="home-hero__details">
            <p className="lead home-hero__lede">{content.lede}</p>

            <div className="home-actions">
              <MotionLink
                className="button button--primary button--glitch button--beacon"
                data-text={content.secondaryCta}
                emphasis="primary"
                href="#contact"
              >
                <span className="button__label">{content.secondaryCta}</span>
              </MotionLink>
              <MotionLink
                className="button button--secondary button--hero-secondary"
                emphasis="secondary"
                href="#work"
              >
                <span className="button__label">{content.primaryCta}</span>
              </MotionLink>
            </div>
          </div>

          <div className="home-hero__facts">
            {stageFacts.map((stat, index) => (
              <MotionReveal
                as="article"
                className={`hero-fact-card${stat.accent ? " is-accent" : ""}${stat.live ? " is-live" : ""}`}
                key={stat.label}
                delay={220 + index * 55}
                hoverEffect="lift-sm"
                variant={index % 2 === 0 ? "slide-left" : "rise"}
              >
                <span className="stat__label">{stat.label}</span>
                <strong>
                  <ScrambleText
                    as="span"
                    text={stat.value}
                    trigger="mount"
                    mountDuration={680 + index * 80}
                  />
                </strong>
                <p className="lead--compact">
                  {stat.live && <span className="stat__live-dot" aria-hidden />}
                  {stat.note}
                </p>
              </MotionReveal>
            ))}
          </div>
        </MotionReveal>

        <MotionReveal
          as="aside"
          className="home-hero__aside ambient-panel ambient-panel--dark"
          delay={170}
          variant="slide-right"
        >
          <div className="home-hero__aside-head">
            <GlobeGridBadge assets={assets} className="home-topbar__badge" />
            <p className="eyebrow">{content.asideEyebrow}</p>
          </div>

          <p className="lead lead--compact home-hero__aside-summary">
            {content.asideBody}
          </p>

          {typeof mergedPrs === "number" && mergedPrs > 0 && (
            <p className="micro-note home-hero__live-note">
              {locale === "es"
                ? `${mergedPrs} PRs mergeados en GitHub · actividad en vivo`
                : `${mergedPrs} PRs merged on GitHub · live activity`}
            </p>
          )}

          <div className="home-hero__signals" aria-label="Key strengths">
            {content.list.map((item, index) => (
              <MotionReveal
                as="article"
                className="signal-card"
                key={item}
                delay={220 + index * 55}
                hoverEffect="lift-sm"
                variant="rise"
              >
                <span className="signal-card__icon">
                  <ArchiveGlyph name={signalIcons[index] ?? "systems"} />
                </span>
                <p>{item}</p>
              </MotionReveal>
            ))}
          </div>

          <div className="home-hero__stats">
            {asideFacts.map((stat, index) => (
              <MotionReveal
                as="article"
                className={`metric-card${stat.accent ? " is-accent" : ""}${stat.live ? " is-live" : ""}`}
                key={stat.label}
                delay={310 + index * 60}
                hoverEffect="lift-sm"
                variant={index % 2 === 0 ? "slide-right" : "rise"}
              >
                <span className="stat__label">{stat.label}</span>
                <strong>
                  <ScrambleText
                    as="span"
                    text={stat.value}
                    trigger="mount"
                    mountDuration={680 + index * 80}
                  />
                </strong>
                <p className="lead--compact">
                  {stat.live && <span className="stat__live-dot" aria-hidden />}
                  {stat.note}
                </p>
              </MotionReveal>
            ))}
          </div>

        </MotionReveal>
      </div>
    </section>
  );
}
