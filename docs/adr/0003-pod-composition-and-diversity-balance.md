<!-- [LAYER: UI] -->
# ADR-0003: Pod Composition Balancing Semantic Affinity & Discipline Diversity

## Status
Accepted

## Context
When grouping conference attendees, naive clustering algorithms simply group the most semantically identical profiles together. In a technical conference, this leads to sterile monocultures: 5 front-end engineers talking only to other front-end engineers.

The most productive conference interactions occur when attendees share a common problem domain (e.g. distributed systems) but bring complementary disciplines (e.g. security, storage, SRE, and product engineering). Furthermore, attendees who have already swiped `LIKE` on each other possess strong social buy-in and should be kept together.

## Decision
We designed a multi-factor Pod composition algorithm implemented in `src/core/PodOrchestrationController.mjs`:
1. **Mutual Match Anchor Bonds:** Attendees with confirmed mutual swipe matches are prioritized as seed pairs.
2. **Semantic Centroid Cohesion:** Calculates the 32-dim centroid of the group and penalizes candidates whose distance from the centroid exceeds threshold boundaries.
3. **Discipline Diversity Bonus:** Rewards candidate combinations that span distinct expertise areas (e.g. infrastructure + research + product) while maintaining domain relevance.
4. **Cohort Size Constraining:** Automatically constrains pod sizes to between 4 and 6 members.

## Consequences
- **Positive:** Produces engaging, diverse cohorts with high conversation momentum; honors attendee swipe preferences.
- **Negative:** Slightly more complex than single-linkage hierarchical clustering.
- **Neutral:** For small cohorts (<=10 attendees), greedy candidate selection runs in under 5ms.

## Verification
Verified via `tests/matching-and-pods.test.mjs` and step 5 of `tests/scenario.test.mjs`.

