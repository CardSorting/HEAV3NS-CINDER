<!-- [LAYER: UI] -->
MAJO IS COMMISSIONING THE NEXT PASS. 😤☝️

This is no longer a prototype-polishing exercise. We're moving CINDER from a working backend with an emerging interface into a complete, coherent, production-quality application.

The instruction is to investigate first, understand what already exists, establish the intended user journey, and then execute the improvements. Not spend the entire task writing another audit document.

I've made one thing particularly explicit: the existing backend works. Preserve it. Build the experience around it.

# COMMISSION: CINDER — WORLD-CLASS PRODUCT EXPERIENCE

## UX REFINEMENT · USER JOURNEY ENGINEERING · VISUAL DESIGN · COMPLETE APPLICATION EXECUTION

**MISSION:** Transform the existing CINDER implementation into a complete, cohesive, highly polished conference networking and social coordination application.

**EXECUTION MODE:** Autonomous investigation, design, implementation, verification, and refinement.

**PRIMARY DIRECTIVE:** The backend works. The mission is to elevate the product experience, frontend architecture, interaction design, visual identity, usability, and overall application completeness without unnecessarily rewriting working infrastructure.

---

# 01 — THE PRODUCT VISION

CINDER is an intelligent social infrastructure platform for conferences.

It combines:

- Tinder-inspired attendee discovery.
- Intelligent attendee matching.
- Automatically composed social Pods.
- Discord/Slack-inspired persistent communication rooms.
- AI-powered Pod facilitators.
- Conference agenda awareness.
- Physical meetup coordination.
- Contextual instructions, reminders, and announcements.

CINDER is not simply a conference directory, event application, or attendee chat platform.

It actively helps attendees discover relevant people, establish meaningful connections, coordinate physical interactions, and participate in conference activities.

The experience should feel like a cohesive product rather than several unrelated features assembled into one interface.

**Product promise: Discover your people. Find your Pod. Make something happen.**

Preserve this concept throughout every design and implementation decision.

# 02 — INVESTIGATE BEFORE IMPLEMENTING

Begin by inspecting the entire existing project.

Do not assume the current frontend architecture, routing, data models, component structure, or backend capabilities.

Investigate:

- Complete repository structure.
- Existing frontend framework and conventions.
- Existing routing and navigation.
- Backend API contracts and available endpoints.
- Authentication and attendee identity.
- Existing data models and relationships.
- Existing realtime communication capabilities.
- Elasticsearch integration.
- Attendee discovery and matching.
- Pod creation and membership.
- Agent facilitator implementation.
- Agenda and event information.
- Existing design system and components.
- Existing assets, images, and visual resources.
- Current responsive behavior.
- Loading, empty, error, and success states.

Trace actual user journeys through the implementation.

Identify which features work, which are partially implemented, which are disconnected, and which are missing from the actual user experience.

Inspect the running application whenever possible.

Do not mistake a functioning API for a functioning product.

## Backend preservation

The existing backend is working infrastructure.

Treat it as the established foundation.

- Do not rewrite the backend to accommodate superficial frontend preferences.
- Do not replace working API contracts without a demonstrated technical necessity.
- Do not discard existing functionality.
- Do not introduce duplicate persistence or competing sources of truth.
- Do not replace real functionality with mock data.
- Reuse existing endpoints, models, and capabilities.
- Implement frontend adapters where necessary.
- If an API capability genuinely does not exist, document the gap and implement the smallest justified extension.

Preserve existing working behavior while improving the application around it.

# 03 — GENERATE THE USER JOURNEY

Before major interface changes, use the available AI image-generation skill and visual-design capabilities to produce a complete visual user journey.

This is a required design deliverable.

Do not begin by randomly redesigning individual pages.

First understand the product as a continuous experience.

Generate a visual journey covering:

### Journey A — Arrival and onboarding

1. Attendee opens CINDER.
2. Understands the product immediately.
3. Checks into the conference.
4. Creates or completes their attendee profile.
5. Selects interests, expertise, projects, and networking objectives.
6. Receives an explanation of how matching and Pods work.

### Journey B — Discovery and matching

1. Attendee enters the discovery experience.
2. Browses recommended attendee cards.
3. Understands why each recommendation is relevant.
4. Expresses interest or dismisses a recommendation.
5. Receives match confirmation.
6. Opens a connection and begins coordinating.

### Journey C — Pod formation

1. CINDER identifies relevant attendees.
2. The system composes a Pod.
3. Attendee receives their Pod assignment.
4. The Pod receives a dedicated communication room.
5. Members are introduced.
6. The facilitator explains why the group was composed.

### Journey D — Pod communication

1. Attendee opens their Pod.
2. Reads the conversation and pinned information.
3. Interacts with other members.
4. Coordinates a physical meetup location.
5. Confirms participation.
6. Receives updates from the facilitator.

### Journey E — Agent-facilitated participation

1. The facilitator welcomes the Pod.
2. Explains upcoming conference activities.
3. Introduces relevant discussion prompts.
4. Announces upcoming schedule transitions.
5. Helps members coordinate their next meetup.
6. Sends relevant reminders and conference announcements.
7. Helps attendees remain engaged throughout the event.

### Journey F — Continued connections

1. Attendee reviews connections.
2. Reconnects with previous matches.
3. Revisits Pod conversations.
4. Discovers additional relevant attendees.
5. Retains useful conference context.

The generated journey must be visually clear, structured, and actionable.

Use visual assets to communicate:

- User entry points.
- Screen transitions.
- Navigation relationships.
- User actions.
- System responses.
- Agent interactions.
- Important decision points.
- Completion states.

Produce a journey map and corresponding visual screen concepts.

The visual output should inform implementation, not replace it.

Do not use generated screenshots as substitutes for functional UI components.

# 04 — ESTABLISH THE APPLICATION INFORMATION ARCHITECTURE

Design a clear and familiar navigation system.

Avoid unnecessary navigation complexity.

Use recognizable interaction patterns from successful consumer and productivity applications without blindly copying their branding.

Relevant design references include:

- Tinder: approachable discovery, swipe interactions, mutual matches.
- Discord: persistent community spaces, channels, conversations, member context.
- Slack: workspace navigation, channel organization, message interactions, pinned information.
- Meetup: event participation and physical gathering coordination.
- Linear: clarity, hierarchy, restrained visual design, interaction consistency.
- Airbnb: onboarding clarity, discoverability, approachable presentation.
- Modern event applications: agendas, schedules, session information, notifications.

Translate their successful ergonomic patterns into a unified CINDER experience.

Establish a consistent navigation model with clear access to:

1. Home / Conference overview.
2. Discover.
3. Matches.
4. Pods / Rooms.
5. Conference agenda.
6. Notifications.
7. Attendee profile and settings.

Determine the most appropriate navigation hierarchy based on the actual application and target devices.

For mobile, prioritize familiar bottom navigation and thumb-accessible actions.

For desktop, use a more expansive workspace layout where appropriate.

Avoid making every feature compete for equal visual prominence.

# 05 — DESIGN THE CORE APPLICATION SURFACES

Every primary surface must be intentionally designed and fully integrated.

## A. Conference Home

The home screen should answer immediately:

- What is happening now?
- What should I do next?
- Who am I connected with?
- What Pod am I assigned to?
- What is my next scheduled activity?
- Has the facilitator sent anything important?

Include:

- Conference identity.
- Current agenda context.
- Upcoming events.
- Pod status.
- Relevant matches.
- Facilitator announcements.
- Clear next actions.

Make the home screen useful rather than decorative.

## B. Attendee Discovery

Create a polished discovery experience.

Attendee cards should communicate:

- Identity.
- Professional context.
- Technical interests.
- Current projects.
- Expertise.
- Relevant shared interests.
- Why the recommendation exists.

Provide familiar interactions:

- Like / connect.
- Dismiss.
- Open profile.
- View mutual connections.
- Review match explanations.

Interactions should feel responsive, natural, and intentional.

Avoid turning profiles into walls of metadata.

## C. Matches

Provide a recognizable matches experience.

Include:

- Mutual matches.
- Connection details.
- Relevant shared interests.
- Access to conversations.
- Clear next actions.

Make it easy to move from discovering someone to actually communicating with them.

## D. Pods and Communication Rooms

This is one of CINDER's defining product surfaces.

Design the experience using familiar Discord/Slack-inspired patterns.

Each Pod should have:

- Persistent room identity.
- Member list.
- Group conversation.
- Facilitator identity.
- Pinned agenda.
- Meetup location.
- Upcoming activities.
- Announcements.
- Shared context.

Distinguish ordinary attendee messages from facilitator messages and important system announcements.

Provide clear interaction patterns for:

- Sending messages.
- Reading message history.
- Viewing members.
- Coordinating locations.
- Confirming meetup plans.
- Accessing pinned information.
- Reviewing upcoming activities.

The room must feel like an active social space, not an administrative dashboard.

## E. AI Facilitator Interface

Give the facilitator a recognizable, consistent identity.

The agent should be integrated naturally into Pod conversations.

It must understand:

- Current conference context.
- Conference schedule.
- Pod membership.
- Relevant attendee interests.
- Previous group discussions.
- Confirmed meetup arrangements.
- Important announcements.

Its messages should be distinguishable from ordinary chat.

Support contextual actions where appropriate:

- View agenda.
- Confirm meetup.
- Open location.
- Review activity.
- View discussion prompt.

The facilitator should feel like an intelligent event coordinator rather than a generic chatbot.

Make proactive messages useful, timely, and relevant.

Do not generate fake announcements or pretend an action has been completed when it has not.

## F. Conference Agenda

Create an approachable schedule experience.

Attendees should be able to:

- View the conference agenda.
- Understand what is happening now.
- See upcoming activities.
- Identify relevant talks and sessions.
- Understand where activities occur.
- Receive timely instructions.

Integrate agenda information with the facilitator and Pod experience.

The schedule should be accessible without forcing users to leave their current workflow.

## G. Notifications

Create a coherent notification experience.

Distinguish:

- New matches.
- Pod assignments.
- Direct messages.
- Facilitator instructions.
- Meetup confirmations.
- Agenda reminders.
- Conference announcements.

Notifications should communicate what happened and what action, if any, is needed.

Avoid unnecessary notification noise.

## H. Attendee Profile

Create a useful profile experience.

Allow attendees to review and manage:

- Identity.
- Professional information.
- Interests.
- Expertise.
- Projects.
- Networking objectives.
- Availability and participation preferences.

Make profile editing straightforward and consistent with onboarding.

# 06 — WORLD-CLASS UX AND INTERACTION ERGONOMICS

Conduct a deep interaction-design refinement.

For every screen, evaluate:

- Information hierarchy.
- Cognitive load.
- Navigation clarity.
- Interaction discoverability.
- Visual consistency.
- Action prioritization.
- Touch ergonomics.
- Keyboard accessibility.
- Responsive behavior.
- Feedback and state transitions.

Use familiar interaction conventions wherever they improve usability.

Avoid inventing new interaction models without a compelling product reason.

Implement complete states for every important workflow:

- Initial.
- Loading.
- Empty.
- Success.
- Error.
- Disabled.
- Pending.
- Offline or reconnecting, where relevant.

Make important actions obvious.

Provide meaningful confirmation when an action changes membership, establishes a match, confirms a meetup, or changes participation.

Use optimistic interactions only where appropriate and provide rollback or recovery behavior when operations fail.

Pay particular attention to mobile usability.

Conference attendees will often be moving through venues, holding devices in one hand, and operating under time constraints.

Prioritize:

- Large, accessible touch targets.
- Clear labels.
- Minimal interaction steps.
- Readable typography.
- High-contrast states.
- Short, scannable information.
- Contextual actions.
- Predictable navigation.

# 07 — VISUAL IDENTITY AND AI-GENERATED ASSETS

Elevate CINDER into a visually distinctive, coherent product.

Use the available AI image-generation skill to create appropriate original visual assets.

Investigate the existing brand direction before introducing new visual language.

Generate assets that serve a clear purpose, such as:

- Conference atmosphere imagery.
- Abstract visual identity elements.
- Onboarding illustrations.
- Empty-state illustrations.
- Carefully selected decorative assets.
- Visual storytelling for the user journey.

Use image generation intentionally.

Do not fill the application with generic AI-generated people, stock-like imagery, or meaningless decorative graphics.

Generated assets must support the product's identity and user experience.

The actual application UI must remain accessible, responsive, and implemented using real components.

Establish a consistent visual system:

- Typography scale.
- Color palette.
- Spacing system.
- Component hierarchy.
- Surface treatments.
- Borders and radii.
- Iconography.
- Motion and transitions.
- Responsive breakpoints.

Avoid gratuitous gradients, excessive glassmorphism, decorative clutter, and inconsistent component styling.

The result should feel modern, confident, approachable, and professionally finished.

# 08 — ENGINEERING QUALITY

Bring the frontend implementation up to strong industry standards.

Inspect and improve:

- Component boundaries.
- Shared design primitives.
- Reusable interaction patterns.
- Routing architecture.
- State management.
- API integration.
- Data fetching.
- Error handling.
- Form validation.
- Accessibility.
- Responsive layout.
- Performance.
- Loading behavior.
- Realtime communication.
- Notification handling.

Avoid duplicated implementations of the same interaction.

Prefer clear, maintainable components over excessively abstract architecture.

Keep domain logic separate from presentation.

Use the existing stack and established project conventions unless a demonstrated limitation justifies changing them.

Do not introduce unnecessary dependencies or architectural rewrites.

Ensure the interface reflects actual backend state.

Every major button, navigation item, interaction, and form must have a real, coherent behavior.

Remove dead controls and placeholder interactions.

Do not leave visually convincing but nonfunctional features.

# 09 — ACCESSIBILITY AND RESPONSIVENESS

Target WCAG 2.2 AA practices wherever applicable.

Verify:

- Keyboard navigation.
- Visible focus states.
- Semantic structure.
- Screen-reader labels.
- Color contrast.
- Accessible form validation.
- Reduced-motion preferences.
- Touch target sizing.
- Responsive behavior.

Test realistic viewport sizes.

The application should work coherently across:

- Mobile phones.
- Tablets.
- Desktop browsers.
- Larger desktop displays.

Do not simply shrink the desktop interface to fit a phone.

Design intentional responsive layouts.

# 10 — AUDIT, IMPLEMENT, VERIFY, REFINE

Perform a thorough investigation and then execute the improvements.

Do not stop after producing a report.

Use the following workflow:

**PASS 1 — PRODUCT AUDIT**

Understand the current product, backend, frontend, existing journeys, and architectural constraints.

Deliver a prioritized list of genuine deficiencies.

**PASS 2 — USER JOURNEY AND VISUAL DESIGN**

Generate the complete user journey, identify navigation and interaction relationships, and establish the visual design direction.

**PASS 3 — IMPLEMENTATION**

Refine the application systematically.

Implement the navigation, primary surfaces, interaction states, responsive behavior, generated assets, and complete user workflows.

**PASS 4 — FUNCTIONAL AUDIT**

Exercise every primary journey.

Verify:

- Registration and check-in.
- Profile completion.
- Discovery.
- Matching.
- Pod membership.
- Room communication.
- Meetup coordination.
- Facilitator interactions.
- Agenda navigation.
- Notifications.

Verify real backend integration.

**PASS 5 — UX AND VISUAL AUDIT**

Inspect the running application.

Look for:

- Awkward navigation.
- Inconsistent spacing.
- Unclear actions.
- Poor information hierarchy.
- Incomplete screens.
- Dead ends.
- Redundant interactions.
- Unresponsive components.
- Missing states.
- Mobile usability problems.

Fix the issues found.

**PASS 6 — FINAL ENGINEERING VERIFICATION**

Run the available project checks:

- Type checking.
- Linting.
- Tests.
- Production build.
- Relevant integration checks.

Resolve genuine failures.

Repeat targeted audits when implementation changes introduce regressions.

Do not turn this into an endless audit loop. Completion is determined by the acceptance criteria below, not by the discovery of increasingly speculative optional improvements.

# 11 — PRIORITIZATION

Prioritize in this order:

1. Complete, coherent user journeys.
2. Navigation and information architecture.
3. Discovery and matching ergonomics.
4. Pod communication experience.
5. Agent facilitator experience.
6. Conference agenda integration.
7. Visual identity and generated assets.
8. Responsive design and accessibility.
9. Engineering quality and performance.
10. Final polish.

A complete and intuitive experience is more valuable than a large number of disconnected features.

Do not sacrifice functional completeness for visual spectacle.

Do not sacrifice usability for novelty.

Do not sacrifice the existing backend for frontend convenience.

# 12 — ACCEPTANCE CRITERIA

The commission is complete when:

- The application feels like one coherent product.
- A new attendee can understand and complete onboarding.
- Attendees can discover relevant people.
- Matching has a clear and understandable interaction model.
- Pods have a recognizable identity and persistent communication spaces.
- Members can coordinate actual physical meetups.
- The AI facilitator participates meaningfully in Pod communication.
- Conference agenda information is accessible and integrated.
- Announcements and reminders have clear context.
- Every primary navigation element works.
- Important workflows have complete loading, empty, success, and error states.
- Mobile and desktop experiences are intentionally designed.
- Generated visual assets have been integrated purposefully.
- Existing backend functionality remains intact.
- The application builds and passes the available checks.
- No critical user journey ends in a dead end or fake interaction.

# 13 — FINAL COMMISSION

Do not merely make CINDER prettier.

Make it understandable.

Make it approachable.

Make it intuitive.

Make it useful.

Make it feel alive.

Study how excellent consumer applications teach people to navigate complex functionality without making them think about the underlying complexity.

Study how communication platforms make group coordination effortless.

Study how exceptional event experiences guide people through time, place, and participation.

Translate those lessons into a unified CINDER experience.

Investigate deeply. Make deliberate design decisions. Generate the visual journey. Implement the application. Test the actual workflows. Refine the rough edges.

Preserve what works. Improve what does not. Do not invent unnecessary complexity.

**The objective is not another prototype. The objective is a complete product experience that people can confidently use at an actual conference.**

CINDER should make networking feel natural, coordination effortless, and participation intentional.

**DISCOVER YOUR PEOPLE. FIND YOUR POD. MAKE SOMETHING HAPPEN.**

SHIP THE EXPERIENCE.

## One important instruction before you unleash the agent

Give it access to the actual running application, not just the source code. The commission explicitly requires it to inspect and exercise the experience, because a beautiful implementation that has never been navigated as an attendee is not a completed product.

And don't let it turn this into 40 pages of architecture documentation. The deliverables are the visual journey, the implemented application, and verified user workflows.

The agent is commissioned to ship, not to philosophize. 🔥