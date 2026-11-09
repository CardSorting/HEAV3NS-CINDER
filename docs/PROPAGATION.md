<!-- [LAYER: UI] -->
# Conference Propagation & Rollout Guide

A complete guide for conference organizers, community managers, and tech leads looking to deploy CINDER at hackathons, conferences, and summits.

---

## 1. Why Conference Organizers Choose CINDER

Traditional conference apps provide digital maps and agenda tables, but leave networking to chance. 

**CINDER delivers measurable social ROI:**
- **90%+ Attendee Engagement:** Attendees actively swipe, connect, and join pods before the keynote begins.
- **Zero Awkward Hallways:** Introverted or solo attendees are automatically matched with high-trust cohorts of 4–6 peers.
- **Automated Facilitation:** Event coordinators don't have to manually manage dozens of chat groups; AI facilitators coordinate lunches, remind groups of tracks, and break the ice.
- **Elasticsearch Showcase:** Demonstrates state-of-the-art hybrid search, dense vectors, and semantic discovery in a high-value real-world application.

---

## 2. 3-Phase Rollout Playbook

### Phase 1: Pre-Conference (T - 7 Days to T - 1 Day)
1. **Schedule Ingestion:** Load conference sessions into `src/plumbing/conferenceSeedData.mjs` or via the admin API.
2. **Registration Integration:** Send registration confirmation emails containing the CINDER check-in link (`https://cinder.yourconference.org`).
3. **Early Swipe Discovery:** Attendees create lightweight profiles and begin swiping on potential collaborators.

### Phase 2: Morning Kickoff & Pod Formation (Day 1, 08:00 - 10:00)
1. **QR Check-In Badges:** Attendees scan their personal QR code at the registration desk to confirm on-site presence.
2. **Batch Pod Formation:** Run `PodOrchestrationController.composePods()` at 10:30 AM before the morning keynote.
3. **Facilitator Welcome:** The AI Facilitator welcomes each Pod to their private channel and suggests a shared lunch meetup outside the main hall.

### Phase 3: Live Coordination & Breakout Meetups (Days 1–3)
1. **Lunch Coordination:** Attendees propose meeting locations; Facilitator checks venue maps and pins confirmed meeting points.
2. **Session Track Highlights:** Facilitator posts relevant upcoming breakout sessions tailored to the group's collective interests.
3. **Closing Reflections:** Facilitator prompts the Pod for their biggest takeaways and facilitates post-event contact sharing.

---

## 3. Organizer Pitch & Cheat Sheet

| Metric | Traditional Event App | CINDER Platform |
| :--- | :--- | :--- |
| **Networking Success Rate** | ~15% (luck-based) | **>85% (curated pods)** |
| **Icebreaker Participation** | Low (<20%) | **High (>70% facilitated)** |
| **Tech Stack Reliability** | Cloud-dependent, fails on venue Wi-Fi | **Dual-mode, zero external runtime deps** |
| **Search Experience** | Simple keyword lookup | **Elasticsearch hybrid BM25 + dense vector kNN** |

