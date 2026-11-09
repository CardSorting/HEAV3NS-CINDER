/** [LAYER: PLUMBING] */

/**
 * Pure stateless vector math utilities: dot product, Euclidean norm,
 * cosine similarity, and vector normalization.
 * Zero external dependencies. Zero state.
 */

/**
 * Calculates dot product of two numerical vectors of equal length.
 * @param {readonly number[]} a
 * @param {readonly number[]} b
 * @returns {number}
 */
export function dotProduct(a, b) {
  if (!a || !b || a.length !== b.length) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Calculates Euclidean magnitude (L2 norm) of a vector.
 * @param {readonly number[]} v
 * @returns {number}
 */
export function magnitude(v) {
  if (!v || v.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i] * v[i];
  }
  return Math.sqrt(sum);
}

/**
 * Computes cosine similarity between two vectors.
 * Returns value in range [-1.0, 1.0], normalized to 0 if either vector has 0 magnitude.
 * @param {readonly number[]} a
 * @param {readonly number[]} b
 * @returns {number}
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length === 0 || b.length === 0) {
    return 0;
  }
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) {
    return 0;
  }
  const cos = dotProduct(a, b) / (magA * magB);
  // Clamp floating point imprecision
  return Math.max(-1, Math.min(1, cos));
}

/**
 * Normalizes vector to unit length.
 * @param {readonly number[]} v
 * @returns {number[]}
 */
export function normalizeVector(v) {
  const mag = magnitude(v);
  if (mag === 0) {
    return new Array(v.length).fill(0);
  }
  return v.map((x) => x / mag);
}

/**
 * Computes the centroid (mean vector) of multiple vectors.
 * @param {readonly (readonly number[])[]} vectors
 * @returns {number[]}
 */
export function vectorCentroid(vectors) {
  if (!vectors || vectors.length === 0) return [];
  const dims = vectors[0].length;
  const centroid = new Array(dims).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < dims; i++) {
      centroid[i] += vec[i] || 0;
    }
  }
  for (let i = 0; i < dims; i++) {
    centroid[i] /= vectors.length;
  }
  return normalizeVector(centroid);
}
