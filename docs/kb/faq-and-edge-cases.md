<!-- [LAYER: UI] -->
# Frequently Asked Questions & Edge Cases

Common technical inquiries, corner cases, and architectural rationale for CINDER.

---

## Technical FAQ

### 1. Does CINDER require a live Elasticsearch cluster to run?
**No.** While CINDER is designed to integrate natively with enterprise Elasticsearch clusters (supporting `dense_vector` mappings and hybrid queries), it incorporates a complete, zero-dependency embedded search engine. If an external cluster is unreachable, CINDER automatically activates its built-in BM25 scorer, 32-dim cosine math, and RRF ranker without dropping connections.

### 2. Why are vector embeddings 32 dimensions?
In conference networking domains, profile concepts can be effectively partitioned across core technical axes (infrastructure, frontend, AI, security, data, systems, product, research). A 32-dimensional embedding space provides high semantic nuance, fast cosine distance calculation in under 0.1ms, and compact memory footprint.

### 3. What happens if an attendee swipes `PASS` on everyone?
If an attendee passes on all recommendations, they are not grouped based on mutual swipe affinity. However, during automated Pod composition, the system utilizes semantic centroid cohesion and discipline diversity to ensure every attendee receives a high-value Pod assignment.

### 4. How does the AI Facilitator avoid hallucinating conference rooms?
The Facilitator does not generate room locations or times freely. When an attendee proposes a meetup, the Facilitator verifies the proposal against the authoritative `AgendaSession` entities stored in `CinderApp.agenda`. If a proposed room does not exist in the schedule, the Facilitator prompts the group to clarify.

### 5. Can an attendee be in multiple Pods simultaneously?
In the current MVP (`v1.0.0`), attendees are assigned to exactly one primary Pod to focus group cohesion and prevent divided attention during conference activities. Future releases may support secondary topic-specific breakout pods.

---

## Edge Cases

- **Odd Number of Attendees (e.g. 7 or 11):** Pod composition dynamically splits attendees into balanced pods of 3–5 or 4–6 rather than leaving an isolated pair.
- **Identical Profiles:** If two attendees submit identical text, cosine similarity is `1.0`. The diversity bonus balances the group with members from complementary domains.
- **Empty Search Query:** When no query text is provided, hybrid search falls back entirely to vector kNN distance.

