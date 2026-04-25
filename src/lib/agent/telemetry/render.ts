import type { AgentTelemetry, ClientTelemetry, ServerTelemetry } from "./types";

function compactUA(ua?: string): string | null {
  if (!ua) return null;

  // OS first — iOS before macOS (iPhones spoof "Mac OS X"), Android before
  // Linux (same trick).
  const os =
    /Windows NT/.exec(ua) ? "Windows" :
    /(iPhone|iPad|iPod|CPU iPhone OS|CPU OS \d+_\d+)/.exec(ua) ? "iOS" :
    /Android/.exec(ua) ? "Android" :
    /Mac OS X/.exec(ua) ? "macOS" :
    /Linux/.exec(ua) ? "Linux" :
    null;

  // Browser. On iOS Safari version comes from "Version/x.y", on desktop from
  // "Safari/x" (the WebKit build, not user-facing). Order matters: Edg before
  // Chrome (Edge UAs also contain "Chrome").
  let browser: string | null = null;
  const firefox = /Firefox\/(\d+)/.exec(ua);
  const edge = /Edg\/(\d+)/.exec(ua);
  const chrome = /Chrome\/(\d+)/.exec(ua);
  const safariVer = /Version\/(\d+)[^ ]*\s+Safari/.exec(ua);
  const safari = /Safari\/(\d+)/.exec(ua);

  if (firefox) browser = `Firefox ${firefox[1]}`;
  else if (edge) browser = `Edge ${edge[1]}`;
  else if (chrome) browser = `Chrome ${chrome[1]}`;
  else if (safariVer) browser = `Safari ${safariVer[1]}`;
  else if (safari) browser = "Safari";
  else browser = "browser";

  return os ? `${browser} on ${os}` : browser;
}

function hostOfReferrer(r?: string): string | null {
  if (!r) return null;
  try {
    const u = new URL(r);
    return u.hostname || null;
  } catch {
    return null;
  }
}

function renderClient(c: ClientTelemetry | undefined): string[] {
  if (!c) return [];
  const lines: string[] = [];
  const ua = compactUA(c.userAgent);
  if (ua) lines.push(`UA: ${ua}`);
  if (c.platform) lines.push(`platform: ${c.platform}`);
  const langs = c.languages && c.languages.length > 0
    ? c.languages.slice(0, 3).join(", ")
    : c.language;
  if (langs) lines.push(`lang: ${langs}`);
  if (c.timezone) lines.push(`browser tz: ${c.timezone}`);
  if (c.screenW && c.screenH) {
    const dpr = c.devicePixelRatio && c.devicePixelRatio !== 1
      ? ` @${c.devicePixelRatio}x`
      : "";
    lines.push(`screen: ${c.screenW}x${c.screenH}${dpr}`);
  }
  const refHost = hostOfReferrer(c.referrer);
  if (refHost) {
    lines.push(`referrer: ${refHost}`);
  } else if (c.referrer !== undefined) {
    lines.push("referrer: direct (sin referrer)");
  }
  if (c.reducedMotion) lines.push("prefs: reduced-motion");
  if (c.colorScheme) lines.push(`prefs: ${c.colorScheme} mode`);
  if (typeof c.touchPoints === "number" && c.touchPoints > 0) {
    lines.push(`touch points: ${c.touchPoints} (mobile/tablet probable)`);
  }
  return lines;
}

function renderServer(s: ServerTelemetry | undefined): string[] {
  if (!s) return [];
  const lines: string[] = [];
  if (s.ipClass && s.ipClass !== "public") {
    lines.push(`ip class: ${s.ipClass} (sin geo confiable — dev/local probable)`);
  }
  const geoBits: string[] = [];
  if (s.city) geoBits.push(s.city);
  if (s.region) geoBits.push(s.region);
  if (s.countryName || s.country) geoBits.push(s.countryName || s.country!);
  if (geoBits.length > 0) {
    lines.push(`geo ≈ ${geoBits.join(", ")} (aproximado por IP)`);
  }
  if (s.timezone) lines.push(`server tz: ${s.timezone}`);
  if (s.source) lines.push(`source: ${s.source}`);
  return lines;
}

export function renderOsintBlock(t: AgentTelemetry, turnNumber: number): string {
  const clientLines = renderClient(t.client);
  const serverLines = renderServer(t.server);
  if (clientLines.length === 0 && serverLines.length === 0) {
    return `## Telemetría visitante (turno #${turnNumber})\n(sin datos — no inventes)`;
  }
  const parts = [
    `## Telemetría visitante (turno #${turnNumber})`,
    ...serverLines.map((l) => `- ${l}`),
    ...clientLines.map((l) => `- ${l}`)
  ];
  return parts.join("\n");
}
