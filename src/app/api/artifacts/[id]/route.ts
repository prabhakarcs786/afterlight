import { appMode } from "@/lib/config";
import { artifactSchema, operationSchema } from "@/lib/domain";
import { createWriteBudget, HttpError, json, problem, readJson, requireCurator, requireSameOrigin } from "@/lib/http";
import { changeArtifact } from "@/lib/repository";

export const runtime = "nodejs";
export const maxDuration = 60;
const budget = createWriteBudget();

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    requireSameOrigin(request);
    if (appMode() !== "live") throw new HttpError(409, "local-demo", "Demo changes belong in this browser, not the server.");
    requireCurator(request); budget();
    const { id } = await context.params;
    if (!artifactSchema.shape._id.safeParse(id).success) throw new HttpError(400, "invalid-id", "Invalid object identifier.");
    const operation = operationSchema.safeParse(await readJson(request));
    if (!operation.success) throw new HttpError(400, "invalid-operation", operation.error.issues[0]?.message || "Invalid workflow action.");
    return json({ artifact: await changeArtifact(id, operation.data, request.signal), ...(operation.data.action === "prepare" ? { drafting: "model" } : {}) });
  } catch (error) { return problem(error); }
}