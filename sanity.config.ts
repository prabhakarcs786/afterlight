import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./sanity/schema";
import { stages } from "./src/lib/domain";

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
if (!projectId) throw new Error("Set SANITY_STUDIO_PROJECT_ID before starting the Afterlight Studio.");

export default defineConfig({
  name: "afterlight", title: "Afterlight / The Curator Archive", projectId, dataset: process.env.SANITY_STUDIO_DATASET || "production",
  plugins: [structureTool({ structure: (builder) => builder.list().title("The archive").items([
    builder.documentTypeListItem("collection").title("Collections"), builder.divider(),
    ...stages.map((stage) => builder.listItem().title(stage.charAt(0).toUpperCase() + stage.slice(1)).child(builder.documentList().title(stage).filter('_type == "artifact" && stage == $stage').params({ stage }))),
  ]) })],
  schema: { types: schemaTypes },
});