# Checkout Migration — Decision Brief

Prepared for the platform review, **July 16**. An agent wrote this file as a
single markdown artifact; everything below is plain markdown.

## Recommendation

*Migrate checkout to the new payments API in Q3*

The legacy gateway reaches end-of-life in **November**. Migrating in Q3
gives us one full quarter of dual-running before the deadline.

Labels: `approved-pending-budget` · `owner: payments team`

## Numbers that matter

Conversion on the legacy flow dropped **1.8pp** since January while the
new API pilot held steady. Support tickets tell the same story:
**340/month** on legacy vs **12/month** on the pilot cohort.

Labels: `legacy: 4.2% error rate` · `pilot: 0.3% error rate`

## Migration plan

### Q3 — Migrate

Move 100% of new merchants plus the 20% pilot cohort. Weekly conversion
review; instant rollback per merchant segment.

### Q4 — Dual-run

Remaining 80% migrate in four weekly waves. Legacy stays warm as
fallback. Freeze window during peak season, **Nov 20 – Dec 2**.

### Q1 — Decommission

Legacy gateway decommissioned. Contract savings of **$38k/month** start
February.

## Risks and open questions

### Refund flows are not API-compatible

Legacy refunds reference internal transaction ids the new API does not
know. We need the mapping table live **before** wave one, or refunds on
migrated merchants fail silently.

### Peak season overlap

Wave four lands two weeks before the freeze. If wave three slips, we
either compress testing or carry legacy through December at
**$38k** extra cost.

### Payments team capacity

Two of five engineers are committed to the tax project until August.
The plan assumes they return; confirm with their lead this week.

## Decision needed

Approve the Q3 migration budget (**$120k**, mostly the mapping-table
work) by **July 25** so wave one starts on schedule.

Label: `decision by: July 25`

Actions: **Approve budget** · Request revision

Edit this file to change the report — the rendering updates on reload.
That is the whole artifact contract.
