import { ImageResponse } from "next/og";

export const runtime = "nodejs";

/**
 * Renders the 2c share card as a PNG.
 *
 * Server-side on purpose: the browser-side approach (html-to-image) hangs on
 * its font-embedding step and never resolves. Doing it here is reliable, and it
 * gives the card a real URL -- which is what makes "Copy link" meaningful.
 *
 * Satori supports a flexbox subset only: every container needs an explicit
 * display:flex, and there is no grid, float, or `gap` shorthand on some paths.
 */

const P100 = "#f6edef";
const P200 = "#f1e4e7";
const P700 = "#844c60";
const P800 = "#704153";
const P900 = "#613a4a";
const INK = "#3d2b32";

function toCard(answer: string) {
  const sentences = answer
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { headline: sentences[0] ?? answer, steps: sentences.slice(1, 4) };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") ?? "Woofchat").slice(0, 80);
  const answer = (searchParams.get("answer") ?? "").slice(0, 1200);

  if (!answer) {
    return new Response("Missing answer", { status: 400 });
  }

  const { headline, steps } = toCard(answer);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: P100,
          padding: "64px 58px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 24,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: P700,
            fontWeight: 500,
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 54,
            lineHeight: 1.28,
            letterSpacing: -1.2,
            color: P900,
            fontWeight: 600,
          }}
        >
          {headline}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", marginBottom: 20 }}>
              <div style={{ fontSize: 28, color: P800, fontWeight: 600, marginRight: 24 }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ fontSize: 30, lineHeight: 1.5, color: INK, flex: 1 }}>{s}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 32,
            background: "#ffffff",
            borderLeft: `6px solid ${P700}`,
            padding: "22px 26px",
            fontSize: 25,
            lineHeight: 1.5,
            color: INK,
          }}
        >
          Written by a robot, not a veterinarian. If it looks like an emergency, call a vet.
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 32,
            paddingTop: 30,
            borderTop: `2px solid ${P200}`,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 96 96">
            <circle cx="24" cy="30" r="10" fill="#dfc2c9" />
            <circle cx="48" cy="22" r="10" fill="#b77c8c" />
            <circle cx="72" cy="30" r="10" fill="#dfc2c9" />
            <path
              d="M48 44c14 0 24 10 24 21 0 8-7 13-16 13h-16c-9 0-16-5-16-13 0-11 10-21 24-21z"
              fill="#9f5f74"
            />
          </svg>
          <div
            style={{
              marginLeft: 18,
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: -1,
              color: P900,
            }}
          >
            woofchat
          </div>
          <div style={{ marginLeft: "auto", fontSize: 24, color: P700 }}>
            Ask about your dog
          </div>
        </div>
      </div>
    ),
    { width: 800, height: 1000 },
  );
}
