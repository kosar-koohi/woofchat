/**
 * Per-visitor daily counter.
 *
 * In-memory: it resets whenever the server restarts, and it does not work
 * across more than one instance. Fine for local dev and a single-box deploy.
 * Move to Redis (Upstash) or a `usage` table before you charge anyone.
 */
type Entry = { day: string; count: number };

const counters = new Map<string, Entry>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function checkAndIncrement(
  key: string,
  limit: number,
): { allowed: boolean; used: number; limit: number } {
  if (limit === Infinity) {
    return { allowed: true, used: 0, limit };
  }

  const day = today();
  const entry = counters.get(key);
  const current = entry && entry.day === day ? entry.count : 0;

  if (current >= limit) {
    return { allowed: false, used: current, limit };
  }

  counters.set(key, { day, count: current + 1 });
  return { allowed: true, used: current + 1, limit };
}

export function peek(key: string, limit: number): { used: number; limit: number } {
  const entry = counters.get(key);
  const used = entry && entry.day === today() ? entry.count : 0;
  return { used, limit };
}
