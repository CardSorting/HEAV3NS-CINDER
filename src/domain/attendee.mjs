/** [LAYER: DOMAIN] */

/**
 * Pure Domain Entity: Attendee Profile.
 * Zero I/O.
 */
export class Attendee {
  /**
   * @param {Object} props
   * @param {string} props.id
   * @param {string} props.name
   * @param {string} [props.title]
   * @param {string} [props.company]
   * @param {string} [props.avatar]
   * @param {string} [props.bio]
   * @param {string[]} [props.interests]
   * @param {string[]} [props.expertise]
   * @param {string} [props.projects]
   * @param {string} [props.challenges]
   * @param {string} [props.looking_for]
   * @param {string[]} [props.topics]
   * @param {number[]} [props.embedding]
   * @param {string} [props.checked_in_at]
   * @param {string|null} [props.eventId=null] - Event (eventapp @id) this registration belongs to
   * @param {string} [props.discipline=""] - professional discipline (e.g. "sre", "backend"), used for Pod diversity
   * @param {string[]} [props.bookmarkedSessionIds=[]] - sessions the attendee plans to attend
   * @param {string[]} [props.speakerSessionIds=[]] - sessions the attendee speaks at
   */
  constructor({
    id,
    name,
    title = "",
    company = "",
    avatar = "",
    bio = "",
    interests = [],
    expertise = [],
    projects = "",
    challenges = "",
    looking_for = "",
    topics = [],
    embedding = [],
    checked_in_at = new Date().toISOString(),
    eventId = null,
    discipline = "",
    bookmarkedSessionIds = [],
    speakerSessionIds = []
  }) {
    if (!id || typeof id !== "string") {
      throw new Error("Attendee must have a valid string id");
    }
    if (!name || typeof name !== "string") {
      throw new Error("Attendee must have a valid string name");
    }
    if (eventId !== null && (typeof eventId !== "string" || eventId.trim() === "")) {
      throw new Error("Attendee eventId must be a non-empty string or null");
    }

    this.id = id;
    this.name = name;
    this.title = title;
    this.company = company;
    this.avatar = avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${id}`;
    this.bio = bio;
    this.interests = Array.isArray(interests) ? [...interests] : [];
    this.expertise = Array.isArray(expertise) ? [...expertise] : [];
    this.projects = projects;
    this.challenges = challenges;
    this.looking_for = looking_for;
    this.topics = Array.isArray(topics) ? [...topics] : [];
    this.embedding = Array.isArray(embedding) ? [...embedding] : [];
    this.checked_in_at = checked_in_at;
    this.eventId = eventId;
    this.discipline = typeof discipline === "string" ? discipline : "";
    this.bookmarkedSessionIds = Array.isArray(bookmarkedSessionIds) ? [...bookmarkedSessionIds] : [];
    this.speakerSessionIds = Array.isArray(speakerSessionIds) ? [...speakerSessionIds] : [];
  }

  /**
   * Extracts searchable combined text representation for Elasticsearch indexing.
   * @returns {string}
   */
  toSearchableText() {
    return [
      this.name,
      this.title,
      this.company,
      this.bio,
      this.interests.join(" "),
      this.expertise.join(" "),
      this.projects,
      this.challenges,
      this.looking_for,
      this.topics.join(" ")
    ].join(" ");
  }

  /**
   * Plain JSON-serializable snapshot of the attendee.
   * @returns {Record<string, any>}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      title: this.title,
      company: this.company,
      avatar: this.avatar,
      bio: this.bio,
      interests: this.interests,
      expertise: this.expertise,
      projects: this.projects,
      challenges: this.challenges,
      looking_for: this.looking_for,
      topics: this.topics,
      embedding: this.embedding,
      checked_in_at: this.checked_in_at,
      eventId: this.eventId,
      discipline: this.discipline,
      bookmarkedSessionIds: this.bookmarkedSessionIds,
      speakerSessionIds: this.speakerSessionIds
    };
  }
}

