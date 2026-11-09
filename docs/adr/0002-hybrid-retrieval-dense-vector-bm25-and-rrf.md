<!-- [LAYER: UI] -->
# ADR-0002: Elasticsearch Hybrid Retrieval via BM25, Dense Vectors, & RRF

## Status
Accepted

## Context
Attendee networking discovery requires identifying both exact technical commonalities (e.g. both working on "Kubernetes", "Prometheus", or "eBPF") and conceptual, semantic synergies (e.g. an autonomous infrastructure researcher and an observability engineer sharing complementary challenges). Pure keyword search misses semantic synonyms, while pure vector kNN search often fails on specific technical acronyms and rare libraries.

## Decision
We implemented **Elasticsearch Hybrid Retrieval** combining:
1. **Lexical BM25:** Multi-field text matching over attendee interests, expertise, projects, and challenges (`src/plumbing/bm25Scorer.mjs`).
2. **Dense Vector kNN:** 32-dimensional normalized vector embeddings evaluated with cosine similarity (`src/plumbing/vectorMath.mjs`).
3. **Reciprocal Rank Fusion (RRF):** Fusing the lexical and vector rank positions using the standard constant $k=60$ (`src/plumbing/rrfRanker.mjs`).

In live cluster mode, this maps directly to Elasticsearch 8's hybrid query combining `knn` search with `multi_match`.

## Consequences
- **Positive:** Exceptional discovery relevance; retrieves candidates with exact keyword overlaps as well as semantic intent synergies; avoids vector blind spots.
- **Negative:** Requires storing both text tokens and 32-dim dense vectors per document.
- **Neutral:** Computational overhead for RRF is negligible for typical attendee candidate pools (<1ms).

## Verification
Verified via `tests/elasticsearch.test.mjs` and `tests/plumbing.test.mjs`. Confirms RRF rank calculation, vector cosine similarity, and BM25 token frequencies match expected scores.

