"use client";

import { useEffect, useRef, useState } from "react";
import DogProfileForm from "@/components/DogProfileForm";
import type { DogProfile } from "@/lib/prompt";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "woofchat.dog";

const STARTERS = [
  "My dog pulls on the leash the whole walk",
  "How much should a 40 lb adult dog eat?",
  "She barks at every dog we pass",
  "Puppy wakes up at 4am every night",
];

export default function Page() {
  const [dog, setDog] = useState<DogProfile | null>(null);
  const [editingDog, setEditingDog] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywalled, setPaywalled] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDog(JSON.parse(raw));
      else setEditingDog(true);
    } catch {
      setEditingDog(true);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streaming]);

  function saveDog(next: DogProfile) {
    setDog(next);
    setEditingDog(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private browsing — profile just won't persist */
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setError(null);
    setPaywalled(null);
    setDraft("");

    const outgoing: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...outgoing, { role: "assistant", content: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: outgoing, dog }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => null);
        if (res.status === 402) {
          setPaywalled(payload?.message ?? "Daily limit reached.");
        } else {
          setError(payload?.error ?? "Request failed.");
        }
        setMessages(outgoing);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const eventLine = frame.split("\n").find((l) => l.startsWith("event: "));
          const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!eventLine || !dataLine) continue;

          const name = eventLine.slice(7);
          const payload = JSON.parse(dataLine.slice(6));

          if (name === "delta") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              next[next.length - 1] = { ...last, content: last.content + payload.text };
              return next;
            });
          } else if (name === "done") {
            if (payload.quota) setQuota(payload.quota);
          } else if (name === "error") {
            setError(payload.message);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Lost the connection mid-answer.");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      setMessages((prev) =>
        prev.filter((m, i) => !(i === prev.length - 1 && m.role === "assistant" && !m.content)),
      );
    }
  }

  const remaining = quota ? Math.max(0, quota.limit - quota.used) : null;

  return (
    <main className="shell">
      <header className="bar">
        <div className="brand">
          <span className="mark" aria-hidden="true">🐾</span>
          <strong>Woofchat</strong>
        </div>
        <div className="bar-right">
          {remaining !== null && (
            <span className="quota">{remaining} left today</span>
          )}
          <button className="ghost" onClick={() => setEditingDog(true)}>
            {dog?.name ? dog.name : "Add your dog"}
          </button>
        </div>
      </header>

      <div className="scroll" ref={scrollRef}>
        <div className="thread">
          {messages.length === 0 && (
            <div className="intro">
              <h1>Ask about your dog.</h1>
              <p>
                Training, behavior, feeding, gear, and care. Not a substitute
                for your vet — for anything urgent, call one.
              </p>
              <div className="starters">
                {STARTERS.map((s) => (
                  <button key={s} className="starter" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {m.content || <span className="dots">···</span>}
            </div>
          ))}

          {error && <div className="notice error">{error}</div>}

          {paywalled && (
            <div className="notice paywall">
              <strong>{paywalled}</strong>
              <p>
                Pro gets you unlimited questions, a longer memory of the
                conversation, and profiles for up to five dogs.
              </p>
              <button className="primary" disabled>
                Upgrade — coming soon
              </button>
            </div>
          )}
        </div>
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <textarea
          value={draft}
          rows={1}
          placeholder={dog?.name ? `Ask about ${dog.name}…` : "Ask about your dog…"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
        />
        {streaming ? (
          <button type="button" className="primary" onClick={() => abortRef.current?.abort()}>
            Stop
          </button>
        ) : (
          <button type="submit" className="primary" disabled={!draft.trim()}>
            Send
          </button>
        )}
      </form>

      {editingDog && (
        <DogProfileForm
          initial={dog}
          onSave={saveDog}
          onClose={() => setEditingDog(false)}
        />
      )}
    </main>
  );
}
