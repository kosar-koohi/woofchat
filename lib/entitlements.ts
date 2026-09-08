import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

export type Tier = "free" | "pro";

export const LIMITS = {
  free: {
    messagesPerDay: 1000,
    historyTurns: 6, // how far back the model can see
    profiles: 5,
  },
  pro: {
    messagesPerDay: Infinity,
    historyTurns: 40,
    profiles: 5,
  },
} as const;

const VISITOR_COOKIE = "woofchat_visitor";

/** Stable per-browser id. Replace with a real user id once auth exists. */
export async function getVisitorId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(VISITOR_COOKIE)?.value;
  if (existing) return existing;

  const id = randomUUID();
  jar.set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return id;
}

/**
 * The single place that decides what a visitor is entitled to.
 *
 * STUB: everyone is on free. When you wire up Stripe, this becomes a lookup of
 * the customer's subscription status -- and it stays the ONLY place that
 * decides. The client never gets a say; it can only render what this returns.
 */
export async function getTier(_visitorId: string): Promise<Tier> {
  return "free";
}
