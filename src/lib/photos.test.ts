import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("server-only", () => ({}));
import { normalizePhoto } from "./photos";

describe("photo validation", () => {
  it("resizes photos and strips metadata before storing or sending them", async () => {
    const input = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: "#446655" } }).jpeg().withMetadata({ exif: { IFD0: { Artist: "private-test-metadata" } } }).toBuffer();
    const output = await normalizePhoto(`data:image/jpeg;base64,${input.toString("base64")}`);
    const metadata = await sharp(output).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(1600);
    expect(metadata.height).toBe(800);
    expect(metadata.exif).toBeUndefined();
  });
  it("accepts valid PNG and WebP images", async () => {
    for (const format of ["png", "webp"] as const) {
      const input = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#557766" } }).toFormat(format).toBuffer();
      expect((await normalizePhoto(`data:image/${format};base64,${input.toString("base64")}`)).length).toBeGreaterThan(0);
    }
  });
  it("rejects mismatched media types and invalid image bytes", async () => {
    const input = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#557766" } }).png().toBuffer();
    await expect(normalizePhoto(`data:image/jpeg;base64,${input.toString("base64")}`)).rejects.toMatchObject({ status: 415 });
    await expect(normalizePhoto("data:image/png;base64,AA==")).rejects.toMatchObject({ status: 400 });
  });
  it("rejects SVG and oversized image data", async () => {
    await expect(normalizePhoto("data:image/svg+xml;base64,AA==")).rejects.toMatchObject({ status: 400 });
    await expect(normalizePhoto(`data:image/png;base64,${"A".repeat(3_000_000)}`)).rejects.toMatchObject({ status: 400 });
  });
});