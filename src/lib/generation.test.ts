import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedArtifacts } from "./fixtures";
import { publicConfig } from "./config";

const mocks = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("ai", async (importOriginal) => ({ ...await importOriginal<typeof import("ai")>(), generateText: mocks.generate }));

import { prepareDraft } from "./generation";

beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("APP_MODE", "live"); vi.stubEnv("GOOGLE_MODEL", ""); });
afterEach(() => vi.unstubAllEnvs());

describe("real model drafting", () => {
  it("does not substitute a sample when live credentials are missing", async () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    await expect(prepareDraft(seedArtifacts[0], new AbortController().signal)).rejects.toMatchObject({ status: 503, code: "drafting-not-configured" });
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(publicConfig().generator).toBe("model");
  });

  it("returns the provider's validated draft", async () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-only-key");
    const output = { label: "A voice kept on a small loop of magnetic tape.", interpretation: "A fictional interpretation of a portable archive of familiar voices.", strangeness: 4 };
    mocks.generate.mockResolvedValue({ output });
    await expect(prepareDraft(seedArtifacts[0], new AbortController().signal)).resolves.toEqual(output);
    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ model: expect.objectContaining({ modelId: "gemini-3.5-flash-lite", provider: "google.generative-ai" }) }));
  });

  it("uses the configured Gemini model", async () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-only-key");
    vi.stubEnv("GOOGLE_MODEL", "gemini-test-model");
    mocks.generate.mockResolvedValue({ output: { label: "An imagined vessel for keeping moments.", interpretation: "Speculative fiction: a small archive for otherwise forgotten moments.", strangeness: 3 } });
    await prepareDraft(seedArtifacts[0], new AbortController().signal);
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ model: expect.objectContaining({ modelId: "gemini-test-model", provider: "google.generative-ai" }) }));
  });

  it("does not substitute a sample when the provider fails", async () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-only-key");
    mocks.generate.mockRejectedValue(new Error("provider unavailable"));
    await expect(prepareDraft(seedArtifacts[0], new AbortController().signal)).rejects.toThrow("provider unavailable");
  });

  it("keeps the local demonstration explicitly labelled as a template", () => {
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-only-key");
    expect(publicConfig().generator).toBe("template");
  });
});