<!-- [LAYER: UI] -->
# Changelog

All notable changes to CINDER are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-09

### Added
- **Core Orchestration Engine (`src/core/`):**
  - `CheckInController`: Attendee registration, profile normalization, vector generation, and Elasticsearch indexing.
  - `DiscoveryController`: Attendee discovery feed with hybrid search, candidate ranking, and swipe tracking.
  - `PodOrchestrationController`: Automated Pod formation balancing semantic affinity, mutual matches, and skill diversity.
  - `CommunicationController`: Group messaging, meetup proposal detection, and pinned pod notifications.
  - `FacilitatorController`: Context-aware AI Facilitator managing welcoming, icebreaking, agenda updates, and meetup coordination.
  - `ScenarioRunner`: 10-step end-to-end conference demonstration scenario.
  - `CinderApp`: Composition root container wiring domain models, infrastructure adapters, and controllers.
- **Elasticsearch Hybrid Retrieval (`src/infrastructure/ElasticsearchClient.mjs`):**
  - Dual-mode operation: live HTTP cluster integration (`http://localhost:9200`) and embedded zero-dependency engine.
  - Index mapping with 32-dimensional `dense_vector` (cosine similarity) and multi-field text search.
  - Reciprocal Rank Fusion (RRF) combining lexical BM25 rankings and vector kNN similarity.
- **Plumbing Primitives (`src/plumbing/`):**
  - `vectorMath.mjs`: High-performance dot product, vector magnitude, cosine similarity, unit normalization, and centroid calculation.
  - `bm25Scorer.mjs`: Pure BM25 text scorer with tokenization, term frequencies, and inverse document frequency calculation.
  - `rrfRanker.mjs`: Reciprocal Rank Fusion algorithm fusing multiple ranked retrieval lists.
  - `textEmbedder.mjs`: Deterministic 32-dimensional semantic text embedder with domain keyword weighting.
  - `conferenceSeedData.mjs`: Seed database of 5 realistic conference attendees and comprehensive schedule.
- **UI & Presentation (`src/ui/` & `bin/`):**
  - Native Node.js HTTP server and REST API (`src/ui/web/webServer.mjs`).
  - Interactive Single Page Application (`src/ui/web/public/`): Tinder-style swipe cards, interactive Pod chat, and scenario triggers.
  - ANSI-colored CLI presenter (`src/ui/cli/cliPresenter.mjs`).
  - Executable binaries: `bin/cinder.mjs`, `bin/demo.mjs`, `bin/server.mjs`.
- **Architectural Sovereignty:**
  - 100% Joyzoning compliance across all 5 canonical zones (`DOMAIN`, `CORE`, `INFRASTRUCTURE`, `PLUMBING`, `UI`).
  - 0 blocking violations, 0 circular dependencies, strict dependency inversion.
- **Testing & Verification:**
  - 28 automated unit and integration tests across 6 test suites (`tests/`).

