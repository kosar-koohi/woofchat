# Woofchat

A chat app for dog owners. Next.js front end, one server route that talks to
the Gemini API, a free tier with a daily cap, and a Pro tier stub ready for Stripe.

## Run it

1. Get a free API key at https://aistudio.google.com — no card required
2. `cp .env.local.example .env.local` and paste the key in
3. `npm run dev`
4. Open http://localhost:3000

## How it's put together

| Path | What it does |
|---|---|
| `app/page.tsx` | Chat UI. Reads the SSE stream, keeps the dog profile in `localStorage`. |
| `app/api/chat/route.ts` | The only place the API key is used. Enforces the tier, trims history, streams back. |
| `lib/prompt.ts` | The persona and the safety rules. This file is the product. |
| `lib/entitlements.ts` | Single source of truth for free vs. pro. Stripe plugs in here. |
| `lib/ratelimit.ts` | Daily message counter. In-memory — swap for Redis before launch. |

### The key never reaches the browser

`GEMINI_API_KEY` is read server-side in the route handler only. Nothing in
`app/page.tsx` or `components/` touches it. Don't prefix it with
`NEXT_PUBLIC_` — that would ship it to every visitor.

### The paywall is server-side

`getTier()` runs on the server and the client only renders what the server
allows. A user editing local storage or posting a longer message array gets
nothing extra: the history cap and the daily counter are both applied in the
route.

## Turning on real subscriptions

Only two things are stubbed:

1. **`lib/entitlements.ts` → `getTier()`** returns `"free"` for everyone.
   Replace the body with a lookup of the signed-in user's Stripe subscription
   status. Keep it the only decision point.
2. **`lib/ratelimit.ts`** is in-process, so it resets on restart and breaks
   across multiple instances. Move it to Upstash Redis or a `usage` table.

You'll also need auth (Clerk or Auth.js) so a subscription attaches to a person
rather than a cookie, and a Stripe webhook to keep status in sync.

Because this is a website, Apple's 30% doesn't apply. If you later wrap it as
an iOS app, digital-only subscriptions must go through Apple IAP — that's the
part of the plan worth deciding before you build the wrapper, not after.

## Cost and limits

Gemini free tier: no card, no spend, but it is rate limited (roughly 15
requests/minute) and **Google may use free-tier traffic to improve their
products**. Fine for building and testing; decide deliberately before real
users are typing into it.

Free-tier model availability is per-account and changes. If the default model
is rejected, check what your key allows at
https://aistudio.google.com/rate-limit and set `GEMINI_MODEL` in
`.env.local`.

The provider lives entirely in `app/api/chat/route.ts`. Switching to a paid
provider later is one file; `lib/prompt.ts` carries over untouched. Re-test the
emergency questions after any model change -- models differ in how tightly they
hold refusal rules.

## Not done yet

- No auth, no payments, no database. Conversations vanish on refresh.
- Rate limiting resets when the server restarts.
- No abuse controls beyond the daily cap.
- The vet-safety rules in `lib/prompt.ts` are not a legal review. Add terms and
  a visible disclaimer before this is public.
