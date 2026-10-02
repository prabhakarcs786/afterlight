"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { z } from "zod";
import { applyOperation, artifactSchema, createArtifact, photoDescriptionSchema, type Artifact, type Intake, type Operation, type PhotoDescription } from "@/lib/domain";
import { prepareLocalDraft } from "@/lib/fixtures";
import { decodeSnapshot, encodeSnapshot, storageKey } from "@/lib/demo-store";

const responseSchema = z.object({ artifacts: z.array(artifactSchema) });

export function useArchive(mode: "demo" | "live", initialArtifacts: Artifact[], initialError: string | null) {
  const [artifacts, setArtifacts] = useState(initialArtifacts);
  const [error, setError] = useState(initialError || "");
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(mode === "live");
  const [pending, setPending] = useState(false);
  const [curatorCode, setCuratorCode] = useState("");
  const [connection, setConnection] = useState(mode === "demo" ? "Local archive" : "Connecting");

  useEffect(() => {
    if (mode !== "demo") return;
    const hydrate = () => {
      try { setArtifacts(decodeSnapshot(localStorage.getItem(storageKey))); setReady(true); }
      catch { setError("The saved demo archive could not be read. Reset it to restore the sample collection."); }
    };
    queueMicrotask(hydrate);
    const onStorage = (event: StorageEvent) => { if (event.key === storageKey) hydrate(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [mode]);

  const refreshLive = useEffectEvent(async () => {
    try {
      const response = await fetch(`/api/artifacts${curatorCode ? "?view=curator" : ""}`, { headers: curatorCode ? { "x-curator-code": curatorCode } : {}, cache: "no-store", signal: AbortSignal.timeout(12_000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.title || "Archive unavailable.");
      setArtifacts(responseSchema.parse(data).artifacts); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Archive unavailable."); }
  });

  useEffect(() => {
    if (mode !== "live") return;
    const source = new EventSource("/api/events");
    const update = () => { void refreshLive(); };
    source.addEventListener("ready", () => setConnection("Live stream"));
    source.addEventListener("change", update);
    source.addEventListener("unavailable", () => setConnection("Polling fallback"));
    source.onerror = () => setConnection("Reconnecting");
    const polling = setInterval(update, 15_000);
    return () => { source.close(); clearInterval(polling); };
  }, [mode]);

  async function unlock(code: string) {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/artifacts?view=curator", { headers: { "x-curator-code": code }, cache: "no-store", signal: AbortSignal.timeout(12_000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.title || "Curator access failed.");
      setArtifacts(responseSchema.parse(data).artifacts); setCuratorCode(code); setNotice("Curator access opened for this session.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Access failed."); }
    finally { setPending(false); }
  }

  async function operation(id: string, action: Operation): Promise<Artifact | null> {
    setPending(true); setError(""); setNotice("");
    try {
      let updated: Artifact;
      if (mode === "demo") {
        const latest = decodeSnapshot(localStorage.getItem(storageKey));
        const current = latest.find((artifact) => artifact._id === id);
        if (!current) throw new Error("The object no longer exists in this archive.");
        updated = applyOperation(current, action, action.action === "prepare" ? "automation" : "curator", { eventId: crypto.randomUUID(), at: new Date().toISOString(), preparedDraft: action.action === "prepare" ? prepareLocalDraft(current) : undefined });
        const next = latest.map((artifact) => artifact._id === id ? updated : artifact);
        localStorage.setItem(storageKey, encodeSnapshot(next)); setArtifacts(next);
      } else {
        const response = await fetch(`/api/artifacts/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-curator-code": curatorCode }, body: JSON.stringify(action), signal: AbortSignal.timeout(40_000) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.title || "The object could not be updated.");
        updated = artifactSchema.parse(data.artifact);
        setArtifacts((previous) => previous.map((artifact) => artifact._id === id ? updated : artifact));
      }
      setNotice(action.action === "approve" ? "Object approved and added to the exhibition." : action.action === "revise" ? "Returned to draft and removed from the exhibition." : "Archive updated.");
      return updated;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The change failed; nothing was saved."); return null; }
    finally { setPending(false); }
  }

  async function add(input: Intake): Promise<Artifact | null> {
    setPending(true); setError("");
    try {
      let created: Artifact;
      if (mode === "demo") {
        const latest = decodeSnapshot(localStorage.getItem(storageKey));
        if (latest.length >= 100) throw new Error("This demo archive has reached its 100-object limit.");
        created = createArtifact(input, crypto.randomUUID());
        const next = [...latest, created]; localStorage.setItem(storageKey, encodeSnapshot(next)); setArtifacts(next);
      } else {
        const response = await fetch("/api/artifacts", { method: "POST", headers: { "Content-Type": "application/json", "x-curator-code": curatorCode }, body: JSON.stringify(input), signal: AbortSignal.timeout(30_000) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.title || "Object intake failed.");
        created = artifactSchema.parse(data.artifact); setArtifacts((previous) => [...previous, created]);
      }
      setNotice("Object entered into intake."); return created;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Object intake failed."); return null; }
    finally { setPending(false); }
  }

  function resetDemo() {
    try { localStorage.removeItem(storageKey); setArtifacts(decodeSnapshot(null)); setReady(true); setError(""); setNotice("Local archive reset to the original collection."); }
    catch { setError("Browser storage is unavailable. Enable local storage to edit the demo."); }
  }

  async function suggestPhoto(dataUrl: string): Promise<PhotoDescription | null> {
    setPending(true); setError("");
    try {
      if (mode !== "live") throw new Error("Photo suggestions require live Gemini access.");
      const response = await fetch("/api/photos/describe", { method: "POST", headers: { "Content-Type": "application/json", "x-curator-code": curatorCode }, body: JSON.stringify({ dataUrl, consent: true }), signal: AbortSignal.timeout(40_000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.title || "Photo description failed.");
      return photoDescriptionSchema.parse(data.suggestions);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Photo description failed."); return null; }
    finally { setPending(false); }
  }

  return { artifacts, error, notice, ready, pending, connection, unlocked: mode === "demo" || Boolean(curatorCode), operation, add, unlock, resetDemo, suggestPhoto };
}