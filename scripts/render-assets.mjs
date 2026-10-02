import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.env.ASSET_BASE_URL || "http://127.0.0.1:3002";
const kinds = ["cassette", "key", "disk", "bulb", "phone", "cup", "disc", "battery"];
await mkdir("public/objects", { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 600, height: 480 }, deviceScaleFactor: 2 });
  for (const kind of kinds) {
    await page.goto(`${baseUrl}/render/${kind}`);
    await page.locator("canvas").waitFor();
    await page.waitForFunction(() => {
      const canvas = document.querySelector("canvas");
      const context = canvas?.getContext("webgl2");
      if (!context) return false;
      const pixels = new Uint8Array(context.drawingBufferWidth * context.drawingBufferHeight * 4);
      context.readPixels(0, 0, context.drawingBufferWidth, context.drawingBufferHeight, context.RGBA, context.UNSIGNED_BYTE, pixels);
      return pixels.some((value, index) => index % 4 === 3 && value > 0);
    });
    await page.locator("canvas").screenshot({ path: `public/objects/${kind}.png`, omitBackground: true });
    console.log(`Rendered original asset: ${kind}.png`);
  }
} finally { await browser.close(); }