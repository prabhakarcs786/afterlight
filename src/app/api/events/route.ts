import { appMode } from "@/lib/config";
import { problem, requireSameOrigin } from "@/lib/http";
import { sanityClient } from "@/lib/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    requireSameOrigin(request);
    if (appMode() === "demo") return new Response(null, { status: 204 });
    const client = sanityClient();
    const encoder = new TextEncoder();
    let cleanup: (() => void) | undefined;
    const stream = new ReadableStream({
      start(controller) {
        let closed = false;
        const send = (data: string) => { if (!closed) controller.enqueue(encoder.encode(data)); };
        const subscription = client.listen('*[_type == "artifact" && !(_id in path("drafts.**"))]', {}, { includeResult: false, visibility: "query", events: ["mutation"] }).subscribe({
          next: () => send('event: change\ndata: {"changed":true}\n\n'),
          error: () => { send('event: unavailable\ndata: {}\n\n'); cleanup?.(); },
        });
        const heartbeat = setInterval(() => send(": heartbeat\n\n"), 20_000);
        const end = setTimeout(() => cleanup?.(), 50_000);
        cleanup = () => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat); clearTimeout(end); subscription.unsubscribe();
          request.signal.removeEventListener("abort", cleanup!);
          try { controller.close(); } catch { return; }
        };
        request.signal.addEventListener("abort", cleanup, { once: true });
        if (request.signal.aborted) cleanup();
        else send('event: ready\ndata: {"connected":true}\n\n');
      },
      cancel() { cleanup?.(); },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
  } catch (error) { return problem(error); }
}