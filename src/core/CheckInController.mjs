/** [LAYER: CORE] */

import { Attendee } from "../domain/attendee.mjs";
import { generateDenseEmbedding } from "../plumbing/textEmbedder.mjs";
import { generatePrefixedId } from "../plumbing/idGenerator.mjs";

/**
 * Controller for Milestone 1: Attendee Check-In & Indexing.
 * Coordinates Domain Attendee entity, Elasticsearch indexing, and Repository persistence.
 */
export class CheckInController {
  /**
   * @param {Object} params
   * @param {import("../domain/interfaces/IAttendeeRepository.mjs").IAttendeeRepository} params.attendeeRepo
   * @param {import("../domain/interfaces/IElasticsearchClient.mjs").IElasticsearchClient} params.esClient
   * @param {import("../domain/interfaces/IEventBus.mjs").IEventBus} params.eventBus
   */
  constructor({ attendeeRepo, esClient, eventBus }) {
    this.attendeeRepo = attendeeRepo;
    this.esClient = esClient;
    this.eventBus = eventBus;
  }

  /**
   * Checks in a new attendee, generates vector embedding, saves and indexes in Elasticsearch.
   * @param {Object} profile
   * @returns {Promise<Attendee>}
   */
  async checkIn(profile) {
    const id = profile.id || generatePrefixedId("att");
    const searchableSummary = [
      profile.name,
      profile.title,
      profile.bio,
      profile.projects,
      profile.challenges,
      profile.looking_for
    ].filter(Boolean).join(" ");

    const tags = [
      ...(profile.interests || []),
      ...(profile.expertise || []),
      ...(profile.topics || [])
    ];

    const embedding = profile.embedding && profile.embedding.length === 32
      ? profile.embedding
      : generateDenseEmbedding(searchableSummary, tags);

    const attendee = new Attendee({
      ...profile,
      id,
      embedding
    });

    // 1. Persist in repository
    await this.attendeeRepo.save(attendee);

    // 2. Index in Elasticsearch with full text & vector fields
    await this.esClient.indexAttendee(attendee);

    // 3. Dispatch event
    this.eventBus.publish("attendee.checked_in", attendee.toJSON());

    return attendee;
  }

  /**
   * Retrieves an attendee profile by ID.
   * @param {string} id
   */
  async getProfile(id) {
    return this.attendeeRepo.findById(id);
  }

  /**
   * Lists checked in attendees, optionally only those registered for one event.
   * @param {string} [eventId]
   */
  async listAttendees(eventId) {
    return this.attendeeRepo.listAll(eventId);
  }
}

