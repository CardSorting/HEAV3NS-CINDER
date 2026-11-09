<!-- [LAYER: UI] -->
[x] Push the feat/elasticsearch-data branch to origin and open a pull request into master
[x] Merge feat/elasticsearch-data into master and create a feat/elasticsearch-integration branch from it
[x] Obtain the heav3ns-joy checker, replace the machine-specific path in the package.json check script with a portable command, and confirm npm run check passes on master
[x] Add a plumbing module that loads ES_URL, ES_API_KEY and index names from .env or the process environment without external dependencies
[x] Add a plumbing clock module that returns the real time or a configured demo time so all time-dependent logic uses one source
[x] Choose the demo event from eventapp and set its id and demo clock time in configuration
[x] Extend IElasticsearchClient with generic search, get, index, update, delete-by-query, bulk and inference methods
[x] Rewrite the live HTTP transport in ElasticsearchClient to send the ApiKey authorization header, use per-request timeouts, and surface Elasticsearch error types
[x] Replace the /_cluster/health probe with GET / so serverless clusters are detected as live instead of returning 410
[x] Keep the embedded BM25 and vector engine as the offline fallback and make the active mode explicit in /api/status
[x] Add unit tests for the live transport with a mocked fetch covering auth, timeouts, 4xx, 5xx and fallback switching
[x] Add an opt-in integration test suite that runs against the live cluster only when ES_URL and ES_API_KEY are set
[x] Add an eventId field to the Attendee, Pod, Match and Message domain entities and update their constructors, toJSON and tests
[x] Add a ConferenceEvent domain entity for selectable events with id, name, category, dates, timezone, venue and cinder summary
[x] Add a Session domain field set for absolute startDate, endDate, timezone, sessionType and spaceId while keeping startTime and endTime for display
[x] Add a VenueSpace domain entity matching cinder-spaces with name, aliases, kind, floor, capacity, tags and meetupFriendly
[x] Add an Announcement domain entity matching cinder-announcements with publishAt, kind, severity, audience and affects
[x] Add domain interfaces IEventRepository, IAgendaRepository, ISpaceRepository, IAnnouncementRepository, IPromptRepository, IInteractionRepository and IMessageRepository
[x] Implement an Elasticsearch EventRepository that lists eventapp documents with cinder.enabled true, sorted by start date, with category and date filters
[ ] Implement an Elasticsearch AttendeeRepository on cinder-registrations that adds eventId, personId and role, drops the 32-dim embedding, and filters every query by eventId
[ ] Write registrations with refresh wait_for so a checked-in attendee is immediately discoverable and embedded by the cinder-embed-registration pipeline
[ ] Implement an Elasticsearch InteractionRepository on cinder-interactions for swipes and mutual matches scoped by eventId
[ ] Implement an Elasticsearch MessageRepository on cinder-messages storing pod messages with channel pod and direct messages with channel direct and matchId
[ ] Implement an Elasticsearch PodRepository on cinder-pods that stores pods without embedded messages and loads messages through the MessageRepository
[ ] Implement Elasticsearch AgendaRepository, SpaceRepository, AnnouncementRepository and PromptRepository using the from_session and from_space mappings in elasticsearch/cinder/compat_check.py
[ ] Add unit tests for every Elasticsearch repository with a mocked client, including the strict-mapping adapter transforms
[ ] Add an EventController in core that lists selectable events and resolves the active event for a request
[ ] Wire the Elasticsearch repositories into CinderApp behind configuration, keeping the memory repositories for offline mode and tests
[ ] Add GET /api/conferences and GET /api/conferences/:id routes and require an eventId parameter on attendee, discovery, swipe, match, pod and agenda routes
[ ] Scope SSE broadcasts by eventId so clients only receive realtime events for their selected event
[ ] Move swipe and match state out of DiscoveryController maps into the InteractionRepository
[ ] Move the discovery reset logic from webServer into a DiscoveryController method so the UI layer holds no state
[ ] Move direct-message storage from the webServer directMessages map into CommunicationController and the MessageRepository
[ ] Move meetup pinning and RSVP logic from webServer routes into CommunicationController methods
[ ] Change CheckInController to save registrations through the Elasticsearch repository and stop computing 32-dim embeddings in live mode
[ ] Replace the hybridSearch implementation in live mode with an Elasticsearch RRF retriever combining BM25 on profile fields, kNN on the stored profile vector, and kNN on looking_for text via query_vector_builder
[ ] Fetch stored vectors with _source exclude_vectors false wherever a stored embedding is reused as a kNN query
[ ] Weight the looking_for retriever above profile similarity so discovery surfaces complementary attendees rather than lookalikes
[ ] Exclude the requesting attendee and previously swiped attendees from discovery with filters inside every retriever
[ ] Return the executed Elasticsearch query and per-retriever ranks from discovery so the UI shows the real query specification
[ ] Update explainMatchRelevance to describe complementary matches using looking_for, discipline and shared interests from registration data
[ ] Evaluate discovery quality on the demo event with a fixed set of attendees and tune retriever weights and rank window size
[ ] Rewrite PodOrchestrationController candidate retrieval to use Elasticsearch kNN around the seed attendees' centroid filtered by eventId
[ ] Enforce discipline diversity in pod composition using the registration discipline field and existing mutual matches as anchors
[ ] Store the pod centroid vector and compositionMeta on cinder-pods and derive the pod name and theme from shared interests
[ ] Replace SEED_CONFERENCE_AGENDA, VENUE_LOCATIONS and DISCUSSION_PROMPTS usage in CinderApp, FacilitatorController and AiFacilitatorEngine with the Elasticsearch repositories
[ ] Make GET /api/agenda return sessions, meetup venues and prompts for the selected event in the existing response shape
[ ] Resolve meetup locations in evaluateMeetupIntent by matching message text against cinder-spaces aliases for the event venue
[ ] Resolve meetup times against the next lunch, break or networking session from the agenda and store pinnedMeetup.startsAt
[ ] Replace the hard-coded 12:15 PM and Main Hall East Patio defaults in the facilitator and webServer with agenda and space lookups
[ ] Select discussion prompts by kNN against the pod centroid filtered by phase
[ ] Surface relevant upcoming talks for a pod by kNN against the pod centroid filtered by eventId, session type and the demo clock
[ ] Deliver announcements to pods whose members are affected by the announced sessions or spaces when publishAt passes on the demo clock
[ ] Add a facilitator scheduler that triggers welcome, agenda reminders, meetup reminders and prompts from the demo clock
[ ] Add an LLM facilitator mode using the Elasticsearch chat_completion inference endpoint that only states agenda, room and time facts retrieved from Elasticsearch
[ ] Keep the template facilitator as the fallback when the LLM endpoint fails or times out
[ ] Add a seeding command to elasticsearch/cinder that loads the five seed attendees into the demo event with their existing att_ ids
[ ] Verify the seed attendees produce the scripted story, including the Alex Chen and Maya Lin mutual match, against live discovery
[ ] Update ScenarioRunner to run the ten-step demonstration against the demo event in live mode and in offline mode
[ ] Update existing tests for eventId scoping and repository injection and confirm npm test passes
[ ] Run elasticsearch/cinder/compat_check.py and npm run check and fix any findings
[ ] Add the event picker screen to the web UI and store the selected event for the session
[ ] Update the check-in form to submit to the selected event and show the new attendee in discovery
[ ] Update discovery cards to show avatar, title, company, discipline, complementary match explanation and the executed query
[ ] Build the Matches tab on GET /api/matches with direct messaging through POST /api/matches/:id/messages
[ ] Update the Pods tab to show roster, chat, pinned meetup with real location and time, and RSVP controls
[ ] Build the Agenda tab from GET /api/agenda with day, time, room, track and speakers, and the meetup venues sidebar
[ ] Build the Notifications tab from announcements delivered for the selected event
[ ] Update the Profile tab to edit the attendee registration and re-embed it on save
[ ] Update the status indicator to show live or embedded mode, cluster latency and document counts for the selected event
[ ] Train Floodgate models for check-ins, swipes, pod messages and direct messages from samples produced by compat_check dump_entities
[ ] Create a Floodgate Tide with foreign keys from interactions and messages to registrations and an event-day density histogram for check-ins, breaks and lunch
[ ] Create a Floodgate Ship and Shipment for the demo event activity data with a fixed seed
[ ] Add a loader to elasticsearch/cinder that delivers the Shipment, remaps ids to the demo event's registrations, and bulk-loads cinder-interactions, cinder-messages and check-in times
[ ] Verify the loaded activity data renders correctly in discovery, matches, pods and notifications
[ ] Load the real event data into eventapp through the eventapp-final pipeline and confirm the fields match the synthetic schema
[ ] Run elasticsearch/cinder/generate.py for the real conference, academic, meetup and expo events
[ ] Purge synthetic eventapp and cinder documents that real data replaces using the purge-synthetic and reset commands
[ ] Confirm the final demo event, reseed the five demo attendees, and regenerate the Floodgate activity data for it
[ ] Confirm the API key is used only server-side and never sent to the browser
[ ] Measure discovery, check-in and pod composition latency against the live cluster and fix any request over one second
[ ] Write an ADR for the live serverless Elasticsearch adapter with 1024-dim jina embeddings, superseding the 32-dim embedding decisions in ADR 0002 and ADR 0005
[ ] Write an ADR for event-scoped data and the people and registrations split
[ ] Update docs/architecture/current.md, docs/api/cli.md, docs/api/public-api.md, docs/PROJECT_MAP.md and docs/CODE_TO_DOC_MAP.md for the new modules and routes
[ ] Update README.md, docs/GETTING_STARTED.md and docs/OPERATIONS.md with .env setup, data tooling commands and live mode
[ ] Update docs/GLOSSARY.md with Event, Registration, Space, Announcement and Demo Clock
[ ] Update docs/playbooks/elasticsearch-cluster-failover.md and docs/kb/symptom-diagnosis-matrix.md with the serverless and embedding gotchas
[ ] Update CHANGELOG.md and VALIDATION_REPORT.md and confirm npm run verify passes
[ ] Rehearse the full ten-step demonstration against the live cluster and confirm offline fallback works with the network disabled
[ ] Record the demonstration with bin/record-live-journey.mjs and capture screens with bin/capture-screens.mjs
[ ] Merge the integration branch into master and tag the release
[ ] Submit the hackathon entry with the repository link, demo recording and setup instructions
