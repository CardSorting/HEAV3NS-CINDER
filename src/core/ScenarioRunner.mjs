/** [LAYER: CORE] */

/**
 * Automated 10-Step Demonstration Scenario Runner.
 * Executes the continuous story from Section 9 of mvp.md against one event: the live demo event
 * (CINDER_DEMO_EVENT_ID, seeded with `npm run seed:demo`) or the offline seed event.
 *
 * Nothing about the venue is scripted: the meetup place and time, the Pod theme and the agenda alert all come
 * from the event's own agenda, spaces and attendees, so the same story runs in live and offline mode.
 */

/** The scripted cast (src/plumbing/conferenceSeedData.mjs ids, kept by `npm run seed:demo`). */
const CAST = Object.freeze({
  initiator: "att_alex_chen",
  partner: "att_maya_lin",
  proposer: "att_marcus_vance"
});

export class ScenarioRunner {
  /**
   * @param {import("./CinderApp.mjs").CinderApp} app
   */
  constructor(app) {
    this.app = app;
    this.logs = [];
    this.stepResults = [];
  }

  log(stepNumber, title, details) {
    const entry = {
      step: stepNumber,
      title,
      details,
      timestamp: new Date().toISOString()
    };
    this.logs.push(entry);
    return entry;
  }

  /**
   * Runs the complete 10-step hackathon demonstration story.
   * @param {Object} [options]
   * @param {(step: any) => void} [options.onStep]
   * @param {string} [options.eventId] - defaults to the app's default event (demo event live, seed event offline)
   */
  async runFullScenario({ onStep = null, eventId = null } = {}) {
    this.logs = [];
    this.stepResults = [];
    const emit = (n, title, details) => {
      const entry = this.log(n, title, details);
      if (onStep) onStep(entry);
      return entry;
    };

    await this.app.initialize();
    const event = await this.app.eventCtrl.resolveEvent(eventId || this.app.defaultEventId);
    const registrations = await this.app.attendeeRepo.listAll(event.id);
    // The cast (with vectors, for the index breakdown), in seed order; anyone else registered is the crowd.
    const cast = [];
    for (const a of registrations.filter((r) => r.id.startsWith("att_"))) {
      cast.push((await this.app.attendeeRepo.findById(a.id, { includeVectors: true })) || a);
    }
    const initiator = cast.find((a) => a.id === CAST.initiator) || cast[0] || registrations[0];
    const partnerId = cast.some((a) => a.id === CAST.partner) ? CAST.partner : (cast.find((a) => a.id !== initiator?.id) || registrations[1])?.id;
    if (!initiator || !partnerId) {
      throw new Error(`Event ${event.id} has fewer than two attendees; run \`npm run seed:demo\` first`);
    }

    // Step 1: Attendee Check-In
    emit(1, "Attendee Check-In & Registration", {
      eventId: event.id,
      eventName: event.name,
      attendeeCount: registrations.length,
      castCount: cast.length,
      attendees: cast.map((a) => a.toJSON())
    });

    // Step 2: Elasticsearch Vector & Text Indexing Breakdown
    const esStatus = await this.app.esClient.getStatus();
    const dims = cast.find((a) => a.embedding?.length)?.embedding.length || 0;
    emit(2, "Elasticsearch Vector & Inverted Index Breakdown", {
      indexName: this.app.mode === "live" ? this.app.config?.indices?.registrations || "cinder-registrations" : esStatus.indexName || "cinder_attendees",
      clusterStatus: esStatus.status,
      mode: esStatus.mode,
      dataMode: this.app.mode,
      totalDocsIndexed: registrations.length,
      mappings: {
        embedding: { type: "dense_vector", dims, similarity: "cosine", index: true },
        textFields: ["interests", "expertise", "projects", "challenges", "looking_for"],
        keywordFields: ["company", "topics"]
      },
      indexedProfiles: cast.map((a) => ({
        id: a.id,
        name: a.name,
        title: a.title,
        company: a.company,
        interests: a.interests,
        tokenCount: a.toSearchableText().split(/\s+/).length,
        vectorDims: a.embedding?.length || 0,
        vectorSample: (a.embedding || []).slice(0, 4).map((v) => Number(v.toFixed(3)))
      }))
    });

    // Step 3: Elasticsearch Identifies Relevant Attendee Connections
    const discoveryFeed = await this.app.discoveryCtrl.getDiscoveryFeed(initiator.id, 5, { eventId: event.id });
    const top = discoveryFeed.candidates[0];
    const partnerRank = discoveryFeed.candidates.findIndex((c) => c.profile.id === partnerId) + 1;
    emit(3, "Elasticsearch Hybrid Search & Relevance Explanation", {
      searchedFor: initiator.name,
      candidatesCount: discoveryFeed.candidates.length,
      topCandidate: top?.profile.name,
      partnerRank: partnerRank || null,
      relevanceExplanation: top?.explanation,
      esQuerySpec: discoveryFeed.esQuerySpec,
      tookMs: discoveryFeed.tookMs
    });

    // Step 4: Attendees Discover One Another Through Swipe Interface
    await this.app.discoveryCtrl.recordSwipe({ fromAttendeeId: initiator.id, toAttendeeId: partnerId, action: "like", eventId: event.id });
    const reciprocal = await this.app.discoveryCtrl.recordSwipe({ fromAttendeeId: partnerId, toAttendeeId: initiator.id, action: "like", eventId: event.id });
    const partner = await this.app.attendeeRepo.findById(partnerId);
    emit(4, "Mutual Match Established via Swipe Interface", {
      initiator: initiator.name,
      partner: partner?.name,
      isMutual: reciprocal.isMutual,
      matchId: reciprocal.match?.id
    });

    // Step 5: Mutual Matches Inform Composition of a Pod (theme derived from the members' shared interests)
    const pod = await this.app.podCtrl.composePod({ seedAttendeeIds: [initiator.id, partnerId], targetSize: 5, eventId: event.id });
    emit(5, `${pod.name} Formed via Elasticsearch Hybrid Ranking`, {
      podId: pod.id,
      podName: pod.name,
      memberCount: pod.memberIds.length,
      memberIds: pod.memberIds,
      topic: pod.topic,
      candidateRankings: pod.compositionMeta?.candidateRankings || []
    });

    // Step 6: Dedicated Pod Communication Space Created
    emit(6, "Dedicated Pod Communication Space Created", {
      podId: pod.id,
      podName: pod.name,
      channel: `#${slug(pod.name)}`,
      status: "ACTIVE",
      facilitatorName: pod.facilitatorName,
      capabilities: ["Persistent Group Chat", "AI Facilitator Onboarding", "Real-Time SSE Event Stream", "Pinned Meetup Noticeboard"]
    });

    // Step 7: AI Facilitator Welcomes the Group & Introductions Begin
    const welcomeMsg = await this.app.facilitatorCtrl.welcomePod(pod.id);
    const msgA = await this.app.commCtrl.sendMessage({
      podId: pod.id,
      senderId: initiator.id,
      content: "Hey everyone! Alex here. We're building autonomous k8s cluster healing controllers and hitting tricky eBPF kernel state correlation."
    });
    const msgB = await this.app.commCtrl.sendMessage({
      podId: pod.id,
      senderId: partnerId,
      content: "Hey Alex! That's exactly what my team is tackling at DataFlow — zero-overhead eBPF probes for continuous tracing."
    });
    emit(7, "AI Facilitator Welcomes Group & Introductions Begin", {
      facilitatorName: welcomeMsg?.senderName,
      welcomeMessage: welcomeMsg?.content,
      pinned: welcomeMsg?.pinned,
      dialogue: [
        { from: msgA.senderName, text: msgA.content },
        { from: msgB.senderName, text: msgB.content }
      ]
    });

    // Step 8: A third member proposes lunch at the next social slot; the app resolves where and when.
    const slot = await this.app.facilitatorCtrl.nextSocialSlot(event.id);
    const proposerId = pod.memberIds.includes(CAST.proposer)
      ? CAST.proposer
      : pod.memberIds.find((id) => id !== initiator.id && id !== partnerId) || initiator.id;
    const proposal = await this.app.commCtrl.sendMessage({
      podId: pod.id,
      senderId: proposerId,
      content: `Should we grab lunch together${slot ? ` at ${slot.time}` : ""} to compare architectures?`
    });
    const updatedPod = await this.app.podCtrl.getPod(pod.id);
    emit(8, "Pod Members Coordinate Physical Lunch Meetup", {
      sender: proposal.senderName,
      proposalMessage: proposal.content,
      proposedLocation: updatedPod?.pinnedMeetup?.location || null,
      proposedTime: updatedPod?.pinnedMeetup?.time || slot?.time || null,
      slot: slot?.title || null
    });

    // Step 9: Facilitator Confirms Location and Pins Meetup
    const podMessages = await this.app.commCtrl.getMessages(pod.id);
    const facConfirmMsg = podMessages.find((m) => m.senderType === "facilitator" && m.metadata?.meetupConfirmed);
    emit(9, "AI Facilitator Confirms & Pins Physical Meetup", {
      pinnedLocation: updatedPod?.pinnedMeetup?.location,
      meetupTime: updatedPod?.pinnedMeetup?.time,
      startsAt: updatedPod?.pinnedMeetup?.startsAt || null,
      status: updatedPod?.pinnedMeetup?.confirmed ? "CONFIRMED" : "PENDING",
      facilitatorConfirmation: facConfirmMsg?.content || `Meetup confirmed at ${updatedPod?.pinnedMeetup?.location} at ${updatedPod?.pinnedMeetup?.time}.`
    });

    // Step 10: Facilitator Introduces Agenda Alert (the upcoming talk most relevant to the Pod) & Discussion Prompt
    const agendaMsg = await this.app.facilitatorCtrl.triggerAgendaAlert(pod.id);
    const promptMsg = await this.app.facilitatorCtrl.triggerDiscussionPrompt(pod.id);
    emit(10, "Agenda Guidance & Deep-Dive Discussion Prompt", {
      agendaAnnouncement: agendaMsg?.content,
      session: agendaMsg?.metadata?.session?.title || null,
      discussionPrompt: promptMsg?.content
    });

    return {
      success: true,
      eventId: event.id,
      mode: this.app.mode,
      podId: pod.id,
      steps: this.logs
    };
  }
}

function slug(text) {
  return String(text || "pod").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
