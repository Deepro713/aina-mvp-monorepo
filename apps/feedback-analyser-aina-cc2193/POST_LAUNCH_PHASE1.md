# feedback-analyser-aina: Post-launch Phase 1 roadmap

### What shipped in V0

- **Sign in with a magic link.** `/signin` uses the `requestMagicLink` server action with Auth.js v5 and Resend. Links are single-use and expire after 10 minutes. Each email address can request 5 links per hour, and requests past that get a clean 429. Sessions are kept in the database for 30 days.
- **Connect your own model.** On `/connect`, `ProviderForm` works with OpenAI, Anthropic, Gemini, or any OpenAI-compatible HTTPS endpoint. Save only unlocks after a connection test passes, and the test returns an HMAC-signed `test_token`. Keys are stored encrypted with AES-256-GCM and bound to the user, and the UI only ever shows the last 4 characters. Every model call goes through an SSRF guard (`lib/llm/ssrf.ts`).
- **Batch analysis.** On `/analyze`, `BatchComposer` takes up to 25 entries, one per line, and runs 3 at a time. Each row shows its own status and a Retry button. Every entry goes through `POST /api/analyze`, which normalises the model's labels, checks them with a strict zod schema and retries once. Malformed output is never saved.
- **Dashboard.** `/dashboard` is a server component with a 7d / 30d / All filter, KPI tiles, sentiment and category bar charts (each can switch to a table), and a TanStack table of the latest entries with cursor-based "Load more".
- **Corrections and data control.** You can change sentiment or category inline. Each change writes a row to `label_corrections` in the same transaction. You can delete single entries, and `/account` deletes the whole account and everything in it. The landing, privacy and terms pages carry Plausible, which loads on those public pages only.

### What's deferred to Phase 1

V0 is the foundation. Phase 1 makes it reliable in production, turns the correction log into an accuracy score you can see, makes the dashboard explorable, and closes the security and cost gaps found in QA.

### Phase 1 features (8-12 items, ranked by priority)

#### Feature 1 — Production deploy hardening (lockfile, migrations, env loading, charts)

**Why:** A fresh deploy currently has no tables and CI fails on `npm ci`. Until that's fixed, every signed-in page shows "server isn't configured" and every API route returns errors.

**Acceptance criteria:**
- `package-lock.json` is committed. It resolves `next` to at least 16.0.7 and `react`/`react-dom` to at least 19.2.1 (the CVE-2025-55182 fixes). `npm ci`, `typecheck`, `lint`, `test` and `db:check` all pass in GitHub Actions.
- `drizzle/` contains generated SQL migrations with a `meta/_journal.json`. Deploying to a brand-new Neon database creates every table before `next build` runs. `tests/helpers/db.ts` then applies the real migrations instead of `FALLBACK_DDL`.
- After the README Quickstart (values in `.env.local` only), `npm run db:migrate` reaches the database.
- The sentiment and category bar charts render bars in production. They are not blank.
- `.env.example` no longer sets `AUTH_URL=http://localhost:3000` for Vercel. Sign-in emails from production link to the HTTPS production host.

**Implementation notes:**
- Bump `next` to `^16.0.7` and `react`/`react-dom` to `^19.2.1` in `package.json`, run `npm install`, and commit the lockfile.
- Add `"overrides": { "react-is": "^19.0.0" }` for Recharts 2.15 on React 19.
- `drizzle.config.ts`: replace `import "dotenv/config"` with explicit `config({ path: ".env.local" })` and then `config()`, the same way `scripts/seed.ts` does it.
- Add a `"vercel-build": "drizzle-kit migrate && next build"` script and point `vercel.json` `buildCommand` at it. Preview deploys get their own Neon branch, so running migrations on previews is safe.
- Optionally add `INCLUDE (sentiment, category)` to the `feedback_entries_user_created_idx` migration by hand, in a new migration. Never edit a migration that has already run.
- In `.env.example`, comment out `AUTH_URL` and add a note: "leave unset on Vercel, or set to your https:// URL".

**Complexity:** M

**Depends on:** none

---

#### Feature 2 — Recover from an unreadable saved key; separate outages from setup errors

**Why:** If the encryption secret changes, a user's saved key can't be decrypted. They get stuck in a loop: "re-enter your key" fails with the same 409 every time. Separately, a short Neon outage tells real users the server "isn't configured yet."

**Acceptance criteria:**
- The saved ciphertext is undecryptable and the user types a **new** key on `/connect`. Test returns 200 with a `test_token`, and Save stores the new key. No 409.
- The user leaves the key blank and the saved key can't be decrypted. Test returns 409 `connection_unreadable`, and the error appears on the API key field ("Re-enter your API key").
- A database error other than `DbNotConfiguredError` or `KeyConfigError` in the `(app)` layout shows the `app/(app)/error.tsx` boundary with a "Try again" button, not the setup card.
- New tests in `tests/connection.test.ts` cover both connection cases.

**Implementation notes:**
- `app/api/connection/test/route.ts`: only compare fingerprints against `resolveSaved(saved)` when `resolveInput` reports `reusedSavedKey`. Otherwise compare provider, model and base URL plus the new key without decrypting. If decryption throws `ApiError` `connection_unreadable`, skip stamping `last_tested_at` instead of failing.
- Make `decryptSaved` in `lib/connection.ts` include `fields: { api_key: ... }` in its 409 so `ProviderForm` shows the error inline.
- `app/(app)/layout.tsx`: check `e instanceof DbNotConfiguredError || e instanceof KeyConfigError` before showing `<SetupNeeded />`. Rethrow anything else.

**Complexity:** S

**Depends on:** none

---

#### Feature 3 — Model accuracy card (correction rate per model)

**Why:** The Impact plan's main trust metric is corrections ÷ entries analyzed, with a target under 15% and a red line at 25%. V0 records the corrections but never shows them, so users can't tell whether to trust their dashboard.

**Acceptance criteria:**
- For the selected range, `/dashboard` shows an "Accuracy" card: "X% of entries corrected", where X = entries with at least one correction ÷ entries in range, rounded to whole percent.
- The card breaks the rate down by `provider` + `model_id`, with entry count and corrected count for each model. Rates under 15% get an emerald pill, 15–25% amber, and over 25% rose, always with a text label next to the colour.
- `GET /api/stats?range=…` adds an `accuracy` object: `{ corrected_entries, rate, by_model: [{ provider, model_id, entries, corrected }] }`. Existing fields are unchanged.
- An entry corrected twice counts once. Correcting a label from the table updates the card after `router.refresh()`.
- With zero entries in the range, the card is hidden. It never shows a division by zero.

**Implementation notes:**
- Add `getAccuracy(userId, range)` in `lib/queries.ts`: `feedback_entries` LEFT JOIN `label_corrections` ON `entry_id`, `count(distinct …)`, grouped by `provider, model_id`. Call it from both `getStats` and `getDashboardData`.
- Add an index on `label_corrections (entry_id)` in a new migration.
- Corrections on deleted entries (`entry_id = NULL`) are left out, which is fine for a per-range view. Mention this in a tooltip.
- Sample-data entries (`model_id = "sample-data"`) show up as their own row. Don't filter them out.
- Add tests to `tests/dashboard.test.ts`: zero-fill, multiple corrections on one entry, other users' corrections never counted.

**Complexity:** M

**Depends on:** Feature 1

---

#### Feature 4 — Click a chart bar to filter the latest entries

**Why:** The dashboard tells you "38% negative" but you can't see *which* entries those are without scrolling and reading. Clicking from the breakdown straight to the entries is the step from counting feedback to acting on it.

**Acceptance criteria:**
- Clicking a bar (or its row in table view) adds `?sentiment=negative` or `?category=bug` to the URL alongside `range`. The latest-entries table then shows only matching entries, and "Load more" pages within that filter.
- Active filters appear as removable chips above the table ("Negative ×", "Bug ×"). Sentiment and category filters can be combined. Removing a chip updates the URL.
- The charts and KPI tiles keep showing the full range. The selected bar is visually highlighted and has `aria-pressed`.
- `GET /api/entries` accepts optional `sentiment` and `category` query params. Values outside the enums return 422 `validation_failed`.
- When no entries match: "No Negative · Bug entries in the last 30 days", with a "Clear filters" link.

**Implementation notes:**
- Extend `entriesQuerySchema` in `lib/validation.ts` with `z.enum(SENTIMENTS).optional()` and `z.enum(CATEGORIES).optional()`. Add the conditions to the `where` in `listEntries`. The keyset cursor still works unchanged.
- In `app/(app)/dashboard/page.tsx`, parse the new params and pass them through `getDashboardData`. Include the filters in the `EntriesTable` `key` so its state resets when they change.
- `BreakdownChart`: give `Bar` an `onClick` that calls `router.push` with merged search params. Bars aren't keyboard-focusable, so make the table-view rows the accessible path (buttons).
- `RangeFilter` links currently drop other params. Preserve `sentiment` and `category` when the range changes.
- After an inline correction, a row may no longer match the filter. Keep it visible until the next navigation so it doesn't vanish mid-edit.

**Complexity:** M

**Depends on:** none

---

#### Feature 5 — Reasoning-model compatibility (gpt-5 / o-series / Gemini 2.5)

**Why:** QA found that reasoning models can spend the whole 300-token output budget thinking. They return nothing, every entry fails with `model_invalid_output`, and the user doesn't know why. These are now many users' default models.

**Acceptance criteria:**
- With an OpenAI model ID matching `gpt-5*` or `o<digit>*`, `/api/analyze` sends `providerOptions.openai.reasoningEffort = "minimal"` (or `"low"` where minimal isn't supported) and a larger output budget (`LLM_REASONING_MAX_OUTPUT_TOKENS`, default 2000).
- With Gemini `*-flash*` models, the call sets `providerOptions.google.thinkingConfig.thinkingBudget = 0`.
- If the model still returns empty text with `finishReason: "length"`, the API returns 502 with the new code `model_output_truncated`, `retryable: false`, and the message "<Provider> used its whole output budget on reasoning. Pick a non-reasoning model or raise LLM_MAX_OUTPUT_TOKENS."
- `POST /api/connection/test` uses the same options. A model that passes Test can therefore actually analyze.
- Unit tests check the `providerOptions` passed to the mocked `generateObject` and `generateText` for each model family.

**Implementation notes:**
- Add `modelCallOptions(conn)` in `lib/llm/providers.ts`, returning `{ providerOptions, maxOutputTokens }`. Use it in both `callModel` and `pingModel` in `lib/llm/classify.ts`.
- Add `LLM_REASONING_MAX_OUTPUT_TOKENS` to `lib/env.ts` and `.env.example`. Keep the 55 s deadline. Reasoning calls are slower, so don't raise `maxDuration`.
- `NoObjectGeneratedError` exposes `finishReason`. Check it before falling back to `extractJson`.
- In `lib/labels.ts` `PROVIDER_META.openai.blurb`, add the hint "reasoning models are supported but slower".

**Complexity:** M

**Depends on:** none

---

#### Feature 6 — Unsent batch entries return to the composer automatically

**Why:** The UX spec says unsent rows "stay in the composer" when the user goes offline mid-batch. V0 makes them click "Move failed back to composer" by hand, which is easy to miss after losing connection.

**Acceptance criteria:**
- When a batch finishes and any row failed with code `offline` or `network_error`, those rows' text is put back into the textarea automatically (below anything already there). An info alert says "3 unsent entries were returned to the composer. Nothing was saved for them."
- Rows that failed for any other reason stay in the results list with Retry. They are not moved.
- The per-row and bulk Retry buttons are disabled while `navigator.onLine` is false, with the tooltip "You're offline".
- When the connection comes back, the offline banner says "Back online. N entries ready to analyze."

**Implementation notes:**
- `components/BatchComposer.tsx`: in the `Promise.all(batch.map(run)).then(...)` handler, collect the keys of rows that failed for network reasons, then reuse the `moveFailedBack` logic filtered to those keys. `run` already returns false for those rows, so return the error code as well.
- The textarea is `disabled={running}`, so append only after `running` is false to avoid racing with user typing.
- `AnalysisRow.tsx`: pass an `offline` prop to disable Retry.

**Complexity:** S

**Depends on:** none

---

#### Feature 7 — Daily analysis cap counts every call, with remaining quota shown

**Why:** The 500-per-day cap only counts *saved* entries. A provider that keeps failing can be called without limit on the user's own key, and users can't see how close they are to the cap.

**Acceptance criteria:**
- Every `POST /api/analyze` that reaches the model counts toward the daily cap, whether it succeeds or fails. Requests rejected earlier (413, 409, 422) don't count.
- The 501st counted call in a UTC day returns 429 `daily_limit_reached`, with `retry-after` set to the seconds until the next UTC midnight.
- `/analyze` shows "N of 500 analyses left today" next to the entry counter. If the pasted batch is bigger than what's left, the Analyze button is blocked with "Only N analyses left today."
- Deleting the account removes the usage rows (FK cascade).
- `tests/analyze.test.ts` covers: a failed call counts, a 413 doesn't count, and the counter resets at the day boundary (fake timers).

**Implementation notes:**
- Add a new table `analyze_usage (user_id FK cascade, day date, count int)` with PK `(user_id, day)`. Do an atomic upsert-increment with `returning`, as `consumeMagicLinkQuota` does in `lib/rate-limit.ts`. Increment just before `classifyFeedback`.
- Replace `analyzeCallsLast24h`. Update the existing "501st analysis" test, which seeds entries.
- Add `GET /api/usage` → `{ used, limit, resets_at }`, or pass it from the server component through `loadAppContext`.
- Update the wording on the terms page ("500 analyses per day") if needed.

**Complexity:** M

**Depends on:** Feature 1

---

#### Feature 8 — Move the UI onto shadcn/ui primitives

**Why:** The BuildSpec requires shadcn, but V0 shipped a Tailwind-only kit with native `<select>` elements. Radix primitives give the keyboard and focus behaviour the WCAG 2.1 AA target assumes, and give a consistent base to build on.

**Acceptance criteria:**
- `components/ui/` contains shadcn `button`, `card`, `input`, `label`, `select`, `alert`, `alert-dialog`, `badge`, `radio-group`, `checkbox`, `table`, `toggle-group` and `chart`, generated with `npx shadcn add`.
- No native `<select>` is left in `components/`. Sentiment and category correction uses the shadcn `Select`, which opens, moves and commits with the keyboard alone (Enter, Arrow keys, Esc).
- Deleting an entry and deleting the account use `AlertDialog`. Focus returns to the trigger when the dialog closes.
- The dark theme looks the same: the indigo accent and sentiment colours (green, slate, red, amber) are unchanged, and visible focus rings are present everywhere.
- `npm run typecheck`, `lint`, `test` and `next build` pass. `tests/public.test.ts` still passes.

**Implementation notes:**
- Run `npx shadcn init`, then merge its CSS variables into `app/globals.css`, which has existing `@theme` tokens and `color-scheme: dark`. Don't overwrite the sentiment tokens.
- Keep the `components/kit.tsx` exports (`buttonClass`, `Card`, `Pill`, `Alert`) as thin wrappers over the shadcn components, so pages change as little as possible. Remove them later.
- `LabelBadge.tsx` `PillSelect` → shadcn `Select` styled as a pill. Inside the TanStack cell, make sure the open state survives re-renders (stable `getRowId` already exists).
- `RangeFilter` can become a `ToggleGroup` of `Link`s. Keep the URL-driven behaviour.
- The shadcn `chart` wrapper sits on top of Recharts. Keep `BreakdownChart`'s table toggle.

**Complexity:** L

**Depends on:** Feature 1

---

#### Feature 9 — Per-IP rate limit on magic-link requests

**Why:** The NFR asks for a per-IP cap alongside the per-email one. Without it, one client can trigger sign-in emails to unlimited addresses, which hurts the sending domain's reputation and can get Resend to suspend the account.

**Acceptance criteria:**
- More than `MAGIC_LINK_IP_HOURLY_LIMIT` (default 20) sign-in requests from one IP in an hour get the same 429 / "Too many sign-in links requested" response, through both the `/signin` server action and `POST /api/auth/signin/resend`.
- No email is sent for a request blocked by IP (`signIn` is never called).
- Raw IPs are never stored. Only an HMAC of the IP keyed with `AUTH_SECRET`.
- Rows older than 24 h are deleted opportunistically, so the table doesn't grow without limit.
- Tests in `tests/auth.test.ts` cover the 21st request from one IP and 20 requests from a different IP that still succeed.

**Implementation notes:**
- New table `magic_link_ip_attempts (ip_hash text, window_start timestamptz, count int)`, with an atomic upsert like `consumeMagicLinkQuota`.
- Take the IP from `x-forwarded-for` (first entry) or `x-real-ip`. In the server action use `headers()` from `next/headers`. `sendVerificationRequest` has no request object, so enforce the IP limit in the action and the route pre-check, and keep the per-email check in `auth.ts`.
- Add `MAGIC_LINK_IP_HOURLY_LIMIT` to `lib/env.ts` and `.env.example`.

**Complexity:** M

**Depends on:** Feature 1

---

#### Feature 10 — Close the DNS-rebinding gap in `guardedFetch`

**Why:** `guardedFetch` checks DNS, but `fetch` then does its own lookup. A hostile endpoint can return a public IP to the check and a private one to the connection. That's the remaining SSRF hole flagged by Backend and QA.

**Acceptance criteria:**
- Outbound requests to user-supplied base URLs connect only to an IP that was checked in the same DNS lookup. The check and the connection can never use different lookups.
- If a hostname resolves to any private, loopback or link-local address at connect time, the request fails with 422 `ssrf_blocked`, and the error appears on the `base_url` field.
- TLS still validates against the original hostname (SNI and certificate check), so HTTPS endpoints behind CDNs keep working.
- A test mocks DNS to return a public IP on the first call and `10.0.0.1` on the second, and asserts that no socket is opened to `10.0.0.1`.
- Redirects are still refused, and the 45 s timeout still applies.

**Implementation notes:**
- Add `undici` as a dependency. Build a module-level `Agent({ connect: { lookup } })` where `lookup` calls `dns.lookup(host, { all: true })`, rejects if any address fails `isPublicIp`, and returns the first validated address.
- Use undici's own `fetch` with `dispatcher: agent` inside `guardedFetch`. Mixing the global fetch with a separately installed undici `Agent` can break on version mismatch.
- Keep `assertPublicUrl` for the early, readable 422s at save and test time.
- `lib/llm/ssrf.ts` is the only file that should change. The route must stay on `runtime = "nodejs"`.

**Complexity:** M

**Depends on:** none

---

#### Feature 11 — Security regression test pack

**Why:** The most important security rules aren't tested yet: never sending a saved key to a new host, SSRF via hostnames, and origin checks on every write. A future @claude PR could quietly break them.

**Acceptance criteria:**
- Test: with a saved OpenAI-compatible connection at host A, testing or saving with base URL host B and no key **does not** send the saved key. The mocked provider receives `apiKey` undefined.
- Test: a hostname (not an IP literal) whose mocked DNS result is `192.168.1.10` returns 422 `ssrf_blocked` from both `/api/connection/test` and `PUT /api/connection`.
- Test: a cross-origin `Origin` header returns 403 `bad_origin` on `POST /api/analyze`, `PATCH`/`DELETE /api/entries/[id]`, `DELETE /api/connection` and `DELETE /api/account`.
- Test: base URL `https://host.example.com` is saved as `https://host.example.com/v1`, and a keyless OpenAI-compatible connection saves and analyzes end to end.
- Test: the `connection_unreadable` paths from Feature 2.

**Implementation notes:**
- Mock DNS with `vi.mock("node:dns/promises")`, scoped to the files that need it so other tests resolve normally.
- Use `it.each` over the mutating handlers for the origin tests. The `call()` helper in `tests/helpers/http.ts` already takes `headers`.
- Find the key passed to the provider by spying on `buildModel` in `lib/llm/providers.ts`, or on the `createOpenAICompatible` options.

**Complexity:** M

**Depends on:** Feature 2

---

#### Feature 12 — Health monitoring and API-key rotation script

**Why:** The NFR's uptime monitor was never built, and `key_version` exists without any way to rotate keys. These are the two operational gaps most likely to cause an outage nobody notices, or to make a leaked secret hard to recover from.

**Acceptance criteria:**
- `.github/workflows/uptime.yml` runs every 15 minutes, `GET`s `${{ secrets.HEALTHCHECK_URL }}/api/health`, and fails (triggering GitHub's failure email) on anything other than 200 with `"db":"ok"`.
- `npm run keys:rotate` re-encrypts every `model_connections.api_key_encrypted` from older `KEY_ENCRYPTION_SECRET_V<n>` secrets to the current `KEY_ENCRYPTION_VERSION`, updates `key_version`, and prints counts only. It never prints keys.
- The rotation script is idempotent (running it twice changes nothing), supports `--dry-run`, and skips rows it can't decrypt, reporting how many.
- `docs/OPERATIONS.md` documents: setting a Vercel spend limit, Neon autoscaling caps, the rotation procedure step by step, and what to check in Vercel Logs (the `request_id`, `error.code` fields).

**Implementation notes:**
- Write `scripts/rotate-keys.ts` the same way as `scripts/seed.ts`: relative imports, `tsx`, loads `.env.local`, uses `decryptApiKey` and `encryptApiKey` from `lib/crypto/keys.ts` with the row's `user_id` as AAD.
- Rotation doesn't invalidate `test_token`s. They're signed with the current secret and expire in 15 minutes anyway.
- The uptime workflow should skip when the secret isn't set, so forks stay green.

**Complexity:** M

**Depends on:** Feature 1

---

### Beyond Phase 1

- **Integrations (Intercom, Zendesk, email forwarding, app-store reviews).** The Longevity review found the product's long-term value depends on feedback flowing *into* it. We need the customer to choose which source matters first before building one.
- **CSV import/export and a GDPR data export.** Deferred to the hardened tier in the SOW. The customer needs to decide the format and whether export is a compliance requirement.
- **Model-drift flags and original-label columns.** Warn when the model behind a dashboard range changes, and store `model_sentiment`/`model_category` for accuracy reporting (PRD open question 4). This needs a product decision on how accuracy is reported.
- **B2B compliance posture (DPA, sub-processor page, EU-region Neon).** Only needed if early users are B2B teams. It's a kill criterion for that segment, so confirm the target buyers first.
- **Teams, shared dashboards and custom categories.** Deliberately left out of V1 to keep labels consistent. Revisit only after the month-4 retention and correction-rate check.

### How to engage

## How to continue building

- Each feature above is filed as a GitHub issue with `@claude` mention. The Claude Code Action will pick them up and open PRs.
- To request a feature manually, comment `@claude implement Feature N` on this repo, or open a new issue starting with `@claude`.
- To pause the autonomous work, remove the `claude-task` label from open issues.
