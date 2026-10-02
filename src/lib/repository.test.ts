import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedArtifacts } from "./fixtures";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), getDocument: vi.fn(), patch: vi.fn(), revision: vi.fn(), set: vi.fn(), commit: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@sanity/client", () => ({ createClient: () => ({ fetch: mocks.fetch, getDocument: mocks.getDocument, patch: mocks.patch }) }));
vi.mock("./generation", () => ({ prepareDraft: vi.fn() }));
import { changeArtifact, listArtifacts } from "./repository";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SANITY_STUDIO_PROJECT_ID", "testproject"); vi.stubEnv("SANITY_WRITE_TOKEN", "test-only");
  mocks.patch.mockReturnValue({ ifRevisionId: mocks.revision });
  mocks.revision.mockReturnValue({ set: mocks.set }); mocks.set.mockReturnValue({ commit: mocks.commit });
});
afterEach(() => vi.unstubAllEnvs());

describe("Sanity revision-guarded workflow persistence", () => {
  it("only requests exhibited documents for the public view", async () => {
    mocks.fetch.mockResolvedValue([]);
    await listArtifacts();
    expect(mocks.fetch.mock.calls[0][0]).toContain('stage == "exhibited"');
    expect(mocks.fetch.mock.calls[0][1]).toEqual({ curator: false });
  });
  it("guards the write against the exact fetched revision", async () => {
    const artifact = seedArtifacts.find((item) => item.stage === "review")!;
    const document = { ...artifact, _type: "artifact", collection: { _type: "reference", _ref: artifact.collectionId } };
    mocks.getDocument.mockResolvedValue(document);
    mocks.commit.mockResolvedValue({ ...document, _rev: "new-revision", stage: "exhibited" });
    const result = await changeArtifact(artifact._id, { action: "approve", expectedRevision: artifact._rev }, new AbortController().signal);
    expect(mocks.revision).toHaveBeenCalledWith(artifact._rev);
    expect(mocks.set.mock.calls[0][0].stage).toBe("exhibited");
    expect(mocks.commit).toHaveBeenCalledWith({ visibility: "sync" });
    expect(result._rev).toBe("new-revision");
  });
  it("surfaces a conflict if another write wins after the read", async () => {
    const artifact = seedArtifacts.find((item) => item.stage === "review")!;
    mocks.getDocument.mockResolvedValue({ ...artifact, collection: { _ref: artifact.collectionId } });
    mocks.commit.mockRejectedValue({ statusCode: 409 });
    await expect(changeArtifact(artifact._id, { action: "approve", expectedRevision: artifact._rev }, new AbortController().signal)).rejects.toThrow("saved this object first");
  });
});