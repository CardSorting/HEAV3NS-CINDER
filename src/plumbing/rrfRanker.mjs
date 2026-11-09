/** [LAYER: PLUMBING] */

/**
 * Pure Reciprocal Rank Fusion (RRF) combiner.
 * Standard Elasticsearch 8.x+ algorithm for combining BM25 keyword search
 * and kNN dense vector rankings.
 * Zero state.
 */

const DEFAULT_RRF_K = 60;

/**
 * Combines ranked lists from BM25 and Vector Search using Reciprocal Rank Fusion.
 *
 * @param {Object} params
 * @param {Array<{ id: string, score: number, doc: any }>} params.bm25Results - Sorted by BM25 descending
 * @param {Array<{ id: string, score: number, doc: any }>} params.knnResults - Sorted by Cosine similarity descending
 * @param {number} [params.k=60] - RRF smoothing parameter
 * @returns {Array<{ id: string, rrfScore: number, bm25Rank: number | null, knnRank: number | null, bm25Score: number, knnScore: number, doc: any }>}
 */
export function reciprocalRankFusion({ bm25Results = [], knnResults = [], k = DEFAULT_RRF_K }) {
  const mergedMap = new Map();

  // Process BM25 ranks
  bm25Results.forEach((item, index) => {
    const rank = index + 1;
    const current = mergedMap.get(item.id) || {
      id: item.id,
      doc: item.doc,
      bm25Rank: null,
      knnRank: null,
      bm25Score: 0,
      knnScore: 0,
      rrfScore: 0
    };
    current.bm25Rank = rank;
    current.bm25Score = item.score;
    current.rrfScore += 1 / (k + rank);
    if (!current.doc) current.doc = item.doc;
    mergedMap.set(item.id, current);
  });

  // Process kNN ranks
  knnResults.forEach((item, index) => {
    const rank = index + 1;
    const current = mergedMap.get(item.id) || {
      id: item.id,
      doc: item.doc,
      bm25Rank: null,
      knnRank: null,
      bm25Score: 0,
      knnScore: 0,
      rrfScore: 0
    };
    current.knnRank = rank;
    current.knnScore = item.score;
    current.rrfScore += 1 / (k + rank);
    if (!current.doc) current.doc = item.doc;
    mergedMap.set(item.id, current);
  });

  const merged = Array.from(mergedMap.values());
  // Sort descending by RRF score
  merged.sort((a, b) => b.rrfScore - a.rrfScore);

  return merged.map((item) => ({
    ...item,
    rrfScore: Number(item.rrfScore.toFixed(6))
  }));
}
