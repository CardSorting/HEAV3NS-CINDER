<!-- [LAYER: UI] -->
# Documentation Guide

<p align="center">
  <a href="README.md">Docs Hub</a> ·
  <a href="adr/README.md">ADRs</a> ·
  <a href="playbooks/README.md">Playbooks</a> ·
  <a href="wiki/README.md">Wiki</a> ·
  <a href="postmortems/README.md">Postmortems</a> ·
  <a href="kb/README.md">Knowledge Base</a> ·
  <a href="MAINTAINER.md">Maintainer Guide</a>
</p>

Complete map of the **CINDER** documentation system, combining the **Diátaxis framework** (Tutorials, How-To Playbooks, Reference, Explanation/Wiki) with **Institutional Engineering Memory** (Architecture Decision Records, Blameless Postmortems, and a 3-Tier Knowledge Base).

---

## Principles

1. **1-to-1 Parity with Code:** Architecture, ADR, Playbook, Postmortem, Wiki, KB, and API pages mirror concrete paths under `src/`, `bin/`, and `tests/`.
2. **Every Markdown File is Joyzoned:** Every `.md` document begins with `<!-- [LAYER: UI] -->` within the first 10KB and passes `npm run check`.
3. **Diátaxis Separation:**
   - **Tutorials:** [GETTING_STARTED.md](GETTING_STARTED.md) provides a 10-minute onboarding tutorial.
   - **Playbooks:** [playbooks/README.md](playbooks/README.md) contains actionable incident and operational runbooks.
   - **Reference:** [api/README.md](api/README.md), [PROJECT_MAP.md](PROJECT_MAP.md), and [GLOSSARY.md](GLOSSARY.md) document factual specifications.
   - **Explanation:** [wiki/README.md](wiki/README.md) and [papers/README.md](papers/README.md) explain concepts, mental models, and algorithms.
4. **Institutional Memory:**
   - **ADRs:** [adr/README.md](adr/README.md) records the provenance and rationale of architectural decisions.
   - **Postmortems:** [postmortems/README.md](postmortems/README.md) documents lessons learned from past operational failures.
   - **Knowledge Base:** [kb/README.md](kb/README.md) indexes symptoms, root causes, and technical FAQs.
5. **No Broken Links & Workspace Metric Parity:** All relative markdown links resolve to existing files on disk, and workspace metrics reflect live code facts.

---

## Complete Directory Index

### 1. Root & Governance (`docs/`)
- [README.md](README.md): Central documentation portal, Diátaxis matrix, and audience reading paths.
- [GETTING_STARTED.md](GETTING_STARTED.md): 10-minute onboarding tutorial.
- [DOCS_GUIDE.md](DOCS_GUIDE.md): Documentation system standards and directory index (this document).
- [PROJECT_MAP.md](PROJECT_MAP.md): Comprehensive module and file inventory.
- [CODE_TO_DOC_MAP.md](CODE_TO_DOC_MAP.md): Source file to documentation page lookup table.
- [CODEBASE_STANDARDS.md](CODEBASE_STANDARDS.md): Joyzoning rules, ES modules, and coding discipline.
- [CONSTITUTION.md](CONSTITUTION.md): The 6 immutable laws of CINDER.
- [AGENT_STACK.md](AGENT_STACK.md): AI Facilitator architecture, prompt contracts, and reactive event loops.
- [CI_INTEGRATION.md](CI_INTEGRATION.md): Automated CI pipeline and Joyzoning verification.
- [GLOSSARY.md](GLOSSARY.md): Definitions of all CINDER domain terms.
- [MAINTAINER.md](MAINTAINER.md): Guidelines for maintainers, reviewers, and releases.
- [OPERATIONS.md](OPERATIONS.md): Operations runbook, server startup, health endpoints, and monitoring.
- [PORTABLE_TRINITY.md](PORTABLE_TRINITY.md): Event bus, background queues, and state synchronization.
- [PROPAGATION.md](PROPAGATION.md): Conference organizer adoption guide and rollout playbook.
- [RELEASING.md](RELEASING.md): Semantic versioning rules and release checklist.
- [SECURITY_BEST_PRACTICES.md](SECURITY_BEST_PRACTICES.md): Threat model, privacy safeguards, and sandbox boundaries.

### 2. Architecture (`docs/architecture/`)
- [architecture/current.md](architecture/current.md): System architecture, 5-zone topology, and data flow pipelines.

### 3. Architecture Decision Records (`docs/adr/`)
- [adr/README.md](adr/README.md): ADR registry, decision dependencies, and MADR lifecycle rules.
- [adr/0000-adr-template.md](adr/0000-adr-template.md): MADR template with verification requirement.
- [adr/0001-five-canonical-zones-and-geographic-alignment.md](adr/0001-five-canonical-zones-and-geographic-alignment.md): 5 Canonical Zones & Principle of Geographic Alignment.
- [adr/0002-hybrid-retrieval-dense-vector-bm25-and-rrf.md](adr/0002-hybrid-retrieval-dense-vector-bm25-and-rrf.md): Elasticsearch Hybrid Retrieval with BM25, 32-dim Vectors, and RRF.
- [adr/0003-pod-composition-and-diversity-balance.md](adr/0003-pod-composition-and-diversity-balance.md): Pod Composition Balancing Semantic Affinity and Discipline Diversity.
- [adr/0004-proactive-event-driven-ai-facilitator.md](adr/0004-proactive-event-driven-ai-facilitator.md): Proactive Event-Driven AI Facilitator with Strict Tool Boundaries.
- [adr/0005-dual-mode-elasticsearch-adapter-with-embedded-fallback.md](adr/0005-dual-mode-elasticsearch-adapter-with-embedded-fallback.md): Dual-Mode Elasticsearch Adapter with 250ms Embedded Fallback.
- [adr/0006-realtime-communication-event-bus-and-meetup-detection.md](adr/0006-realtime-communication-event-bus-and-meetup-detection.md): Realtime Pod Event Bus and Heuristic Meetup Intent Detection.
- [adr/0007-diataxis-documentation-and-institutional-memory.md](adr/0007-diataxis-documentation-and-institutional-memory.md): Diátaxis + Institutional Memory Documentation Architecture.

### 4. Operational & Incident Playbooks (`docs/playbooks/`)
- [playbooks/README.md](playbooks/README.md): Playbook directory, severity matrix, and triage router.
- [playbooks/architectural-violation-remediation.md](playbooks/architectural-violation-remediation.md): Remediating Joyzoning and SPI violation findings.
- [playbooks/elasticsearch-cluster-failover.md](playbooks/elasticsearch-cluster-failover.md): Handling Elasticsearch cluster disconnects and embedded fallback.
- [playbooks/pod-stalls-and-facilitator-recovery.md](playbooks/pod-stalls-and-facilitator-recovery.md): Unblocking stalled pod discussions and facilitator prompt recovery.
- [playbooks/conference-onboarding-scale-out.md](playbooks/conference-onboarding-scale-out.md): Handling morning registration spikes and high concurrency.
- [playbooks/attendee-moderation-and-privacy-incident.md](playbooks/attendee-moderation-and-privacy-incident.md): Attendee content moderation, privacy scrubbing, and blocking.

### 5. Blameless SRE Postmortems (`docs/postmortems/`)
- [postmortems/README.md](postmortems/README.md): Incident learning culture and postmortem index.
- [postmortems/0000-postmortem-template.md](postmortems/0000-postmortem-template.md): Blameless SRE postmortem template.
- [postmortems/PM-001-pod-formation-entropy-collapse.md](postmortems/PM-001-pod-formation-entropy-collapse.md): Pod formation monoculture collapse.
- [postmortems/PM-002-elasticsearch-connection-timeout-on-checkin-burst.md](postmortems/PM-002-elasticsearch-connection-timeout-on-checkin-burst.md): Check-in timeout burst handling.
- [postmortems/PM-003-facilitator-hallucinated-schedule-announcement.md](postmortems/PM-003-facilitator-hallucinated-schedule-announcement.md): Facilitator room hallucination.
- [postmortems/PM-004-websocket-meetup-race-condition.md](postmortems/PM-004-websocket-meetup-race-condition.md): Meetup proposal confirmation race condition.
- [postmortems/PM-005-vector-embedding-cache-poisoning.md](postmortems/PM-005-vector-embedding-cache-poisoning.md): Stale attendee embedding cache poisoning.

### 6. Knowledge Base (`docs/kb/`)
- [kb/README.md](kb/README.md): Knowledge Base hub and top symptom router.
- [kb/symptom-diagnosis-matrix.md](kb/symptom-diagnosis-matrix.md): Master Symptom → Root Cause → Fix Command table.
- [kb/faq-and-edge-cases.md](kb/faq-and-edge-cases.md): Technical FAQ, edge cases, and design rationale.
- [kb/knowledge-handling-architecture.md](kb/knowledge-handling-architecture.md): 3-Tier knowledge handling in CINDER.

### 7. Technical Papers (`docs/papers/`)
- [papers/README.md](papers/README.md): Papers index and executive reading order.
- [papers/companion-brief.md](papers/companion-brief.md): Executive summary with verified workspace metrics.
- [papers/philosophy.md](papers/philosophy.md): *A Philosophy of Conference Social Infrastructure*.
- [papers/whitepaper.md](papers/whitepaper.md): *CINDER Technical Whitepaper*.

### 8. Engineering Wiki (`docs/wiki/`)
- [wiki/README.md](wiki/README.md): Wiki portal and conceptual system map.
- [wiki/mental-models.md](wiki/mental-models.md): The core mental models of CINDER.
- [wiki/hybrid-search-and-rrf.md](wiki/hybrid-search-and-rrf.md): Mathematical guide to BM25, dense vector cosine similarity, and RRF.
- [wiki/pod-composition-algorithms.md](wiki/pod-composition-algorithms.md): Algorithms and heuristics for group composition.
- [wiki/agent-facilitator-design.md](wiki/agent-facilitator-design.md): Reactive event state machine and prompt design for AI facilitators.

### 9. Programmatic & CLI API (`docs/api/`)
- [api/README.md](api/README.md): API & CLI reference index.
- [api/public-api.md](api/public-api.md): Complete public API for CinderApp, controllers, domain models, and adapters.
- [api/cli.md](api/cli.md): CLI commands and HTTP REST API routes.
- [api/errors.md](api/errors.md): Error codes and guided error troubleshooting.

### 10. Project Plan (`docs/plan/`)
- [plan/todo.md](plan/todo.md): Ordered, dependency-safe todo list of the work remaining to complete the project.

