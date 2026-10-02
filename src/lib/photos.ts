import "server-only";
import sharp from "sharp";
import { maxPhotoBytes, photoDataSchema } from "./domain";
import { HttpError } from "./http";

export const maxPhotoRequestBytes = Math.ceil(maxPhotoBytes / 3) * 4 + 8192;

export async function normalizePhoto(dataUrl: string): Promise<Buffer> {
  if (!photoDataSchema.safeParse(dataUrl).success) throw new HttpError(400, "invalid-photo", "Choose a JPEG, PNG, or WebP photo under 2 MB.");
  const input = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  if (!input.length || input.length > maxPhotoBytes) throw new HttpError(413, "photo-too-large", "Photos must be under 2 MB.");
  try {
    const image = sharp(input, { limitInputPixels: 25_000_000, failOn: "warning" });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format) || !dataUrl.startsWith(`data:image/${metadata.format};`)) throw new HttpError(415, "unsupported-photo", "The image contents must match a JPEG, PNG, or WebP file.");
    if ((metadata.pages || 1) > 1) throw new HttpError(415, "animated-photo", "Choose a still photo, not an animated image.");
    const output = await image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    if (output.length > maxPhotoBytes) throw new HttpError(413, "photo-too-large", "The processed photo is too large. Try a smaller image.");
    return output;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "invalid-photo", "The photo could not be decoded. Use a still image under 2 MB and 25 megapixels.");
  }
}