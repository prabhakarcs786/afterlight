import "server-only";
import { createClient } from "@sanity/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { applyOperation, artifactSchema, createArtifact, WorkflowError, type Artifact, type Intake, type Operation } from "./domain";
import { prepareDraft } from "./generation";
import { HttpError } from "./http";

export type ArtifactDocument = Omit<Artifact, "collectionId"> & { _type: "artifact"; collection: { _type: "reference"; _ref: Artifact["collectionId"] } };

export function sanityClient(write = false) {
  const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
  const token = write ? process.env.SANITY_WRITE_TOKEN : process.env.SANITY_READ_TOKEN;
  if (!projectId || (write && !token)) throw new HttpError(503, "sanity-not-configured", "Configure the Sanity project and least-privilege server tokens.");
  return createClient({ projectId, dataset: process.env.SANITY_STUDIO_DATASET || "production", apiVersion: "2026-09-01", useCdn: false, token, perspective: "published", timeout: 10_000, maxRetries: 1 });
}

export const artifactProjection = `{_id, _rev, _updatedAt, title, kind, "collectionId": collection._ref, accession, material, observed, interpretation, label, strangeness, stage, history}`;

export async function listArtifacts(curator = false): Promise<Artifact[]> {
  const result = await sanityClient().fetch(`*[_type == "artifact" && !(_id in path("drafts.**")) && ($curator || stage == "exhibited")] | order(accession asc)[0...100]${artifactProjection}`, { curator }, { signal: AbortSignal.timeout(10_000) });
  return z.array(artifactSchema).parse(result);
}

function fromDocument(document: ArtifactDocument): Artifact {
  return artifactSchema.parse({ ...document, collectionId: document.collection?._ref });
}

export async function insertArtifact(input: Intake): Promise<Artifact> {
  const artifact = createArtifact(input, randomUUID());
  const fields = artifactSchema.omit({ _rev: true, _updatedAt: true, collectionId: true }).parse(artifact);
  const saved = await sanityClient(true).create<Omit<ArtifactDocument, "_rev" | "_updatedAt">>({ ...fields, _type: "artifact", collection: { _type: "reference", _ref: artifact.collectionId } });
  return fromDocument(saved);
}

export async function changeArtifact(id: string, operation: Operation, signal: AbortSignal): Promise<Artifact> {
  const client = sanityClient(true);
  const document = await client.getDocument<ArtifactDocument>(id);
  if (!document) throw new HttpError(404, "not-found", "This object no longer exists.");
  const current = fromDocument(document);
  if (current._rev !== operation.expectedRevision) throw new WorkflowError("conflict", "This object changed in another session. Reload before editing.");
  if (operation.action === "prepare" && !["intake", "draft"].includes(current.stage)) throw new WorkflowError("transition", "Only intake and draft objects can be prepared.");
  const preparedDraft = operation.action === "prepare" ? await prepareDraft(current, signal) : undefined;
  const next = applyOperation(current, operation, operation.action === "prepare" ? "automation" : "curator", { eventId: randomUUID(), at: new Date().toISOString(), preparedDraft });
  try {
    const saved = await client.patch(id).ifRevisionId(operation.expectedRevision).set({ stage: next.stage, label: next.label, interpretation: next.interpretation, strangeness: next.strangeness, history: next.history }).commit<ArtifactDocument>({ visibility: "sync" });
    return fromDocument(saved);
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error && error.statusCode === 409) throw new WorkflowError("conflict", "Another curator saved this object first. Reload; your change was not applied.");
    throw error;
  }
}