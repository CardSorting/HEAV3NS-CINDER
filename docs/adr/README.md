<!-- [LAYER: UI] -->
# Architecture Decision Records (ADRs)

This directory preserves the immutable architectural decision history of **CINDER**. Each record documents the context, alternatives considered, decision made, trade-offs accepted, and verification methods following the **MADR** format.

---

## ADR Registry

| ADR | Title | Status | Date | Decision Summary |
| :--- | :--- | :--- | :--- | :--- |
| [0000-adr-template.md](0000-adr-template.md) | ADR Template | Superseded | 2026-11-09 | Standard MADR template with mandatory Verification section |
| [0001-five-canonical-zones-and-geographic-alignment.md](0001-five-canonical-zones-and-geographic-alignment.md) | 5 Canonical Zones & Geographic Alignment | Accepted | 2026-11-09 | Strict Joyzoning boundary separation (`DOMAIN`, `CORE`, `INFRASTRUCTURE`, `PLUMBING`, `UI`) |
| [0002-hybrid-retrieval-dense-vector-bm25-and-rrf.md](0002-hybrid-retrieval-dense-vector-bm25-and-rrf.md) | Elasticsearch Hybrid Retrieval via BM25 + Vector kNN + RRF | Accepted | 2026-11-09 | Combining lexical BM25 scoring with 32-dim dense vector cosine similarity via Reciprocal Rank Fusion |
| [0003-pod-composition-and-diversity-balance.md](0003-pod-composition-and-diversity-balance.md) | Pod Composition Balancing Semantic Affinity & Diversity | Accepted | 2026-11-09 | Pod formation algorithm balancing mutual swipe bonds, centroid coherence, and skill diversity |
| [0004-proactive-event-driven-ai-facilitator.md](0004-proactive-event-driven-ai-facilitator.md) | Proactive Event-Driven AI Facilitator Lifecycle | Accepted | 2026-11-09 | Autonomous facilitator subscribing to event bus with bounded read-only permissions |
| [0005-dual-mode-elasticsearch-adapter-with-embedded-fallback.md](0005-dual-mode-elasticsearch-adapter-with-embedded-fallback.md) | Dual-Mode Elasticsearch Adapter with Embedded Fallback | Accepted | 2026-11-09 | Live HTTP cluster connection with 250ms timeout and seamless zero-dependency embedded fallback |
| [0006-realtime-communication-event-bus-and-meetup-detection.md](0006-realtime-communication-event-bus-and-meetup-detection.md) | Realtime Pod Event Bus & Meetup Intent Detection | Accepted | 2026-11-09 | In-process publish/subscribe message bus with heuristic regex meetup detection |
| [0007-diataxis-documentation-and-institutional-memory.md](0007-diataxis-documentation-and-institutional-memory.md) | Diátaxis + Institutional Memory Documentation Architecture | Accepted | 2026-11-09 | Comprehensive documentation framework separating tutorials, playbooks, reference, wiki, and memory |

