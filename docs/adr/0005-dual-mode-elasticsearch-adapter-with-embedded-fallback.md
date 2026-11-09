<!-- [LAYER: UI] -->
# ADR-0005: Dual-Mode Elasticsearch Adapter with Embedded Fallback

## Status
Accepted

## Context
At physical conferences and hackathons, internet access is notoriously erratic. An application that hard-crashes when an external Elasticsearch cluster is unreachable or misconfigured cannot be relied upon during live events or evaluations. However, we also must support connecting to production Elasticsearch clusters running in enterprise clouds.

## Decision
We implemented a **Dual-Mode Adapter** in `src/infrastructure/ElasticsearchClient.mjs` implementing `src/domain/interfaces/IElasticsearchClient.mjs`:
1. **Live HTTP Cluster Mode:** Probes `http://localhost:9200` (or `ELASTICSEARCH_URL`) with a bounded 250ms timeout. If reachable, it initializes the `cinder_attendees` index with dense vector mappings and dispatches real HTTP JSON queries.
2. **Embedded Zero-Dependency Engine:** If the live cluster probe times out or fails, the client seamlessly falls back to an embedded in-memory engine featuring authentic BM25 term weighting, 32-dim dense vector cosine math, and Reciprocal Rank Fusion. Zero external npm dependencies are required.

## Consequences
- **Positive:** Absolute resilience; zero-configuration quickstart; 100% test reproducibility in offline environments; seamless switchover to enterprise clusters.
- **Negative:** Embedded mode stores documents in Node memory, bounded by process memory limits (suitable for <=10,000 attendees).
- **Neutral:** The rest of the application (controllers, web routes, CLI) interacts only with `IElasticsearchClient` and remains completely unaware of which mode is active.

## Verification
Verified via `tests/elasticsearch.test.mjs` with cluster health checks, index creation, and hybrid queries executed under bounded latency.

