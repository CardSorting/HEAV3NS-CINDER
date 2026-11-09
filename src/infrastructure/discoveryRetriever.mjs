/** [LAYER: INFRASTRUCTURE] */

/**
 * Default RRF weights. The looking_for signals outweigh profile similarity so discovery surfaces the
 * complementary people an attendee asked for rather than lookalikes.
 * Tuned with `npm run eval:discovery` (DevSummit 2026, 40 fixed attendees, top 10; "answers" = candidate is
 * who looking_for asks for, "same" = same discipline):
 *   equal weights            32% answers / 43% same / 2.9 disciplines
 *   lf_knn 3, lf_bm25 2      47% / 21% / 3.1
 *   lf_knn 3, lf_bm25 3      50% / 17% / 3.1   <- default (gains plateau; heavier weights add ~1 point)
 *   window 20 instead of 50  54% / 22% / 2.8   (less diverse, fewer fused candidates; window stays 50)
 */
export const DEFAULT_DISCOVERY_WEIGHTS = Object.freeze({ bm25: 1, profile_knn: 1, looking_for_knn: 3, looking_for_bm25: 3 });

/**
 * Reads each retriever's initial rank from an RRF hit explanation
 * ("rrf score: [..] computed for initial ranks [27, 19, 2, 13] with rankConstant…").
 * @param {Object|undefined} explanation - the hit's `_explanation`
 * @param {string[]} names - retriever names in request order
 * @returns {Record<string, number|null>} rank per retriever (null when that retriever did not return the hit)
 */
export function parseRetrieverRanks(explanation, names) {
  const match = /initial ranks \[([^\]]*)\]/.exec(explanation?.description || "");
  const ranks = match ? match[1].split(",").map((s) => Number.parseInt(s.trim(), 10)) : [];
  return Object.fromEntries(names.map((name, i) => [name, Number.isFinite(ranks[i]) ? ranks[i] : null]));
}

/** Fields of other attendees that a `looking_for` text ("backend engineers who…") should match. */
export const LOOKING_FOR_TARGET_FIELDS = Object.freeze(["title^3", "expertise^2", "interests", "bio"]);

/** Profile fields searched by the BM25 retriever, with boosts. */
export const DISCOVERY_TEXT_FIELDS = Object.freeze([
  "interests^3", "expertise^2", "topics^2", "title^2", "projects", "challenges", "looking_for", "bio"
]);

/**
 * Builds the live discovery search: an RRF retriever over cinder-registrations that fuses
 *   1. BM25 over profile text (shared vocabulary),
 *   2. kNN on the requester's stored profile vector (people similar to them), when available,
 *   3. kNN on the requester's `looking_for` text embedded at query time (people they asked to meet),
 *   4. BM25 of the `looking_for` text against others' titles/expertise (roles they asked for),
 *      (3 and 4 only when `looking_for` is set), combined with weighted RRF (DEFAULT_DISCOVERY_WEIGHTS).
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
 * @param {Partial<typeof DEFAULT_DISCOVERY_WEIGHTS>} [params.weights] - per-retriever RRF weights
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
  rankConstant = 60,
  weights = DEFAULT_DISCOVERY_WEIGHTS
}) {
  if (!eventId) throw new Error("buildDiscoveryQuery requires an eventId");
  const filter = { bool: { filter: [{ term: { eventId } }], must_not: excludeIds.length ? [{ ids: { values: [...excludeIds] } }] : [] } };
  // kNN retrievers must return at least the fusion window so RRF sees the same depth from every retriever.
  const k = Math.max(limit, rankWindowSize);
  const numCandidates = Math.min(10000, Math.max(100, k * 2));

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
    retrievers.push({
      standard: {
        query: {
          bool: {
            filter: filter.bool.filter,
            must_not: filter.bool.must_not,
            should: [{ multi_match: { query: lookingForText, fields: [...LOOKING_FOR_TARGET_FIELDS] } }],
            minimum_should_match: 1
          }
        }
      }
    });
    names.push("looking_for_bm25");
  }
  if (!retrievers.length) throw new Error("buildDiscoveryQuery needs query text, a profile vector or looking_for text");

  const w = { ...DEFAULT_DISCOVERY_WEIGHTS, ...weights };
  const retriever = retrievers.length === 1
    ? retrievers[0]
    : {
        rrf: {
          retrievers: retrievers.map((r, i) => ({ retriever: r, weight: w[names[i]] ?? 1 })),
          rank_window_size: rankWindowSize,
          rank_constant: rankConstant
        }
      };

  return {
    retrievers: names,
    weights: Object.fromEntries(names.map((n) => [n, retrievers.length === 1 ? 1 : (w[n] ?? 1)])),
    body: {
      size: limit,
      _source: { excludes: ["searchText", "embedding"] },
      retriever
    }
  };
}
