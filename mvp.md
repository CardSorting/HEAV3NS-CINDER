<!-- [LAYER: UI] -->
# CINDER
## The Social Infrastructure for Conferences

**DISCOVER YOUR PEOPLE. FIND YOUR POD. MAKE SOMETHING HAPPEN.**

### 1. The Commission

Build CINDER: an intelligent, agent-facilitated social coordination platform that transforms how people discover, meet, communicate, and participate in conferences.

Conferences bring together hundreds or thousands of people with overlapping interests, complementary expertise, shared challenges, and potentially extraordinary opportunities to collaborate.

Yet most conference networking is left to chance.

Attendees navigate schedules independently, struggle to identify relevant people, exchange contact details without meaningful follow-through, and frequently leave without meeting the people they came to find.

CINDER changes this.

Rather than simply giving attendees a schedule and expecting them to figure everything out, CINDER actively facilitates the social experience.

It discovers meaningful connections, organizes attendees into curated groups called **Pods**, provisions dedicated communication spaces, coordinates physical meetups, and deploys an AI facilitator that helps participants navigate the conference together.

**The objective is to make meaningful human connection an intentional, coordinated part of the conference experience.**

---

### 2. Product Philosophy

CINDER combines three complementary experiences:

1. **Discovery:** Find people worth meeting.
2. **Coordination:** Give those people a shared space to communicate and organize.
3. **Facilitation:** Actively help those people participate in the conference experience.

The product should feel approachable, immediate, social, and alive.

The interaction model borrows from familiar social applications, while its underlying infrastructure operates more like a distributed community platform with an intelligent event coordinator.

CINDER should not require attendees to become experts in another conference application.

It should help them participate with minimal friction.

---

### 3. The Attendee Experience

#### A. Check In

Attendees enter CINDER through a simple conference check-in experience.

Their profiles capture:

- Name and professional background.
- Technical interests and areas of expertise.
- Current projects and technologies.
- Problems they are trying to solve.
- Topics and talks they are interested in.
- People or types of collaborators they would like to meet.

The onboarding experience should be lightweight and encourage meaningful participation rather than exhaustive profile completion.

#### B. Discover

Introduce a swipe-based attendee discovery interface.

Attendees receive suggested profiles based on relevant interests, expertise, projects, and potential collaboration opportunities.

Each recommendation should explain why the connection is relevant.

Examples:

- Shared interest in Kubernetes automation.
- Complementary experience in infrastructure and observability.
- Both researching autonomous agents.
- Working on related technical challenges.

Attendees can express interest, dismiss recommendations, and establish mutual connections.

The goal is to make discovering relevant people intuitive and enjoyable.

#### C. Match

When attendees express mutual interest, CINDER establishes a connection.

Matches should be able to communicate, coordinate, and potentially participate in the same Pod.

Matching should also inform the broader group-composition process.

Importantly, the product should not reduce every useful connection to a binary swipe. Attendees may have valuable complementary relationships even when their interests are not identical.

---

### 4. Pods: The Social Coordination Layer

Pods are the central organizing concept of CINDER.

A Pod is a curated group of conference attendees brought together around relevant interests, complementary expertise, shared projects, or potential collaboration opportunities.

Each Pod receives its own persistent digital communication space.

Think Discord or Slack channels, purpose-built for the conference experience.

#### Pod capabilities

Every Pod should have:

- A dedicated group chat.
- Member profiles and introductions.
- A shared conversation history.
- Meetup location coordination.
- Scheduled activities and reminders.
- Pinned announcements and agenda information.
- Conversation prompts and participation instructions.
- An AI facilitator assigned to the group.

Pods should allow members to communicate asynchronously, coordinate physical meetups, and stay connected throughout the event.

They are not simply temporary matchmaking results. They are small, purpose-driven communities that help attendees navigate the conference together.

#### Pod composition

The system should support automatic group formation.

For the initial implementation, aim for approximately 4–6 attendees per Pod.

Composition should consider:

- Semantic similarity between interests.
- Complementary skills and expertise.
- Shared technical challenges.
- Existing mutual matches.
- Diversity of perspectives.
- Previous group assignments and interactions.

The system should avoid simply placing identical profiles together.

The interesting connections often emerge between people who approach the same problem from different disciplines.

---

### 5. The AI Facilitator

Every Pod receives an AI facilitator.

This is a central product capability, not an optional chatbot.

The facilitator is responsible for helping the group participate in the conference experience.

It should understand:

- The conference agenda.
- The current time and upcoming activities.
- Pod membership and relevant attendee context.
- Conference announcements.
- Venue and room information.
- Group conversations and agreed meetup plans.

#### Facilitator responsibilities

**Onboarding and introductions**

- Welcome new Pod members.
- Introduce the purpose of the group.
- Explain why attendees were brought together.
- Suggest relevant conversation starters.

**Agenda coordination**

- Announce upcoming sessions and activities.
- Notify attendees when it is time to move.
- Provide instructions for participating in conference activities.
- Surface relevant talks based on group interests.

**Meetup coordination**

- Help attendees agree on physical meeting locations.
- Share confirmed locations with Pod members.
- Remind attendees about upcoming meetups.
- Coordinate group participation around lunch and networking periods.

**Engagement**

- Introduce discussion prompts.
- Encourage members to share relevant experience.
- Suggest topics based on the group's collective interests.
- Help conversations move beyond superficial introductions.

**Announcements**

- Distribute relevant conference-wide updates.
- Communicate schedule changes.
- Relay room and venue instructions.
- Deliver time-sensitive information to affected Pods.

#### Facilitator behavior

The agent should be context-aware and proactive.

It should not wait for attendees to ask what happens next.

For example:

> Welcome to Pod 07! You have been grouped around Kubernetes automation, observability, and autonomous infrastructure.
>
> Your lunch networking session begins at 12:15 PM.
>
> Before meeting, take a moment to introduce the problem you're currently working on. You might discover someone who has already encountered it.

Later:

> Your group has agreed to meet outside the main hall. Your meetup begins in five minutes.
>
> Today's discussion prompt: What would an autonomous infrastructure platform need to understand before taking action?

The facilitator should distinguish confirmed information from suggestions, avoid inventing venue instructions, and respect attendee preferences and communication boundaries.

---

### 6. Elasticsearch: The Intelligence Layer

Elasticsearch must be a fundamental component of CINDER, not merely a storage backend added to satisfy a sponsor requirement.

It powers attendee discovery, semantic relevance, and intelligent group formation.

#### Required capabilities

**Attendee indexing**

Index attendee profiles, interests, expertise, projects, and collaboration objectives.

**Semantic discovery**

Use vector search to identify relevant people beyond exact keyword matches.

**Hybrid retrieval**

Combine keyword relevance with semantic similarity to improve discovery quality.

**Complementary expertise**

Retrieve candidates with related or complementary technical experience.

**Group composition**

Use Elasticsearch to retrieve and rank candidate attendees for Pod formation.

**Context retrieval**

Make relevant attendee, talk, and conference information available to the facilitator.

#### Proposed data domains

- Attendee profiles.
- Interests and expertise.
- Projects and technical challenges.
- Conference sessions and talk descriptions.
- Matches and interaction history.
- Pod membership and shared context.
- Conference announcements and reference information.

Elasticsearch should provide the retrieval and relevance foundation.

Group assignment, membership constraints, and coordination logic can live in the application layer.

The objective is to demonstrate meaningful keyword, vector, and hybrid search in an application where search directly creates user value.

---

### 7. System Architecture

The proposed system consists of the following logical components:

**Attendee Application**
- Registration and check-in.
- Profile creation.
- Swipe-based discovery.
- Mutual matching.
- Pod membership.
- Realtime messaging.
- Event and meetup notifications.

**Elasticsearch**
- Attendee indexing.
- Semantic and keyword retrieval.
- Vector similarity.
- Hybrid search.
- Relevant context retrieval.

**Matching and Pod Orchestration**
- Candidate ranking.
- Compatibility scoring.
- Pod composition.
- Group membership.
- Assignment history.

**Realtime Communication**
- Persistent Pod channels.
- Group messaging.
- System messages.
- Meetup coordination.
- Pinned information.

**AI Facilitator**
- Conference agenda awareness.
- Pod-specific context.
- Scheduled announcements.
- Conversation facilitation.
- Meetup coordination.
- Event instructions.

**Conference Information**
- Agenda and schedules.
- Session descriptions.
- Venue and room information.
- Announcements.
- Event timing.

The architecture should favor clear boundaries between retrieval, orchestration, communication, and agent behavior.

The facilitator should operate with access to relevant information and explicit permissions, rather than unrestricted authority over attendee communications or event operations.

---

### 8. Hackathon MVP

The hackathon objective is to deliver one complete, demonstrable attendee experience.

Do not attempt to build an entire conference-management platform.

Prioritize the following implementation milestones.

**MILESTONE 1 — CHECK IN**

- Attendee registration.
- Lightweight profile creation.
- Interest and expertise capture.
- Elasticsearch indexing.

**MILESTONE 2 — DISCOVER**

- Swipeable attendee cards.
- Search and semantic recommendations.
- Explanation of match relevance.
- Mutual matching.

**MILESTONE 3 — FORM PODS**

- Automatic Pod composition.
- Group membership assignment.
- Dedicated Pod creation.
- Persistent group context.

**MILESTONE 4 — COMMUNICATE**

- Realtime Pod messaging.
- Member introductions.
- Meetup coordination.
- Pinned agenda and location information.

**MILESTONE 5 — FACILITATE**

- AI facilitator assigned to each Pod.
- Conference agenda integration.
- Automated activity announcements.
- Conversation prompts.
- Meetup reminders.
- Context-aware group instructions.

A single functioning conference agenda and a small set of realistic event announcements are sufficient to demonstrate the facilitator's capabilities.

---

### 9. Demonstration Scenario

The final demonstration should tell one continuous story.

1. Five attendees check into CINDER.
2. They create profiles describing their interests, expertise, and current projects.
3. Elasticsearch identifies relevant attendee connections.
4. Attendees discover one another through the swipe interface.
5. Mutual matches inform the composition of a Pod.
6. CINDER creates a dedicated communication channel.
7. The AI facilitator welcomes the group and explains their shared interests.
8. Members coordinate a physical lunch meetup through the channel.
9. The facilitator confirms the location and announces the upcoming activity.
10. The facilitator introduces a discussion prompt and guides the group through the scheduled experience.

The demonstration should make the entire concept understandable without requiring judges to imagine missing functionality.

The central moment is when attendees stop interacting with an application and start interacting with one another.

---

### 10. Scope and Engineering Priorities

The project should optimize for a complete experience rather than an enormous feature checklist.

Priorities:

1. A working end-to-end attendee journey.
2. Meaningful Elasticsearch integration.
3. Useful semantic discovery and matching.
4. Functional Pod creation and communication.
5. An agent that genuinely understands the conference agenda and Pod context.
6. Clear, intuitive user experience.

Do not spend the hackathon building:

- A full Discord replacement.
- A generalized autonomous-agent framework.
- An elaborate conference administration suite.
- An unnecessarily complicated multi-agent architecture.
- A comprehensive social networking platform.

A single capable facilitator with well-defined tools and contextual access is sufficient for the initial product.

Use existing infrastructure wherever it accelerates delivery without compromising the experience.

---

### 11. Definition of Success

CINDER succeeds when an attendee can:

- Check into a conference.
- Discover people worth meeting.
- Establish mutual connections.
- Join an intelligently composed Pod.
- Communicate with Pod members.
- Coordinate a physical meetup.
- Receive relevant agenda instructions and announcements.
- Participate in the conference with assistance from an AI facilitator.

The judges should be able to experience this workflow themselves.

The application must demonstrate that Elasticsearch is central to the discovery and matching experience, not incidental infrastructure.

---

### 12. Final Direction

CINDER is built around a simple observation:

**A conference is not its talks, its venue, or its schedule. A conference is the people who come together.**

The infrastructure exists to make those interactions possible.

CINDER turns passive attendance into active participation.

It transforms isolated attendees into connected groups, gives those groups the tools to coordinate, and introduces an intelligent facilitator that helps them make the most of their shared time.

Discover your people.

Find your Pod.

Make something happen.

**CINDER — Conferences, together.**