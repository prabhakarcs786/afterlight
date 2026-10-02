import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function visiblePixels(page: Page) {
  return page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext("webgl2");
    if (!context) return 0;
    const pixels = new Uint8Array(context.drawingBufferWidth * context.drawingBufferHeight * 4);
    context.readPixels(0, 0, context.drawingBufferWidth, context.drawingBufferHeight, context.RGBA, context.UNSIGNED_BYTE, pixels);
    let visible = 0;
    for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 20) visible++;
    return visible;
  });
}

test("renders original assets, filters the collection, and inspects moving 3D content", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Small things. Long afterlives." })).toBeVisible();
  await expect(page.locator(".object-card")).toHaveCount(4);
  await expect.poll(() => page.locator(".object-image img").evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("collection.png"), fullPage: true });
  await page.getByRole("button", { name: "Borrowed energy", exact: true }).click();
  await expect(page.locator(".object-card")).toHaveCount(1);
  await page.getByRole("button", { name: /All objects/ }).click();
  await page.getByRole("searchbox", { name: "Search objects" }).fill("cassette");
  await expect(page.locator(".object-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Inspect A pocket-sized time machine" }).click();
  await expect.poll(() => visiblePixels(page)).toBeGreaterThan(1000);
  await expect(page.getByRole("heading", { name: "A pocket-sized time machine" })).toBeVisible();
  const canvas = page.locator("canvas");
  const before = await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
  await page.getByRole("button", { name: "Rotate object", exact: true }).click();
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL())).not.toBe(before);
  await page.getByRole("button", { name: "Pause rotation" }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Reset view" }).click();
  await page.screenshot({ path: testInfo.outputPath("inspection.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download catalogue record" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("al-001.md");
  await canvas.evaluate((element: HTMLCanvasElement) => element.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext());
  await expect(page.getByText("3D view unavailable.", { exact: false })).toBeVisible();
  await expect(page.locator(".stage-fallback")).toBeVisible();
  expect(errors).toEqual([]);
});

test("creates, edits, reviews, exhibits, persists, and withdraws an object", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Curator desk", exact: true }).click();
  await page.getByRole("button", { name: "New object", exact: true }).click();
  await page.getByLabel("Object title").fill("The quiet morning vessel");
  await page.getByLabel("Reconstruction", { exact: true }).selectOption("cup");
  await page.getByLabel("Collection", { exact: true }).selectOption("collection-rituals");
  await page.getByLabel("Observed material").fill("White ceramic");
  await page.getByLabel("Observable details").fill("A hollow ceramic body with a small curved handle and a flat base.");
  await page.getByRole("button", { name: "Enter into archive" }).click();
  await page.getByRole("button", { name: "Prepare a sample draft" }).click();
  await page.getByLabel("Exhibition label", { exact: true }).fill("A small ceramic pause before the beginning of an ordinary day.");
  await expect(page.getByRole("button", { name: "Submit for review" })).toBeDisabled();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await page.getByRole("button", { name: "Approve & exhibit" }).click();
  await expect(page.getByText("Part of the public collection")).toBeVisible();
  await page.getByRole("button", { name: /The collection/ }).click();
  await expect(page.getByRole("button", { name: "Inspect The quiet morning vessel" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Inspect The quiet morning vessel" })).toBeVisible();
  await page.getByRole("button", { name: "Curator desk", exact: true }).click();
  await page.getByRole("button", { name: "Inspect The quiet morning vessel" }).click();
  await page.getByLabel("Revision reason").fill("The fictional label needs another editorial review.");
  await page.getByRole("button", { name: "Return to draft" }).click();
  await page.getByRole("button", { name: /The collection/ }).click();
  await expect(page.getByRole("button", { name: "Inspect The quiet morning vessel" })).toHaveCount(0);
});

test("preserves stale editor inputs when another tab changes a record", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Curator desk", exact: true }).click();
  await page.getByRole("button", { name: "Inspect The ritual of waiting" }).click();
  const other = await context.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: "Curator desk", exact: true }).click();
  await other.getByRole("button", { name: "Inspect The ritual of waiting" }).click();
  await other.getByRole("button", { name: "Approve & exhibit" }).click();
  await expect(page.getByText("This object changed since you opened it.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Return to draft" })).toBeDisabled();
  await page.getByRole("button", { name: "Discard local edits and reload" }).click();
  await expect(page.getByRole("button", { name: "Return to draft" })).toBeEnabled();
  await other.close();
});

test("supports keyboard access, accessible views, and a dismissible reset dialog", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  for (const name of [/The collection/, /^Curator desk$/, /^Archive notes$/]) {
    await page.getByRole("button", { name }).click();
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  const reset = page.getByRole("button", { name: "Reset local archive", exact: true });
  await reset.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(reset).toBeFocused();
  await reset.click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});