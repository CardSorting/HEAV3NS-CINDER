<!-- [LAYER: UI] -->
# Blameless Engineering Postmortems

This directory contains blameless SRE postmortems capturing past operational incidents, root cause analyses (5 Whys), preventative code safeguards, and regression tests.

---

## Blameless Culture

We treat every failure as an opportunity to harden the system:
1. **No Finger-Pointing:** System failures are the result of missing automated guardrails, ambiguous interfaces, or unhandled edge cases, never individual human negligence.
2. **Action Items Required:** Every postmortem MUST produce concrete code changes, architectural constraints, or automated tests.
3. **Closed-Loop Verification:** Postmortem action items must be tracked to completion with verified test assertions.

---

## Incident Registry

| ID | Title | Date | Severity | Safeguard Introduced |
| :--- | :--- | :--- | :--- | :--- |
| [0000-postmortem-template.md](0000-postmortem-template.md) | Blameless Postmortem Template | 2026-11-09 | N/A | Standard template with mandatory 5 Whys and Action Items |
| [PM-001-pod-formation-entropy-collapse.md](PM-001-pod-formation-entropy-collapse.md) | Pod Formation Monoculture Entropy Collapse | 2026-11-09 | `SEV-2` | Centroid divergence scoring balancing affinity with diversity |
| [PM-002-elasticsearch-connection-timeout-on-checkin-burst.md](PM-002-elasticsearch-connection-timeout-on-checkin-burst.md) | ES Connection Timeout on Check-In Burst | 2026-11-09 | `SEV-1` | 250ms bounded health check probe & automatic embedded engine fallback |
| [PM-003-facilitator-hallucinated-schedule-announcement.md](PM-003-facilitator-hallucinated-schedule-announcement.md) | AI Facilitator Hallucinated Schedule Room | 2026-11-09 | `SEV-3` | Strict grounding contract against immutable `AgendaSession` entities |
| [PM-004-websocket-meetup-race-condition.md](PM-004-websocket-meetup-race-condition.md) | Concurrent Meetup Proposal Overwrite Race | 2026-11-09 | `SEV-3` | Idempotent meetup state transitions & atomic pinned header updates |
| [PM-005-vector-embedding-cache-poisoning.md](PM-005-vector-embedding-cache-poisoning.md) | Stale Vector Embedding Cache Poisoning | 2026-11-09 | `SEV-3` | Profile content hashing & deterministic embedding re-computation |

