import { describe, expect, it, vi } from "vitest";
import { applyOperation, createArtifact, intakeSchema, operationSchema, type Artifact } from "./domain";
import { prepareLocalDraft } from "./fixtures";
import { verifyLiveWorkflow } from "./live-acceptance";

function fakeLiveApi(failDraft = false) {
  let artifact: Artifact | undefined;
  let revision = 0;
  return vi.fn<typeof fetch>().mockImplementation(async (input, options) => {
    const url = new URL(String(input));
    const method = options?.method || "GET";
    if (url.pathname === "/api/photos/describe") return Response.json({ suggestions: { title: "Pale vessel", material: "Possibly ceramic", observed: "A pale vessel with a curved handle.", alt: "A pale handled vessel" } });
    if (url.searchParams.get("view") === "curator" && !new Headers(options?.headers).has("x-curator-code")) return new Response(null, { status: 401 });
    if (method === "GET") return Response.json({ mode: "live", artifacts: artifact?.stage === "exhibited" ? [artifact] : [] });
    if (method === "POST") {
      artifact = createArtifact(intakeSchema.parse(JSON.parse(String(options?.body))), "test-acceptance-object");
      if (artifact.photo) artifact.photo = { ...artifact.photo, url: `https://cdn.sanity.io/images/project/production/${"a".repeat(40)}-20x20.webp`, assetId: `image-${"a".repeat(40)}-20x20-webp` };
      return Response.json({ artifact }, { status: 201 });
    }
    const operation = operationSchema.parse(JSON.parse(String(options?.body)));
    if (operation.action === "prepare" && failDraft) return new Response(null, { status: 502 });
    if (!artifact || artifact._rev !== operation.expectedRevision) return new Response(null, { status: 409 });
    artifact = applyOperation(artifact, operation, operation.action === "prepare" ? "automation" : "curator", { eventId: `revision-${++revision}`, at: new Date().toISOString(), preparedDraft: prepareLocalDraft(artifact) });
    return Response.json({ artifact, ...(operation.action === "prepare" ? { drafting: "model" } : {}) });
  });
}

describe("live workflow acceptance gate", () => {
  it("verifies photo suggestions, stored image references, and image preservation", async () => {
    const cleanup = vi.fn().mockResolvedValue(undefined);
    const result = await verifyLiveWorkflow("http://localhost:3002", "test-only-code", { nonce: "photo-run", photo: { dataUrl: "data:image/png;base64,AA==", alt: "A pale handled vessel", consent: true }, fetcher: fakeLiveApi(), cleanup });
    expect(result.photoSuggestionsReceived).toBe(true);
    expect(result.photoPreserved).toBe(true);
    expect(cleanup).toHaveBeenCalledOnce();
  });
  it("exercises the full workflow and cleans its temporary record", async () => {
    const cleanup = vi.fn().mockResolvedValue(undefined);
    const result = await verifyLiveWorkflow("http://localhost:3002", "test-only-code", { nonce: "test-run", fetcher: fakeLiveApi(), cleanup });
    expect(result.staleWriteRejected).toBe(true);
    expect(result.transitions).toEqual(["intake", "draft", "review", "exhibited", "draft"]);
    expect(cleanup).toHaveBeenCalledWith("artifact-test-acceptance-object", expect.objectContaining({ title: "Live acceptance test-run" }));
  });
  it("cleans up even if live model drafting fails", async () => {
    const cleanup = vi.fn().mockResolvedValue(undefined);
    await expect(verifyLiveWorkflow("http://localhost:3002", "test-only-code", { nonce: "test-run", fetcher: fakeLiveApi(true), cleanup })).rejects.toThrow("prepare failed");
    expect(cleanup).toHaveBeenCalledOnce();
  });
  it("does not mutate a server still running in demo mode", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
    const cleanup = vi.fn();
    await expect(verifyLiveWorkflow("http://localhost:3002", "test-only-code", { nonce: "test-run", fetcher, cleanup })).rejects.toThrow("APP_MODE");
    expect(fetcher).toHaveBeenCalledOnce();
    expect(cleanup).not.toHaveBeenCalled();
  });
  it("does not report success if temporary-record cleanup fails", async () => {
    const cleanup = vi.fn().mockRejectedValue(new Error("cleanup failed"));
    await expect(verifyLiveWorkflow("http://localhost:3002", "test-only-code", { nonce: "test-run", fetcher: fakeLiveApi(), cleanup })).rejects.toThrow("cleanup failed");
  });
});