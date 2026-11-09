<!-- [LAYER: UI] -->
# ADR-0004: Proactive Event-Driven AI Facilitator Lifecycle

## Status
Accepted

## Context
Standard conference chatbots are passive: they wait in a corner for users to ask questions like "Where is Room 204?". Consequently, adoption is low and networking is unassisted. Conversely, overly autonomous agents can become spammy, intrusive, or hallucinate conference schedule changes.

## Decision
We implemented a **Proactive Event-Driven AI Facilitator** (`src/core/FacilitatorController.mjs` and `src/infrastructure/AiFacilitatorEngine.mjs`):
1. **Event-Driven Activation:** The facilitator triggers only on specific domain events (`pod:formed`, `message:posted` with meetup intent, and scheduled session reminders).
2. **Context-Grounded Prompts:** The facilitator incorporates attendees' explicit profile challenges and the conference master agenda (`AgendaSession`) into its prompts.
3. **Strict Bounded Permissions:** The facilitator operates read-only on conference master data. It can pin messages and confirm meetups, but cannot alter sessions, cancel events, or impersonate attendees.

## Consequences
- **Positive:** Unobtrusive, high-value facilitation; breaks the ice immediately upon pod creation; confirms physical meetups automatically.
- **Negative:** Requires regex and NLP parsing of chat messages to detect intent without flooding the LLM API.
- **Neutral:** Facilitator messages are marked with `senderType: "facilitator"` and visually distinguished in UI.

## Verification
Verified via `tests/matching-and-pods.test.mjs` and steps 7–10 of `tests/scenario.test.mjs`.

