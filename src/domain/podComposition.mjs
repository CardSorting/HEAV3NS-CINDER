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
 * Names a Pod after what its members share: the interests (and topics) held by the most members,
 * e.g. "Kubernetes & Observability". Only interests shared by at least two members count; otherwise the
 * most common single interest is used, else `fallback`.
 * @param {Array<{ interests?: string[], topics?: string[] }>} members
 * @param {string} [fallback="Shared Interests"]
 * @returns {string}
 */
export function derivePodTheme(members, fallback = "Shared Interests") {
  const counts = new Map();
  for (const m of members) {
    const seen = new Set();
    for (const raw of [...(m.interests || []), ...(m.topics || [])]) {
      const key = String(raw).trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const entry = counts.get(key) || { label: String(raw).trim(), n: 0 };
      entry.n++;
      counts.set(key, entry);
    }
  }
  const ranked = [...counts.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  const shared = ranked.filter((e) => e.n >= 2).slice(0, 2).map((e) => e.label);
  if (shared.length) return shared.join(" & ");
  return ranked[0]?.label || fallback;
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
