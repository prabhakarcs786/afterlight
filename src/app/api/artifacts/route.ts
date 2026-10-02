import { appMode } from "@/lib/config";
import { intakeSchema, publicCollection } from "@/lib/domain";
import { seedArtifacts } from "@/lib/fixtures";
import { createWriteBudget, HttpError, json, problem, readJson, requireCurator, requireSameOrigin } from "@/lib/http";
import { insertArtifact, listArtifacts } from "@/lib/repository";
import { maxPhotoRequestBytes } from "@/lib/photos";

export const runtime = "nodejs";
const budget = createWriteBudget();

export async function GET(request: Request) {
  try {
    const curator = new URL(request.url).searchParams.get("view") === "curator";
    if (appMode() === "demo") return json({ mode: "demo", artifacts: curator ? seedArtifacts : publicCollection(seedArtifacts) });
    if (curator) requireCurator(request);
    return json({ mode: "live", artifacts: await listArtifacts(curator) });
  } catch (error) { return problem(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (appMode() !== "live") throw new HttpError(409, "local-demo", "Demo changes belong in this browser, not the server.");
    requireCurator(request); budget();
    const parsed = intakeSchema.safeParse(await readJson(request, maxPhotoRequestBytes));
    if (!parsed.success) throw new HttpError(400, "invalid-object", parsed.error.issues[0]?.message || "Invalid object.");
    return json({ artifact: await insertArtifact(parsed.data) }, 201);
  } catch (error) { return problem(error); }
}