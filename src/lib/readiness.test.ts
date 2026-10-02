import { describe, expect, it } from "vitest";
import { appMode } from "./config";
import { applicationOrigin, inspectConfiguration } from "./readiness";

describe("live readiness", () => {
  it("requires an explicit production mode", () => {
    expect(() => appMode({ NODE_ENV: "production" })).toThrow("APP_MODE explicitly");
    expect(appMode({ NODE_ENV: "production", APP_MODE: "live" })).toBe("live");
  });
  it("requires real model credentials and never logs them", () => {
    const result = inspectConfiguration({ SANITY_WRITE_TOKEN: "not-a-real-private-token", OPENAI_API_KEY: "legacy-test-key" });
    expect(result.missing).toContain("GOOGLE_GENERATIVE_AI_API_KEY");
    expect(JSON.stringify(result)).not.toContain("not-a-real-private-token");
  });
  it("accepts Gemini configuration without OpenAI credentials", () => {
    const result = inspectConfiguration({ APP_MODE: "live", SANITY_STUDIO_PROJECT_ID: "project42", SANITY_READ_TOKEN: "test-viewer-token", SANITY_WRITE_TOKEN: "test-editor-token", GOOGLE_GENERATIVE_AI_API_KEY: "test-only-key", CURATOR_ACCESS_CODE: "curator-test-code-long-enough" });
    expect(result.configured).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.liveVerified).toBe(false);
    expect(JSON.stringify(result)).not.toContain("test-only-key");
  });
  it("rejects placeholders and short access codes", () => {
    const result = inspectConfiguration({ APP_MODE: "live", SANITY_STUDIO_PROJECT_ID: "YOUR_PROJECT_ID", CURATOR_ACCESS_CODE: "short" });
    expect(result.missing).toContain("SANITY_STUDIO_PROJECT_ID");
    expect(result.issues).toContain("Use a CURATOR_ACCESS_CODE of at least 24 characters.");
    expect(result.liveVerified).toBe(false);
  });
  it("limits credential-bearing probes to HTTPS or loopback origins", () => {
    expect(applicationOrigin("http://127.0.0.1:3002")).toBe("http://127.0.0.1:3002");
    expect(() => applicationOrigin("http://remote.test")).toThrow("HTTPS");
    expect(() => applicationOrigin("https://remote.test/path")).toThrow("HTTPS");
  });
});