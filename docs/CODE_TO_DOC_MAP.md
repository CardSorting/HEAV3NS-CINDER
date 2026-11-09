<!-- [LAYER: UI] -->
# Code to Documentation Map

This lookup table maps every implementation file in `src/` and `bin/` to its architectural zone, governing specifications, and relevant documentation pages.

---

## Mapping Table

| Source File | Zone | Documentation Links | Architectural Role |
| :--- | :--- | :--- | :--- |
| `src/domain/attendee.mjs` | `DOMAIN` | [api/public-api.md#attendee](api/public-api.md#attendee) · [CONSTITUTION.md](CONSTITUTION.md) | Attendee entity representation, validation, and profile modeling |
| `src/domain/pod.mjs` | `DOMAIN` | [api/public-api.md#pod](api/public-api.md#pod) · [wiki/pod-composition-algorithms.md](wiki/pod-composition-algorithms.md) | Pod entity, membership lists, channel state, and pinned locations |
| `src/domain/match.mjs` | `DOMAIN` | [api/public-api.md#match](api/public-api.md#match) · [adr/0003-pod-composition-and-diversity-balance.md](adr/0003-pod-composition-and-diversity-balance.md) | Swipe action recording and mutual match status tracking |
| `src/domain/message.mjs` | `DOMAIN` | [api/public-api.md#message](api/public-api.md#message) · [adr/0006-realtime-communication-event-bus-and-meetup-detection.md](adr/0006-realtime-communication-event-bus-and-meetup-detection.md) | Pod channel messages, sender types (attendee, facilitator, system), and pinned flags |
| `src/domain/agenda.mjs` | `DOMAIN` | [api/public-api.md#agendasession](api/public-api.md#agendasession) · [wiki/agent-facilitator-design.md](wiki/agent-facilitator-design.md) | Conference schedule sessions, room tracking, and timing validation |
| `src/domain/relevanceScore.mjs` | `DOMAIN` | [api/public-api.md#relevancescore](api/public-api.md#relevancescore) · [wiki/hybrid-search-and-rrf.md](wiki/hybrid-search-and-rrf.md) | Synergy score calculation and human-readable explanation generation |
| `src/domain/interfaces/*.mjs` | `DOMAIN` | [api/public-api.md#interfaces](api/public-api.md#interfaces) · [CODEBASE_STANDARDS.md](CODEBASE_STANDARDS.md) | Formal Dependency Inversion contracts (`IAttendeeRepository`, `IPodRepository`, `IElasticsearchClient`, `IAiFacilitatorService`, `IEventBus`) |
| `src/core/CinderApp.mjs` | `CORE` | [api/public-api.md#cinderapp](api/public-api.md#cinderapp) · [architecture/current.md](architecture/current.md) | Composition root wiring repositories, event bus, ES adapter, and controllers |
| `src/core/CheckInController.mjs` | `CORE` | [api/public-api.md#checkincontroller](api/public-api.md#checkincontroller) · [GETTING_STARTED.md](GETTING_STARTED.md) | Registration validation, vectorization, and Elasticsearch indexing pipeline |
| `src/core/DiscoveryController.mjs` | `CORE` | [api/public-api.md#discoverycontroller](api/public-api.md#discoverycontroller) · [adr/0002-hybrid-retrieval-dense-vector-bm25-and-rrf.md](adr/0002-hybrid-retrieval-dense-vector-bm25-and-rrf.md) | Hybrid discovery query dispatch, candidate ranking, and swipe recording |
| `src/core/PodOrchestrationController.mjs` | `CORE` | [api/public-api.md#podorchestrationcontroller](api/public-api.md#podorchestrationcontroller) · [wiki/pod-composition-algorithms.md](wiki/pod-composition-algorithms.md) | Automated pod grouping algorithm, centroid cohesion, and diversity balancing |
| `src/core/CommunicationController.mjs` | `CORE` | [api/public-api.md#communicationcontroller](api/public-api.md#communicationcontroller) · [adr/0006-realtime-communication-event-bus-and-meetup-detection.md](adr/0006-realtime-communication-event-bus-and-meetup-detection.md) | Pod channel messaging, event bus publication, and meetup intent detection |
| `src/core/FacilitatorController.mjs` | `CORE` | [api/public-api.md#facilitatorcontroller](api/public-api.md#facilitatorcontroller) · [AGENT_STACK.md](AGENT_STACK.md) · [adr/0004-proactive-event-driven-ai-facilitator.md](adr/0004-proactive-event-driven-ai-facilitator.md) | AI Facilitator orchestration, introductions, icebreakers, agenda alerts, and meetup confirmations |
| `src/core/ScenarioRunner.mjs` | `CORE` | [GETTING_STARTED.md#2-run-the-10-step-demonstration-scenario](GETTING_STARTED.md#2-run-the-10-step-demonstration-scenario) · [api/public-api.md#scenariorunner](api/public-api.md#scenariorunner) | 10-step end-to-end continuous conference demonstration engine |
| `src/infrastructure/ElasticsearchClient.mjs` | `INFRA` | [adr/0005-dual-mode-elasticsearch-adapter-with-embedded-fallback.md](adr/0005-dual-mode-elasticsearch-adapter-with-embedded-fallback.md) · [playbooks/elasticsearch-cluster-failover.md](playbooks/elasticsearch-cluster-failover.md) | Dual-mode adapter for live HTTP Elasticsearch cluster and embedded fallback |
| `src/infrastructure/AiFacilitatorEngine.mjs` | `INFRA` | [AGENT_STACK.md](AGENT_STACK.md) · [wiki/agent-facilitator-design.md](wiki/agent-facilitator-design.md) | Facilitator prompt synthesizer and structured message generator |
| `src/infrastructure/Memory*Repository.mjs` | `INFRA` | [api/public-api.md#repositories](api/public-api.md#repositories) · [OPERATIONS.md](OPERATIONS.md) | In-memory CRUD repositories for attendees and pods |
| `src/infrastructure/SimpleEventBus.mjs` | `INFRA` | [PORTABLE_TRINITY.md](PORTABLE_TRINITY.md) · [adr/0006-realtime-communication-event-bus-and-meetup-detection.md](adr/0006-realtime-communication-event-bus-and-meetup-detection.md) | In-process publish/subscribe event bus |
| `src/plumbing/vectorMath.mjs` | `PLUMBING` | [wiki/hybrid-search-and-rrf.md](wiki/hybrid-search-and-rrf.md) | Pure vector math: dotProduct, magnitude, cosineSimilarity, normalizeVector, centroid |
| `src/plumbing/bm25Scorer.mjs` | `PLUMBING` | [wiki/hybrid-search-and-rrf.md](wiki/hybrid-search-and-rrf.md) | Inverted index tokenization, term frequency, inverse document frequency BM25 score |
| `src/plumbing/rrfRanker.mjs` | `PLUMBING` | [adr/0002-hybrid-retrieval-dense-vector-bm25-and-rrf.md](adr/0002-hybrid-retrieval-dense-vector-bm25-and-rrf.md) · [wiki/hybrid-search-and-rrf.md](wiki/hybrid-search-and-rrf.md) | Reciprocal Rank Fusion implementation |
| `src/plumbing/textEmbedder.mjs` | `PLUMBING` | [wiki/hybrid-search-and-rrf.md](wiki/hybrid-search-and-rrf.md) | Deterministic 32-dimensional domain keyword-weighted vector embedder |
| `src/plumbing/conferenceSeedData.mjs` | `PLUMBING` | [GETTING_STARTED.md](GETTING_STARTED.md) · [papers/companion-brief.md](papers/companion-brief.md) | Seed profiles for 5 attendees and conference master agenda |
| `src/plumbing/idGenerator.mjs` | `PLUMBING` | [api/public-api.md](api/public-api.md) | Collision-resistant cryptographic ID generator |
| `src/ui/cli/cliPresenter.mjs` | `UI` | [api/cli.md](api/cli.md) | Terminal rendering, cards, tables, chat bubbles, and progress meters |
| `src/ui/web/webServer.mjs` | `UI` | [api/cli.md#rest-api-reference](api/cli.md#rest-api-reference) · [OPERATIONS.md](OPERATIONS.md) | Native Node HTTP web server and REST API handler |
| `src/ui/web/public/*` | `UI` | [GETTING_STARTED.md#3-launch-the-interactive-web-platform](GETTING_STARTED.md#3-launch-the-interactive-web-platform) | Frontend Single Page Application (HTML, CSS, JS) |
| `bin/cinder.mjs` | `UI` | [api/cli.md](api/cli.md) | Unified CLI router |
| `bin/demo.mjs` | `UI` | [GETTING_STARTED.md#2-run-the-10-step-demonstration-scenario](GETTING_STARTED.md#2-run-the-10-step-demonstration-scenario) | Command line demonstration runner |
| `bin/server.mjs` | `UI` | [OPERATIONS.md](OPERATIONS.md) | Web server standalone launcher |

