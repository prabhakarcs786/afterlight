import { createHash, timingSafeEqual } from "node:crypto";
import { WorkflowError } from "./domain";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function requireCurator(request: Request, expected = process.env.CURATOR_ACCESS_CODE) {
  if (!expected) throw new HttpError(503, "curation-not-configured", "Live curation access has not been configured.");
  const digest = (value: string) => createHash("sha256").update(value).digest();
  const provided = request.headers.get("x-curator-code") || "";
  if (!timingSafeEqual(digest(provided), digest(expected))) throw new HttpError(401, "curator-access-required", "Enter a valid curator access code.");
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  let accepted: boolean;
  try {
    const parsed = new URL(origin);
    accepted = ["http:", "https:"].includes(parsed.protocol) && parsed.host === (request.headers.get("host") || new URL(request.url).host) && parsed.origin === origin;
  } catch { accepted = false; }
  if (!accepted) throw new HttpError(403, "origin-rejected", "Cross-origin changes are not allowed.");
}

export async function readJson(request: Request, maxBytes = 8192): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new HttpError(415, "unsupported-media-type", "Send application/json.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "invalid-json", "A JSON body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new HttpError(413, "payload-too-large", "The request is too large."); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new HttpError(400, "invalid-json", "The request body is not valid JSON."); }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function problem(error: unknown): Response {
  const workflow = error instanceof WorkflowError;
  const status = error instanceof HttpError ? error.status : workflow ? error.code === "conflict" ? 409 : error.code === "forbidden" ? 403 : 422 : 502;
  const title = error instanceof HttpError || workflow ? error.message : "Sanity could not complete the request. Check access and configuration, then refresh. No local data was substituted.";
  return Response.json({ type: "about:blank", title, status, code: error instanceof HttpError || workflow ? error.code : "upstream-failed" }, { status, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store" } });
}

export function createWriteBudget(limit = 30, now = Date.now) {
  let since = now();
  let count = 0;
  return () => {
    if (now() - since >= 60_000) { since = now(); count = 0; }
    if (++count > limit) throw new HttpError(429, "write-budget", "Write budget reached. Try again in one minute.");
  };
}