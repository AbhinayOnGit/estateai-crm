# EstateAI CRM — AI-Assisted Real Estate CRM & Business Intelligence

**Showcase edition.** This public demo runs entirely in the browser on synthetic sample data: no real customers, no sign-in, nothing uploaded.

![Dashboard](screenshots/01-dashboard.png)

## The problem

Real-estate sales teams handle large volumes of enquiries that pass through many executives, stages and reassignments before a booking. Standard CRM screens rarely show where follow-ups slip, which sources and projects convert, or how often a lead has been churned.

## What it does

EstateAI CRM is a CRM and BI command centre for real-estate CRM, sales and marketing teams. It follows the lead journey from capture and assignment through calling, follow-up, site visit, negotiation, EOI and booking.

- **Lead priority:** a booking-likelihood model, trained in the browser and retrained whenever the data changes, feeds a 0–100 priority score with a reason and a recommended next action for every open lead.
- **Attention centre:** rule-based checks flag unassigned leads, SLA breaches and attribution gaps, each with an owner and a link to fix it.
- **Churn governance:** every reassignment is audited against protection rules, with flags for breaches and leads churned more than once.
- **Sales performance:** Executive 360 and Manager 360 cover workload, response speed, funnel, conversion and revenue.
- **Operations:** site visits (revisits, multi-project visits, payouts), projects, bookings and revenue.
- **MIS & data quality:** report templates, a single KPI dictionary, and data-quality checks.
- **Role preview:** 13 roles with field-level masking (a preview of access rules, not a login).

![Lead priority](screenshots/02-lead-priority.png)
![Executive 360](screenshots/03-executive-360.png)
![Churn overview](screenshots/04-churn-overview.png)

## About this edition

- **Sample data only.** All leads, executives, projects and builders are fictional. Advertising, inventory, finance, WhatsApp and call data come from sample adapters.
- **What's not included.** The full version runs inside Claude and reads LeadSquared in read-only mode through each viewer's own connection. That live mode and its live-only modules (the AI & BI Lead Intelligence suite and the daily Google report) are left out of this edition.
- **Planned.** WhatsApp inbox, a non-ad marketing expense ledger, real authentication, and live adapters for ad platforms, finance and inventory.

## Tech

A single self-contained HTML file in plain JavaScript, with no framework, build step or backend. Charts are drawn in SVG. Settings are saved in the browser's local storage. Built with Claude.

## Payout API (optional)

Payout verification (Verify / Reject, Approve, Mark paid) can be saved on a server instead of in the browser. `node api/server.js` (Node 22+, no dependencies) serves `index.html` and a small SQLite-backed API on port 8787 (`PORT` and `PAYOUT_DB` override). Steps are checked in order and by role, and each change is written to an audit table. Opened as a plain file or from a static host, the page falls back to browser-only storage. Roles come from the role preview, so this enforces the workflow but is not sign-in. Tests: `node --test api/server.test.js`.
