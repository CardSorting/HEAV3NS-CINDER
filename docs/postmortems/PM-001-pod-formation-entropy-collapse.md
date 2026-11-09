<!-- [LAYER: UI] -->
# PM-001: Pod Formation Monoculture Entropy Collapse

## Summary
- **Incident Date:** 2026-11-09
- **Severity:** `SEV-2`
- **Impact Duration:** 45 minutes during test conference dry-run
- **Customer Impact:** Attendees assigned to Pod 04 complained of repetitive conversations where all 5 members had identical job titles and identical tooling stacks, preventing cross-disciplinary collaboration.
- **Lead Investigator:** Pod Orchestration Engineer

## Root cause
The initial greedy Pod composition algorithm ranked candidate additions solely on nearest cosine vector distance to the seed member. Consequently, the top 5 candidates all had near-identical profiles (e.g. all 5 were React/Redux frontend engineers from fintech companies). This caused semantic clustering without complementary perspectives.

### 5 Whys
1. **Why did Pod 04 consist of 5 identical frontend engineers?** Because candidate ranking selected the 5 closest vector matches to the first attendee.
2. **Why were the closest vector matches selected?** The algorithm optimized solely for pairwise cosine similarity without measuring group diversity.
3. **Why was group diversity omitted?** The original prototype relied on attendees having disparate interests in seed data.
4. **Why wasn't diversity tested?** Unit tests verified pod size and valid IDs, but did not measure skill distribution variance across pod members.
5. **Why was there no variance metric?** The system lacked a formal definition of Pod structural entropy and discipline diversity.

## Action items
| Item | Type | Owner | Status | Tracking Issue / PR |
| :--- | :--- | :--- | :--- | :--- |
| Implement centroid divergence diversity scoring in `PodOrchestrationController` | Preventative | Algorithmic Team | Done | PR #12 |
| Add `tests/matching-and-pods.test.mjs` verifying multi-disciplinary pod composition | Preventative | QA / SRE | Done | PR #14 |
| Document pod composition heuristics in `docs/wiki/pod-composition-algorithms.md` | Educational | Tech Lead | Done | PR #15 |

## Lessons learned
- **What went well:** Attendees gave immediate honest feedback during the dry-run, catching the issue before the live conference.
- **What went poorly:** Vector cosine similarity was mistakenly assumed to be synonymous with "optimal group composition".
- **Where we got lucky:** The issue occurred during a dry-run with 30 attendees rather than the main 2,000-person event.

