/** [LAYER: INFRASTRUCTURE] */

/** Profile fields searched by the BM25 retriever, with boosts. */
export const DISCOVERY_TEXT_FIELDS = Object.freeze([
  "interests^3", "expertise^2", "topics^2", "title^2", "projects", "challenges", "looking_for", "bio"
]);

/**
 * Builds the live discovery search: an RRF retriever over cinder-registrations that fuses
 *   1. BM25 over profile text (shared vocabulary),
 *   2. kNN on the requester's stored profile vector (people similar to them), when available,
 *   3. kNN on the requester's `looking_for` text embedded at query time (people they asked to meet),
 *      when available.
 * Every retriever filters to the event and excludes the requester and already-swiped attendees, so
 * exclusions cannot leak back in through any single retriever.
 *
 * @param {Object} params
 * @param {string} params.eventId
 * @param {string} params.queryText - BM25 query text (interests, topics, projects, challenges…)
 * @param {number[]} [params.profileVector] - stored 1024-dim vector of the requester
 * @param {string} [params.lookingForText] - the requester's `looking_for`
 * @param {string[]} [params.excludeIds=[]]
 * @param {number} [params.limit=10]
 * @param {string} params.embedModel - inference endpoint for `looking_for`
 * @param {number} [params.rankWindowSize=50]
 * @param {number} [params.rankConstant=60]
 * @returns {{ body: Object, retrievers: string[] }} search body and the names of the retrievers used
 */
export function buildDiscoveryQuery({
  eventId,
  queryText,
  profileVector,
  lookingForText,
  excludeIds = [],
  limit = 10,
  embedModel,
  rankWindowSize = 50,
  rankConstant = 60
}) {
  if (!eventId) throw new Error("buildDiscoveryQuery requires an eventId");
  const filter = { bool: { filter: [{ term: { eventId } }], must_not: excludeIds.length ? [{ ids: { values: [...excludeIds] } }] : [] } };
  const k = Math.max(limit, Math.min(rankWindowSize, 50));
  const numCandidates = Math.max(100, k * 4);

  const retrievers = [];
  const names = [];
  if (queryText && queryText.trim()) {
    retrievers.push({
      standard: {
        query: {
          bool: {
            filter: filter.bool.filter,
            must_not: filter.bool.must_not,
            should: [{ multi_match: { query: queryText, fields: [...DISCOVERY_TEXT_FIELDS] } }],
            minimum_should_match: 1
          }
        }
      }
    });
    names.push("bm25");
  }
  if (Array.isArray(profileVector) && profileVector.length) {
    retrievers.push({ knn: { field: "embedding", query_vector: profileVector, k, num_candidates: numCandidates, filter } });
    names.push("profile_knn");
  }
  if (lookingForText && lookingForText.trim()) {
    retrievers.push({
      knn: {
        field: "embedding", k, num_candidates: numCandidates, filter,
        query_vector_builder: { text_embedding: { model_id: embedModel, model_text: lookingForText } }
      }
    });
    names.push("looking_for_knn");
  }
  if (!retrievers.length) throw new Error("buildDiscoveryQuery needs query text, a profile vector or looking_for text");

  const retriever = retrievers.length === 1
    ? retrievers[0]
    : { rrf: { retrievers, rank_window_size: rankWindowSize, rank_constant: rankConstant } };

  return {
    retrievers: names,
    body: {
      size: limit,
      _source: { excludes: ["searchText", "embedding"] },
      retriever
    }
  };
}
