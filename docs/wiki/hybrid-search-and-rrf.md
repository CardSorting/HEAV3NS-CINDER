<!-- [LAYER: UI] -->
# Hybrid Search & Reciprocal Rank Fusion (RRF)

A mathematical and implementation guide to CINDER's hybrid retrieval engine combining lexical BM25 and dense vector cosine similarity.

---

## 1. Why Hybrid Retrieval?

In attendee profile discovery, single-strategy search fails in characteristic ways:

| Strategy | Strengths | Failure Mode |
| :--- | :--- | :--- |
| **Lexical BM25** | Excels at exact technical terms, rare library names (`"tokio"`, `"bcc"`, `"opentelemetry"`), and acronyms (`"eBPF"`, `"CRD"`). | Completely misses semantic synonyms; fails when Alex searches for "autonomous scaling" and Maya wrote "self-healing control loops". |
| **Dense Vector kNN** | Captures high-level concepts, themes, and semantic intent across varied phrasing. | Suffers from vector compression loss; fails on specific version numbers, distinct libraries, and obscure acronyms. |
| **Hybrid Search (BM25 + Vector)** | Combines exact keyword precision with high-level conceptual recall. | Naive score summation suffers from mismatched score distributions. |

---

## 2. Reciprocal Rank Fusion (RRF)

Because raw BM25 scores (unbounded positive floats) and cosine similarity scores ($[-1, 1]$ or $[0, 1]$) have incompatible distributions, direct linear combination ($\alpha S_{\text{BM25}} + \beta S_{\text{cos}}$) is brittle and requires constant heuristic weight tuning.

**Reciprocal Rank Fusion (RRF)** bypasses score scales entirely by operating on rank positions:

$$RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$

Where:
- $M = \{\text{BM25}, \text{Vector}\}$ represents the set of retrieval rankings.
- $r_m(d)$ is the 1-based rank position of candidate document $d$ within ranking $m$. If document $d$ was not retrieved by strategy $m$, $r_m(d) \to \infty$ (contribution is $0$).
- $k = 60$ is the standard smoothing parameter proven across TREC benchmarks to balance top ranks against long tails.

### Implementation in `src/plumbing/rrfRanker.mjs`

```javascript
/** [LAYER: PLUMBING] */

export function reciprocalRankFusion(rankedLists, k = 60) {
  const scores = new Map();

  for (const list of rankedLists) {
    list.forEach((item, index) => {
      const rank = index + 1;
      const currentScore = scores.get(item.id) || { id: item.id, item, score: 0 };
      currentScore.score += 1 / (k + rank);
      scores.set(item.id, currentScore);
    });
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({
      ...entry.item,
      rrfScore: entry.score
    }));
}
```

---

## 3. 32-Dimensional Dense Vectors

Profiles are vectorized by `src/plumbing/textEmbedder.mjs` into 32 dimensions representing orthogonal conference domains (e.g. distributed systems, machine learning, cloud infrastructure, cryptography, UI, databases).

Vectors are normalized to unit magnitude:
$$\|\mathbf{v}\| = \sqrt{\sum_{i=1}^{32} v_i^2} = 1.0$$

Cosine similarity reduces to a fast dot product:
$$\cos(\theta) = \mathbf{u} \cdot \mathbf{v} = \sum_{i=1}^{32} u_i \cdot v_i$$
This executes in < 0.05ms on modern JavaScript runtimes.

