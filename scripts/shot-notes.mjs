import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const notes = await page.$("#notes");
if (!notes) throw new Error("no #notes");
await notes.scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
await notes.screenshot({ path: ".codex-output/notes-only.png" });
await browser.close();
