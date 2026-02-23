# Functionality Gaps (MVP)

## Referring Doctor + Doctor-Scoped Results (Deferred)

### Gap

Current integration plan adds `WorkOrder.referringDoctor` but does not define:

- source of referring doctor data (system user vs external doctor),
- doctor identity linkage (e.g., Cognito `sub` / profile model),
- doctor-specific filtering logic for “my results,”
- explicit order-creation UI flow (`Nueva Orden`) where this data is captured.

### Current state

- Reception orders are currently mock-based (`INITIAL_ORDERS`) and not created via real Order Intake UI.
- Doctor dashboard is mock-based and has no backend filtering by doctor ownership/referral.

### MVP decision

Defer full referring-doctor identity model and doctor-scoped filtering to a post-MVP phase.

### Temporary MVP approach

- Keep `referringDoctor` as optional display string for now.
- Do not enforce doctor-owner filtering in MVP unless required by business/compliance.
- Track as follow-up for production hardening.
