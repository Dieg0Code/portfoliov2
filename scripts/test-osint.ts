/* eslint-disable no-console */
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });

import { renderOsintBlock } from "../src/lib/agent/telemetry/render";

// Sample 1: realistic desktop visitor in prod-Vercel
const sample1 = renderOsintBlock(
  {
    server: {
      ipClass: "public",
      country: "CL",
      city: "Santiago",
      region: "RM",
      timezone: "America/Santiago",
      approx: true,
      source: "vercel"
    },
    client: {
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/131.0",
      platform: "Linux x86_64",
      language: "es-CL",
      languages: ["es-CL", "es", "en"],
      timezone: "America/Santiago",
      screenW: 2560,
      screenH: 1440,
      devicePixelRatio: 1,
      referrer: "https://github.com/Dieg0Code",
      reducedMotion: false,
      colorScheme: "dark",
      touchPoints: 0
    }
  },
  3
);

console.log("=== SAMPLE 1: prod-Vercel desktop visitor ===\n");
console.log(sample1);

// Sample 2: mobile, iOS, direct
const sample2 = renderOsintBlock(
  {
    server: {
      ipClass: "public",
      country: "AR",
      countryName: "Argentina",
      city: "Buenos Aires",
      timezone: "America/Argentina/Buenos_Aires",
      approx: true,
      source: "ipapi"
    },
    client: {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1",
      platform: "iPhone",
      language: "es-AR",
      timezone: "America/Argentina/Buenos_Aires",
      screenW: 390,
      screenH: 844,
      devicePixelRatio: 3,
      colorScheme: "dark",
      touchPoints: 5
    }
  },
  1
);

console.log("\n\n=== SAMPLE 2: mobile iPhone, direct referral ===\n");
console.log(sample2);

// Sample 3: local dev, no data
const sample3 = renderOsintBlock(
  {
    server: { ipClass: "loopback", source: "none" },
    client: {
      userAgent: "Mozilla/5.0 local",
      language: "es",
      timezone: "America/Santiago",
      screenW: 1920,
      screenH: 1080
    }
  },
  1
);

console.log("\n\n=== SAMPLE 3: loopback dev ===\n");
console.log(sample3);
