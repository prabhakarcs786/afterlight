import { createClient } from "@sanity/client";
import { artifactSchema, collections } from "../src/lib/domain";
import { seedArtifacts } from "../src/lib/fixtures";

async function seed() {
  const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
  const token = process.env.SANITY_WRITE_TOKEN;
  if (!projectId || !token) throw new Error("Sanity project and write token are required.");
  const client = createClient({ projectId, dataset: process.env.SANITY_STUDIO_DATASET || "production", apiVersion: "2026-09-01", token, useCdn: false });
  const transaction = client.transaction();
  for (const collection of collections) transaction.createIfNotExists<{ _type: string; _id: string; title: string; description: string; color: string }>({ ...collection, _type: "collection" });
  for (const artifact of seedArtifacts) {
    const fields = artifactSchema.omit({ _rev: true, _updatedAt: true, collectionId: true }).parse(artifact);
    transaction.createIfNotExists({ ...fields, _type: "artifact", collection: { _type: "reference", _ref: artifact.collectionId } });
  }
  await transaction.commit();
  console.log("Seeded 3 collections and 8 fictional objects. Existing records were not overwritten.");
}

seed().catch(() => { console.error("Seed failed. Check project, dataset, and write permission. No credentials were logged."); process.exitCode = 1; });