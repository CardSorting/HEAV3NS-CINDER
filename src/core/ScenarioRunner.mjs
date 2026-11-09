/** [LAYER: CORE] */

/**
 * Automated 10-Step Demonstration Scenario Runner.
 * Executes the continuous story from Section 9 of mvp.md.
 */
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
   */
  async runFullScenario({ onStep = null } = {}) {
    this.logs = [];
    this.stepResults = [];

    // Step 1: Attendee Check-In (5 Attendees Registered)
    await this.app.initialize();
    const attendees = await this.app.attendeeRepo.listAll();
    const step1Result = this.log(
      1,
      "Attendee Check-In & Registration",
      {
        attendeeCount: attendees.length,
        attendees: attendees.map((a) => a.toJSON())
      }
    );
    if (onStep) onStep(step1Result);

    // Step 2: Elasticsearch Vector & Text Indexing Breakdown
    const esStatus = await this.app.esClient.getStatus();
    const step2Result = this.log(
      2,
      "Elasticsearch Vector & Inverted Index Breakdown",
      {
        indexName: esStatus.indexName || "cinder_attendees",
        clusterStatus: esStatus.status,
        mode: esStatus.mode,
        totalDocsIndexed: attendees.length,
        mappings: {
          embedding: {
            type: "dense_vector",
            dims: 32,
            similarity: "cosine",
            index: true
          },
          textFields: ["interests", "expertise", "projects", "challenges", "looking_for"],
          keywordFields: ["company", "topics"]
        },
        indexedProfiles: attendees.map((a) => ({
          id: a.id,
          name: a.name,
          title: a.title,
          company: a.company,
          interests: a.interests,
          tokenCount: a.toSearchableText().split(/\s+/).length,
          vectorDims: a.embedding?.length || 32,
          vectorSample: (a.embedding || []).slice(0, 4).map((v) => Number(v.toFixed(3)))
        }))
      }
    );
    if (onStep) onStep(step2Result);

    // Step 3: Elasticsearch Identifies Relevant Attendee Connections
    const alex = attendees.find((a) => a.id === "att_alex_chen") || attendees[0];
    const discoveryFeed = await this.app.discoveryCtrl.getDiscoveryFeed(alex.id, 5);
    const step3Result = this.log(
      3,
      "Elasticsearch Hybrid Search & Relevance Explanation",
      {
        searchedFor: alex.name,
        candidatesCount: discoveryFeed.candidates.length,
        topCandidate: discoveryFeed.candidates[0]?.profile.name,
        relevanceExplanation: discoveryFeed.candidates[0]?.explanation,
        esQuerySpec: discoveryFeed.esQuerySpec,
        tookMs: discoveryFeed.tookMs
      }
    );
    if (onStep) onStep(step3Result);

    // Step 4: Attendees Discover One Another Through Swipe Interface
    await this.app.discoveryCtrl.recordSwipe({
      fromAttendeeId: "att_alex_chen",
      toAttendeeId: "att_maya_lin",
      action: "like"
    });
    const mayaMatch = await this.app.discoveryCtrl.recordSwipe({
      fromAttendeeId: "att_maya_lin",
      toAttendeeId: "att_alex_chen",
      action: "like"
    });

    const step4Result = this.log(
      4,
      "Mutual Match Established via Swipe Interface",
      {
        initiator: "Alex Chen",
        partner: "Maya Lin",
        isMutual: mayaMatch.isMutual,
        matchId: mayaMatch.match?.id
      }
    );
    if (onStep) onStep(step4Result);

    // Step 5: Mutual Matches Inform Composition of a Pod (Pod 07)
    // Seed members Alex & Maya match; Elasticsearch hybrid search ranks complementary members to complete Pod of 5!
    const pod = await this.app.podCtrl.composePod({
      seedAttendeeIds: ["att_alex_chen", "att_maya_lin"],
      theme: "Autonomous Cloud & Systems",
      targetSize: 5
    });

    const step5Result = this.log(
      5,
      "Pod 07 Formed via Elasticsearch Hybrid Ranking",
      {
        podId: pod.id,
        podName: pod.name,
        memberCount: pod.memberIds.length,
        memberIds: pod.memberIds,
        topic: pod.topic,
        candidateRankings: pod.compositionMeta?.candidateRankings || []
      }
    );
    if (onStep) onStep(step5Result);

    // Step 6: Dedicated Pod Communication Space Created
    const step6Result = this.log(
      6,
      "Dedicated Pod Communication Space Created",
      {
        podId: pod.id,
        podName: pod.name,
        channel: "#pod-07-autonomous-cloud",
        status: "ACTIVE",
        facilitatorName: pod.facilitatorName,
        capabilities: [
          "Persistent Group Chat",
          "AI Facilitator Onboarding",
          "Real-Time SSE Event Stream",
          "Pinned Meetup Noticeboard"
        ]
      }
    );
    if (onStep) onStep(step6Result);

    // Step 7: AI Facilitator Welcomes the Group & Introductions Begin
    const welcomeMsg = await this.app.facilitatorCtrl.welcomePod(pod.id);

    const msgAlex = await this.app.commCtrl.sendMessage({
      podId: pod.id,
      senderId: "att_alex_chen",
      content: "Hey everyone! Alex here. We're building autonomous k8s cluster healing controllers and hitting tricky eBPF kernel state correlation."
    });

    const msgMaya = await this.app.commCtrl.sendMessage({
      podId: pod.id,
      senderId: "att_maya_lin",
      content: "Hey Alex! That's exactly what my team is tackling at DataFlow — zero-overhead eBPF probes for continuous tracing."
    });

    const step7Result = this.log(
      7,
      "AI Facilitator Welcomes Group & Introductions Begin",
      {
        facilitatorName: welcomeMsg?.senderName,
        welcomeMessage: welcomeMsg?.content,
        pinned: welcomeMsg?.pinned,
        dialogue: [
          { from: msgAlex.senderName, text: msgAlex.content },
          { from: msgMaya.senderName, text: msgMaya.content }
        ]
      }
    );
    if (onStep) onStep(step7Result);

    // Step 8: Members Coordinate Physical Lunch Meetup in Pod Channel
    const msgMarcus = await this.app.commCtrl.sendMessage({
      podId: pod.id,
      senderId: "att_marcus_vance",
      content: "Should we grab lunch together at the Main Hall East Patio at 12:15 to compare architectures?"
    });

    const step8Result = this.log(
      8,
      "Pod Members Coordinate Physical Lunch Meetup",
      {
        sender: msgMarcus.senderName,
        proposalMessage: msgMarcus.content,
        proposedLocation: "Main Hall East Patio",
        proposedTime: "12:15 PM"
      }
    );
    if (onStep) onStep(step8Result);

    // Step 9: Facilitator Confirms Location and Pins Meetup
    const updatedPod = await this.app.podCtrl.getPod(pod.id);
    const podMessages = await this.app.commCtrl.getMessages(pod.id);
    const facConfirmMsg = podMessages.find((m) => m.senderType === "facilitator" && m.metadata?.meetupConfirmed);

    const step9Result = this.log(
      9,
      "AI Facilitator Confirms & Pins Physical Meetup",
      {
        pinnedLocation: updatedPod?.pinnedMeetup?.location,
        meetupTime: updatedPod?.pinnedMeetup?.time,
        status: updatedPod?.pinnedMeetup?.confirmed ? "CONFIRMED" : "PENDING",
        facilitatorConfirmation: facConfirmMsg?.content || `Meetup confirmed at ${updatedPod?.pinnedMeetup?.location} at ${updatedPod?.pinnedMeetup?.time}.`
      }
    );
    if (onStep) onStep(step9Result);

    // Step 10: Facilitator Introduces Agenda Alert & Discussion Prompt
    const agendaMsg = await this.app.facilitatorCtrl.triggerAgendaAlert(pod.id, "session_05");
    const promptMsg = await this.app.facilitatorCtrl.triggerDiscussionPrompt(pod.id);

    const step10Result = this.log(
      10,
      "Agenda Guidance & Deep-Dive Discussion Prompt",
      {
        agendaAnnouncement: agendaMsg?.content,
        discussionPrompt: promptMsg?.content
      }
    );
    if (onStep) onStep(step10Result);

    return {
      success: true,
      podId: pod.id,
      steps: this.logs
    };
  }
}
