<!-- [LAYER: UI] -->
# PM-004: Concurrent Meetup Proposal Overwrite Race Condition

## Summary
- **Incident Date:** 2026-11-09
- **Severity:** `SEV-3`
- **Impact Duration:** 15 minutes
- **Customer Impact:** Two pod members simultaneously typed meetup proposals ("Meet at cafe" vs "Meet at sponsor lounge"). The channel pinned header flickered between both locations before getting stuck on an unconfirmed proposal.
- **Lead Investigator:** Realtime Systems Engineer

## Root cause
The meetup confirmation handler in `CommunicationController` did not serialize concurrent state updates. When two proposals arrived concurrently, both executed an asynchronous verification check, and the slower unconfirmed proposal completed last, overwriting the verified confirmed meetup.

### 5 Whys
1. **Why was the wrong location pinned?** The unconfirmed proposal's write finished after the confirmed proposal.
2. **Why did the unconfirmed write finish last?** Both requests were handled concurrently in the Node event loop without state serialization.
3. **Why weren't meetup state transitions atomic?** The `Pod.pinnedLocation` field was a simple mutable property without versioning or transition locking.
4. **Why was an unconfirmed proposal able to overwrite a confirmed one?** The setter did not check the `status` of the existing pinned meetup before updating.
5. **Why wasn't this caught in testing?** Integration tests simulated sequential messages, not concurrent asynchronous message bursts.

## Action items
| Item | Type | Owner | Status | Tracking Issue / PR |
| :--- | :--- | :--- | :--- | :--- |
| Enforce state machine transitions on `Pod.pinnedLocation` (`PROPOSED` cannot overwrite `CONFIRMED`) | Preventative | Domain Team | Done | PR #27 |
| Add concurrent meetup race test in `tests/matching-and-pods.test.mjs` | Preventative | QA Team | Done | PR #29 |
| Document meetup state lifecycle in `docs/adr/0006-realtime-communication-event-bus-and-meetup-detection.md` | Educational | Tech Lead | Done | PR #30 |

## Lessons learned
- **What went well:** The Pod chat message history retained the original messages, so members could scroll back and see what had happened.
- **What went poorly:** The channel header showed conflicting state, confusing members who just glanced at the top banner.
- **Where we got lucky:** The incident was confined to a single Pod of 4 members who resolved it amicably in chat.

