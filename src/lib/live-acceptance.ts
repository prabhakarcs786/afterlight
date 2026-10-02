import { z } from "zod";
import { artifactSchema, photoDescriptionSchema, type Artifact, type Intake, type Operation } from "./domain";
import { applicationOrigin } from "./readiness";

const archiveSchema = z.object({ mode: z.literal("live"), artifacts: z.array(artifactSchema) });
const changeSchema = z.object({ artifact: artifactSchema, drafting: z.literal("model").optional() });

export async function verifyLiveWorkflow(url: string, accessCode: string, options: {
  nonce: string;
  photo?: Intake["photo"];
  cleanup: (id: string | undefined, input: Intake) => Promise<void>;
  fetcher?: typeof fetch;
}) {
  const origin = applicationOrigin(url);
  const fetcher = options.fetcher || fetch;
  const headers = { "Content-Type": "application/json", Origin: origin, "x-curator-code": accessCode };
  const unauthorized = await fetcher(`${origin}/api/artifacts?view=curator`, { redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (unauthorized.status !== 401) throw new Error("The live curator view must reject unauthenticated requests. Check APP_MODE.");

  async function publicRecords() {
    const response = await fetcher(`${origin}/api/artifacts`, { redirect: "error", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Public archive failed with HTTP ${response.status}.`);
    return archiveSchema.parse(await response.json()).artifacts;
  }

  async function update(current: Artifact, operation: Operation) {
    const response = await fetcher(`${origin}/api/artifacts/${current._id}`, { method: "PATCH", headers, body: JSON.stringify(operation), redirect: "error", signal: AbortSignal.timeout(40_000) });
    if (!response.ok) throw new Error(`Live ${operation.action} failed with HTTP ${response.status}.`);
    const result = changeSchema.parse(await response.json());
    if (result.artifact._id !== current._id || result.artifact._rev === current._rev) throw new Error("The persisted revision did not advance.");
    if (operation.action === "prepare" && result.drafting !== "model") throw new Error("Live drafting did not identify the real model path.");
    return result.artifact;
  }

  await publicRecords();
  const input: Intake = { title: `Live acceptance ${options.nonce}`, kind: options.photo ? "photo" : "cup", collectionId: "collection-rituals", material: "Test ceramic", observed: `Temporary acceptance-check object ${options.nonce}; not part of the permanent museum collection.`, ...(options.photo ? { photo: options.photo } : {}) };
  let id: string | undefined;
  try {
    if (options.photo) {
      const described = await fetcher(`${origin}/api/photos/describe`, { method: "POST", headers, body: JSON.stringify({ dataUrl: options.photo.dataUrl, consent: true }), redirect: "error", signal: AbortSignal.timeout(40_000) });
      if (!described.ok) throw new Error(`Live photo description failed with HTTP ${described.status}.`);
      photoDescriptionSchema.parse((await described.json()).suggestions);
    }
    const created = await fetcher(`${origin}/api/artifacts`, { method: "POST", headers, body: JSON.stringify(input), redirect: "error", signal: AbortSignal.timeout(30_000) });
    if (created.status !== 201) throw new Error(`Live intake failed with HTTP ${created.status}.`);
    let current = changeSchema.parse(await created.json()).artifact;
    id = current._id;
    const savedPhoto = current.photo;
    if (options.photo && (!savedPhoto?.assetId || !savedPhoto.url.startsWith("https://cdn.sanity.io/images/"))) throw new Error("The photo was not saved as a Sanity image asset.");
    if (current.stage !== "intake" || (await publicRecords()).some((artifact) => artifact._id === id)) throw new Error("An intake object became public before approval.");
    current = await update(current, { action: "prepare", expectedRevision: current._rev });
    if (current.stage !== "draft" || current.observed !== input.observed || current.material !== input.material) throw new Error("Draft generation changed the object's observed facts or workflow stage incorrectly.");
    const staleRevision = current._rev;
    current = await update(current, { action: "save", expectedRevision: current._rev, draft: { label: `${current.label.slice(0, 420)} Reviewed during the live acceptance check.`, interpretation: current.interpretation, strangeness: current.strangeness } });
    const stale = await fetcher(`${origin}/api/artifacts/${id}`, { method: "PATCH", headers, body: JSON.stringify({ action: "approve", expectedRevision: staleRevision }), redirect: "error", signal: AbortSignal.timeout(15_000) });
    if (stale.status !== 409) throw new Error("The live API did not reject a stale revision.");
    current = await update(current, { action: "submit", expectedRevision: current._rev });
    if (current.stage !== "review" || (await publicRecords()).some((artifact) => artifact._id === id)) throw new Error("Review content was publicly exhibited before approval.");
    current = await update(current, { action: "approve", expectedRevision: current._rev });
    if (current.stage !== "exhibited" || !(await publicRecords()).some((artifact) => artifact._id === id)) throw new Error("Approval did not publish the object to the public collection.");
    current = await update(current, { action: "revise", expectedRevision: current._rev, note: "Live acceptance check complete; withdraw this temporary object." });
    if (current.stage !== "draft" || (await publicRecords()).some((artifact) => artifact._id === id)) throw new Error("Withdrawal did not remove the object from the public collection.");
    if (options.photo && JSON.stringify(current.photo) !== JSON.stringify(savedPhoto)) throw new Error("The workflow changed the saved photo.");
    return { artifactId: id, transitions: ["intake", "draft", "review", "exhibited", "draft"], staleWriteRejected: true, observedFactsPreserved: true, ...(options.photo ? { photoSuggestionsReceived: true, photoPreserved: true } : {}) };
  } finally {
    await options.cleanup(id, input);
  }
}