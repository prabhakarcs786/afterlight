import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ normalize: vi.fn(), describe: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/photos", () => ({ normalizePhoto: mocks.normalize, maxPhotoRequestBytes: 3_000_000 }));
vi.mock("@/lib/generation", () => ({ describePhoto: mocks.describe }));
import { POST } from "../app/api/photos/describe/route";

beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("APP_MODE", "live"); vi.stubEnv("CURATOR_ACCESS_CODE", "curator-test-code"); });
afterEach(() => vi.unstubAllEnvs());
const request = (body: unknown, code = "curator-test-code", origin = "http://localhost") => new Request("http://localhost/api/photos/describe", { method: "POST", headers: { "content-type": "application/json", "x-curator-code": code, origin }, body: JSON.stringify(body) });

describe("photo description trust boundary", () => {
  it("rejects unauthorised requests before image processing", async () => {
    expect((await POST(request({}, "wrong-code"))).status).toBe(401);
    expect(mocks.normalize).not.toHaveBeenCalled();
  });
  it("rejects cross-origin requests and absent consent", async () => {
    expect((await POST(request({}, "curator-test-code", "https://elsewhere.example"))).status).toBe(403);
    expect((await POST(request({ dataUrl: "data:image/png;base64,AA==" }))).status).toBe(400);
    expect(mocks.normalize).not.toHaveBeenCalled();
  });
  it("sends only sanitised pixels for consented suggestions", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const suggestions = { title: "Pale vessel", material: "Possibly ceramic", observed: "A pale vessel with a handle.", alt: "A pale handled vessel" };
    mocks.normalize.mockResolvedValue(bytes); mocks.describe.mockResolvedValue(suggestions);
    const response = await POST(request({ dataUrl: "data:image/png;base64,AA==", consent: true }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ suggestions });
    expect(mocks.describe.mock.calls[0][0]).toBe(bytes);
  });
});