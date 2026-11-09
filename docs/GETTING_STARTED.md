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

# Run all automated tests (all 28 tests across 6 suites should pass)
npm test

# Run the Joyzoning architectural audit (verifies 0 leaks, 0 cycles)
npm run check
```

Expected output from `npm test`:
```
ℹ tests 28
ℹ suites 6
ℹ pass 28
ℹ fail 0
```

---

## 2. Run the 10-Step Demonstration Scenario

Execute the end-to-end hackathon scenario via the CLI:

```bash
npm run demo
# or
node bin/demo.mjs
```

Observe the 10 continuous steps rendered in your terminal:
1. **Check In:** Registers 5 realistic attendees (Alex Chen, Maya Lin, David Kim, Priya Patel, Marcus Vance) with technical skills, current projects, and collaboration objectives.
2. **Elasticsearch Indexing:** Automatically extracts and vectorizes profile texts into 32-dimensional normalized vectors and indexes them alongside BM25 text fields.
3. **Hybrid Discovery & Match Synergy:** Alex Chen receives candidate recommendations using combined BM25 and dense vector kNN retrieval with an AI-generated match headline and synergy summary.
4. **Swipe & Mutual Connection:** Alex likes Maya, and Maya likes Alex, creating a verified Mutual Match.
5. **Intelligent Pod Formation:** System calculates semantic centroid and discipline diversity, automatically composing Pod 07 ("Cloud-Native Autonomous Agents").
6. **Dedicated Space Provisioning:** Persistent group channel provisioned with agenda metadata and member roster.
7. **AI Facilitator Welcome:** The AI Facilitator greets Pod 07, explains why their skills complement each other, and prompts initial introductions.
8. **Physical Meetup Proposal:** Member suggests a physical lunch meetup at the Main Hall Cafe.
9. **Meetup Confirmation & Pinning:** The AI Facilitator checks the conference agenda, confirms the slot (12:30 PM), and pins the location to the Pod channel header.
10. **Agenda Coordination & Prompting:** Facilitator alerts the Pod to the upcoming Keynote Session and delivers an architectural discussion prompt.

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

