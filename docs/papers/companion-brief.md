<!-- [LAYER: UI] -->
# CINDER Companion Brief & Verified Metrics

An executive brief and factual inventory of **CINDER — The Social Infrastructure for Conferences** (`v1.0.0`).

---

## Executive Summary

Conferences bring together hundreds or thousands of talented people with overlapping interests and complementary capabilities. Yet, the vast majority of conference networking remains an inefficient game of chance: hallway loitering, badge squinting, and unfulfilled promises to follow up.

**CINDER transforms passive attendance into active, facilitated human connection.** 

Using **Elasticsearch Hybrid Retrieval** (BM25 keyword search + 32-dimensional dense vector kNN cosine similarity fused via Reciprocal Rank Fusion), CINDER matches attendees based on deep technical synergy. It groups attendees into high-trust cohorts of 4–6 peers called **Pods**, provisions dedicated communication channels, and deploys a proactive **AI Facilitator** that coordinates lunches, alerts pods to relevant sessions, and breaks the ice.

---

## Workspace-Verified Metrics

Every figure below is derived directly from live code in `/Users/bozoegg/Desktop/elasticsearch`:

| Metric | Measured Value | Verification Source |
| :--- | :--- | :--- |
| **Package Version** | `1.0.0` | [`package.json`](../../package.json) |
| **External npm Runtime Dependencies** | `0` (Zero external packages) | [`package.json`](../../package.json) |
| **Joyzoning Canonical Zones** | `5` (`DOMAIN`, `CORE`, `INFRASTRUCTURE`, `PLUMBING`, `UI`) | [`stability.config.json`](../../stability.config.json) |
| **Stability Index** | `100%` (0.0007 Structural Entropy) | `npm run check` |
| **Blocking Violations** | `0` (100% Joyzoning Conformance) | `npm run check` |
| **Automated Test Suites** | `6` suites · `28` passing tests | `node --test tests/*.test.mjs` |
| **Elasticsearch Adapter Modes** | `2` (Live HTTP cluster probe & Embedded engine) | `src/infrastructure/ElasticsearchClient.mjs` |
| **Dense Vector Embedding Dimensions** | `32` dimensions (unit normalized) | `src/plumbing/textEmbedder.mjs` |
| **Reciprocal Rank Fusion Constant** | $k = 60$ | `src/plumbing/rrfRanker.mjs` |
| **Demonstration Scenario Steps** | `10` continuous steps | `src/core/ScenarioRunner.mjs` |
| **Formal Domain Interfaces** | `5` (`IAttendeeRepository`, `IPodRepository`, `IElasticsearchClient`, `IAiFacilitatorService`, `IEventBus`) | `src/domain/interfaces/` |

---

## Key Differentiators

1. **Meaningful Elasticsearch Integration:** Elasticsearch is the foundational intelligence layer driving discovery, candidate ranking, and group composition, not merely a storage sink.
2. **Dual-Mode Zero-Dependency Resilience:** Executes with zero external npm dependencies, seamlessly falling back to an in-process embedded BM25 and vector math engine if external network access drops.
3. **Proactive AI Facilitation with Hard Safeguards:** The AI Facilitator initiates introductions, confirms meetups against real agenda slots, and prompts discussion without hallucinating venue data or impersonating attendees.
4. **Joyzoning Architectural Sovereignty:** Built with strict decoupling across 5 canonical zones, ensuring zero architectural drift and 100% testability.

