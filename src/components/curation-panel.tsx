"use client";

import { useState, type FormEvent } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, CheckCheck, Clock3, FilePenLine, LoaderCircle, RotateCcw, Save, Sparkles } from "lucide-react";
import { artifactMarkdown, collections, intakeSchema, objectKinds, type Artifact, type Draft, type Intake, type Operation } from "@/lib/domain";

export function ArtifactEditor({ artifact, pending, generator, operate }: { artifact: Artifact; pending: boolean; generator: "model" | "template"; operate: (operation: Operation) => Promise<Artifact | null> }) {
  const [base, setBase] = useState(artifact);
  const [draft, setDraft] = useState<Draft>({ label: artifact.label, interpretation: artifact.interpretation, strangeness: artifact.strangeness });
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState("");
  const stale = base._rev !== artifact._rev;
  const dirty = draft.label !== base.label || draft.interpretation !== base.interpretation || draft.strangeness !== base.strangeness;

  function load(updated: Artifact) { setBase(updated); setDraft({ label: updated.label, interpretation: updated.interpretation, strangeness: updated.strangeness }); setReason(""); setLocalError(""); }
  async function run(operation: Operation) { const updated = await operate(operation); if (updated) load(updated); }
  function download() {
    const url = URL.createObjectURL(new Blob([artifactMarkdown(artifact)], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${artifact.accession.toLowerCase()}.md`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div className="curation-panel">
    <div className="panel-title"><h3>Curator desk</h3><span className={`stage-label stage-${artifact.stage}`}>{artifact.stage}</span></div>
    {stale && <div className="message warning" role="alert">This object changed since you opened it.<button type="button" className="text-action" onClick={() => load(artifact)}><RotateCcw size={14} aria-hidden="true" />Discard local edits and reload</button></div>}
    {(artifact.stage === "intake" || artifact.stage === "draft") && <button type="button" className="secondary-command" disabled={pending || stale || dirty} onClick={() => run({ action: "prepare", expectedRevision: base._rev })}>{pending ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}{generator === "model" ? "Draft with AI" : "Prepare a sample draft"}</button>}
    {artifact.stage === "draft" && <form onSubmit={(event) => { event.preventDefault(); void run({ action: "save", expectedRevision: base._rev, draft }); }}>
      <fieldset disabled={pending || stale} className="editor-fields"><label htmlFor="interpretation">Fictional interpretation</label><textarea id="interpretation" rows={5} maxLength={1200} value={draft.interpretation} onChange={(event) => setDraft({ ...draft, interpretation: event.target.value })} /><label htmlFor="exhibit-label">Exhibition label</label><textarea id="exhibit-label" rows={4} maxLength={500} value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} /><label className="range-label" htmlFor="strangeness">Strangeness <output>{draft.strangeness} / 5</output></label><input id="strangeness" type="range" min={1} max={5} step={1} value={draft.strangeness} onChange={(event) => setDraft({ ...draft, strangeness: Number(event.target.value) })} /></fieldset>
      <div className="editor-actions"><button type="submit" className="secondary-command" disabled={pending || stale || !dirty}><Save size={16} aria-hidden="true" />Save draft</button><button type="button" className="primary-command" disabled={pending || stale || dirty} onClick={() => run({ action: "submit", expectedRevision: base._rev })}>Submit for review<ArrowRight size={16} aria-hidden="true" /></button></div>
      {dirty && <p className="field-status" role="status">Unsaved draft</p>}
    </form>}
    {artifact.stage === "review" && <div className="approval-block"><span className="eyebrow">HUMAN REVIEW</span><h4>Ready for the collection?</h4><p>{artifact.label}</p><button type="button" className="primary-command" disabled={pending || stale} onClick={() => run({ action: "approve", expectedRevision: base._rev })}><CheckCheck size={18} aria-hidden="true" />Approve & exhibit</button></div>}
    {artifact.stage === "exhibited" && <div className="exhibited-state"><Check size={18} aria-hidden="true" /><span>Part of the public collection</span></div>}
    {(artifact.stage === "review" || artifact.stage === "exhibited") && <form className="revision-form" onSubmit={(event) => { event.preventDefault(); if (reason.trim().length < 5) { setLocalError("Add a revision reason of at least five characters."); return; } void run({ action: "revise", expectedRevision: base._rev, note: reason }); }}><label htmlFor="revision-reason">Revision reason</label><input id="revision-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={500} required placeholder="What should change?" /><button type="submit" className="text-action" disabled={pending || stale}><ArrowLeft size={14} aria-hidden="true" />Return to draft</button></form>}
    {localError && <p role="alert" className="message error">{localError}</p>}
    <details className="history"><summary><Clock3 size={15} aria-hidden="true" />Workflow history<span>{artifact.history.length}</span></summary><ol>{[...artifact.history].reverse().map((event) => <li key={event._key}><strong>{event.action} <span>/ {event.actor}</span></strong><p>{event.note}</p><time dateTime={event.at}>{event.at.slice(0, 16).replace("T", " ")} UTC</time></li>)}</ol></details>
    <button className="text-action export-action" type="button" onClick={download}><ArrowDownToLine size={15} aria-hidden="true" />Export catalogue record</button>
  </div>;
}

export function IntakeForm({ pending, onAdd, onCancel }: { pending: boolean; onAdd: (input: Intake) => Promise<Artifact | null>; onCancel: () => void }) {
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = intakeSchema.safeParse(values);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Check the object details."); return; }
    await onAdd(parsed.data);
  }
  return <section className="intake-view" aria-labelledby="intake-heading"><button className="text-action" type="button" onClick={onCancel}><ArrowLeft size={15} aria-hidden="true" />Back to curator desk</button><div className="intake-heading"><FilePenLine size={26} aria-hidden="true" /><div><span className="eyebrow">ACCESSION / NEW OBJECT</span><h2 id="intake-heading">A small thing, worth keeping.</h2></div></div><form onSubmit={submit}><fieldset disabled={pending} className="intake-fields"><label htmlFor="intake-title">Object title</label><input id="intake-title" name="title" required minLength={3} maxLength={90} placeholder="The name it might have had" /><div className="field-pair"><div><label htmlFor="intake-kind">Reconstruction</label><select id="intake-kind" name="kind">{objectKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></div><div><label htmlFor="intake-collection">Collection</label><select id="intake-collection" name="collectionId">{collections.map((collection) => <option key={collection._id} value={collection._id}>{collection.title}</option>)}</select></div></div><label htmlFor="intake-material">Observed material</label><input id="intake-material" name="material" required minLength={2} maxLength={100} placeholder="Glass, brass, worn plastic..." /><label htmlFor="intake-observed">Observable details</label><textarea id="intake-observed" name="observed" required minLength={10} maxLength={1000} rows={5} placeholder="Only what can be seen. Interpretation comes later." /></fieldset>{error && <p role="alert" className="message error">{error}</p>}<button className="primary-command" type="submit" disabled={pending}>{pending ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}Enter into archive</button></form></section>;
}