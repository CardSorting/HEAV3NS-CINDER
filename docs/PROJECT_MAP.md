<!-- [LAYER: UI] -->
# Project Map & Module Inventory

This map reflects the **actual** layout of the **CINDER** workspace. Paths are relative to the repository root (`/Users/bozoegg/Desktop/elasticsearch`).

---

## Workspace Overview by Zone

| Directory / File | Architectural Zone | Role & Description |
| :--- | :--- | :--- |
| **`src/domain/`** | `DOMAIN` | Pure domain entities: `attendee.mjs` (attendee profiles), `pod.mjs` (pods & membership), `match.mjs` (swipes & mutual matches), `message.mjs` (group communications), `agenda.mjs` (conference sessions), `relevanceScore.mjs` (synergy scoring and explanations). Zero external I/O. |
| **`src/domain/interfaces/`** | `DOMAIN` | Formal Dependency Inversion interfaces: `IAttendeeRepository.mjs`, `IPodRepository.mjs`, `IElasticsearchClient.mjs`, `IAiFacilitatorService.mjs`, `IEventBus.mjs`. |
| **`src/core/`** | `CORE` | Use-case orchestration controllers: `CinderApp.mjs` (composition root), `CheckInController.mjs` (registration & indexing), `DiscoveryController.mjs` (hybrid retrieval feed & swipes), `PodOrchestrationController.mjs` (automated pod formation), `CommunicationController.mjs` (group chat & meetup detection), `FacilitatorController.mjs` (AI agent lifecycle), `ScenarioRunner.mjs` (10-step continuous demo). |
| **`src/infrastructure/`** | `INFRASTRUCTURE` | Concrete external adapters: `ElasticsearchClient.mjs` (dual-mode live HTTP and embedded ES engine), `AiFacilitatorEngine.mjs` (prompt engineering & response parsing), `MemoryAttendeeRepository.mjs` (in-memory attendee store), `MemoryPodRepository.mjs` (in-memory pod store), `SimpleEventBus.mjs` (in-process pub/sub event bus). |
| **`src/plumbing/`** | `PLUMBING` | Stateless leaf mathematical and algorithmic primitives: `vectorMath.mjs` (cosine similarity, centroid, normalization), `bm25Scorer.mjs` (BM25 tokenization and scoring), `rrfRanker.mjs` (Reciprocal Rank Fusion), `textEmbedder.mjs` (deterministic 32-dim semantic vectorizer), `conferenceSeedData.mjs` (seed attendees & agenda), `idGenerator.mjs` (unique ID generator). |
| **`src/ui/`** | `UI` | Presentation and interfaces: `cli/cliPresenter.mjs` (terminal dashboard presenter), `web/webServer.mjs` (native HTTP server & REST API), `web/public/` (`index.html`, `styles.css`, `app.js` Single Page Application). |
| **`bin/`** | `UI` | Executable entry points: `cinder.mjs` (unified CLI router), `demo.mjs` (10-step demonstration runner), `server.mjs` (web server launcher). |
| **`tests/`** | `UI` | Automated verification suites: `domain.test.mjs`, `elasticsearch.test.mjs`, `matching-and-pods.test.mjs`, `plumbing.test.mjs`, `scenario.test.mjs`, `web-server.test.mjs`. |
| **`docs/`** | `UI` | Diátaxis documentation portal, ADRs, playbooks, postmortems, knowledge base, wiki, papers, and API reference. |

---

## Core Execution Flow

```
bin/cinder.mjs (or bin/demo.mjs / bin/server.mjs)
  └─ src/core/CinderApp.mjs (Composition Root)
       ├─ src/infrastructure/ElasticsearchClient.mjs
       │    ├─ checkHealth() (probe localhost:9200 within 250ms)
       │    ├─ ensureIndex() (live dense_vector mapping or embedded store)
       │    ├─ indexAttendee() (store profile text + 32-dim vector)
       │    └─ hybridSearch()
       │         ├─ computeBM25Score() (src/plumbing/bm25Scorer.mjs)
       │         ├─ cosineSimilarity() (src/plumbing/vectorMath.mjs)
       │         └─ reciprocalRankFusion() (src/plumbing/rrfRanker.mjs)
       ├─ src/core/CheckInController.mjs
       │    ├─ validate Attendee (src/domain/attendee.mjs)
       │    ├─ generateEmbedding() (src/plumbing/textEmbedder.mjs)
       │    └─ index into Elasticsearch & save to IAttendeeRepository
       ├─ src/core/DiscoveryController.mjs
       │    ├─ query Elasticsearch hybridSearch()
       │    ├─ calculateRelevance() (src/domain/relevanceScore.mjs)
       │    └─ recordSwipe() -> detect mutual Match (src/domain/match.mjs)
       ├─ src/core/PodOrchestrationController.mjs
       │    ├─ composePods() (mutual matches + centroid cohesion + diversity)
       │    ├─ create Pod entity (src/domain/pod.mjs)
       │    └─ dispatch facilitator welcome event
       ├─ src/core/CommunicationController.mjs
       │    ├─ postMessage() (src/domain/message.mjs)
       │    ├─ detect meetup intent regex
       │    └─ trigger AI Facilitator verification
       └─ src/core/FacilitatorController.mjs
            ├─ generateWelcomeMessage()
            ├─ generateDiscussionPrompt()
            └─ verifyAndConfirmMeetup() (cross-reference src/domain/agenda.mjs)
```

---

## File Inventory & Zone Classification

| Path | Zone | Lines of Code | Exported Symbols |
| :--- | :--- | :--- | :--- |
| `src/domain/attendee.mjs` | `DOMAIN` | ~60 | `Attendee` |
| `src/domain/pod.mjs` | `DOMAIN` | ~85 | `Pod` |
| `src/domain/match.mjs` | `DOMAIN` | ~40 | `Match` |
| `src/domain/message.mjs` | `DOMAIN` | ~40 | `Message` |
| `src/domain/agenda.mjs` | `DOMAIN` | ~55 | `AgendaSession` |
| `src/domain/relevanceScore.mjs` | `DOMAIN` | ~60 | `RelevanceScore`, `calculateRelevance` |
| `src/domain/interfaces/IAttendeeRepository.mjs` | `DOMAIN` | ~30 | `IAttendeeRepository` |
| `src/domain/interfaces/IPodRepository.mjs` | `DOMAIN` | ~30 | `IPodRepository` |
| `src/domain/interfaces/IElasticsearchClient.mjs` | `DOMAIN` | ~35 | `IElasticsearchClient` |
| `src/domain/interfaces/IAiFacilitatorService.mjs` | `DOMAIN` | ~35 | `IAiFacilitatorService` |
| `src/domain/interfaces/IEventBus.mjs` | `DOMAIN` | ~25 | `IEventBus` |
| `src/core/CinderApp.mjs` | `CORE` | ~112 | `CinderApp` |
| `src/core/CheckInController.mjs` | `CORE` | ~55 | `CheckInController` |
| `src/core/DiscoveryController.mjs` | `CORE` | ~75 | `DiscoveryController` |
| `src/core/PodOrchestrationController.mjs` | `CORE` | ~110 | `PodOrchestrationController` |
| `src/core/CommunicationController.mjs` | `CORE` | ~90 | `CommunicationController` |
| `src/core/FacilitatorController.mjs` | `CORE` | ~100 | `FacilitatorController` |
| `src/core/ScenarioRunner.mjs` | `CORE` | ~170 | `ScenarioRunner` |
| `src/infrastructure/ElasticsearchClient.mjs` | `INFRA` | ~276 | `ElasticsearchClient` |
| `src/infrastructure/AiFacilitatorEngine.mjs` | `INFRA` | ~130 | `AiFacilitatorEngine` |
| `src/infrastructure/MemoryAttendeeRepository.mjs`| `INFRA` | ~65 | `MemoryAttendeeRepository` |
| `src/infrastructure/MemoryPodRepository.mjs` | `INFRA` | ~70 | `MemoryPodRepository` |
| `src/infrastructure/SimpleEventBus.mjs` | `INFRA` | ~50 | `SimpleEventBus` |
| `src/plumbing/vectorMath.mjs` | `PLUMBING` | ~60 | `dotProduct`, `magnitude`, `cosineSimilarity`, `normalizeVector`, `centroid` |
| `src/plumbing/bm25Scorer.mjs` | `PLUMBING` | ~65 | `tokenizeText`, `calculateTermFrequencies`, `computeBM25Score` |
| `src/plumbing/rrfRanker.mjs` | `PLUMBING` | ~45 | `reciprocalRankFusion` |
| `src/plumbing/textEmbedder.mjs` | `PLUMBING` | ~75 | `generateEmbedding` |
| `src/plumbing/conferenceSeedData.mjs` | `PLUMBING` | ~130 | `SEED_ATTENDEES`, `SEED_CONFERENCE_AGENDA` |
| `src/plumbing/idGenerator.mjs` | `PLUMBING` | ~30 | `generateId` |
| `src/ui/cli/cliPresenter.mjs` | `UI` | ~140 | `CliPresenter` |
| `src/ui/web/webServer.mjs` | `UI` | ~250 | `CinderWebServer` |
| `bin/cinder.mjs` | `UI` | ~45 | CLI router |
| `bin/demo.mjs` | `UI` | ~72 | Demo runner |
| `bin/server.mjs` | `UI` | ~25 | Server launcher |

