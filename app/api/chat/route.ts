import { GoogleGenAI } from "@google/genai";
import { buildSystemInstruction, type ChatMessage, type DogProfile } from "@/lib/prompt";
import { getTier, getVisitorId, LIMITS } from "@/lib/entitlements";
import { createVetFilter } from "@/lib/vet-marker";
import { checkAndIncrement } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Free-tier model availability changes and is per-account. Check which models
// your key can use at https://aistudio.google.com/rate-limit and override with
// GEMINI_MODEL if this default is not on your tier.
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";

type Body = {
  messages: ChatMessage[];
  dog: DogProfile | null;
};

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Server is missing GEMINI_API_KEY. Add it to .env.local and restart." },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Malformed request body." }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: "No messages supplied." }, { status: 400 });
  }

  const visitorId = await getVisitorId();
  const tier = await getTier(visitorId);
  const limits = LIMITS[tier];

  const quota = checkAndIncrement(visitorId, limits.messagesPerDay);
  if (!quota.allowed) {
    return Response.json(
      {
        error: "limit_reached",
        message: `You've used all ${quota.limit} free messages today. Pro removes the cap.`,
        used: quota.used,
        limit: quota.limit,
      },
      { status: 402 },
    );
  }

  // Trim history server-side. A free client cannot buy itself more context by
  // posting a longer array -- the cap is applied here, not in the browser.
  const trimmed = body.messages.slice(-limits.historyTurns * 2);

  // Stateless multi-turn: every prior turn is replayed as a step. `store: false`
  // keeps Google from persisting the conversation server-side, so the history
  // this app sends is the only history that exists.
  const input = trimmed.map((m) => ({
    type: m.role === "user" ? ("user_input" as const) : ("model_output" as const),
    content: [{ type: "text" as const, text: m.content }],
  }));

  const ai = new GoogleGenAI({ apiKey });
  const encoder = new TextEncoder();

  const sse = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        const stream = await ai.interactions.create({
          model: MODEL,
          input,
          system_instruction: buildSystemInstruction(body.dog),
          store: false,
          stream: true,
        });

        const vetFilter = createVetFilter();

        for await (const event of stream) {
          if (event.event_type === "step.delta" && event.delta.type === "text") {
            const text = vetFilter.take(event.delta.text);
            if (text) send("delta", { text });
          } else if (event.event_type === "error") {
            console.error("[chat] stream event error", event.error);
            send("error", { message: "The model stopped mid-answer. Try again." });
          }
        }

        const tail = vetFilter.end();
        if (tail.text) send("delta", { text: tail.text });

        send("done", { vet: tail.vet, quota: { used: quota.used, limit: quota.limit } });
      } catch (err) {
        console.error("[chat] request failed", err);

        const raw = err instanceof Error ? err.message : String(err);
        let message = "Something went wrong reaching Gemini. Try again.";

        if (/API key|API_KEY_INVALID|PERMISSION_DENIED|401|403/i.test(raw)) {
          message = "The server's Gemini key was rejected. Check GEMINI_API_KEY.";
        } else if (/quota|RESOURCE_EXHAUSTED|429/i.test(raw)) {
          message =
            "Hit the Gemini free-tier rate limit. Wait a minute, or check your limits in AI Studio.";
        } else if (/not found|NOT_FOUND|404|not supported/i.test(raw)) {
          message = `The model "${MODEL}" is not available to this key. Set GEMINI_MODEL in .env.local to one your tier allows.`;
        }

        send("error", { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(sse, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
