/** [LAYER: INFRASTRUCTURE] */

import { ISpaceRepository } from "../domain/interfaces/ISpaceRepository.mjs";
import { VENUE_LOCATIONS, SEED_EVENT } from "../plumbing/conferenceSeedData.mjs";

/** Offline ISpaceRepository: the seed meetup locations as spaces of the seed event. */
export class MemorySpaceRepository extends ISpaceRepository {
  /**
   * @param {Object} [deps]
   * @param {Object[]} [deps.spaces] - VenueSpace props (with eventId or venueId)
   * @param {(props: Object) => any} [deps.toEntity]
   */
  constructor({ spaces = seedSpaces(), toEntity = (props) => props } = {}) {
    super();
    this.spaces = spaces.map((s) => ({ ...s }));
    this.toEntity = toEntity;
  }

  /** @inheritdoc */
  async listForEvent(eventId, { meetupFriendlyOnly = false } = {}) {
    return this.spaces
      .filter((s) => s.eventId === eventId)
      .filter((s) => !meetupFriendlyOnly || s.meetupFriendly)
      .map((s) => this.toEntity(s));
  }

  /** @inheritdoc */
  async findById(spaceId) {
    const s = this.spaces.find((x) => x.id === spaceId);
    return s ? this.toEntity(s) : null;
  }
}

/** VENUE_LOCATIONS -> VenueSpace props. Aliases are the name's significant word groups ("patio", "tech cafe"). */
export function seedSpaces(event = SEED_EVENT, locations = VENUE_LOCATIONS) {
  return locations.map((loc) => {
    const words = loc.name.toLowerCase().replace(/[()]/g, "").split(/\s+/).filter((w) => !/^(main|hall|booth|\d+)$/.test(w));
    const aliases = new Set([loc.name.toLowerCase(), words.join(" "), ...words, loc.id.replace(/^loc_/, "").replace(/_/g, " ")]);
    return {
      id: loc.id,
      name: loc.name,
      kind: "meetup-spot",
      aliases: [...aliases].filter((a) => a.length > 2),
      floor: "",
      capacity: loc.capacity,
      tags: loc.tag.split("&").map((t) => t.trim().toLowerCase()),
      meetupFriendly: true,
      venueId: null,
      eventId: event.id
    };
  });
}
