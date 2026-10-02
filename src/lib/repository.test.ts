import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedArtifacts } from "./fixtures";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), getDocument: vi.fn(), patch: vi.fn(), revision: vi.fn(), set: vi.fn(), commit: vi.fn(), create: vi.fn(), upload: vi.fn(), normalize: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@sanity/client", () => ({ createClient: () => ({ fetch: mocks.fetch, getDocument: mocks.getDocument, patch: mocks.patch, create: mocks.create, assets: { upload: mocks.upload } }) }));
vi.mock("./generation", () => ({ prepareDraft: vi.fn() }));
vi.mock("./photos", () => ({ normalizePhoto: mocks.normalize }));
import { changeArtifact, insertArtifact, listArtifacts } from "./repository";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SANITY_STUDIO_PROJECT_ID", "testproject"); vi.stubEnv("SANITY_WRITE_TOKEN", "test-only");
  mocks.patch.mockReturnValue({ ifRevisionId: mocks.revision });
  mocks.revision.mockReturnValue({ set: mocks.set }); mocks.set.mockReturnValue({ commit: mocks.commit });
});
afterEach(() => vi.unstubAllEnvs());

describe("Sanity revision-guarded workflow persistence", () => {
  it("stores sanitised photo assets by reference without embedding original image data", async () => {
    const assetId = `image-${"a".repeat(40)}-20x20-webp`;
    const bytes = Buffer.from("sanitised-test-image");
    mocks.normalize.mockResolvedValue(bytes);
    mocks.upload.mockResolvedValue({ _id: assetId });
    mocks.create.mockImplementation(async (document) => ({ ...document, _rev: "photo-revision", _updatedAt: "2026-10-02T12:00:00.000Z" }));
    const result = await insertArtifact({ title: "A personal keepsake", kind: "photo", collectionId: "collection-rituals", material: "Ceramic", observed: "A pale vessel with a handle.", photo: { dataUrl: "data:image/png;base64,AA==", alt: "A pale vessel", consent: true } });
    expect(mocks.upload).toHaveBeenCalledWith("image", bytes, { contentType: "image/webp", filename: "afterlight-photo.webp" });
    expect(mocks.create.mock.calls[0][0].photo.asset._ref).toBe(assetId);
    expect(JSON.stringify(mocks.create.mock.calls[0][0])).not.toContain("data:image");
    expect(result.photo?.url).toContain("https://cdn.sanity.io/images/testproject/production/");
    expect(result.stage).toBe("intake");
  });
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