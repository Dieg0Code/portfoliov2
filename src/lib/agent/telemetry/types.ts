// Shared telemetry types — used by both the client collector and the server
// route. Everything optional: anything the browser didn't ship or the header
// didn't carry stays undefined. Never invent values.

export type ClientTelemetry = {
  userAgent?: string;
  platform?: string;        // navigator.userAgentData.platform or navigator.platform
  language?: string;        // navigator.language (eg "es-CL")
  languages?: string[];     // navigator.languages
  timezone?: string;        // Intl.DateTimeFormat().resolvedOptions().timeZone
  screenW?: number;
  screenH?: number;
  devicePixelRatio?: number;
  referrer?: string;        // document.referrer
  reducedMotion?: boolean;
  colorScheme?: "light" | "dark";
  touchPoints?: number;     // navigator.maxTouchPoints
};

export type ServerTelemetry = {
  ipClass?: "public" | "private" | "loopback" | "unknown";
  country?: string;         // ISO-2, eg "CL"
  countryName?: string;     // full name, eg "Chile"
  region?: string;          // region/state code
  city?: string;
  timezone?: string;        // eg "America/Santiago"
  approx?: boolean;         // true when data is IP-geolocated (always fuzzy)
  source?: "vercel" | "ipapi" | "none";
};

export type AgentTelemetry = {
  client?: ClientTelemetry;
  server?: ServerTelemetry;
};
