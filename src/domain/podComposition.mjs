/** [LAYER: DOMAIN] */

/**
 * Pure Domain Logic: choosing Pod members that balance relevance with discipline diversity.
 * Zero I/O.
 */

const GENERIC_TITLE_WORDS = new Set([
  "senior", "staff", "principal", "lead", "head", "chief", "junior", "associate", "of", "and", "the", "&",
  "engineer", "engineering", "manager", "director", "vp", "officer", "specialist"
]);

/**
 * The discipline used for diversity: the registration's `discipline` when present, else the distinctive
 * words of the title ("Senior Platform Engineer" -> "platform").
 * @param {{ discipline?: string, title?: string }} profile
 * @returns {string}
 */
export function disciplineOf(profile) {
  if (profile?.discipline) return String(profile.discipline).toLowerCase();
  const words = String(profile?.title || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !GENERIC_TITLE_WORDS.has(w));
  return words.join(" ") || "unknown";
}

/**
 * Selects Pod members in order: seeds, then anchors (the seeds' mutual matches), then the ranked
 * candidates, allowing at most `maxPerDiscipline` members per discipline. If that leaves the Pod short,
 * the cap is relaxed and the best remaining candidates fill it.
 *
 * @param {Object} params
 * @param {Object[]} params.seeds - seed attendee profiles (always included)
 * @param {Object[]} [params.anchors=[]] - mutual-match partners of the seeds, strongest first
 * @param {Object[]} [params.candidates=[]] - retrieval results, most relevant first
 * @param {number} params.targetSize
 * @param {number} [params.maxPerDiscipline] - defaults to ceil(targetSize / 3), at least 1
 * @returns {{ members: Object[], anchorsUsed: string[], disciplines: Record<string, number>, relaxedCap: boolean, skippedForDiversity: string[] }}
 */
export function selectPodMembers({ seeds, anchors = [], candidates = [], targetSize, maxPerDiscipline }) {
  const cap = Math.max(1, maxPerDiscipline ?? Math.ceil(targetSize / 3));
  const members = [];
  const ids = new Set();
  const counts = {};
  const add = (p) => {
    members.push(p);
    ids.add(p.id);
    const d = disciplineOf(p);
    counts[d] = (counts[d] || 0) + 1;
  };

  for (const s of seeds) if (!ids.has(s.id)) add(s);

  const anchorsUsed = [];
  for (const a of anchors) {
    if (members.length >= targetSize) break;
    if (ids.has(a.id)) continue;
    if ((counts[disciplineOf(a)] || 0) >= cap) continue;
    add(a);
    anchorsUsed.push(a.id);
  }

  const skippedForDiversity = [];
  for (const c of candidates) {
    if (members.length >= targetSize) break;
    if (ids.has(c.id)) continue;
    if ((counts[disciplineOf(c)] || 0) >= cap) {
      skippedForDiversity.push(c.id);
      continue;
    }
    add(c);
  }

  let relaxedCap = false;
  for (const c of [...anchors, ...candidates]) {
    if (members.length >= targetSize) break;
    if (ids.has(c.id)) continue;
    relaxedCap = true;
    add(c);
  }

  return { members, anchorsUsed, disciplines: counts, relaxedCap, skippedForDiversity };
}
