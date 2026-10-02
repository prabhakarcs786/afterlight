import { describe, expect, it } from "vitest";
import { decodeSnapshot, encodeSnapshot } from "./demo-store";
import { seedArtifacts } from "./fixtures";

describe("local demonstration persistence", () => {
  it("returns independent seed snapshots", () => {
    const first = decodeSnapshot(null);
    first[0].title = "Changed";
    expect(decodeSnapshot(null)[0].title).toBe(seedArtifacts[0].title);
  });
  it("round-trips validated artifacts", () => {
    expect(decodeSnapshot(encodeSnapshot(seedArtifacts))).toEqual(seedArtifacts);
  });
  it("rejects corrupt, unsupported, or duplicate records", () => {
    expect(() => decodeSnapshot("{")).toThrow();
    expect(() => decodeSnapshot('{"version":99,"artifacts":[]}')).toThrow();
    expect(() => decodeSnapshot(encodeSnapshot([seedArtifacts[0], seedArtifacts[0]]))).toThrow("duplicate");
  });
});