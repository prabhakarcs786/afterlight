import { describe, expect, it } from "vitest";
import { applyOperation, artifactMarkdown, createArtifact, publicCollection, type Artifact, type Operation } from "./domain";
import { prepareLocalDraft, seedArtifacts } from "./fixtures";

const at = "2026-09-30T14:00:00.000Z";
const cup = seedArtifacts.find((artifact) => artifact.kind === "cup")!;
const advance = (artifact: Artifact, action: Operation["action"], id: string) => applyOperation(artifact, { action, expectedRevision: artifact._rev } as Operation, action === "prepare" ? "automation" : "curator", { eventId: id, at, preparedDraft: prepareLocalDraft(artifact) });

describe("curation workflow", () => {
  it("moves through drafting, review, and a human exhibition decision", () => {
    const draft = advance(cup, "prepare", "event-draft");
    const review = advance(draft, "submit", "event-review");
    const exhibited = advance(review, "approve", "event-exhibited");
    expect([draft.stage, review.stage, exhibited.stage]).toEqual(["draft", "review", "exhibited"]);
    expect(exhibited.history.at(-1)?.actor).toBe("curator");
    expect(publicCollection([cup, draft, review, exhibited])).toEqual([exhibited]);
  });
  it("does not allow automation to approve", () => {
    const review = seedArtifacts.find((artifact) => artifact.stage === "review")!;
    expect(() => applyOperation(review, { action: "approve", expectedRevision: review._rev }, "automation", { at, eventId: "bad" })).toThrow("only a curator");
  });
  it("rejects stale revisions instead of overwriting another curator", () => {
    expect(() => applyOperation(cup, { action: "prepare", expectedRevision: "outdated" }, "automation", { at, eventId: "bad", preparedDraft: prepareLocalDraft(cup) })).toThrow("another session");
  });
  it("cannot skip directly from intake to exhibition", () => {
    expect(() => advance(cup, "approve", "bad")).toThrow("Only a reviewed object");
  });
  it("requires a complete label and interpretation before review", () => {
    const draft = { ...cup, stage: "draft" as const };
    expect(() => advance(draft, "submit", "bad")).toThrow("at least 20");
  });
  it("does not allow editing an exhibited artifact in place", () => {
    const exhibited = seedArtifacts[0];
    expect(() => applyOperation(exhibited, { action: "save", expectedRevision: exhibited._rev, draft: prepareLocalDraft(exhibited) }, "curator", { at, eventId: "bad" })).toThrow("Only a draft");
  });
  it("withdraws an exhibited object on revision and keeps the reason", () => {
    const exhibited = seedArtifacts[0];
    const revised = applyOperation(exhibited, { action: "revise", expectedRevision: exhibited._rev, note: "The interpretation needs a clearer fiction label." }, "curator", { at, eventId: "event-return" });
    expect(revised.stage).toBe("draft");
    expect(publicCollection([revised])).toEqual([]);
    expect(revised.history.at(-1)?.note).toContain("fiction label");
  });
  it("does not let generated text change observed facts", () => {
    const draft = advance(cup, "prepare", "event-draft");
    expect(draft.observed).toBe(cup.observed);
    expect(draft.material).toBe(cup.material);
    expect(draft.title).toBe(cup.title);
  });
  it("creates new artifacts only in intake", () => {
    const created = createArtifact({ title: "Recovered glass", kind: "cup", collectionId: "collection-rituals", material: "Clear glass", observed: "A hollow cylinder with a chipped handle." }, "new-object", at);
    expect(created.stage).toBe("intake");
    expect(created._id).toBe("artifact-new-object");
    expect(created.label).toBe("");
  });
  it("exports an explicitly fictional provenance record", () => {
    const output = artifactMarkdown(seedArtifacts[0]);
    expect(output).toContain("fictional archive");
    expect(output).toContain("Workflow history");
    expect(output).toContain("not historical claims");
  });
  it("does not mutate the prior document", () => {
    const previous = structuredClone(cup);
    advance(cup, "prepare", "event-draft");
    expect(cup).toEqual(previous);
  });
});