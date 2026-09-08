/**
 * The model ends health-related replies with [[VET]] on its own line. That
 * marker must never reach the reader, and it arrives mid-stream: a delta can
 * split it into "[[VE" + "T]]", so we hold back a tail long enough to catch a
 * partial marker before emitting.
 *
 * Extracted from the route so the chunk-boundary behaviour is testable.
 */
export const VET_MARKER = "[[VET]]";

export function createVetFilter() {
  const HOLD = VET_MARKER.length - 1;
  let pending = "";
  let vet = false;

  function take(chunk: string): string {
    pending += chunk;

    // Strip complete markers from the whole buffer BEFORE slicing. Checking
    // only the part about to be emitted misses a marker that straddles the
    // emit boundary, which is the common case.
    if (pending.includes(VET_MARKER)) {
      vet = true;
      pending = pending.split(VET_MARKER).join("");
    }

    // Keep back enough characters that a partially-arrived marker stays buffered.
    if (pending.length <= HOLD) return "";
    let out = pending.slice(0, pending.length - HOLD);
    let rest = pending.slice(pending.length - HOLD);

    // Hold trailing whitespace back too. The marker sits on its own line, so
    // flushing the newline before it arrives would leave a blank line behind
    // once the marker is stripped. Buffered whitespace is released as soon as
    // real text follows it, and trimmed away by end() if nothing does.
    const trailing = out.match(/\s+$/);
    if (trailing) {
      rest = trailing[0] + rest;
      out = out.slice(0, out.length - trailing[0].length);
    }

    pending = rest;
    return out;
  }

  /** Flush whatever is held back. Trailing whitespace left by a stripped marker goes too. */
  function end(): { text: string; vet: boolean } {
    let out = pending;
    pending = "";
    if (out.includes(VET_MARKER)) {
      vet = true;
      out = out.split(VET_MARKER).join("");
    }
    return { text: out.replace(/\s+$/, ""), vet };
  }

  return { take, end };
}
