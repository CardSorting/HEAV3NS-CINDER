<!-- [LAYER: UI] -->
# Getting Started with CINDER

A hands-on, 10-minute onboarding tutorial: clone the repository, run automated tests, execute the 10-step conference networking demonstration, and interact with the live web application.

---

## Prerequisites

- **Node.js:** v18.0.0 or later (`node -v`)
- **Git:** Installed and configured
- **Dependencies:** **Zero external npm packages to install.** CINDER uses native ECMAScript Modules (`node:http`, `node:fs`, `node:crypto`).
- *(Optional)* A running Elasticsearch 8+ cluster accessible at `http://localhost:9200`. If absent, CINDER automatically activates its embedded search engine with zero configuration.

---

## 1. Clone & Verify Baseline

```bash
git clone https://github.com/CardSorting/elasticsearch.git
cd elasticsearch

# Run all automated tests (offline; every test should pass)
npm test

# Run the Joyzoning architectural audit (verifies 0 leaks, 0 cycles)
npm run check
```

Expected output from `npm test` ends with `ℹ fail 0`.

---

## 2. Run the 10-Step Demonstration Scenario

Execute the end-to-end hackathon scenario via the CLI:

```bash
npm run demo              # live when .env is configured (see below), else offline
npm run demo -- --offline # always the offline seed event
```

Observe the 10 continuous steps rendered in your terminal.
The ten steps run against one event: the live demo event (`CINDER_DEMO_EVENT_ID`) or the offline seed event.
Nothing about the venue is scripted: the Pod theme, the meetup place and time, and the agenda alert come from that event's
attendees, agenda and spaces.

1. **Attendee Registration:** The event's registrations are loaded (165 live, 5 offline) and the five-person demo cast is shown.
2. **Elasticsearch Indexing:** Profiles are embedded (1024-dim Jina embeddings live, 32-dim hashed vectors offline) next to BM25 text fields.
3. **Hybrid Search & Explanation:** Weighted RRF over BM25, profile kNN and `looking_for` kNN finds Maya Lin for Alex Chen (#1 live) with the reasons.
4. **Swipe & Mutual Connection:** Alex and Maya like each other, forming a mutual match.
5. **Intelligent Pod Composition:** The Pod is filled by kNN around the seeds' centroid with a discipline-diversity cap, and named after shared interests (live: "Pod 07: eBPF & Kubernetes").
6. **Dedicated Space Provisioning:** The Pod's channel is created.
7. **AI Facilitator Welcome:** The facilitator greets the Pod and names the next social slot on the agenda.
8. **Physical Meetup Proposal:** A member proposes lunch at the next social slot's time.
9. **Meetup Confirmation & Pinning:** The facilitator resolves the place and time from the agenda and venue (live: Exhibit Hall, 12:15 PM, "starts in 30 minutes") and pins it.
10. **Agenda Coordination & Prompting:** The facilitator alerts the Pod to the upcoming talk most relevant to it and posts a discussion prompt.

### Run it live: connect Elasticsearch

Without configuration CINDER runs **offline** on its built-in seed event (Cloud & AI Summit 2026, five attendees, in-memory engine).
To run against an Elastic cluster with the generated event data:

```bash
cp .env.example .env             # then set ES_URL and ES_API_KEY (.env is git-ignored; the key stays server-side)
python3 elasticsearch/cinder/generate.py setup    # pipelines + any missing cinder-* indices (non-destructive)
python3 elasticsearch/cinder/generate.py build    # generate, embed and load the event data (~15 min, one time)
npm run seed:demo                # add the five scripted demo attendees to CINDER_DEMO_EVENT_ID
npm run demo                     # ten-step scenario, live (≈40 s; writes one Pod, its messages and a match)
npm start                        # API + React UI, live
```

`.env` also sets the demo event (`CINDER_DEMO_EVENT_ID`, DevSummit 2026) and the demo clock (`CINDER_DEMO_TIME`,
30 minutes before day-one lunch). The server and CLI print `LIVE` or `OFFLINE` at startup; if the cluster does not answer
the startup probe (5 s, one retry) they fall back to offline seed data. Force offline with `CINDER_OFFLINE=true` or
`npm run demo -- --offline`. Data tooling and index details: [elasticsearch/README.md](../elasticsearch/README.md).

---

## 3. Launch the Interactive Web Platform

Start the local HTTP web server:

```bash
npm start
# or
node bin/server.mjs
```

Open **`http://localhost:3000`** in your browser.

### Key Interactive Features in the Web App
1. **Swipeable Attendee Feed:**
   - Browse attendees.
   - Inspect their technical interests, current projects, and synergy scores.
   - Click **Like** or **Pass** to record swipes.
2. **Interactive Pod Chat:**
   - Select Pod 07 from the channel list.
   - Send chat messages as an attendee.
   - Watch the AI Facilitator reply to meetup proposals in real time.
3. **One-Click Scenario Trigger:**
   - Click the **Run 10-Step Demo** button in the header.
   - Watch the live activity log stream as each scenario step executes.
4. **Live Cluster Indicator:**
   - The top banner shows Elasticsearch connection health, latency, active mode (`live-elasticsearch-cluster` or `embedded-es-engine`), and total indexed attendees.

---

## 4. Explore the Unified CLI Binary

The CINDER CLI provides quick commands for scripting and inspections:

```bash
# View help
node bin/cinder.mjs help

# Inspect cluster and repository state as formatted JSON
node bin/cinder.mjs status

# Run the demonstration scenario
node bin/cinder.mjs demo

# Start the web server
node bin/cinder.mjs server
```

---

## 5. Architectural Health & Joyzoning

CINDER uses **Joyzoning** to maintain clean boundaries between business rules, retrieval adapters, and user interfaces:

```bash
npm run check
```

- If you create or modify a file, ensure it resides in the appropriate directory (`src/domain/`, `src/core/`, `src/infrastructure/`, `src/plumbing/`, `src/ui/`).
- Tag the top of every file with its layer comment (e.g. `/** [LAYER: CORE] */` or `<!-- [LAYER: UI] -->`).
- Domain logic must remain pure with zero external I/O.

---

## Next Steps

- **Understand the Architecture:** Read [architecture/current.md](architecture/current.md).
- **Inspect the API & Code:** Read [api/public-api.md](api/public-api.md) and [PROJECT_MAP.md](PROJECT_MAP.md).
- **Learn the Algorithms:** Read [wiki/hybrid-search-and-rrf.md](wiki/hybrid-search-and-rrf.md) and [wiki/pod-composition-algorithms.md](wiki/pod-composition-algorithms.md).
- **Using an AI Agent?** Review [AGENT_STACK.md](AGENT_STACK.md) and [../AGENTS.md](../AGENTS.md).

