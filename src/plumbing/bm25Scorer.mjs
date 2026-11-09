/** [LAYER: PLUMBING] */

/**
 * Pure BM25 (Best Matching 25) Scorer.
 * Implements the standard Okapi BM25 ranking function used by Elasticsearch.
 * Stateless pure functions.
 */

const K1 = 1.2;
const B = 0.75;

/**
 * Tokenizes text into lowercase terms.
 * @param {string} text
 * @returns {string[]}
 */
export function tokenizeText(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Calculates Term Frequency (TF) map for a document.
 * @param {readonly string[]} tokens
 * @returns {Map<string, number>}
 */
export function calculateTermFrequencies(tokens) {
  const tf = new Map();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  return tf;
}

/**
 * Computes Okapi BM25 score for a query against a document.
 * @param {Object} params
 * @param {readonly string[]} params.queryTerms
 * @param {Map<string, number>} params.docTermFreqs
 * @param {number} params.docLength
 * @param {number} params.avgDocLength
 * @param {number} params.totalDocs
 * @param {Map<string, number>} params.docFrequencies - number of docs containing term
 * @returns {number} BM25 score
 */
export function computeBM25Score({
  queryTerms,
  docTermFreqs,
  docLength,
  avgDocLength,
  totalDocs,
  docFrequencies
}) {
  if (!queryTerms || queryTerms.length === 0 || docLength === 0) {
    return 0;
  }
  const avgLen = avgDocLength > 0 ? avgDocLength : 1;
  const N = Math.max(totalDocs, 1);
  let totalScore = 0;

  for (const term of queryTerms) {
    const tf = docTermFreqs.get(term) || 0;
    if (tf === 0) continue;

    const df = docFrequencies.get(term) || 1;
    // IDF calculation: ln(1 + (N - df + 0.5) / (df + 0.5))
    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    // BM25 term weighting
    const numerator = tf * (K1 + 1);
    const denominator = tf + K1 * (1 - B + B * (docLength / avgLen));
    totalScore += idf * (numerator / denominator);
  }

  return Number(Math.max(0, totalScore).toFixed(4));
}

