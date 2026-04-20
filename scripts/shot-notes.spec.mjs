import { test } from "@playwright/test";

test("shot notes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const el = await page.$("#notes");
  if (!el) throw new Error("no #notes");
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2200);
  await el.screenshot({ path: ".codex-output/notes-only.png" });
});
