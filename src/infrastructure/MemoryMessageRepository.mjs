/** [LAYER: INFRASTRUCTURE] */

import { IMessageRepository } from "../domain/interfaces/IMessageRepository.mjs";

/** Offline IMessageRepository for pod chat and 1:1 direct messages. */
export class MemoryMessageRepository extends IMessageRepository {
  /**
   * @param {Object} [deps]
   * @param {(props: Object) => any} [deps.toEntity] - pod message factory
   */
  constructor({ toEntity = (props) => props } = {}) {
    super();
    this.toEntity = toEntity;
    this.pod = new Map();
    this.direct = new Map();
  }

  /** @inheritdoc */
  async appendPodMessage(message) {
    const json = typeof message?.toJSON === "function" ? message.toJSON() : { ...message };
    upsert(this.pod, json.podId, json);
  }

  /** @inheritdoc */
  async listPodMessages(podId, { limit = 200 } = {}) {
    return latest(this.pod.get(podId), limit).map((m) => this.toEntity(m));
  }

  /** @inheritdoc */
  async appendDirectMessage(message) {
    if (!message?.id || !message.matchId || !message.content) throw new Error("appendDirectMessage requires id, matchId and content");
    upsert(this.direct, message.matchId, { ...message });
  }

  /** @inheritdoc */
  async listDirectMessages(matchId, { limit = 200 } = {}) {
    return latest(this.direct.get(matchId), limit);
  }
}

function upsert(map, key, msg) {
  const list = map.get(key) || [];
  const i = list.findIndex((m) => m.id === msg.id);
  if (i >= 0) list[i] = msg; else list.push(msg);
  map.set(key, list);
}

function latest(list = [], limit) {
  return [...list].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp))).slice(-limit);
}
