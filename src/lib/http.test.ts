import { describe, expect, it } from "vitest";
import { createWriteBudget, problem, readJson, requireCurator, requireSameOrigin } from "./http";
import { WorkflowError } from "./domain";

describe("curator trust boundary", () => {
  it("rejects missing or incorrect access codes", () => {
    expect(() => requireCurator(new Request("http://localhost/api/artifacts"), "test-only-code")).toThrow("valid curator");
    expect(() => requireCurator(new Request("http://localhost/api/artifacts"), "")).toThrow("not been configured");
    expect(() => requireCurator(new Request("http://localhost/api/artifacts", { headers: { "x-curator-code": "test-only-code" } }), "test-only-code")).not.toThrow();
  });
  it("allows the browser host, but not cross-origin mutations", () => {
    expect(() => requireSameOrigin(new Request("http://localhost/api/artifacts", { headers: { Host: "127.0.0.1:3002", Origin: "http://127.0.0.1:3002" } }))).not.toThrow();
    expect(() => requireSameOrigin(new Request("http://localhost/api/artifacts", { headers: { Origin: "https://elsewhere.example" } }))).toThrow("Cross-origin");
    expect(() => requireSameOrigin(new Request("http://localhost/api/artifacts", { headers: { Origin: "null" } }))).toThrow("Cross-origin");
  });
  it("bounds and parses JSON input", async () => {
    const makeRequest = (body: string) => new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body });
    await expect(readJson(makeRequest('{"title":"test"}'))).resolves.toEqual({ title: "test" });
    await expect(readJson(makeRequest("x".repeat(9000)))).rejects.toThrow("too large");
    await expect(readJson(makeRequest("{"))).rejects.toThrow("not valid JSON");
  });
  it("maps concurrent edits to 409 and hides upstream details", async () => {
    expect(problem(new WorkflowError("conflict", "Reload first.")).status).toBe(409);
    expect(await problem(new Error("sensitive-api-token")).text()).not.toContain("sensitive-api-token");
  });
  it("limits repeated writes", () => {
    let time = 0;
    const permit = createWriteBudget(1, () => time);
    permit();
    expect(permit).toThrow("budget");
    time = 60_000;
    expect(permit).not.toThrow();
  });
});