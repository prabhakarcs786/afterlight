import { createClient } from "@sanity/client";
import { randomUUID } from "node:crypto";
import { inspectConfiguration } from "../src/lib/readiness";
import { verifyLiveWorkflow } from "../src/lib/live-acceptance";

async function check() {
  const readiness = inspectConfiguration();
  if (!readiness.configured) { console.error(JSON.stringify(readiness, null, 2)); throw new Error("Missing configuration"); }
  const client = createClient({ projectId: process.env.SANITY_STUDIO_PROJECT_ID, dataset: process.env.SANITY_STUDIO_DATASET || "production", apiVersion: "2026-09-01", token: process.env.SANITY_READ_TOKEN, useCdn: false, perspective: "published", timeout: 10_000, maxRetries: 0 });
  const result = await client.fetch<{ collections: number; artifacts: number; exhibited: number }>('{"collections": count(*[_type == "collection"]), "artifacts": count(*[_type == "artifact"]), "exhibited": count(*[_type == "artifact" && stage == "exhibited"])}', {}, { signal: AbortSignal.timeout(10_000) });
  if (result.collections < 3 || result.artifacts < 1) throw new Error("Missing seed data");
  console.log(`Sanity read preflight passed: ${result.collections} collections, ${result.artifacts} objects, ${result.exhibited} exhibited.`);
  if (!process.argv.includes("--exercise")) {
    console.log("READ PREFLIGHT ONLY. Set APP_URL to the running app and rerun with --exercise to test real model drafting and temporary content writes.");
    return;
  }
  if (!process.env.APP_URL) throw new Error("APP_URL is required for live acceptance checks");
  console.log("This check consumes model quota and briefly exhibits one uniquely named temporary object, then withdraws and deletes it.");
  const writer = client.withConfig({ token: process.env.SANITY_WRITE_TOKEN });
  const accepted = await verifyLiveWorkflow(process.env.APP_URL, process.env.CURATOR_ACCESS_CODE!, {
    nonce: randomUUID(),
    cleanup: async (id, input) => {
      const matching = await writer.fetch<{ _id: string; title: string; observed: string }[]>('*[_type == "artifact" && title == $title && observed == $observed][0...2]{_id,title,observed}', { title: input.title, observed: input.observed }, { signal: AbortSignal.timeout(10_000) });
      if (matching.length > 1) throw new Error("Ambiguous cleanup; inspect the temporary records manually");
      for (const document of matching) {
        if ((id && document._id !== id) || !document._id.startsWith("artifact-")) throw new Error("Cleanup ownership mismatch");
        await writer.delete(document._id);
        if (await writer.getDocument(document._id)) throw new Error("Temporary record cleanup was not confirmed");
      }
      if (id && matching.length === 0 && await writer.getDocument(id)) throw new Error("The temporary record changed unexpectedly; cleanup needs review");
    },
  });
  console.log(JSON.stringify({ status: "LIVE_WORKFLOW_PASSED", ...accepted, cleanedUp: true }, null, 2));
  console.log("Still verify cross-browser live refresh in the UI; this HTTP check does not prove SSE delivery.");
}

check().catch(() => { console.error("Live verification failed. Check npm run doctor, APP_URL, live server mode, dataset access, model access, and temporary Live acceptance records if cleanup was interrupted. No credentials or provider response bodies were logged."); process.exitCode = 1; });