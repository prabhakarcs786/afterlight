import { z } from "zod";
import { artifactSchema, type Artifact } from "./domain";
import { seedArtifacts } from "./fixtures";

export const storageKey = "afterlight-demo-v1";
const snapshotSchema = z.object({ version: z.literal(1), artifacts: z.array(artifactSchema).max(100) });

export function decodeSnapshot(raw: string | null): Artifact[] {
  if (!raw) return structuredClone(seedArtifacts);
  const snapshot = snapshotSchema.parse(JSON.parse(raw));
  if (new Set(snapshot.artifacts.map((artifact) => artifact._id)).size !== snapshot.artifacts.length) throw new Error("The saved archive contains duplicate objects.");
  return snapshot.artifacts;
}

export function encodeSnapshot(artifacts: Artifact[]): string {
  return JSON.stringify(snapshotSchema.parse({ version: 1, artifacts }));
}