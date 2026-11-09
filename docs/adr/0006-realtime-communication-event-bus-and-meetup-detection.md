<!-- [LAYER: UI] -->
# ADR-0006: Realtime Communication Event Bus & Meetup Intent Detection

## Status
Accepted

## Context
When attendees communicate in a Pod channel, their primary objective is to align on physical meetups (e.g. coffee, lunch, or seating together during keynotes). Relying on external third-party chat platforms isolates messaging from conference agenda context and prevents automated facilitation.

## Decision
We implemented an in-memory asynchronous publish/subscribe event bus (`src/infrastructure/SimpleEventBus.mjs` implementing `src/domain/interfaces/IEventBus.mjs`) paired with `CommunicationController` (`src/core/CommunicationController.mjs`):
1. **Event Pub/Sub:** Decouples message ingestion from downstream handlers (AI analysis, UI broadcasting, audit logs).
2. **Heuristic Meetup Detection:** Incoming messages are evaluated against deterministic regex patterns capturing meeting intent, locations, and time slots (e.g. `"meet outside hall"`, `"lunch at 12:30"`).
3. **Automated Verification:** Detected intents trigger `FacilitatorController.verifyAndConfirmMeetup()`, which validates the slot against the conference schedule and pins confirmed metadata to the Pod entity.

## Consequences
- **Positive:** Immediate meetup coordination without requiring manual organizer intervention; decoupled event architecture.
- **Negative:** Regex heuristics require careful tuning to avoid false positives on casual conversational mentions.
- **Neutral:** Confirmed meetups are stored directly on the `Pod` entity and returned in channel status payloads.

## Verification
Verified via `tests/matching-and-pods.test.mjs` ("coordinates messages and detects physical meetup intent") and steps 8–9 of `tests/scenario.test.mjs`.

