# LeadSquared functional analysis → EstateAI CRM

Inspection date: 2026-10-17. Method: read-only LeadSquared MCP **metadata** calls only
(`get_list_of_activity_types`, `get_metadata`, `get_opportunity_types`). No lead, user,
activity-instance or report data was read; nothing was written. No customer data is in this repo.
Browser session, UI screens, reports, role settings: **Unavailable** (no browser tool in this session).
REA was reviewed (README only), not installed; it is a binary-analysis MCP and not needed for this task.

## 1. Evidence (Observed = from the account's schema metadata)

| # | Finding | Status | Limits |
|---|---|---|---|
| 1 | 72 activity types incl. Lead Assigned (audited, lockable by role), Lead Distribution Activity (Distribution Type/Distributed To/Date), Site Visit Schedule, Site Visit Complete, Customer Did not come for Site Visit, Booking Complete, EOI Picked, Meeting Done, Not Interested | Observed | Field lists only; workflow/automation behind them unknown |
| 2 | Site Visit Complete fields: Project, Visit Source, Catcher, Verified For Payout, Visit Payable Amount, Visit Type, Owner 2, Pre-Sales Executive, Cash Payout Done, Builder Executive, Preferred City | Observed | Whether verification gates payout is Inferred |
| 3 | Booking Complete fields: Booking Date **and** Posting Date, Booking Validation, Cancelled Date, Churning, Reference Lead, Owner 2, BSP, Size, Booking Type | Observed | How cancellation affects reports is Unavailable |
| 4 | Lead schema (145 fields): Owner, Initial Owner (custom), Source/Subsource, Project + multi-select Project Preference, Priority Score/Band, Distribution Counter, Lead Age, Last Activity | Observed | Option lists not reviewed |
| 5 | No opportunity types configured | Observed | |
| 6 | Report numerators/denominators, timezone, owner-at-event vs current owner, roles, permissions, export limits | Unavailable | Not inspected; EstateAI definitions below are Proposed |

## 2. Comparison matrix

| LeadSquared observation | Evidence | EstateAI current | Proposed change | Pri | Acceptance criteria |
|---|---|---|---|---|---|
| Booking has Booking Date and Posting Date | Observed | Only `bookingDate` | Add `postingDate`; DQ checks for late posting / posted-before-booked | P2 | Checks `bk-posting-lag`, `bk-posting-order` exist and count correctly |
| Booking Validation, Cancelled Date | Observed | Status always "Confirmed" | `validation`, `cancelledDate`, status Cancelled; cancelled excluded from booking KPIs; new KPI | P2/P3 | Cancelled excluded from `bookings`/value/revenue; cancel % denominator documented |
| Visit Complete + "did not come" activities | Observed | No-show/Cancelled visits already modelled | None | — | Already present |
| Several visit records, same client same day | (user requirement) | Multi-project visit exists | DQ check `visit-sameday` | P2 | Check lists leads with >1 completed visit on one IST day |
| Verified For Payout / Visit Type / Cash Payout | Observed | `payoutStatus` exists | Gap: no verification flag; **not built** (needs rule decision) | P2 | — |
| Initial Owner field; Lead Assigned audit | Observed | Assign/churn history, audit, protection rules exist | None now | — | Already present |
| Owner 2 (visits, bookings) | Observed | Single owner | **Not built**: needs attribution-split decision | P2 | — |
| Lists, funnel, duplicates, reminders, MIS, roles, KPI dictionary | — | Present (13 roles, simulated) | None | — | — |

EstateAI status: single-file HTML, synthetic seed data, browser-only; roles are a client-side preview,
not enforced security; no backend, no persistence beyond localStorage settings.

## 3. Implemented (branch `ccr-2663f87f-bbqv2j`, `index.html`)
- Bookings: `postingDate`, `validation` (Validated/Pending/Rejected), `cancelledDate`, status `Cancelled`.
- Cancelled bookings excluded from `c.bookings` (so bookings, value, revenue); kept in `c.cancelledBookings`.
- KPI `booking_cancel_pct` = cancelled in range ÷ (confirmed in range + cancelled in range) ×100; booking counts (not unique leads); booking date and cancel date are independent.
- Booking list: "Posted on" and "Validation" columns.
- DQ checks: `bk-unvalidated`, `bk-posting-lag`, `bk-posting-order`, `visit-sameday`.
- Cancelled bookings do not mark a unit Sold.

## 4. Validation (headless Chromium, synthetic data)
Passed (executed): page loads with no console/page errors; 44 bookings, 2 cancelled, both with cancel date ≥ booking date; no unit sold for a cancelled booking; DQ checks computed (unvalidated 6, late posting 7, posted-before-booked 0, same-day visits 0); Booking list, Data quality and KPI dictionary pages render the new content.
Untested: `booking_cancel_pct` computed value on the UI (only the dictionary entry rendered); date-range filtering of cancellations; export; role masking of new columns; a dataset where `visit-sameday` > 0 (check is untested against positive cases).

## 5. Gaps / next actions
Browser-based UI inspection of LeadSquared (you sign in; I never ask for credentials); report formulas and role scope;
decide Owner 2 attribution and payout-verification rules; production integration needs separate instruction.

## 6. Browser-session inspection plan (not yet done)
Needs you to sign in to LeadSquared yourself in a browser session; I never ask for credentials. Read-only, no saved filters/views/reports, no exports.
1. Lead list: columns, filters, sort, pagination, saved-view names (Observed per screen, with date).
2. Lead detail: field groups, activity timeline entries, validation messages on duplicates.
3. Manage Tasks / reminders: due, overdue and completion states.
4. Reports/dashboards: for each metric record numerator, denominator, date field, timezone, current vs event-time owner, duplicate handling. Mark anything unverifiable as Unavailable.
5. Roles/permissions screens (view only); untested role behaviour stays "unverified".
Evidence format: screen, date, category (Observed/Documented/Inferred), limitation. No customer data in captures.

## 7. Added after the first pass
- Lead drawer: follow-up tasks and notes (type, due date, mark done, overdue state) stored in localStorage only; timeline includes them. Simulated: not shared, not synced, not audited server-side. Tested: add, overdue, complete, persists after reload, invalid date rejected.
- `site/index.html`: original EstateAI marketing page (own branding and copy; demo form opens a mailto, no server). Checked at 1280px and 390px, no horizontal scroll, no page errors.

## 8. Owner 2 attribution (Proposed rule, synthetic data)
Observed: LeadSquared's Booking Complete and Site Visit Complete activities carry an "Owner 2" field. How it is used in reports is Unavailable, so the rule below is an EstateAI design decision to confirm with you.
- Each booking has `owner2` (optional, must differ from the primary owner) and `ownerShare` (primary owner's %, 1-99; 100 when there is no Owner 2).
- Credited bookings / value for executive e = sum over bookings of share(e) x (1 or agreement value). Shares of a booking add to 100 %, so executive rows reconcile to the unique total.
- Unique-count KPIs (`bookings`, `booking_value`) are unchanged and count each booking once. Executive report shows both "primary owner" and "credited" columns.
- Booking list shows Owner 2 and their %. Data-quality checks: Owner 2 = primary owner; invalid split.
- Not done: Owner 2 on site visits and payouts, editing a split in the UI, manager/team rollups of credited figures.
- Tested (headless Chromium, 42 sample bookings, 7 with Owner 2): credits sum to 42, no same-owner cases, new columns and pages render, no page errors. Untested: date-range filtering of credited figures, role masking of Owner 2.

## 9. Owner 2 on site visits and payouts (Proposed rule, synthetic data)
Observed: Site Visit Complete has an "Owner 2" field (and Verified For Payout / Cash Payout Done). How reports use them is Unavailable.
- Completed visits can have `owner2` and `ownerShare`, with the same rule and validation as bookings (shares add to 100 %).
- The partner payout is paid **once per visit**; Owner 2 does not receive money. Owner 2 only changes who the visit and its payout *cost* are credited to: credited payout cost = share x payout.
- Executive report: "Credited visits" and "Credited payout cost" beside the primary-owner columns. Visit dashboard "Visits by executive" is credited. Visit payouts page has a cost-by-executive table. Visit lists show Owner 2 (share).
- Unique visit counts and KPIs (`visits_done`, no-show %, etc.) are unchanged.
- Data-quality checks: visit Owner 2 equals visit executive; invalid split.
- Tested (headless Chromium, 142 completed sample visits, 10 with Owner 2): credited visits sum to 142; credited payout cost equals total payout (Rs 117,000); no same-owner cases; no Owner 2 on non-completed visits; pages render with no errors.
- Untested: date-range filtering of credited figures, role masking of Owner 2, visit-to-booking conversion by credited owner.
- Not done: editing a split in the UI, manager/team rollups, payout verification rule (still your decision).
