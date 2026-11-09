/** [LAYER: INFRASTRUCTURE] */

import { IPromptRepository } from "../domain/interfaces/IPromptRepository.mjs";
import { DISCUSSION_PROMPTS } from "../plumbing/conferenceSeedData.mjs";
import { cosineSimilarity } from "../plumbing/vectorMath.mjs";

/** Offline IPromptRepository over the seed discussion prompts (ranked by vector when prompts carry one). */
export class MemoryPromptRepository extends IPromptRepository {
  /**
   * @param {Object} [deps]
   * @param {Array<{ id: string, text: string, phase: string, topics?: string[], embedding?: number[] }>} [deps.prompts]
   */
  constructor({ prompts = DISCUSSION_PROMPTS.map((text, i) => ({ id: `prm_seed_${i + 1}`, text, phase: "deep-dive", topics: [] })) } = {}) {
    super();
    this.prompts = prompts.map((p) => ({ topics: [], ...p }));
  }

  /** @inheritdoc */
  async findForVector(vector, { phase, limit = 1, topics } = {}) {
    const wanted = topics?.length ? new Set(topics) : null;
    const generic = (p) => !p.topics.length || p.topics.includes("*");
    return this.prompts
      .filter((p) => !phase || p.phase === phase)
      .filter((p) => !wanted || generic(p) || p.topics.some((t) => wanted.has(t)))
      .map((p) => ({ p, score: Array.isArray(p.embedding) && vector?.length === p.embedding.length ? cosineSimilarity(vector, p.embedding) : 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ p }) => pick(p));
  }

  /** @inheritdoc */
  async listByPhase(phase) {
    return this.prompts.filter((p) => p.phase === phase).map(pick);
  }
}

function pick({ id, text, phase, topics }) {
  return { id, text, phase, topics: topics || [] };
}
