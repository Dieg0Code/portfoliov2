import type { ClientTelemetry } from "./types";

// Browser-only. Collects passive telemetry once per session (idempotent).
// Nothing is sent until the user submits a message.

export function collectClientTelemetry(): ClientTelemetry | null {
  if (typeof window === "undefined") return null;

  const nav = window.navigator;
  if (!nav) return null;

  const out: ClientTelemetry = {};

  try {
    out.userAgent = nav.userAgent;
  } catch {
    /* ignore */
  }

  try {
    const uaData = (nav as { userAgentData?: { platform?: string } }).userAgentData;
    out.platform = uaData?.platform || nav.platform || undefined;
  } catch {
    /* ignore */
  }

  try {
    out.language = nav.language;
    if (Array.isArray(nav.languages) && nav.languages.length > 0) {
      out.languages = [...nav.languages];
    }
  } catch {
    /* ignore */
  }

  try {
    out.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    /* ignore */
  }

  try {
    if (window.screen) {
      out.screenW = window.screen.width;
      out.screenH = window.screen.height;
    }
    out.devicePixelRatio = window.devicePixelRatio;
  } catch {
    /* ignore */
  }

  try {
    out.referrer = document.referrer || undefined;
  } catch {
    /* ignore */
  }

  try {
    out.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    out.colorScheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
    /* ignore */
  }

  try {
    if (typeof nav.maxTouchPoints === "number") {
      out.touchPoints = nav.maxTouchPoints;
    }
  } catch {
    /* ignore */
  }

  return out;
}
