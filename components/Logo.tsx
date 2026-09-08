type LogoProps = {
  /** Height of the paw mark in px. The wordmark scales with it. */
  size?: number;
  /** Drop the wordmark and render the paw alone (tight spaces, avatars). */
  markOnly?: boolean;
  /** Recolour for a dark/purple background. */
  onDark?: boolean;
};

/**
 * The Woofchat mark: three toe dots over a pad, from the design file.
 *
 * Geometry is on a 96x96 grid and must not be edited by hand -- scale it with
 * `size` instead. Colours reference the purple ramp in globals.css so the logo
 * follows the theme rather than pinning its own hex values.
 */
export default function Logo({ size = 28, markOnly = false, onDark = false }: LogoProps) {
  const toes = onDark ? "var(--p500)" : "var(--p300)";
  const centerToe = onDark ? "var(--p300)" : "var(--p500)";
  const pad = onDark ? "var(--p100)" : "var(--p600)";
  const word = onDark ? "var(--p100)" : "var(--p900)";

  return (
    <span className="logo" aria-label="Woofchat" role="img">
      <svg
        width={size}
        height={size}
        viewBox="0 0 96 96"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="24" cy="30" r="10" fill={toes} />
        <circle cx="48" cy="22" r="10" fill={centerToe} />
        <circle cx="72" cy="30" r="10" fill={toes} />
        <path
          d="M48 44c14 0 24 10 24 21 0 8-7 13-16 13h-16c-9 0-16-5-16-13 0-11 10-21 24-21z"
          fill={pad}
        />
      </svg>

      {!markOnly && (
        <span
          className="logo-word"
          style={{ fontSize: size * 0.86, color: word }}
        >
          woofchat
        </span>
      )}
    </span>
  );
}
