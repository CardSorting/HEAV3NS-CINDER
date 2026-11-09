<!-- [LAYER: UI] -->
# Public Programmatic API Reference

Complete reference for CINDER core classes, domain entities, formal interfaces, and infrastructure adapters.

---

## 1. Composition Root: `CinderApp`

Path: `src/core/CinderApp.mjs`

### Constructor
```javascript
new CinderApp(options)
```
- `options.elasticsearchUrl` *(string, optional)*: URL of the live Elasticsearch cluster (defaults to `process.env.ELASTICSEARCH_URL` or `"http://localhost:9200"`).

### Methods
- `initialize(): Promise<{ status: string, seededAttendeesCount: number }>`: Ensures Elasticsearch index mappings and seeds initial conference attendees.
- `getStatus(): Promise<SystemStatus>`: Returns system health, Elasticsearch connection mode, attendee count, pod count, and agenda count.

---

## 2. Core Controllers

### `CheckInController`
Path: `src/core/CheckInController.mjs`
- `checkIn(profileData): Promise<Attendee>`: Validates attendee attributes, generates a 32-dim dense embedding, indexes the profile in Elasticsearch, stores in repository, and emits `attendee:checked_in`.

### `DiscoveryController`
Path: `src/core/DiscoveryController.mjs`
- `getDiscoveryFeed(attendeeId, options): Promise<Array<DiscoveryCandidate>>`: Queries Elasticsearch hybrid search, calculates synergy explanations, and returns ranked candidate cards.
- `recordSwipe(sourceAttendeeId, targetAttendeeId, action): Promise<{ match: Match, mutualMatch: boolean }>`: Records a `LIKE` or `PASS` swipe; detects and returns mutual matches.

### `PodOrchestrationController`
Path: `src/core/PodOrchestrationController.mjs`
- `composePods(options): Promise<Array<Pod>>`: Executes greedy balanced pod composition combining mutual swipe pairs, centroid cohesion, and discipline diversity.
- `getPod(podId): Promise<Pod>`: Retrieves a pod by unique identifier.

### `CommunicationController`
Path: `src/core/CommunicationController.mjs`
- `postMessage(podId, senderId, text): Promise<Message>`: Posts a message to a pod channel, emits `message:posted`, and evaluates regex patterns for physical meetup intent.

### `FacilitatorController`
Path: `src/core/FacilitatorController.mjs`
- `welcomePod(podId): Promise<Message>`: Generates and posts a context-grounded welcome and introduction message to the pod channel.
- `verifyAndConfirmMeetup(podId, proposalText): Promise<ConfirmedMeetup>`: Validates proposed physical meetup against conference schedule slots and pins confirmed meetup to the channel header.

---

## 3. Domain Entities

### `Attendee`
Path: `src/domain/attendee.mjs`
- Properties: `id`, `name`, `role`, `company`, `interests` (Array), `expertise`, `projects`, `challenges`, `lookingFor`, `embedding` (32-dim Array), `createdAt`.

### `Pod`
Path: `src/domain/pod.mjs`
- Properties: `id`, `name`, `topic`, `memberIds` (Array), `messages` (Array), `pinnedLocation`, `createdAt`.
- Methods: `addMember(attendeeId)`, `addMessage(message)`, `pinLocation(location, time)`.

### `Match`
Path: `src/domain/match.mjs`
- Properties: `id`, `attendeeAId`, `attendeeBId`, `swipes` (Map), `status` (`"pending"` or `"mutual"`), `createdAt`.

### `AgendaSession`
Path: `src/domain/agenda.mjs`
- Properties: `id`, `title`, `speaker`, `room`, `track`, `startTime`, `endTime`, `description`.

### `RelevanceScore`
Path: `src/domain/relevanceScore.mjs`
- Properties: `headline`, `synergySummary`, `score` (0.0–1.0), `sharedInterests` (Array).

---

## 4. Formal Domain Interfaces

Path: `src/domain/interfaces/`

- `IAttendeeRepository`: Contracts: `save(attendee)`, `findById(id)`, `listAll()`, `delete(id)`.
- `IPodRepository`: Contracts: `save(pod)`, `findById(id)`, `listAll()`.
- `IElasticsearchClient`: Contracts: `checkHealth(timeoutMs)`, `ensureIndex()`, `indexAttendee(attendee, vector)`, `hybridSearch(queryText, targetVector, options)`, `getStatus()`.
- `IAiFacilitatorService`: Contracts: `generateWelcomeMessage(pod, members)`, `generateDiscussionPrompt(pod, members)`, `verifyMeetup(proposalText, agenda)`.
- `IEventBus`: Contracts: `publish(topic, payload)`, `subscribe(topic, handler)`, `unsubscribe(topic, handler)`.

