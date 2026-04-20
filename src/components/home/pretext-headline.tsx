"use client";

import { clearCache, layoutNextLine, prepareWithSegments, setLocale } from "@chenglou/pretext";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ConcentricArcRadarScale } from "@/components/micrographics/ConcentricArcRadarScale";
import { EpochTransformVerificationPanel } from "@/components/micrographics/EpochTransformVerificationPanel";
import { RestartBandwidthProgressDial } from "@/components/micrographics/RestartBandwidthProgressDial";
import { ScrambleWave } from "@/components/home/scramble-wave";
import type { HomeLocale } from "@/components/home/content";
import type { SelectedMicrographicMarkup } from "@/lib/micrographics/selected-assets";

type HeadlineLine = {
  text: string;
  y: number;
};

type HeadlineLayout = {
  lines: HeadlineLine[];
  fontSize: number;
  lineHeight: number;
  panelTop: number;
  panelWidth: number;
  stageHeight: number;
};

type PretextHeadlineProps = {
  assets: SelectedMicrographicMarkup;
  headline: string;
  locale: HomeLocale;
};

const desktopBreakpoint = 640;

export function PretextHeadline({
  assets,
  headline,
  locale
}: PretextHeadlineProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [layoutState, setLayoutState] = useState<HeadlineLayout | null>(null);
  const [scrambleKey, setScrambleKey] = useState(0);
  const scrambleLockRef = useRef(false);

  const triggerScramble = () => {
    if (scrambleLockRef.current) return;
    scrambleLockRef.current = true;
    setScrambleKey((k) => k + 1);
    window.setTimeout(() => {
      scrambleLockRef.current = false;
    }, 1900);
  };

  useEffect(() => {
    const node = frameRef.current;

    if (!node) {
      return;
    }

    const updateFrameWidth = () => {
      setFrameWidth(node.getBoundingClientRect().width);
    };

    updateFrameWidth();

    const observer = new ResizeObserver(() => {
      updateFrameWidth();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (frameWidth === 0) {
      return () => {
        cancelled = true;
      };
    }

    if (frameWidth < desktopBreakpoint) {
      requestAnimationFrame(() => {
        if (!cancelled) {
          setLayoutState(null);
          setIsReady(true);
        }
      });

      return () => {
        cancelled = true;
      };
    }

    async function measureHeadline() {
      try {
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }

        if (cancelled) {
          return;
        }

        setLocale(locale);
        clearCache();

        const fontSize = Math.max(48, Math.min(78, frameWidth * 0.08));
        const lineHeight = fontSize * 0.92;
        const panelWidth = Math.min(284, frameWidth * 0.3);
        const panelHeight = panelWidth / 1.89;
        const panelTop = Math.max(14, fontSize * 0.14);
        const gutter = 32;
        const prepared = prepareWithSegments(
          headline,
          `700 ${fontSize}px "Inter"`
        );

        const lines: HeadlineLine[] = [];
        let cursor = { segmentIndex: 0, graphemeIndex: 0 };
        let y = fontSize * 0.12;

        while (true) {
          const overlapsPanel =
            y + lineHeight > panelTop && y < panelTop + panelHeight;
          const maxWidth = overlapsPanel
            ? frameWidth - panelWidth - gutter
            : frameWidth;
          const line = layoutNextLine(
            prepared,
            cursor,
            Math.max(maxWidth, frameWidth * 0.56)
          );

          if (line === null) {
            break;
          }

          lines.push({
            text: line.text.trimEnd(),
            y
          });

          cursor = line.end;
          y += lineHeight;
        }

        if (!cancelled) {
          setLayoutState({
            lines,
            fontSize,
            lineHeight,
            panelTop,
            panelWidth,
            stageHeight: Math.max(
              y + fontSize * 0.35,
              panelTop + panelHeight + lineHeight * 0.5,
              324
            )
          });
          requestAnimationFrame(() => {
            if (!cancelled) {
              setIsReady(true);
            }
          });
        }
      } catch {
        if (!cancelled) {
          setLayoutState(null);
          setIsReady(true);
        }
      }
    }

    void measureHeadline();

    return () => {
      cancelled = true;
    };
  }, [frameWidth, headline, locale]);

  const totalChars = layoutState
    ? layoutState.lines.reduce((sum, line) => sum + Array.from(line.text).length, 0)
    : Array.from(headline).length;

  let cumulative = 0;

  return (
    <div
      className={`pretext-headline${isReady ? " is-ready" : ""}`}
      ref={frameRef}
      onMouseEnter={triggerScramble}
      onFocus={triggerScramble}
    >
      {layoutState ? (
        <div
          className="pretext-headline__surface"
          style={{ height: `${layoutState.stageHeight}px` }}
        >
          <ConcentricArcRadarScale
            assets={assets}
            className="pretext-headline__radar"
          />

          {layoutState.lines.map((line, index) => {
            const offset = cumulative;
            cumulative += Array.from(line.text).length;
            return (
              <span
                key={`${line.text}-${index}`}
                className="pretext-headline__line scramble-wave"
                style={
                  {
                    top: `${line.y}px`,
                    fontSize: `${layoutState.fontSize}px`,
                    lineHeight: `${layoutState.lineHeight}px`,
                    "--line-index": index
                  } as CSSProperties
                }
              >
                <ScrambleWave
                  text={line.text}
                  activeKey={scrambleKey}
                  duration={2600}
                  charWindow={0.28}
                  indexOffset={offset}
                  totalChars={totalChars}
                />
              </span>
            );
          })}

          <EpochTransformVerificationPanel
            assets={assets}
            className="pretext-headline__panel"
            style={{
              top: `${layoutState.panelTop}px`,
              width: `${layoutState.panelWidth}px`
            }}
          />

          <RestartBandwidthProgressDial
            assets={assets}
            className="pretext-headline__dial"
          />
        </div>
      ) : (
        <div className="pretext-headline__fallback">
          <h1 className="scramble-wave">
            <ScrambleWave
              text={headline}
              activeKey={scrambleKey}
              duration={2200}
              charWindow={0.18}
            />
          </h1>

          <div className="pretext-headline__fallback-graphics">
            <EpochTransformVerificationPanel assets={assets} />

            <div className="pretext-headline__fallback-accent">
              <ConcentricArcRadarScale
                assets={assets}
                className="pretext-headline__radar"
              />
              <RestartBandwidthProgressDial
                assets={assets}
                className="pretext-headline__dial"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
