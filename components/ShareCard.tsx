"use client";

import { useState } from "react";
import Logo from "@/components/Logo";

/**
 * Splits a reply into a headline and up to three numbered steps.
 *
 * A heuristic, not parsing: the first sentence becomes the headline and the
 * next few become steps. Replies that aren't step-shaped still make a readable
 * card, just a wordier one. Kept in sync with the same helper in
 * app/api/share/route.tsx, which renders the downloadable version.
 */
function toCard(answer: string): { headline: string; steps: string[] } {
  const sentences = answer
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return { headline: sentences[0] ?? answer, steps: sentences.slice(1, 4) };
}

export default function ShareCard({
  title,
  answer,
  onClose,
}: {
  title: string;
  answer: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const { headline, steps } = toCard(answer);

  // The PNG is rendered by the server; this is the URL for both buttons.
  const cardUrl = `/api/share?title=${encodeURIComponent(title)}&answer=${encodeURIComponent(answer)}`;

  async function saveImage() {
    setStatus("Rendering…");
    try {
      const res = await fetch(cardUrl);
      if (!res.ok) throw new Error(String(res.status));

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `woofchat-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Saved");
    } catch {
      setStatus("Could not render the image.");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(cardUrl, location.origin).toString());
      setStatus("Link copied");
    } catch {
      setStatus("Clipboard blocked by the browser.");
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="share-wrap"
        role="dialog"
        aria-modal="true"
        aria-label="Share this answer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="share-card">
          <div className="eyebrow">{title}</div>
          <div className="share-headline">{headline}</div>

          {steps.length > 0 && (
            <ol className="share-steps">
              {steps.map((s, i) => (
                <li key={i}>
                  <span className="num">{String(i + 1).padStart(2, "0")}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          )}

          <div className="share-note">
            Written by a robot, not a veterinarian. If it looks like an emergency,
            call a vet.
          </div>

          <div className="share-foot">
            <Logo size={20} />
            <span className="share-tag">Ask about your dog</span>
          </div>
        </div>

        <div className="share-actions">
          <button className="primary" onClick={saveImage}>
            Save image
          </button>
          <button className="ghost" onClick={copyLink}>
            Copy link
          </button>
          {status && <span className="share-status">{status}</span>}
        </div>
      </div>
    </div>
  );
}
