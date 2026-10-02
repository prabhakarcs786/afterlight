import { connection } from "next/server";
import { Museum } from "@/components/museum";
import { publicConfig } from "@/lib/config";
import { listArtifacts } from "@/lib/repository";
import { seedArtifacts } from "@/lib/fixtures";
import { type Artifact } from "@/lib/domain";

export default async function Home() {
  await connection();
  const config = publicConfig();
  let artifacts: Artifact[] = [];
  let error: string | null = null;
  if (config.mode === "demo") artifacts = seedArtifacts;
  else {
    try { artifacts = await listArtifacts(); }
    catch { error = "The live archive is unavailable. Check the Sanity project, dataset, read token, and seed content. Demo objects were not substituted."; }
  }
  return <Museum {...config} initialArtifacts={artifacts} initialError={error} />;
}
