# Iuris Compliance — Pricing Page Corrections Spec

**Goal:** The live pricing page has drifted from the agreed 3-tier model in several places. This spec corrects every discrepancy in a single pass: database values, plan card display, hero copy, feature bullets, and the removal of components/elements that should not be on the page.

**Scope:** Database (`subscription_plans` table) + frontend (`PricingPage.jsx`, `PlanCard.jsx`, `FAQAccordion.jsx`, hero, and any related components). **Not in scope:** logo files, color scheme, signup flow, payment integration.

## Part 1: Database Corrections

The `subscription_plans` table has incorrect values for several fields. Run this migration to fix them.

Migration file: `supabase/migrations/20260526_correct_pricing_plan_values.sql`

```sql
-- ========================================================================
-- Correct subscription_plans values to match the agreed 3-tier model
-- ========================================================================

-- Small Firm: 1-5 advocates, TZS 250,000/month, TZS 2,500,000/year
UPDATE subscription_plans
SET
  description = 'For firms with 1-5 advocates. Full AMLA Cap. 423 compliance: Client KYC, automated sanctions screening, Institutional Risk Assessment, and FIU-ready reports.',
  price_monthly_tzs = 250000,
  price_annual_tzs = 2500000,
  max_users = 12,
  max_clients = 150,
  max_matters = 250,
  max_iras_per_year = 2,
  max_compliance_cases_per_year = 50,
  max_screenings_per_month = 400,
  storage_gb = 10,
  features = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(features, '{advocate_range}', '"1-5"'),
        '{ira_finalized_per_year}', '2'
      ),
      '{maturity_assessment}', '"annual"'
    ),
    '{compliance_cases_per_year}', '50'
  )
WHERE tier = 'small_firm';

-- Medium Firm: 6-15 advocates, TZS 600,000/month, TZS 6,000,000/year
UPDATE subscription_plans
SET
  description = 'For firms with 6-15 advocates. Everything in Small Firm, plus quarterly risk reviews, premium PEP and adverse media screening via OpenSanctions, and priority support.',
  price_monthly_tzs = 600000,
  price_annual_tzs = 6000000,
  max_users = 30,
  max_clients = 600,
  max_matters = 1200,
  max_iras_per_year = 4,
  max_compliance_cases_per_year = 250,
  max_screenings_per_month = 2500,
  storage_gb = 50,
  features = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(features, '{advocate_range}', '"6-15"'),
        '{ira_finalized_per_year}', '4'
      ),
      '{maturity_assessment}', '"quarterly"'
    ),
    '{compliance_cases_per_year}', '250'
  )
WHERE tier = 'medium_firm';

-- Large Firm: 16+ advocates, NULL pricing (custom), all caps unlimited
UPDATE subscription_plans
SET
  description = 'For firms with 16+ advocates. Everything in Medium Firm, plus unlimited capacity, dedicated account manager, custom onboarding, and SLA-backed support.',
  price_monthly_tzs = NULL,
  price_annual_tzs = NULL,
  max_users = NULL,
  max_clients = NULL,
  max_matters = NULL,
  max_iras_per_year = NULL,
  max_compliance_cases_per_year = NULL,
  max_screenings_per_month = NULL,
  storage_gb = 500,
  contact_sales = TRUE,
  features = jsonb_set(
    jsonb_set(
      features,
      '{advocate_range}', '"16+"'
    ),
    '{maturity_assessment}', '"continuous"'
  )
WHERE tier = 'large_firm';
```

### Verification queries (run after the migration)

```sql
-- Should return exactly 3 rows with correct values
SELECT tier, name, price_monthly_tzs, price_annual_tzs,
       max_users, max_clients, max_matters, max_iras_per_year,
       max_screenings_per_month, storage_gb,
       features->>'advocate_range' AS advocate_range,
       contact_sales
FROM subscription_plans
ORDER BY display_order;

-- Expected output:
-- small_firm  | Small Firm  | 250000  | 2500000 | 12   | 150  | 250  | 2    | 400   | 10  | 1-5  | f
-- medium_firm | Medium Firm | 600000  | 6000000 | 30   | 600  | 1200 | 4    | 2500  | 50  | 6-15 | f
-- large_firm  | Large Firm  | NULL    | NULL    | NULL | NULL | NULL | NULL | NULL  | 500 | 16+  | t
```

## Part 2: Pricing Page Hero — Copy Corrections

In `PricingPage.jsx`, update the hero section:

### Current (wrong):

```
✓ 14-day free trial on all paid plans
✓ No credit card required
✓ Cancel anytime
```

### Replace with:

```
✓ 14-day free trial on Small Firm and Medium Firm
✓ No card required to start
✓ Cancel anytime
```

The change: "all paid plans" is misleading because Large Firm doesn't have a self-serve trial — Large Firm requires sales contact. Also "credit card" → "card" since you don't accept credit cards (only mobile money and CRDB Bank transfer).

The hero headline ("Pricing for Tanzanian Advocates") and subhead ("Three compliance systems in one — Client KYC/CDD, Institutional Risk Assessment, and Sanctions Screening, built for AMLA Cap. 423") are correct.

## Part 3: Monthly/Annual Toggle — REMOVE

The current page has a Monthly/Annual toggle near the top of the cards. Remove this entirely.

### Why

Per the simplification spec, pricing is shown as:
- **Headline price:** monthly (TZS 250,000/mo or TZS 600,000/mo)
- **Secondary line:** annual equivalent with savings note ("or TZS 2,500,000/yr — save 17%")

A toggle adds cognitive load with no benefit since both prices are shown on every card anyway.

### What to do

In `PricingPage.jsx`:

1. Find the `BillingToggle` import and remove it
2. Find the `<BillingToggle>` component instance and remove it
3. Find the `billingCycle` state variable; default to `'monthly'` and stop changing it
4. Pass `billingCycle="monthly"` as a fixed prop to each `<PlanCard>`
5. Delete the `BillingToggle.jsx` component file entirely

In `PlanCard.jsx`: Section 4 below describes the corrected price block; it always renders both monthly and annual.

## Part 4: PlanCard Price Block — Restructure

The current cards show "TZS 208,000/mo" as the headline (which is the annualized monthly figure) and the actual monthly price (TZS 250,000) is hidden behind a strikethrough. This is confusing and reverses the agreed display.

### Replace the price block with this structure:

For Small Firm and Medium Firm cards:

```jsx
<div className="price-block">
  <div className="price-headline">
    <span className="currency">TZS</span>
    <span className="amount">{plan.price_monthly_tzs.toLocaleString()}</span>
    <span className="period">/month</span>
  </div>
  <div className="price-annual">
    or <strong>TZS {plan.price_annual_tzs.toLocaleString()}/year</strong>
    <span className="savings-badge">save 17%</span>
  </div>
  <div className="vat-note">VAT inclusive</div>
</div>
```

For Large Firm card:

```jsx
<div className="price-block">
  <div className="price-headline-custom">Let's talk</div>
  <div className="price-annual">We'll build you a quote</div>
</div>
```

### What this changes

- Headline price is the actual monthly figure (TZS 250,000 or TZS 600,000), not the annualized division
- Annual price is presented as the "or" alternative, with the 17% savings as a small badge
- "VAT inclusive" sits below as a quiet reassurance
- Large Firm shows "Let's talk" instead of the confusing "Custom" + price grid

The current display ("TZS 208,000/mo" with strikethrough TZS 250,000) implies a discount that doesn't exist. Customers see the strikethrough and think "I'm saving TZS 42,000/month" when actually they're being shown the annual price divided by 12. Misleading.

## Part 5: "MOST POPULAR" Badge — REMOVE

The Medium Firm card has a "MOST POPULAR" badge. Remove it.

### Why

Per the simplification spec, this badge was explicitly excluded. The product has no customers yet, so claiming a "most popular" tier is dishonest. Once Iuris Compliance has 50+ paying customers and Medium Firm is genuinely the most-chosen tier, the badge can come back with evidence.

### What to do

In `PlanCard.jsx`:

1. Find any `mostPopular` prop or `is_most_popular` field
2. Remove the conditional rendering of the badge
3. Remove the badge JSX entirely (the "MOST POPULAR" styled element)
4. Remove the corresponding CSS for `.most-popular-badge`
5. Remove any visual emphasis on Medium Firm — all three cards should have equal visual weight

In the `subscription_plans` table, if there's an `is_popular` or `is_recommended` BOOLEAN column, set all rows to FALSE.

## Part 6: Capacity Display in Plan Cards

The capacity table inside each card currently shows the wrong values (carried over from the wrong database state). After the Part 1 migration runs, these will automatically pull correct values IF the component reads from `subscription_plans` columns. Verify this is the case.

### Expected display after migration

| Limit row | Small Firm | Medium Firm | Large Firm |
|---|---|---|---|
| Advocates | Up to 5 (NOT "Up to 10") | Up to 15 (NOT "Up to 30") | 16+ |
| Users | Up to 12 | Up to 30 | Unlimited |
| KYC clients | Up to 150 | Up to 600 | Unlimited |
| Active matters | Up to 250 | Up to 1,200 | Unlimited |
| IRAs/year | 2 | 4 | Unlimited |
| Screenings/month | 400 | 2,500 | Unlimited |
| Storage | 10 GB | 50 GB | 500+ GB |

**Important:** the "Advocates" row should display the `features.advocate_range` value, not `max_users`. These are different concepts:

- **Advocate range** = number of admitted advocates the tier is sold to (1-5, 6-15, 16+)
- **Max users** = total system user accounts the tier permits (advocates + paralegals + admin + compliance officers = 12, 30, or unlimited)

If the component currently shows `max_users` in an "Advocates" row, fix it to use `features.advocate_range` instead.

### What to do in `PlanCard.jsx`

```jsx
const capacityRows = [
  { label: 'Advocates', value: plan.features.advocate_range },
  { label: 'System users', value: plan.max_users ? `Up to ${plan.max_users}` : 'Unlimited' },
  { label: 'KYC clients', value: plan.max_clients ? `Up to ${plan.max_clients.toLocaleString()}` : 'Unlimited' },
  { label: 'Active matters', value: plan.max_matters ? `Up to ${plan.max_matters.toLocaleString()}` : 'Unlimited' },
  { label: 'IRAs/year', value: plan.max_iras_per_year ?? 'Unlimited' },
  { label: 'Screenings/month', value: plan.max_screenings_per_month ? plan.max_screenings_per_month.toLocaleString() : 'Unlimited' },
  { label: 'Storage', value: plan.storage_gb ? `${plan.storage_gb} GB` : 'Unlimited' },
];
```

## Part 7: Feature Bullets — Replace Wholesale

The current feature bullets in each card are partly wrong, partly missing key built features, and partly overstate features that aren't fully built. Replace them with the agreed plain-language outcomes.

### Small Firm bullets (replace the entire list)

```jsx
const smallFirmBullets = [
  'Run client KYC/CDD the way AMLA Cap. 423 requires',
  'Automatically screen clients against UN, EU, UK, and OFAC sanctions lists, refreshed daily',
  'Manage matters with automatic AML trigger flagging across 10 matter types',
  'Generate your annual Institutional Risk Assessment automatically',
  '47-control Maturity Assessment across 9 weighted AML/CFT domains',
  'Track suspicious activity and document STR filings with multi-level approval',
  'Secure document storage with dual-control verification and SHA-256 integrity',
  'MFA-protected accounts with backup codes',
  '10-year audit trail per AMLA retention requirement',
];
```

**Remove from the current Small Firm card:** "NIDA & BRELA verification ready" — this overstates the feature. There's no NIDA or BRELA API integration; there's just a text field. If you want to reference these documents, the honest phrasing is *"Track NIDA, passport, BRELA, and other identification documents"* — but this is already covered by the "Run client KYC/CDD" bullet, so it doesn't need its own line.

### Medium Firm bullets (replace the entire list)

```jsx
const mediumFirmBullets = [
  'Everything in Small Firm',
  'Premium PEP and adverse media screening via OpenSanctions',
  'Quarterly Institutional Risk Assessment reviews instead of annual',
  'Up to 30 system users (advocates, paralegals, staff, compliance)',
  'Required MFA enforcement with session elevation for sensitive actions',
  'Priority email, WhatsApp, and phone support (4-hour response)',
  'Quarterly compliance review session with our team',
];
```

**Remove from the current Medium Firm card:** "Unlimited Institutional Risk Assessments" (incorrect — Medium Firm gets 4/year, not unlimited), "Maturity Assessment (monthly + trending)" (incorrect — it's quarterly, not monthly).

### Large Firm bullets (replace the entire list)

```jsx
const largeFirmBullets = [
  'Everything in Medium Firm',
  'Unlimited users, clients, matters, assessments, and screenings',
  'Dedicated account manager who knows your firm',
  'Custom onboarding program tailored to your structure',
  'Quarterly training sessions (virtual or on-site)',
  'Quarterly compliance review with written report for board reporting',
  'Priority response SLA (1-hour during business hours)',
];
```

**Remove from the current Large Firm card:**

- "99.9% uptime SLA" — only include this if you have a written SLA you can actually deliver against; otherwise it's an unenforceable claim
- "Bespoke implementation support" — vague; the specific items (dedicated account manager, custom onboarding, quarterly training) say the same thing concretely

## Part 8: "See full feature comparison" Button — REMOVE

The page currently has a "See full feature comparison ↓" button below the cards. This was supposed to be removed per the simplification spec.

### What to do

1. In `PricingPage.jsx`, remove the button element
2. Remove the onClick handler that scrolls to or opens `FeatureComparisonTable`
3. Delete `FeatureComparisonTable.jsx` entirely if it still exists
4. Remove the `FeatureComparisonTable` import from `PricingPage.jsx`
5. Remove any related state variables (`showComparison`, etc.)

### Why

Three cards with 7-9 bullets each give buyers enough information to choose. The cards themselves are the comparison. A separate comparison table duplicates content and creates a longer page than needed.

Keep the "See optional add-ons & professional services ↓" button — that's separate functionality that's still relevant.

## Part 9: Payment Methods Section — Minor Adjustment

The five payment method chips (M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, CRDB Bank Transfer) are correct.

### Styling consistency

Currently the chips have inconsistent colors (green M-Pesa, red Mixx, red Airtel, yellow Halo, navy CRDB). Standardize them.

Two acceptable options:

**Option A — All same style (recommended):**
- White background
- Navy border (#0A1929) at 1px
- Navy text (#0A1929)
- Same padding and font weight across all five
- Looks unified, professional

**Option B — Brand-colored chips:**
- Each chip in its actual brand color (M-Pesa red, Airtel red, Mixx blue, etc.)
- Only if you can secure accurate brand color usage rights and apply consistently
- More work, marginal benefit

Recommend Option A unless there's a specific brand reason to differentiate.

## Part 10: FAQ Section — Verify 5 Questions Only

The current page shows 4 FAQ questions visible in the screenshot:

1. What's included in the 14-day free trial?
2. How does Tanzania VAT work?
3. What is Premium Sanctions Screening?
4. Can I cancel or change plans?

We agreed to exactly 5 questions. Add the missing fifth:

5. **What payment methods do you accept?**

   *A: M-Pesa, Mixx by Yas, Airtel Money, HaloPesa, and bank transfer to CRDB Bank. Mobile money payments confirm within seconds.*

Verify each FAQ answer aligns with our agreed answers from the simplification spec. In particular:

- **"What's included in the 14-day free trial?"** should clarify trial is for Small Firm and Medium Firm only; Large Firm has guided demos instead
- **"How does Tanzania VAT work?"** should note all prices are VAT-inclusive at 18%
- **"What is Premium Sanctions Screening?"** should explain it as the OpenSanctions PEP and adverse media addition on Medium Firm and Large Firm only
- **"Can I cancel or change plans?"** should mention 30-day data retention after cancellation

## Part 11: "Still Have Questions?" Footer CTA

The bottom-of-page section ("Still have questions? Our team is ready to help you get started with AMLA Cap. 423 compliance. [Contact sales] [Go to dashboard]") is fine as is. No changes needed.

## Part 12: Acceptance Criteria

The corrections are complete when:

- [ ] DB migration runs cleanly
- [ ] `SELECT` verification query shows the exact expected values for all three tiers
- [ ] `subscription_plans.features->>'advocate_range'` returns '1-5', '6-15', '16+'
- [ ] Pricing page hero shows "14-day free trial on Small Firm and Medium Firm" + "No card required to start" + "Cancel anytime"
- [ ] No Monthly/Annual toggle visible anywhere on the page
- [ ] `BillingToggle.jsx` file deleted; no remaining imports
- [ ] No "MOST POPULAR" badge visible on any card
- [ ] Small Firm card displays headline price "TZS 250,000/month"
- [ ] Medium Firm card displays headline price "TZS 600,000/month"
- [ ] Large Firm card displays "Let's talk" (not "Custom" with a price grid)
- [ ] Both Small Firm and Medium Firm cards show annual price ("or TZS X,XXX,XXX/year — save 17%") below headline
- [ ] All cards show "VAT inclusive" below price block
- [ ] Capacity table inside cards shows correct values (Small Firm: 1-5 advocates, 12 users, 150 clients, 250 matters, 2 IRAs, 400 screenings, 10 GB)
- [ ] Capacity table inside cards shows correct values (Medium Firm: 6-15 advocates, 30 users, 600 clients, 1200 matters, 4 IRAs, 2500 screenings, 50 GB)
- [ ] Capacity table for Large Firm shows "Unlimited" for all caps except storage (500+ GB)
- [ ] Small Firm feature bullets match the 9 agreed bullets exactly
- [ ] Medium Firm feature bullets match the 7 agreed bullets exactly
- [ ] Large Firm feature bullets match the 7 agreed bullets exactly
- [ ] "NIDA & BRELA verification ready" no longer appears anywhere
- [ ] "99.9% uptime SLA" no longer appears anywhere
- [ ] "Bespoke implementation support" no longer appears anywhere
- [ ] "Unlimited Institutional Risk Assessments" on Medium Firm replaced with "Quarterly Institutional Risk Assessment reviews"
- [ ] "Maturity Assessment (monthly + trending)" replaced with quarterly equivalent
- [ ] "See full feature comparison" button removed
- [ ] `FeatureComparisonTable.jsx` file deleted; no remaining imports
- [ ] "See optional add-ons & professional services" button retained and working
- [ ] Payment method chips display in consistent styling (Option A or B)
- [ ] FAQ section has exactly 5 questions including "What payment methods do you accept?"
- [ ] Production build passes with no warnings or errors

## Part 13: Implementation Order

Do the work in this sequence:

1. **Database first.** Run the migration from Part 1. Verify with the query in Part 1.6.
2. **Verify components read correct DB values.** Refresh the pricing page. The capacity rows inside cards should already show correct numbers if components read from `subscription_plans` columns. If they show old values, the components have hardcoded numbers that need replacing with database reads.
3. **Hero copy.** Update the three checkmark lines in the hero (Part 2).
4. **Remove the Monthly/Annual toggle.** Delete the `BillingToggle.jsx` file and all imports (Part 3).
5. **Restructure the price block** in `PlanCard.jsx` (Part 4).
6. **Remove the MOST POPULAR badge** (Part 5).
7. **Update feature bullets** in `PlanCard.jsx` (Part 7).
8. **Remove "See full feature comparison" button and `FeatureComparisonTable.jsx`** (Part 8).
9. **Standardize payment method chips** (Part 9).
10. **Update FAQ section** to 5 questions with correct answers (Part 10).
11. **Run production build.** Confirm no errors.
12. **Manual visual check** — open the pricing page, verify against Part 12 acceptance criteria item by item.

## Part 14: What This Spec Does NOT Touch

Out of scope for this correction:

- Logo files or logo placement (deferred to a separate session)
- Color scheme (already correct)
- Signup flow / `LawFirmOnboarding.jsx` (separate spec covers this)
- `TrialExpiredModal.jsx` (separate spec covers this)
- Admin `SubscriptionManagement.jsx` (separate spec covers this)
- ClickPesa payment integration (separate spec covers this)
- `sales_enquiries` discovery form (separate spec covers this)
- The Large Firm sales sheet content (already correct, not on this page)

These are valid future work items, but mixing them with these pricing-page corrections expands scope and risks regression. Do this spec cleanly first.

---

**That's the complete correction spec.** Paste into Bolt.new in 2 batches:

1. **First batch:** Parts 1, 12, 13 (database migration + acceptance criteria + run order). Let Bolt complete this, run verification queries, and confirm the data is correct before any frontend work.

2. **Second batch:** Parts 2–11 (all the frontend changes). With the data correct, the components only need their display logic and copy updated.

After this is deployed, the pricing page will match what we agreed in this conversation. The next session can address any remaining drift (signup flow, modals, admin dashboard) using the same correction approach.
