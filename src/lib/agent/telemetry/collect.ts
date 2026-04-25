import type { ServerTelemetry } from "./types";

// Server-side telemetry extraction.
//   1. Prefer Vercel's built-in geo headers (set by the edge, no extra hop).
//   2. Outside Vercel or locally, fall back to ipapi.co (free tier, 1k/day,
//      in-memory cache by IP). Best-effort with 2s timeout.
//   3. If DEV_SIMULATED_IP is set, use it as the IP for ipapi — handy for
//      testing the OSINT vibe on localhost.

const IPAPI_TIMEOUT_MS = 2000;
const CACHE_TTL_MS = 60 * 60 * 1000;

type CacheEntry = { at: number; data: ServerTelemetry };
const ipCache = new Map<string, CacheEntry>();

export function extractClientIP(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

function ipClass(ip: string | null): ServerTelemetry["ipClass"] {
  if (!ip) return "unknown";
  if (ip === "::1" || ip === "127.0.0.1" || ip.startsWith("127.")) return "loopback";
  if (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
    ip.startsWith("fc") ||
    ip.startsWith("fd")
  ) {
    return "private";
  }
  return "public";
}

function readVercelHeaders(headers: Headers): ServerTelemetry | null {
  const country = headers.get("x-vercel-ip-country");
  const city = headers.get("x-vercel-ip-city");
  const tz = headers.get("x-vercel-ip-timezone");
  const region = headers.get("x-vercel-ip-country-region");
  if (!country && !city && !tz) return null;
  return {
    country: country || undefined,
    region: region || undefined,
    city: city ? decodeURIComponent(city) : undefined,
    timezone: tz || undefined,
    approx: true,
    source: "vercel"
  };
}

async function ipapiLookup(ip: string): Promise<ServerTelemetry | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), IPAPI_TIMEOUT_MS);
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: ctrl.signal,
      headers: { "User-Agent": "portfolio-agent" }
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      country_code?: string;
      country_name?: string;
      region_code?: string;
      city?: string;
      timezone?: string;
      error?: boolean;
    };
    if (data.error) return null;
    return {
      country: data.country_code || undefined,
      countryName: data.country_name || undefined,
      region: data.region_code || undefined,
      city: data.city || undefined,
      timezone: data.timezone || undefined,
      approx: true,
      source: "ipapi"
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function collectServerTelemetry(headers: Headers): Promise<ServerTelemetry> {
  const ip = extractClientIP(headers);
  const klass = ipClass(ip);

  const vercel = readVercelHeaders(headers);
  if (vercel) {
    return { ...vercel, ipClass: klass };
  }

  const simulated = process.env.DEV_SIMULATED_IP;
  const lookupIp = simulated || (klass === "public" ? ip : null);

  if (!lookupIp) {
    return { ipClass: klass, source: "none" };
  }

  const cached = ipCache.get(lookupIp);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { ...cached.data, ipClass: klass };
  }

  const fetched = await ipapiLookup(lookupIp);
  if (fetched) {
    ipCache.set(lookupIp, { at: Date.now(), data: fetched });
    return { ...fetched, ipClass: klass };
  }

  return { ipClass: klass, source: "none" };
}
