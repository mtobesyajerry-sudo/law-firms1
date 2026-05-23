# Sanctions & Screening — Live Implementation Setup

This package converts the manual-list screening dashboard into a live system that pulls real sanctions data from OFAC, UN, EU, and UK lists, with an optional OpenSanctions premium tier for PEP and adverse media coverage.

## What's in the box

```
supabase/
├── migrations/
│   └── 20260523000000_sanctions_screening_live.sql   # schema + fuzzy match function
└── functions/
    ├── _shared/ingestion.ts        # shared utils for all sync jobs
    ├── sync-ofac/index.ts          # OFAC SDN daily ingestion
    ├── sync-un/index.ts            # UN Consolidated daily ingestion
    ├── sync-eu/index.ts            # EU Consolidated daily ingestion
    ├── sync-uk/index.ts            # UK HMT/OFSI daily ingestion
    └── screen-client/index.ts      # the screening engine (DB + OpenSanctions)

src/
├── services/screeningService.js               # drop-in replacement
└── components/sanctions/
    ├── NewScreeningModal.jsx
    ├── ReviewMatchesPanel.jsx
    └── ManageListsPanel.jsx
```

## Step 1 — Apply the migration

```bash
# Using the Supabase CLI (recommended)
supabase db push

# OR via the Supabase dashboard
# Project → SQL Editor → paste the migration file → Run
```

The migration is **idempotent** — safe to re-run. It:

- Enables `pg_trgm`, `fuzzystrmatch`, `unaccent`, `pg_cron`
- Adds the columns needed for live screening to your existing tables
- Creates `screening_matches`, `list_ingestion_log`, `screening_audit_log`
- Seeds the five global list records (OFAC SDN, OFAC Consolidated, UN, EU, UK)
- Creates the `match_screening_candidates(...)` RPC — the core fuzzy match
- Sets RLS so every advocate sees global lists + their own internal lists only

## Step 2 — Configure Edge Function secrets

In Supabase dashboard → Project Settings → Edge Functions → Secrets, add:

| Secret | Value | Used by |
|---|---|---|
| `CRON_SECRET` | A long random string (`openssl rand -hex 32`) | All sync-* functions |
| `OPENSANCTIONS_API_KEY` | From your OpenSanctions account | screen-client (premium tier) |
| `EU_FSF_TOKEN` | Optional — for EU sanctions list (only if endpoint requires it) | sync-eu |

Note: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected.

## Step 3 — Deploy the Edge Functions

```bash
# From the supabase/ directory
supabase functions deploy sync-ofac --no-verify-jwt
supabase functions deploy sync-un --no-verify-jwt
supabase functions deploy sync-eu --no-verify-jwt
supabase functions deploy sync-uk --no-verify-jwt
supabase functions deploy screen-client
# note: screen-client uses user JWT, so do NOT pass --no-verify-jwt
```

The `--no-verify-jwt` flag on sync-* is intentional — those are protected by `CRON_SECRET` so they can be called from cron/curl without a Supabase session.

## Step 4 — Run the initial list ingestion

Trigger each sync once to populate the lists:

```bash
# Replace YOUR_PROJECT_REF and YOUR_CRON_SECRET
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-ofac

curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-un

# ...repeat for sync-eu and sync-uk
```

You should see responses like `{"ok":true,"added":12345,"updated":0,"removed":0,"total":12345}`.

Check the Manage Lists screen — entries should now show real numbers.

## Step 5 — Schedule daily refreshes

Two options:

### Option A — pg_cron (recommended if pg_net is enabled)

In the SQL Editor:

```sql
-- Store the cron secret + edge URL as settings
ALTER DATABASE postgres SET app.settings.cron_secret = 'YOUR_CRON_SECRET';
ALTER DATABASE postgres SET app.settings.edge_url = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1';

-- Schedule each sync
SELECT cron.schedule('sync-ofac-daily', '0 2 * * *', $$
  SELECT net.http_post(
    url := current_setting('app.settings.edge_url') || '/sync-ofac',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'))
  );
$$);

SELECT cron.schedule('sync-un-daily', '15 2 * * *', $$
  SELECT net.http_post(
    url := current_setting('app.settings.edge_url') || '/sync-un',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'))
  );
$$);

-- Same pattern for sync-eu and sync-uk, staggered 15 min apart
```

### Option B — GitHub Actions cron

```yaml
# .github/workflows/sanctions-sync.yml
name: Sanctions Sync
on:
  schedule:
    - cron: '0 2 * * *'    # daily 02:00 UTC
  workflow_dispatch:
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync OFAC
        run: curl -X POST -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" "${{ secrets.SUPABASE_FN_URL }}/sync-ofac"
      - name: Sync UN
        run: curl -X POST -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" "${{ secrets.SUPABASE_FN_URL }}/sync-un"
      - name: Sync EU
        run: curl -X POST -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" "${{ secrets.SUPABASE_FN_URL }}/sync-eu"
      - name: Sync UK
        run: curl -X POST -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" "${{ secrets.SUPABASE_FN_URL }}/sync-uk"
```

## Step 6 — Wire the React components into your dashboard

Replace your existing `screeningService.js` with the one in `src/services/`. The function signatures are mostly compatible but check your call sites.

Wire up the three new components on the existing dashboard:

```jsx
import NewScreeningModal from "./components/sanctions/NewScreeningModal";
import ReviewMatchesPanel from "./components/sanctions/ReviewMatchesPanel";
import ManageListsPanel from "./components/sanctions/ManageListsPanel";

// "New Screening" button onClick → open NewScreeningModal
// "Review Matches" button onClick → navigate to a page rendering <ReviewMatchesPanel />
// "Manage Lists" button onClick → navigate to a page rendering <ManageListsPanel />
```

The counters on your dashboard can be populated via `getDashboardCounters()` from the service.

## Step 7 — OpenSanctions setup (for premium tier)

1. Sign up at https://www.opensanctions.org/ — use your business email for a trial key
2. For production, contact them about a **reseller license** (you're embedding their data in a product you sell to advocates)
3. Set `OPENSANCTIONS_API_KEY` in Edge Function secrets
4. The "Premium" checkbox in NewScreeningModal toggles its use per-screening

Pricing: pay-per-query. Free tier covers your testing; budget roughly USD $0.001–0.01 per query depending on plan.

## How matching works

When an advocate runs a screening:

1. **Name normalization** — Lowercase, strip accents, remove titles (Mr., Sheikh, etc.), collapse whitespace. Done on both the query and stored names.

2. **Trigram similarity** — Postgres `pg_trgm` extension computes the similarity of the query name to every list entry's primary name AND every alias. Threshold default 0.70.

3. **Score boosts**
   - DOB matches: +0.15 to score
   - DOB mismatch (both known but different): −0.20
   - Nationality match: +0.05
   - ID number found in raw record: +0.20

4. **Risk classification**
   - Score ≥ 0.85 + sanctioned list → `critical`
   - Score ≥ 0.85 → `high`
   - PEP match or score ≥ 0.75 → `medium`
   - Otherwise → `low`

5. **Optional OpenSanctions** — sends the query to their `/match/sanctions` endpoint; adds their results alongside.

6. **Persist + audit** — Writes screening_results, screening_matches, screening_audit_log. Every step is recorded for the seven-year retention required by Tanzania's AML regime.

## Tanzania-specific notes

- This satisfies the **sanctions screening** part of CDD for advocates as DNFBPs under the FIAMLA
- It does **not** by itself satisfy your full CDD obligations — identification, verification, source-of-funds, and beneficial-ownership checks are separate
- Records are retained in `screening_results`, `screening_matches`, and `screening_audit_log` — you should configure regular backups and ensure retention ≥ 7 years from last transaction
- Cash transactions ≥ USD 10,000 and electronic transfers ≥ USD 1,000 trigger separate FIU reporting that is **outside this module's scope**
- Suspicious Transaction Reports (STRs) to the FIU must be filed within 24 hours — consider adding a separate "File STR" feature that auto-pulls a client's screening history

## Testing the system end-to-end

After ingestion, try these names to verify it's working:

```
"Vladimir Putin"           → should hit UK + EU + others, score > 0.95
"Bashar al-Assad"          → multiple sanctions hits
"Kim Jong Un"              → UN + OFAC matches
"Juma Mwakyusa"            → no match (typical Tanzanian name not on lists)
"Vlad Putin"               → fuzzy match should still hit (alias / fuzzy)
"ABU MUSAB AL ZARQAWI"     → UN historical entry
```

## Known limitations

- **EU list endpoint** sometimes requires registration & a token. If sync-eu fails with HTTP 401/403, you'll need to register at https://webgate.ec.europa.eu/europeaid/online-services/index.cfm and set `EU_FSF_TOKEN`.
- **PEP coverage** is intentionally weak in the free tier — only what's incidentally in OFAC/UN/EU/UK. Real PEP coverage requires OpenSanctions premium.
- **Adverse media** is not in the free tier at all. OpenSanctions premium covers it.
- **Vessel/aircraft** screening is supported in the schema but not surfaced in the default UI.
- **Phonetic matching** (for transliterated Arabic/Swahili names) currently relies on trigram similarity only. If you see misses on transliterated names, consider adding double-metaphone in a future iteration.

## What to tell your advocate users

Be clear in your UI/marketing:

- ✅ "Screens against OFAC, UN, EU and UK consolidated sanctions lists, updated daily"
- ✅ "Premium tier adds global PEP and adverse media coverage via OpenSanctions"
- ✅ "Maintains full audit trail for FIU inspection"
- ❌ Do NOT imply the tool fulfills all CDD obligations — it covers sanctions screening only

## Support contact

Internal: monitor `list_ingestion_log` for sync failures, set up Supabase alerts on `sync_status = 'failed'` for any global list.
