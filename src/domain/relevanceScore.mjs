/** [LAYER: DOMAIN] */

/**
 * Pure Domain Logic: Calculates match explanations and complementary synergy.
 * Zero I/O.
 */

/**
 * Generates an intuitive, human-readable match explanation from two attendee profiles.
 *
 * @param {import("./attendee.mjs").Attendee} source
 * @param {import("./attendee.mjs").Attendee} candidate
 * @param {Object} [scores]
 * @param {number} [scores.bm25Score=0]
 * @param {number} [scores.knnScore=0]
 * @param {number} [scores.rrfScore=0]
 * @returns {{
 *   headline: string,
 *   sharedInterests: string[],
 *   complementaryStrengths: string[],
 *   synergySummary: string,
 *   scorePercent: number
 * }}
 */
export function explainMatchRelevance(source, candidate, scores = {}) {
  const sourceInterests = new Set(source.interests.map((s) => s.toLowerCase()));
  const candidateInterests = new Set(candidate.interests.map((s) => s.toLowerCase()));

  // Find shared interests
  const shared = [];
  for (const s of source.interests) {
    if (candidateInterests.has(s.toLowerCase())) {
      shared.push(s);
    }
  }

  // Find complementary skills
  const complementary = [];
  for (const exp of candidate.expertise) {
    const isShared = source.expertise.some((e) => e.toLowerCase() === exp.toLowerCase());
    if (!isShared && complementary.length < 3) {
      complementary.push(exp);
    }
  }

  // Headline generation
  let headline = "";
  if (shared.length > 0) {
    headline = `Shared focus on ${shared.slice(0, 2).join(" & ")}`;
  } else if (complementary.length > 0) {
    headline = `Complementary expertise in ${complementary[0]}`;
  } else {
    headline = "Aligned conference tracks & technical scope";
  }

  // Synergy summary
  let synergySummary = "";
  if (shared.length > 0 && complementary.length > 0) {
    synergySummary = `Both work with ${shared[0]}, with ${candidate.name} bringing deep expertise in ${complementary.join(", ")}.`;
  } else if (shared.length > 0) {
    synergySummary = `Both actively focused on ${shared.join(", ")}. Great opportunity to compare architectural patterns.`;
  } else {
    synergySummary = `High semantic affinity across cloud infrastructure and distributed systems.`;
  }

  const knn = scores.knnScore || 0.75;
  const scorePercent = Math.min(99, Math.max(65, Math.round(knn * 100)));

  return {
    headline,
    sharedInterests: shared,
    complementaryStrengths: complementary,
    synergySummary,
    scorePercent
  };
}
