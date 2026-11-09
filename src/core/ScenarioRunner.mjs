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

    // Step 1 & 2: Check-In 5 Attendees & Elasticsearch Indexing
    await this.app.initialize();
    const attendees = await this.app.attendeeRepo.listAll();
    const step1Result = this.log(
      1,
      "Attendee Check-In & Elasticsearch Indexing",
      {
        attendeeCount: attendees.length,
        attendees: attendees.map((a) => a.toJSON())
      }
    );
    if (onStep) onStep(step1Result);

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
        esQuerySpec: discoveryFeed.esQuerySpec
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
      "Mutual Match Established",
      {
        initiator: "Alex Chen",
        partner: "Maya Lin",
        isMutual: mayaMatch.isMutual,
        matchId: mayaMatch.match?.id
      }
    );
    if (onStep) onStep(step4Result);

    // Step 5: Mutual Matches Inform Composition of a Pod (Pod 07)
    const pod = await this.app.podCtrl.composePod({
      seedAttendeeIds: ["att_alex_chen", "att_maya_lin", "att_jordan_taylor", "att_elena_rostova", "att_marcus_vance"],
      theme: "Autonomous Cloud & Systems",
      targetSize: 5
    });

    const step5Result = this.log(
      5,
      "Pod 07 Formed & Communication Space Created",
      {
        podId: pod.id,
        podName: pod.name,
        memberCount: pod.memberIds.length,
        topic: pod.topic
      }
    );
    if (onStep) onStep(step5Result);

    // Step 6: AI Facilitator Welcomes the Group & Explains Shared Interests
    const welcomeMsg = await this.app.facilitatorCtrl.welcomePod(pod.id);
    const step6Result = this.log(
      6,
      "AI Facilitator Assigned & Group Onboarding",
      {
        sender: welcomeMsg?.senderName,
        welcomeMessage: welcomeMsg?.content,
        pinned: welcomeMsg?.pinned
      }
    );
    if (onStep) onStep(step6Result);

    // Step 7: Members Introduce Themselves & Discuss In Pod Chat
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
      "Active Pod Collaboration & Introductions",
      {
        dialogue: [
          { from: msgAlex.senderName, text: msgAlex.content },
          { from: msgMaya.senderName, text: msgMaya.content }
        ]
      }
    );
    if (onStep) onStep(step7Result);

    // Step 8: Members Coordinate a Physical Lunch Meetup
    const msgMarcus = await this.app.commCtrl.sendMessage({
      podId: pod.id,
      senderId: "att_marcus_vance",
      content: "Should we grab lunch together at the Main Hall East Patio at 12:15 to compare architectures?"
    });

    // Step 9: Facilitator Confirms Location and Pins Meetup
    const updatedPod = await this.app.podCtrl.getPod(pod.id);
    const step9Result = this.log(
      9,
      "Facilitator Confirms & Pins Physical Meetup",
      {
        proposedBy: msgMarcus.senderName,
        pinnedLocation: updatedPod?.pinnedMeetup?.location,
        meetupTime: updatedPod?.pinnedMeetup?.time,
        status: updatedPod?.pinnedMeetup?.confirmed ? "CONFIRMED" : "PENDING"
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
