/** [LAYER: DOMAIN] */

/**
 * Pure Domain Entity: a room or meetup spot inside a venue (matches the cinder-spaces index).
 * Zero I/O.
 */
export class VenueSpace {
  /**
   * @param {Object} props
   * @param {string} props.id - e.g. "space:salt-palace:east-terrace"
   * @param {string} props.name - e.g. "East Terrace"
   * @param {string} [props.kind="room"] - e.g. "patio", "cafe", "breakout", "auditorium", "virtual-room"
   * @param {string[]} [props.aliases=[]] - phrases attendees use for it ("patio", "outside")
   * @param {string} [props.floor=""]
   * @param {number} [props.capacity=0]
   * @param {string[]} [props.tags=[]] - e.g. "outdoor", "quiet", "whiteboards"
   * @param {boolean} [props.meetupFriendly=false] - suitable for pod meetups
   * @param {string|null} [props.venueId=null] - eventapp place @id (physical venues)
   * @param {string|null} [props.eventId=null] - set for event-specific (virtual) spaces
   */
  constructor({
    id,
    name,
    kind = "room",
    aliases = [],
    floor = "",
    capacity = 0,
    tags = [],
    meetupFriendly = false,
    venueId = null,
    eventId = null
  }) {
    if (!id || typeof id !== "string") throw new Error("VenueSpace requires a string id");
    if (!name || typeof name !== "string") throw new Error("VenueSpace requires a name");
    if (!Number.isFinite(capacity) || capacity < 0) throw new Error("VenueSpace capacity must be a non-negative number");
    if (!venueId && !eventId) throw new Error("VenueSpace must belong to a venue (venueId) or an event (eventId)");

    this.id = id;
    this.name = name;
    this.kind = kind;
    this.aliases = Array.isArray(aliases) ? [...aliases] : [];
    this.floor = floor;
    this.capacity = capacity;
    this.tags = Array.isArray(tags) ? [...tags] : [];
    this.meetupFriendly = Boolean(meetupFriendly);
    this.venueId = venueId;
    this.eventId = eventId;
  }

  /**
   * Finds how strongly a message refers to this space: the length of the longest alias (or the
   * name) that appears in the text as whole words, case-insensitively. 0 when not mentioned.
   * @param {string} text
   * @returns {number}
   */
  mentionedIn(text) {
    const haystack = ` ${normalize(text)} `;
    let best = 0;
    for (const phrase of [this.name, ...this.aliases]) {
      const needle = normalize(phrase);
      if (needle && haystack.includes(` ${needle} `)) best = Math.max(best, needle.length);
    }
    return best;
  }

  /** Short display tag built from the first two tags, e.g. "Outdoor & Quiet". */
  displayTag() {
    return this.tags.slice(0, 2).map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" & ");
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      kind: this.kind,
      aliases: this.aliases,
      floor: this.floor,
      capacity: this.capacity,
      tags: this.tags,
      meetupFriendly: this.meetupFriendly,
      venueId: this.venueId,
      eventId: this.eventId
    };
  }
}

/**
 * Picks the space a message most specifically refers to (longest matching alias wins).
 * @param {VenueSpace[]} spaces
 * @param {string} text
 * @returns {VenueSpace|null}
 */
export function findMentionedSpace(spaces, text) {
  let best = null;
  let bestScore = 0;
  for (const space of spaces) {
    const score = space.mentionedIn(text);
    if (score > bestScore) {
      best = space;
      bestScore = score;
    }
  }
  return best;
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();
}
