"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DogProfileForm from "@/components/DogProfileForm";
import Logo from "@/components/Logo";
import type { ChatMessage, DogProfile } from "@/lib/prompt";
import {
  describeDog,
  groupByDay,
  initial,
  loadStore,
  MAX_DOGS,
  newId,
  saveStore,
  titleFrom,
  type Dog,
  type Store,
  type Thread,
} from "@/lib/store";

const STARTERS = [
  "Pulls on the leash",
  "How much to feed",
  "Barks at other dogs",
  "Crate at 4am",
];

export default function Page() {
  const [store, setStore] = useState<Store>({ dogs: [], activeDogId: null, threads: [] });
  const [ready, setReady] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [editingDog, setEditingDog] = useState<Dog | "new" | null>(null);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loaded = loadStore();
    setStore(loaded);
    setReady(true);
    if (loaded.dogs.length === 0) setEditingDog("new");
  }, []);

  const activeDog = useMemo(
    () => store.dogs.find((d) => d.id === store.activeDogId) ?? null,
    [store.dogs, store.activeDogId],
  );

  const dogThreads = useMemo(
    () => store.threads.filter((t) => t.dogId === store.activeDogId),
    [store.threads, store.activeDogId],
  );

  const activeThread = useMemo(
    () => dogThreads.find((t) => t.id === activeThreadId) ?? null,
    [dogThreads, activeThreadId],
  );

  useEffect(() => {
    if (ready) saveStore(store);
  }, [store, ready]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [activeThread?.messages, streaming]);

  function selectDog(id: string) {
    setStore((s) => ({ ...s, activeDogId: id }));
    setActiveThreadId(null);
    setError(null);
  }

  function saveDog(profile: DogProfile) {
    setStore((s) => {
      if (editingDog && editingDog !== "new") {
        const target = editingDog;
        return {
          ...s,
          dogs: s.dogs.map((d) => (d.id === target.id ? { ...d, ...profile } : d)),
        };
      }
      const dog: Dog = { ...profile, id: newId() };
      return { ...s, dogs: [...s.dogs, dog], activeDogId: dog.id };
    });
    setEditingDog(null);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming || !activeDog) return;

    setError(null);
    setDraft("");

    // Start a thread on the first message, otherwise append to the open one.
    const threadId = activeThread?.id ?? newId();
    const history: ChatMessage[] = activeThread?.messages ?? [];
    const outgoing: ChatMessage[] = [...history, { role: "user", content: trimmed }];
    const dogId = activeDog.id;

    setStore((s) => {
      const existing = s.threads.find((t) => t.id === threadId);
      const pending: ChatMessage[] = [...outgoing, { role: "assistant", content: "" }];
      if (existing) {
        return {
          ...s,
          threads: s.threads.map((t) =>
            t.id === threadId ? { ...t, messages: pending, updatedAt: Date.now() } : t,
          ),
        };
      }
      const created: Thread = {
        id: threadId,
        dogId,
        title: titleFrom(trimmed),
        messages: pending,
        updatedAt: Date.now(),
      };
      return { ...s, threads: [created, ...s.threads] };
    });

    setActiveThreadId(threadId);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const appendToAssistant = (chunk: string) =>
      setStore((s) => ({
        ...s,
        threads: s.threads.map((t) => {
          if (t.id !== threadId) return t;
          const msgs = [...t.messages];
          const last = msgs[msgs.length - 1];
          msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
          return { ...t, messages: msgs, updatedAt: Date.now() };
        }),
      }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: outgoing, dog: activeDog }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => null);
        setError(payload?.message ?? payload?.error ?? "Request failed.");
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
          const lines = frame.split("\n");
          const name = lines.find((l) => l.startsWith("event: "))?.slice(7);
          const data = lines.find((l) => l.startsWith("data: "))?.slice(6);
          if (!name || !data) continue;

          const payload = JSON.parse(data);
          if (name === "delta") appendToAssistant(payload.text);
          else if (name === "error") setError(payload.message);
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError("Lost the connection mid-answer.");
    } finally {
      setStreaming(false);
      abortRef.current = null;
      // Drop a reply that never produced any text so the thread isn't left blank.
      setStore((s) => ({
        ...s,
        threads: s.threads.map((t) =>
          t.id === threadId
            ? {
                ...t,
                messages: t.messages.filter(
                  (m, i) =>
                    !(i === t.messages.length - 1 && m.role === "assistant" && !m.content),
                ),
              }
            : t,
        ),
      }));
    }
  }

  const messages = activeThread?.messages ?? [];
  const hasReply = messages.some((m) => m.role === "assistant" && m.content);

  return (
    <main className="shell">
      <aside className="rail">
        <Logo size={24} markOnly onDark />
        <div className="rail-divider" />

        {store.dogs.map((dog) => (
          <button
            key={dog.id}
            className={`dog-pip${dog.id === store.activeDogId ? " active" : ""}`}
            title={`${dog.name || "Unnamed dog"} — double-click to edit`}
            aria-label={`Ask about ${dog.name || "this dog"}`}
            onClick={() => selectDog(dog.id)}
            onDoubleClick={() => setEditingDog(dog)}
          >
            {initial(dog)}
          </button>
        ))}

        {store.dogs.length < MAX_DOGS && (
          <button
            className="dog-pip add"
            aria-label="Add a dog"
            title="Add a dog"
            onClick={() => setEditingDog("new")}
          >
            +
          </button>
        )}
      </aside>

      <aside className="history">
        <div className="history-head">
          <div className="name">{activeDog?.name || "Your dog"}</div>
          {activeDog && <div className="meta">{describeDog(activeDog)}</div>}
        </div>

        <button
          className="new-question"
          onClick={() => {
            setActiveThreadId(null);
            setError(null);
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New question
        </button>

        <div className="history-list">
          {groupByDay(dogThreads).map(([label, items]) => (
            <div key={label}>
              <div className="day-label">{label}</div>
              {items.map((t) => (
                <button
                  key={t.id}
                  className={`thread-item${t.id === activeThreadId ? " active" : ""}`}
                  onClick={() => setActiveThreadId(t.id)}
                >
                  {t.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <div className="chat">
        <div className="chat-scroll" ref={scrollRef}>
          <div className="chat-inner">
            {activeThread && <div className="thread-title">{activeThread.title}</div>}

            {messages.length === 0 && (
              <div className="intro">
                <h1>Ask about {activeDog?.name || "your dog"}.</h1>
                <p>
                  Answers use breed, age and weight. Not a substitute for your vet —
                  for anything urgent, call one.
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

            {hasReply && !streaming && (
              <div className="disclaimer">
                <p>
                  <strong>Woofchat is a robot, not a veterinarian.</strong> Training
                  answers are general. Anything urgent — pain, sudden change, trouble
                  breathing — is a vet call, not a chat.
                </p>
                <a
                  className="vet-button"
                  href="https://www.google.com/maps/search/emergency+vet+near+me"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Find a vet near me
                </a>
              </div>
            )}

            {error && <div className="notice error">{error}</div>}
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
            placeholder={`Ask about ${activeDog?.name || "your dog"}…`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
          />
          {streaming ? (
            <button type="button" className="send" onClick={() => abortRef.current?.abort()}>
              Stop
            </button>
          ) : (
            <button type="submit" className="send" disabled={!draft.trim() || !activeDog}>
              Send
            </button>
          )}
        </form>
      </div>

      {editingDog && (
        <DogProfileForm
          initial={editingDog === "new" ? null : editingDog}
          onSave={saveDog}
          onClose={() => setEditingDog(null)}
        />
      )}
    </main>
  );
}
