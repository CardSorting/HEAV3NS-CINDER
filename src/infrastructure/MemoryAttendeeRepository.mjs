/** [LAYER: INFRASTRUCTURE] */

import { IAttendeeRepository } from "../domain/interfaces/IAttendeeRepository.mjs";

/**
 * In-memory repository for Attendees.
 * Implements IAttendeeRepository.
 */
export class MemoryAttendeeRepository extends IAttendeeRepository {
  constructor() {
    super();
    this.attendees = new Map();
  }

  async save(attendee) {
    if (!attendee || !attendee.id) {
      throw new Error("Invalid attendee");
    }
    this.attendees.set(attendee.id, attendee);
  }

  async findById(id) {
    return this.attendees.get(id) || null;
  }

  async listAll(eventId) {
    const all = Array.from(this.attendees.values());
    return eventId ? all.filter((a) => a.eventId === eventId) : all;
  }

  /**
   * Clears repository state.
   */
  clear() {
    this.attendees.clear();
  }
}
