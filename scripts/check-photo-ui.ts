import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { applicationOrigin, inspectConfiguration } from "../src/lib/readiness";

async function check() {
  if (!inspectConfiguration().configured || !process.env.APP_URL) throw new Error("Configuration required");
  const origin = applicationOrigin(process.env.APP_URL);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    await page.goto(origin);
    await expect(page.locator(".archive-mode")).toContainText("SANITY LIVE");
    await page.getByRole("button", { name: "Curator desk", exact: true }).click();
    await page.getByLabel("Curator access code").fill(process.env.CURATOR_ACCESS_CODE!);
    await page.getByRole("button", { name: "Open curator desk", exact: true }).click();
    await page.getByRole("button", { name: "New object", exact: true }).click();
    await page.getByRole("button", { name: "Your photo", exact: true }).click();
    await page.getByLabel("Object photo", { exact: true }).setInputFiles(resolve("public/objects/cup.png"));
    await expect(page.locator(".photo-preview")).toBeVisible();
    const suggest = page.getByRole("button", { name: "Suggest details from photo", exact: true });
    await expect(suggest).toBeDisabled();
    await page.getByLabel("Object title", { exact: true }).fill("A curator's existing title");
    await page.getByRole("checkbox", { name: /I have permission to upload this photo/ }).check();
    await suggest.click();
    const suggestions = page.getByRole("region", { name: "Unverified photo suggestions" });
    await expect(suggestions).toBeVisible({ timeout: 45_000 });
    await expect(page.getByLabel("Object title", { exact: true })).toHaveValue("A curator's existing title");
    const proposedTitle = await suggestions.locator("dd").first().innerText();
    await mkdir(resolve("docs/screenshots"), { recursive: true });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: resolve("docs/screenshots/live-photo-suggestions.png"), fullPage: true });
    await page.getByRole("button", { name: "Use these details", exact: true }).click();
    await expect(page.getByLabel("Object title", { exact: true })).toHaveValue(proposedTitle);
    await expect(page.getByLabel("Photo description", { exact: true })).not.toHaveValue("");
    console.log("LIVE_PHOTO_UI_PASSED: consent required; suggestions did not overwrite the form until explicitly accepted; no artifact was saved.");
  } finally { await browser.close(); }
}

check().catch(() => { console.error("Live photo UI verification failed. Check the local live app and credentials; no secret values or provider response bodies were logged."); process.exitCode = 1; });