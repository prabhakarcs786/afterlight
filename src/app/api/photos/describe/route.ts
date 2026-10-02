import { z } from "zod";
import { appMode } from "@/lib/config";
import { photoDataSchema } from "@/lib/domain";
import { describePhoto } from "@/lib/generation";
import { createWriteBudget, HttpError, json, problem, readJson, requireCurator, requireSameOrigin } from "@/lib/http";
import { maxPhotoRequestBytes, normalizePhoto } from "@/lib/photos";

export const runtime = "nodejs";
export const maxDuration = 40;
const budget = createWriteBudget(5);
const inputSchema = z.object({ dataUrl: photoDataSchema, consent: z.literal(true) });

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (appMode() !== "live") throw new HttpError(409, "local-demo", "Photo suggestions require live Gemini access. Enter the details manually in the local demo.");
    requireCurator(request); budget();
    const input = inputSchema.safeParse(await readJson(request, maxPhotoRequestBytes));
    if (!input.success) throw new HttpError(400, "invalid-photo", "Choose a supported photo and consent to Gemini processing.");
    const bytes = await normalizePhoto(input.data.dataUrl);
    return json({ suggestions: await describePhoto(bytes, request.signal) });
  } catch (error) {
    return problem(error instanceof HttpError ? error : new HttpError(502, "photo-description-failed", "Gemini could not describe this photo. Try again or enter the details manually."));
  }
}