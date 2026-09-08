"use client";

import { lbToKg, type ChatMessage, type DogProfile } from "@/lib/prompt";

/**
 * Local persistence for dogs and their conversations.
 *
 * The design says "Stored on this device only", so this is localStorage and
 * nothing else -- no account, no sync. Everything here is best-effort: private
 * browsing and blocked site data both make it throw, and the app has to keep
 * working when it does.
 */

const KEY = "woofchat.v2";
export const MAX_DOGS = 5;

export type Thread = {
  id: string;
  dogId: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

export type Dog = DogProfile & { id: string };

export type Store = {
  dogs: Dog[];
  activeDogId: string | null;
  threads: Thread[];
};

const EMPTY: Store = { dogs: [], activeDogId: null, threads: [] };

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return migrateLegacy();
    const parsed = JSON.parse(raw) as Store;
    return {
      dogs: parsed.dogs ?? [],
      activeDogId: parsed.activeDogId ?? parsed.dogs?.[0]?.id ?? null,
      threads: parsed.threads ?? [],
    };
  } catch {
    return EMPTY;
  }
}

export function saveStore(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* quota or blocked storage -- the session still works, it just won't persist */
  }
}

/** Carry over the single dog saved by the previous version. */
function migrateLegacy(): Store {
  try {
    const old = localStorage.getItem("woofchat.dog");
    if (!old) return EMPTY;
    const dog = { ...(JSON.parse(old) as DogProfile), id: newId() };
    const store: Store = { dogs: [dog], activeDogId: dog.id, threads: [] };
    saveStore(store);
    localStorage.removeItem("woofchat.dog");
    return store;
  } catch {
    return EMPTY;
  }
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Initials for the rail pip. Falls back to a paw-ish dash when unnamed. */
export function initial(dog: Dog): string {
  return dog.name?.trim()?.[0]?.toUpperCase() ?? "·";
}

/** "Border collie mix · 3 yr · 40 lb" -- skips whatever is missing. */
export function describeDog(dog: Dog): string {
  const bits: string[] = [];
  if (dog.breed) bits.push(dog.breed);
  if (typeof dog.ageYears === "number") {
    bits.push(dog.ageYears < 1 ? `${Math.round(dog.ageYears * 12)} mo` : `${dog.ageYears} yr`);
  }
  if (typeof dog.weightLb === "number") {
    // Show the unit the owner chose, not the one we store in.
    const kg = (dog.weightUnit ?? "lb") === "kg";
    const value = kg ? lbToKg(dog.weightLb) : dog.weightLb;
    bits.push(`${Math.round(value * 10) / 10} ${kg ? "kg" : "lb"}`);
  }
  return bits.join(" · ");
}

/** First few words of the opening question, used as the sidebar label. */
export function titleFrom(text: string): string {
  const clean = text.trim().replace(/\s+/g, " ");
  const words = clean.split(" ").slice(0, 5).join(" ");
  return words.length < clean.length ? `${words}…` : words;
}

export function groupByDay(threads: Thread[]): Array<[string, Thread[]]> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const today: Thread[] = [];
  const earlier: Thread[] = [];
  for (const t of [...threads].sort((a, b) => b.updatedAt - a.updatedAt)) {
    (t.updatedAt >= startOfToday.getTime() ? today : earlier).push(t);
  }

  const groups: Array<[string, Thread[]]> = [];
  if (today.length) groups.push(["Today", today]);
  if (earlier.length) groups.push(["Earlier", earlier]);
  return groups;
}
