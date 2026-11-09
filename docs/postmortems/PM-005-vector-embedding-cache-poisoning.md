<!-- [LAYER: UI] -->
# PM-005: Stale Vector Embedding Cache Poisoning

## Summary
- **Incident Date:** 2026-11-09
- **Severity:** `SEV-3`
- **Impact Duration:** 30 minutes
- **Customer Impact:** An attendee updated their profile from "Frontend Architecture" to "Distributed Systems & Rust", but their discovery recommendations continued serving frontend design topics for the rest of the morning.
- **Lead Investigator:** Search Relevance Engineer

## Root cause
The profile update endpoint updated the attendee's textual profile in the repository, but failed to invalidate and re-embed the 32-dimensional vector in Elasticsearch. Consequently, lexical BM25 searched the new text while vector kNN continued searching against the cached stale vector representation.

### 5 Whys
1. **Why were the recommendations still frontend-oriented?** The dense vector embedding in the index still reflected the original profile.
2. **Why didn't the vector update?** The update handler only called `attendeeRepo.save(updatedAttendee)` and bypassed the embedder step.
3. **Why did it bypass the embedder?** Vector generation was only wired inside `CheckInController.checkIn()` and was not invoked during partial profile patches.
4. **Why was vector re-embedding omitted?** Developers assumed vector re-computation should be deferred to a background worker that had not yet been scheduled.
5. **Why wasn't this caught in CI?** Profile update tests only verified that `repo.findById()` returned the updated strings, but did not assert index vector synchronization.

## Action items
| Item | Type | Owner | Status | Tracking Issue / PR |
| :--- | :--- | :--- | :--- | :--- |
| Ensure all profile modifications regenerate embeddings and trigger atomic re-indexing | Preventative | Search Team | Done | PR #33 |
| Add content-hash validation asserting that vector matches normalized profile text | Preventative | QA Team | Done | PR #34 |
| Add full profile mutation and discovery re-verification test in `tests/matching-and-pods.test.mjs` | Preventative | SRE Team | Done | PR #35 |

## Lessons learned
- **What went well:** The hybrid search's BM25 component still matched on some of the new keywords, preventing a total discovery failure.
- **What went poorly:** The disconnect between lexical text and vector embeddings produced confusing, low-synergy match explanations.
- **Where we got lucky:** Only a handful of attendees updated their profiles after initial morning check-in.

