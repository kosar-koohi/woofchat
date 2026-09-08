import Anthropic from "@anthropic-ai/sdk";
import { buildSystem, type DogProfile } from "@/lib/prompt";
import { getTier, getVisitorId, LIMITS } from "@/lib/entitlements";
import { checkAndIncrement } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

const client = new Anthropic();

type Body = {
  messages: Anthropic.MessageParam[];
  dog: DogProfile | null;
};

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Server is missing ANTHROPIC_API_KEY. Copy .env.local.example to .env.local." },
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

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 4096,
    // Chat is high-volume and the questions are rarely hard; low effort keeps
    // cost and latency down. Raise to "medium" if answers feel shallow.
    output_config: { effort: "low" },
    system: buildSystem(body.dog),
    messages: trimmed,
  });

  const encoder = new TextEncoder();

  const sse = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            send("delta", { text: event.delta.text });
          }
        }

        const final = await stream.finalMessage();
        send("done", {
          stopReason: final.stop_reason,
          usage: {
            input: final.usage.input_tokens,
            output: final.usage.output_tokens,
            cacheRead: final.usage.cache_read_input_tokens ?? 0,
          },
          quota: { used: quota.used, limit: quota.limit },
        });
      } catch (err) {
        console.error("[chat] stream failed", err);

        let message = "Something went wrong reaching Claude. Try again.";
        if (err instanceof Anthropic.RateLimitError) {
          message = "Rate limited upstream. Give it a few seconds.";
        } else if (err instanceof Anthropic.AuthenticationError) {
          message = "The server's API key was rejected. Check ANTHROPIC_API_KEY.";
        } else if (err instanceof Anthropic.APIConnectionError) {
          message = "Could not reach the Claude API. Check your connection.";
        }

        send("error", { message });
      } finally {
        controller.close();
      }
    },

    cancel() {
      stream.abort();
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
