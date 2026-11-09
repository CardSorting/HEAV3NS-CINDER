/** [LAYER: INFRASTRUCTURE] */

import { IPodRepository } from "../domain/interfaces/IPodRepository.mjs";

/**
 * In-memory repository for Pods.
 * Implements IPodRepository.
 */
export class MemoryPodRepository extends IPodRepository {
  constructor() {
    super();
    this.pods = new Map();
  }

  async save(pod) {
    if (!pod || !pod.id) {
      throw new Error("Invalid pod");
    }
    this.pods.set(pod.id, pod);
  }

  async findById(podId) {
    return this.pods.get(podId) || null;
  }

  async findByMemberId(attendeeId) {
    for (const pod of this.pods.values()) {
      if (pod.memberIds.includes(attendeeId)) {
        return pod;
      }
    }
    return null;
  }

  async listAll() {
    return Array.from(this.pods.values());
  }

  clear() {
    this.pods.clear();
  }
}
