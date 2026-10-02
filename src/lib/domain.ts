import { z } from "zod";

export const objectKinds = ["cassette", "key", "disk", "bulb", "phone", "cup", "disc", "battery"] as const;
export type ObjectKind = typeof objectKinds[number];
export const artifactKinds = [...objectKinds, "photo"] as const;
export const maxPhotoBytes = 2 * 1024 * 1024;
export const photoDataSchema = z.string().max(Math.ceil(maxPhotoBytes / 3) * 4 + 64).regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/, "Choose a JPEG, PNG, or WebP photo.");
export const photoSchema = z.object({
  url: z.union([photoDataSchema, z.url().max(2048).refine((value) => { const url = new URL(value); return url.protocol === "https:" && url.hostname === "cdn.sanity.io" && url.pathname.startsWith("/images/") && !url.username && !url.password; }, "Invalid photo location.")]),
  alt: z.string().trim().min(3).max(300),
  assetId: z.string().regex(/^image-[a-f0-9]+-\d+x\d+-[a-z0-9]+$/).optional(),
});
export const stages = ["intake", "draft", "review", "exhibited"] as const;
export const collections = [
  { _id: "collection-signals", title: "Signals & silence", description: "Objects that once carried a voice.", color: "#cce5e6" },
  { _id: "collection-rituals", title: "Everyday rituals", description: "Small ceremonies, long forgotten.", color: "#f4d6d0" },
  { _id: "collection-energy", title: "Borrowed energy", description: "Things that held a little light.", color: "#e8ebbb" },
] as const;

export const eventSchema = z.object({
  _key: z.string().min(1),
  action: z.enum(["intake", "prepare", "save", "submit", "approve", "revise"]),
  actor: z.enum(["automation", "curator"]),
  from: z.enum(stages),
  to: z.enum(stages),
  at: z.iso.datetime(),
  note: z.string().max(500),
});

export const artifactSchema = z.object({
  _id: z.string().regex(/^artifact-[a-z0-9-]+$/).max(100),
  _rev: z.string().min(1).max(200),
  _updatedAt: z.iso.datetime(),
  title: z.string().trim().min(3).max(90),
  kind: z.enum(artifactKinds),
  photo: photoSchema.nullish(),
  collectionId: z.enum(["collection-signals", "collection-rituals", "collection-energy"]),
  accession: z.string().min(1).max(30),
  material: z.string().trim().min(2).max(100),
  observed: z.string().trim().min(10).max(1000),
  interpretation: z.string().trim().max(1200),
  label: z.string().trim().max(500),
  strangeness: z.number().int().min(1).max(5),
  stage: z.enum(stages),
  history: z.array(eventSchema).max(100),
});

export const draftSchema = artifactSchema.pick({ label: true, interpretation: true, strangeness: true });
export const photoDescriptionSchema = artifactSchema.pick({ title: true, material: true, observed: true }).extend({ alt: z.string().trim().min(3).max(300) });
export const intakeSchema = artifactSchema.pick({ title: true, kind: true, collectionId: true, material: true, observed: true }).extend({
  photo: z.object({ dataUrl: photoDataSchema, alt: z.string().trim().min(3).max(300), consent: z.literal(true) }).optional(),
}).superRefine((value, context) => {
  if (value.kind === "photo" && !value.photo) context.addIssue({ code: "custom", path: ["photo"], message: "Add a photo and confirm permission before saving." });
  if (value.kind !== "photo" && value.photo) context.addIssue({ code: "custom", path: ["kind"], message: "Uploaded photos must use the photo exhibit type." });
});
export const operationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare"), expectedRevision: z.string().min(1).max(200) }),
  z.object({ action: z.literal("save"), expectedRevision: z.string().min(1).max(200), draft: draftSchema }),
  z.object({ action: z.literal("submit"), expectedRevision: z.string().min(1).max(200) }),
  z.object({ action: z.literal("approve"), expectedRevision: z.string().min(1).max(200) }),
  z.object({ action: z.literal("revise"), expectedRevision: z.string().min(1).max(200), note: z.string().trim().min(5).max(500) }),
]);

export type Artifact = z.infer<typeof artifactSchema>;
export type Draft = z.infer<typeof draftSchema>;
export type Intake = z.infer<typeof intakeSchema>;
export type PhotoDescription = z.infer<typeof photoDescriptionSchema>;
export type Operation = z.infer<typeof operationSchema>;
export type Stage = Artifact["stage"];
export type Actor = "automation" | "curator";

export class WorkflowError extends Error {
  constructor(public code: "conflict" | "forbidden" | "transition" | "incomplete", message: string) { super(message); }
}

export function createArtifact(input: Intake, id: string, now = new Date().toISOString()): Artifact {
  const intake = intakeSchema.parse(input);
  return artifactSchema.parse({ ...intake, photo: intake.photo ? { url: intake.photo.dataUrl, alt: intake.photo.alt } : null, _id: `artifact-${id}`, _rev: `intake-${id}`, _updatedAt: now, accession: `A-${id.slice(0, 8).toUpperCase()}`, interpretation: "", label: "", strangeness: 3, stage: "intake", history: [{ _key: id, action: "intake", actor: "curator", from: "intake", to: "intake", at: now, note: "Entered the fictional archive." }] });
}

export function applyOperation(currentInput: Artifact, operationInput: Operation, actor: Actor, context: { eventId: string; at: string; preparedDraft?: Draft }): Artifact {
  const current = artifactSchema.parse(currentInput);
  const operation = operationSchema.parse(operationInput);
  if (current._rev !== operation.expectedRevision) throw new WorkflowError("conflict", "This object changed in another session. Reload before editing.");
  if (actor === "automation" && operation.action !== "prepare") throw new WorkflowError("forbidden", "Automation may draft, but only a curator may review or exhibit.");
  let stage = current.stage;
  let draft: Draft = { label: current.label, interpretation: current.interpretation, strangeness: current.strangeness };
  let note: string;
  if (operation.action === "prepare") {
    if (!["intake", "draft"].includes(stage)) throw new WorkflowError("transition", "Only intake and draft objects can be prepared.");
    if (!context.preparedDraft) throw new WorkflowError("incomplete", "A generated draft is required.");
    draft = draftSchema.parse(context.preparedDraft);
    stage = "draft";
    note = "Prepared an explicitly fictional interpretation for human review.";
  } else if (operation.action === "save") {
    if (stage !== "draft") throw new WorkflowError("transition", "Only a draft can be edited.");
    draft = operation.draft;
    note = "Curator revised the draft.";
  } else if (operation.action === "submit") {
    if (stage !== "draft") throw new WorkflowError("transition", "Only a draft can be submitted.");
    assertComplete(draft);
    stage = "review";
    note = "Submitted for human review.";
  } else if (operation.action === "approve") {
    if (stage !== "review") throw new WorkflowError("transition", "Only a reviewed object can be exhibited.");
    assertComplete(draft);
    stage = "exhibited";
    note = "Approved by a curator for the public fictional collection.";
  } else {
    if (!["review", "exhibited"].includes(stage)) throw new WorkflowError("transition", "Only reviewed or exhibited objects can return to draft.");
    stage = "draft";
    note = operation.note;
  }
  return artifactSchema.parse({
    ...current, ...draft, stage, _rev: context.eventId, _updatedAt: context.at,
    history: [...current.history.slice(-99), { _key: context.eventId, action: operation.action, actor, from: current.stage, to: stage, at: context.at, note }],
  });
}

function assertComplete(draft: Draft) {
  if (draft.label.length < 20 || draft.interpretation.length < 30) throw new WorkflowError("incomplete", "A label of at least 20 characters and an interpretation of at least 30 characters are required.");
}

export function publicCollection(artifacts: Artifact[]): Artifact[] {
  return artifacts.filter((artifact) => artifact.stage === "exhibited");
}

export function artifactMarkdown(artifact: Artifact): string {
  const collection = collections.find((item) => item._id === artifact.collectionId)!;
  return [
    `# ${artifact.title}`,
    `Afterlight / fictional archive / ${artifact.accession}`,
    `Collection: ${collection.title}\nStage: ${artifact.stage}\nStrangeness: ${artifact.strangeness}/5`,
    `## Observed material\n${artifact.material}\n\n${artifact.observed}`,
    `## Fictional interpretation\n${artifact.interpretation || "Not drafted."}`,
    `## Exhibition label\n${artifact.label || "Not drafted."}`,
    ...(artifact.photo ? [`## Reference image\n${artifact.photo.alt}`, artifact.photo.assetId ? `Photo: ${artifact.photo.url}` : "The uploaded image is stored in this browser and is not embedded in this text export."] : []),
    "## Workflow history",
    ...artifact.history.map((event) => `- ${event.at}: ${event.actor} / ${event.from} -> ${event.to} / ${event.note}`),
    "The object rendering and interpretation are creative reconstructions, not historical claims.",
  ].join("\n\n");
}