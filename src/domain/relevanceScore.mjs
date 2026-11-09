/** [LAYER: DOMAIN] */

/**
 * Pure Domain Logic: Calculates match explanations and complementary synergy.
 * Zero I/O.
 */

/** Title/discipline words that say nothing about what someone does. */
const GENERIC_ROLE_WORDS = new Set([
  "senior", "staff", "principal", "lead", "head", "chief", "junior", "associate", "of", "and", "the", "at",
  "engineer", "engineering", "manager", "director", "vp", "officer", "specialist", "member", "team", "eng"
]);

/**
 * Generates an intuitive, human-readable match explanation from two attendee profiles.
 *
 * Reasons, strongest first:
 * 1. The candidate is who the source asked to meet (`looking_for` names their role, discipline or expertise).
 * 2. The fit is mutual (the source is who the candidate asked to meet).
 * 3. Shared interests.
 * 4. Complementary expertise the source does not have.
 *
 * @param {Object} source - attendee (entity or registration document)
 * @param {Object} candidate - attendee (entity or registration document; `discipline` used when present)
 * @param {Object} [scores]
 * @param {number} [scores.bm25Score=0]
 * @param {number} [scores.knnScore] - cosine similarity (embedded engine)
 * @param {number} [scores.rrfScore=0]
 * @param {Record<string, number|null>} [scores.retrieverRanks] - live retriever ranks (1 = best)
 * @returns {{
 *   headline: string,
 *   sharedInterests: string[],
 *   complementaryStrengths: string[],
 *   synergySummary: string,
 *   scorePercent: number,
 *   answersLookingFor: boolean,
 *   mutualFit: boolean,
 *   reasons: string[]
 * }}
 */
export function explainMatchRelevance(source, candidate, scores = {}) {
  const candidateInterests = new Set((candidate.interests || []).map((s) => s.toLowerCase()));

  // Shared interests
  const shared = (source.interests || []).filter((s) => candidateInterests.has(s.toLowerCase()));

  // Complementary skills the source does not have
  const sourceExpertise = new Set((source.expertise || []).map((e) => e.toLowerCase()));
  const complementary = (candidate.expertise || []).filter((e) => !sourceExpertise.has(e.toLowerCase())).slice(0, 3);

  // Who-asked-for-whom
  const answersLookingFor = describesProfile(source.looking_for, candidate);
  const mutualFit = describesProfile(candidate.looking_for, source);
  const role = candidate.title || "attendee";

  const reasons = [];
  if (answersLookingFor) reasons.push(`${candidate.name} is the kind of ${role} you said you want to meet`);
  if (mutualFit) reasons.push(`${candidate.name} is also looking for someone with your background`);
  if (shared.length) reasons.push(`You share ${shared.slice(0, 3).join(", ")}`);
  if (complementary.length) reasons.push(`${candidate.name} brings ${complementary.join(", ")}`);

  // Headline
  let headline;
  if (answersLookingFor && mutualFit) headline = `Mutual fit: ${role} you asked to meet`;
  else if (answersLookingFor) headline = `Matches what you're looking for: ${role}`;
  else if (shared.length > 0) headline = `Shared focus on ${shared.slice(0, 2).join(" & ")}`;
  else if (complementary.length > 0) headline = `Complementary expertise in ${complementary[0]}`;
  else headline = "Aligned conference tracks & technical scope";

  // Synergy summary
  let synergySummary;
  if (answersLookingFor) {
    const extra = shared.length
      ? ` You both work with ${shared[0]}${complementary.length ? `, and ${candidate.name} adds ${complementary.join(", ")}` : ""}.`
      : complementary.length ? ` ${candidate.name} brings ${complementary.join(", ")}.` : "";
    synergySummary = `${candidate.name} (${role}) fits what you're looking for.${extra}${mutualFit ? " They're looking for someone like you too." : ""}`;
  } else if (shared.length > 0 && complementary.length > 0) {
    synergySummary = `Both work with ${shared[0]}, with ${candidate.name} bringing deep expertise in ${complementary.join(", ")}.`;
  } else if (shared.length > 0) {
    synergySummary = `Both actively focused on ${shared.join(", ")}. Great opportunity to compare architectural patterns.`;
  } else if (complementary.length > 0) {
    synergySummary = `${candidate.name} brings ${complementary.join(", ")}, expertise you don't list yourself.`;
  } else {
    synergySummary = "High semantic affinity across your profiles and conference interests.";
  }

  return {
    headline,
    sharedInterests: shared,
    complementaryStrengths: complementary,
    synergySummary,
    scorePercent: scorePercent(scores),
    answersLookingFor,
    mutualFit,
    reasons
  };
}

/**
 * True when a `looking_for` text names the profile's role, discipline or expertise, e.g.
 * "backend engineers who design APIs" vs title "Backend Engineer" or expertise "gRPC".
 * Generic words ("senior", "engineer") never count; plurals match singulars.
 */
function describesProfile(lookingFor, profile) {
  const wanted = new Set(words(lookingFor));
  if (!wanted.size) return false;
  const roleWords = [...words(profile.title), ...words(profile.discipline)].filter((w) => !GENERIC_ROLE_WORDS.has(w));
  if (roleWords.some((w) => wanted.has(w))) return true;
  const text = ` ${words(lookingFor).join(" ")} `;
  return (profile.expertise || []).some((e) => {
    const phrase = words(e).join(" ");
    return phrase.length > 2 && text.includes(` ${phrase} `);
  });
}

/** Lower-cased words with simple plural folding ("SREs" -> "sre", "engineers" -> "engineer"). */
function words(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

/** 65–99: cosine similarity when known (embedded), else the best live retriever rank, else 75. */
function scorePercent({ knnScore, retrieverRanks } = {}) {
  if (typeof knnScore === "number" && knnScore > 0) return clamp(Math.round(knnScore * 100));
  const ranks = Object.values(retrieverRanks || {}).filter((r) => Number.isFinite(r));
  if (ranks.length) return clamp(100 - Math.min(...ranks));
  return 75;
}

function clamp(n) {
  return Math.min(99, Math.max(65, n));
}
