<!-- [LAYER: UI] -->
# PM-0000: Postmortem Template

## Summary
- **Incident Date:** YYYY-MM-DD
- **Severity:** SEV-1 / SEV-2 / SEV-3 / SEV-4
- **Impact Duration:** XX minutes
- **Customer Impact:** Concrete description of what conference attendees or operators experienced.
- **Lead Investigator:** Name / Role

## Root cause
Detailed technical description of what triggered the failure. Include the 5 Whys analysis tracing surface symptoms back to underlying architectural or procedural gaps.

### 5 Whys
1. **Why did the failure occur?** Explanation...
2. **Why?** Explanation...
3. **Why?** Explanation...
4. **Why?** Explanation...
5. **Why?** Root cause...

## Action items
| Item | Type | Owner | Status | Tracking Issue / PR |
| :--- | :--- | :--- | :--- | :--- |
| Add automated regression test | Preventative | Developer | Done | PR #XX |
| Implement architectural guardrail | Mitigative | Architect | In Progress | Issue #XX |

## Lessons learned
- **What went well:** Systems or procedures that helped detect or mitigate the incident rapidly.
- **What went poorly:** Gaps in telemetry, documentation, or test assertions.
- **Where we got lucky:** Serendipitous factors that prevented greater severity.

