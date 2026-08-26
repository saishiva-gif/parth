# Parth Usage & MOU Tracker

Standalone dashboard tracking real Databricks consumption of Parth (NDR AI
Agent + Order Confirmation) against each account's committed MOU. Independent
from the ClickPost Signal app.

## Stack

- Frontend: React + Vite + TypeScript + Tailwind + Recharts, dark-mode-first.
- Backend: Python serverless functions (`/api`) using `databricks-sql-connector`.
- Config: MOUs are editable in-app (see below); alert thresholds are hand-maintained YAML (`config/thresholds.yaml`).

## Billing convention (important, do not change without re-confirming)

Only `NDR_AI_AGENT_WITHOUT_VOICEMAIL` and `ORDER_CONFIRMATION_WITHOUT_VOICEMAIL`
are billable and queried. This is the **opposite** of the ClickPost Signal
scoring engine's convention (which sums the total column and treats
`_WITHOUT_VOICEMAIL` as diagnostic-only). Here, `_WITHOUT_VOICEMAIL` is the
billable meter because billing excludes voicemail-connected calls.

## Local development

```bash
npm install
pip install -r requirements.txt
cp .env.example .env.local   # fill in Databricks credentials
vercel dev                   # serves frontend + /api together on one port
```

`vite dev` alone will not serve the Python `/api` functions — use `vercel dev`
(`npm i -g vercel` if you don't have it) for full-stack local testing.

The first call to `/api/sync` backfills 90 days of history; after that it
pulls incrementally from `fetched_through + 1 day` through yesterday.

## Storage

`api/_lib/kv.py` is a tiny JSON key-value store with two backends:

- **Postgres** (production) — used automatically when `DATABASE_URL` (or
  Vercel's own `POSTGRES_URL`) is set. One table, `parth_kv_store(key text
  primary key, value jsonb, updated_at timestamptz)`, created on first use.
  Two rows live in it: `usage` (the daily usage cache + sync watermark) and
  `mou_config` (the MOU editor's data).
- **Local JSON files** (dev only) — used when no database URL is set. Falls
  back to `data/usage.json` / `data/mou_config.json` locally, or
  `/tmp/parth-usage/...` on Vercel if you ever deploy without a database —
  which does **not** persist across serverless invocations, so don't skip
  provisioning Postgres for a real deployment (see below).

`storage.py` (used by `sync.py`, `data.py`, `mous.py`) only calls through
`kv.get`/`kv.set` — it has no idea which backend is active.

## MOU config

MOUs are managed from inside the app — click **Manage MOUs** in the header to
add, edit, or remove rows (account name, Databricks username, metric, monthly
MOU, effective-from date). Changes save via `PUT /api/mous` and take effect
immediately on reload; no redeploy needed.

Under the hood:

- `config/parth_mous.yaml` is now only a **one-time seed** — on first run,
  `storage.load_mou_config()` reads it once, assigns each row an id, and
  persists it into the same JSON-backed store usage data uses
  (`data/mou_config.json` locally, `/tmp/parth-usage/...` on Vercel — subject
  to the same ephemeral-storage caveat above). After that first seed, the
  YAML file is not read again; the in-app editor is the source of truth.
- Editing a row's `mou_monthly` updates that commitment in place (no history
  is kept for that edit) — for a real renewal with a new committed number,
  add a new row with a later `effective_from` instead of overwriting, so past
  months keep resolving against the MOU that was actually in effect then.
- Each row now takes a single `databricks_username` (the list-of-usernames
  form from the original design was dropped for editor simplicity) — if an
  account has multiple Databricks usernames, add one row per username.

## Alert thresholds

`config/thresholds.yaml` — global defaults, 80% / 120%. Per-account/metric
overrides were explicitly deferred for this first build; revisit if needed.

## Open items carried over from spec

- [x] Confirm Databricks catalog name — confirmed `clickpost_poc_may_18_v2`
      against real data (54 live accounts, both metrics returning counts).
- [ ] Real MOU numbers per account — enter via **Manage MOUs** in the app.
- [ ] `databricks_username` ↔ account-name mapping for every signed account —
      also entered via **Manage MOUs**.
- [ ] Auth — currently **none**; this is an internal tool with no login.
      Add at minimum a shared-password gate before sharing the URL widely,
      since it surfaces usage/billing data.
- [x] Persistent storage — Postgres-backed via `api/_lib/kv.py` (see above).

## Deploying

1. **Install the Vercel CLI and log in** (skip if already set up):
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Link this directory to a Vercel project**:
   ```bash
   vercel link
   ```
   Follow the prompts (create a new project, e.g. `parth-usage-mou-tracker`).

3. **Provision Postgres** — in the [Vercel dashboard](https://vercel.com/dashboard),
   open the project → **Storage** tab → **Create Database** → **Postgres**
   (Neon-backed) → connect it to this project. This automatically injects
   `POSTGRES_URL` (and a few related vars) into the project's environment for
   Production, Preview, and Development — no manual copy-pasting needed.

4. **Set the Databricks secrets** (Settings → Environment Variables in the
   dashboard, or via CLI):
   ```bash
   vercel env add DATABRICKS_SERVER_HOSTNAME production
   vercel env add DATABRICKS_HTTP_PATH production
   vercel env add DATABRICKS_TOKEN production
   ```
   Optionally also `DATABRICKS_CATALOG` (only if it's ever not
   `clickpost_poc_may_18_v2`) and `CRON_SECRET` (a random string — if set,
   `/api/sync` requires it as a bearer token; Vercel Cron sends it
   automatically once the env var exists).

5. **Deploy**:
   ```bash
   vercel --prod
   ```

6. **Trigger the first sync manually** (don't wait for the 3am cron the first
   time — you want to see it work). With `CRON_SECRET` set:
   ```bash
   curl -H "Authorization: Bearer <your CRON_SECRET>" https://<your-deployment>.vercel.app/api/sync
   ```
   Without `CRON_SECRET` set, just visiting `/api/sync` in a browser works.
   This backfills ~180 days of history (takes a little while — it's a real
   Databricks query over 6 months).

7. **Open the deployed URL** and confirm the dashboard populates. Add real
   MOUs via **Manage MOUs** — they're now stored in Postgres, so they'll
   survive redeploys and cold starts.

The daily cron (`vercel.json`, `0 3 * * *`) then keeps usage data current
automatically — no further manual steps. Note: Vercel Cron on the Hobby plan
is capped at once/day, which this schedule already respects; a Pro plan
allows more frequent schedules if you ever want same-day-earlier syncs.
