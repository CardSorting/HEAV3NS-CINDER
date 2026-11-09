<!-- [LAYER: UI] -->
# CINDER Roadmap

This roadmap outlines completed milestones and future enhancements for CINDER as the social infrastructure for conferences.

---

## Completed: Milestone 1–5 MVP (v1.0.0)

- [x] **Milestone 1 — Check In:** Attendee registration, profile creation, interest/challenge capture, 32-dim vectorization, and Elasticsearch indexing.
- [x] **Milestone 2 — Discover:** Swipeable card interface, hybrid retrieval (BM25 + dense vector cosine kNN), RRF ranking, match explanations, and mutual like detection.
- [x] **Milestone 3 — Form Pods:** Automatic Pod composition (4–6 attendees), centroid coherence, diversity scoring, and channel provisioning.
- [x] **Milestone 4 — Communicate:** Persistent Pod channel messaging, member rosters, meetup proposal pattern detection, and pinned headers.
- [x] **Milestone 5 — Facilitate:** AI Facilitator engine, welcoming messages, discussion icebreakers, schedule session alerts, and confirmed meetup pinning.

---

## Upcoming Releases

### Release 1.1.0 — Multi-Track Agenda & Venue Wayfinding
- [ ] Ingestion of multi-room conference schedule formats (iCal, JSON, Open-Feedback).
- [ ] Indoor venue wayfinding integration (floor plans, booth locations, designated Pod meeting zones).
- [ ] Real-time schedule push notifications on session room changes or speaker cancellations.

### Release 1.2.0 — Mutual Handshake & QR Codes
- [ ] On-site badge QR code scanner for instant mutual match verification.
- [ ] Pod check-in beacons via Bluetooth Low Energy (BLE) or NFC.
- [ ] Post-meetup shared notes and contact export (vCard, LinkedIn, GitHub).

### Release 2.0.0 — Enterprise Conference Scaling
- [ ] Sharded Elasticsearch cluster deployment support (10,000+ concurrent attendees).
- [ ] Sub-Pod dynamic branching (splitting pods for specialized breakout discussions).
- [ ] Multi-lingual translation for international conference pods.
- [ ] Conference organizer administrative dashboard with real-time networking heatmaps.

