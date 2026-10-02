import { defineArrayMember, defineField, defineType } from "sanity";
import { artifactKinds, stages } from "../src/lib/domain";

export const schemaTypes = [
  defineType({ name: "collection", title: "Collection", type: "document", fields: [
    defineField({ name: "title", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "description", type: "text", rows: 3, validation: (rule) => rule.required().max(500) }),
    defineField({ name: "color", type: "string", validation: (rule) => rule.required().regex(/^#[0-9a-fA-F]{6}$/) }),
  ] }),
  defineType({ name: "artifact", title: "Archive object", type: "document", groups: [
    { name: "observed", title: "Observed object", default: true },
    { name: "interpretation", title: "Fictional interpretation" },
    { name: "workflow", title: "Workflow & provenance" },
  ], fields: [
    defineField({ name: "title", type: "string", group: "observed", validation: (rule) => rule.required().min(3).max(90) }),
    defineField({ name: "kind", type: "string", group: "observed", options: { list: [...artifactKinds] }, validation: (rule) => rule.required() }),
    defineField({ name: "photo", title: "Uploaded object photo", type: "image", group: "observed", hidden: ({ document }) => document?.kind !== "photo", readOnly: ({ document }) => document?.stage !== "intake", fields: [defineField({ name: "alt", title: "Photo description", type: "string", validation: (rule) => rule.required().min(3).max(300) })], validation: (rule) => rule.custom((value, context) => context.document?.kind === "photo" && !value?.asset ? "A photo exhibit needs an image." : true) }),
    defineField({ name: "collection", type: "reference", group: "observed", to: [{ type: "collection" }], validation: (rule) => rule.required() }),
    defineField({ name: "accession", type: "string", group: "observed", readOnly: true, validation: (rule) => rule.required() }),
    defineField({ name: "material", type: "string", group: "observed", validation: (rule) => rule.required().min(2).max(100) }),
    defineField({ name: "observed", title: "Observable details", type: "text", group: "observed", rows: 5, validation: (rule) => rule.required().min(10).max(1000) }),
    defineField({ name: "interpretation", type: "text", group: "interpretation", rows: 6, readOnly: ({ document }) => document?.stage !== "draft", validation: (rule) => rule.max(1200) }),
    defineField({ name: "label", title: "Exhibition label", type: "text", group: "interpretation", rows: 4, readOnly: ({ document }) => document?.stage !== "draft", validation: (rule) => rule.max(500) }),
    defineField({ name: "strangeness", type: "number", group: "interpretation", readOnly: ({ document }) => document?.stage !== "draft", validation: (rule) => rule.required().integer().min(1).max(5) }),
    defineField({ name: "stage", type: "string", group: "workflow", readOnly: true, options: { list: [...stages] }, validation: (rule) => rule.required() }),
    defineField({ name: "history", title: "Most recent 100 workflow events", type: "array", group: "workflow", readOnly: true, of: [defineArrayMember({ type: "object", name: "workflowEvent", fields: [
      defineField({ name: "action", type: "string" }), defineField({ name: "actor", type: "string" }),
      defineField({ name: "from", type: "string" }), defineField({ name: "to", type: "string" }),
      defineField({ name: "at", type: "datetime" }), defineField({ name: "note", type: "text" }),
    ], preview: { select: { title: "action", subtitle: "note" } } })], validation: (rule) => rule.max(100) }),
  ], preview: { select: { title: "title", stage: "stage", accession: "accession" }, prepare: ({ title, stage, accession }) => ({ title, subtitle: `${accession} / ${stage}` }) } }),
];