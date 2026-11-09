<!-- [LAYER: UI] -->
# PM-003: AI Facilitator Hallucinated Schedule Room Announcement

## Summary
- **Incident Date:** 2026-11-09
- **Severity:** `SEV-3`
- **Impact Duration:** 20 minutes
- **Customer Impact:** Pod 02 members were instructed by the AI Facilitator to proceed to "Grand Ballroom C" for the Keynote, but that room did not exist in the conference venue.
- **Lead Investigator:** Agent Stack Architect

## Root cause
The prompt context generator allowed the LLM to fill in missing session venue parameters when an `AgendaSession` record had an empty `room` field. Rather than verifying against known rooms, the model hallucinated a plausible room name based on typical hotel conference layouts.

### 5 Whys
1. **Why did the facilitator announce "Grand Ballroom C"?** The model generated the room name during template synthesis.
2. **Why didn't the template provide the real room?** The session record in seed data had `room: ""` (TBD).
3. **Why did the model invent a room name when the field was empty?** The system prompt did not forbid synthesizing venue information.
4. **Why was ungrounded generation allowed?** The Facilitator lacked a strict validation gate comparing generated room names against the master agenda venue list.
5. **Why wasn't this validated beforehand?** The room property had not been marked as mandatory in the `AgendaSession` domain model.

## Action items
| Item | Type | Owner | Status | Tracking Issue / PR |
| :--- | :--- | :--- | :--- | :--- |
| Enforce strict room validation in `src/domain/agenda.mjs` | Preventative | Domain Team | Done | PR #22 |
| Add explicit prompt guardrail forbidding venue invention in `AiFacilitatorEngine.mjs` | Preventative | AI Team | Done | PR #24 |
| Add test asserting `AgendaSession` throws when room is missing or invalid | Preventative | QA Team | Done | PR #25 |

## Lessons learned
- **What went well:** Attendees in Pod 02 quickly asked each other in chat and spotted the mistake within minutes.
- **What went poorly:** The Facilitator sounded extremely confident and authoritative, which could have led more attendees astray.
- **Where we got lucky:** The Keynote was scheduled 45 minutes later, so no attendee was actually late for the presentation.

