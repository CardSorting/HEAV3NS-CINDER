<!-- [LAYER: UI] -->
# Contributing to CINDER

Thank you for your interest in improving CINDER! As an intelligent, agent-facilitated social coordination platform, CINDER is designed for intentional conference networking.

This guide outlines our development workflow, architectural conventions, testing standards, and contribution processes.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Architectural Principles & Joyzoning](#architectural-principles--joyzoning)
- [Getting Started with Local Development](#getting-started-with-local-development)
- [Development Workflow](#development-workflow)
- [Coding Conventions](#coding-conventions)
- [Testing & Verification](#testing--verification)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Need Help?](#need-help)

---

## Code of Conduct

All contributors and participants in the CINDER project are expected to adhere to our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Please treat everyone with respect, kindness, and professional courtesy.

---

## Architectural Principles & Joyzoning

CINDER enforces the **Joyzoning Architectural Standard** ([AGENTS.md](AGENTS.md) and [docs/CODEBASE_STANDARDS.md](docs/CODEBASE_STANDARDS.md)). Every source file belongs to exactly one architectural zone and MUST begin with a zone header tag:

| Zone | Folder | Header Tag | Invariants |
| :--- | :--- | :--- | :--- |
| `DOMAIN` | `src/domain/` | `/** [LAYER: DOMAIN] */` | Pure business rules and entities; zero I/O; no imports from infrastructure or UI. |
| `CORE` | `src/core/` | `/** [LAYER: CORE] */` | Use-case orchestration; depends on domain models and formal domain interfaces (`I*`); never imports UI. |
| `INFRASTRUCTURE` | `src/infrastructure/` | `/** [LAYER: INFRASTRUCTURE] */` | External adapters (Elasticsearch, memory stores, AI engines); implements domain interfaces; never imports UI. |
| `PLUMBING` | `src/plumbing/` | `/** [LAYER: PLUMBING] */` | Stateless mathematical and algorithmic leaf helpers (BM25, vector cosine math, RRF); imports no other zone; zero mutable global state. |
| `UI` | `src/ui/`, `bin/`, `docs/` | `/** [LAYER: UI] */` or `<!-- [LAYER: UI] -->` | Presentation, CLI presenters, web server, and documentation. |

### Strict Invariants
1. **Producer before Consumer:** Modify domain entities and plumbing math before updating core controllers and UI presentation.
2. **Dependency Inversion:** Core controllers MUST depend on interfaces (`src/domain/interfaces/I*`), not concrete infrastructure implementations.
3. **No Circular Imports:** Runtime import cycles are strictly blocked (`SPI-201`).
4. **Relative Path Depth:** Maximum relative import depth is 3 (`../../../`).

---

## Getting Started with Local Development

### 1. Prerequisites
- **Node.js:** v18.0.0 or later (`node -v`)
- **Git:** 2.30+
- **Zero external npm dependencies:** CINDER uses standard native Node.js ESM. No `npm install` of third-party libraries is required.
- *(Optional)* Live Elasticsearch 8+ on `http://localhost:9200`.

### 2. Fork and Clone
```bash
git clone https://github.com/CardSorting/elasticsearch.git
cd elasticsearch
```

### 3. Verify Baseline
Run the automated test suite and Joyzoning integrity audit:
```bash
npm test
npm run check
```
Both commands must exit with code `0`.

---

## Development Workflow

1. **Branch Naming:** Create a focused branch off `main`:
   ```bash
   git checkout -b feat/pod-diversity-scoring
   # or
   git checkout -b fix/es-connection-timeout
   ```
2. **Scoped Check Loop:**
   - Before editing: verify current baseline with `npm run check`.
   - After editing: verify the modified file using `npm run check` and `npm test`.
3. **Keep Diffs Focused:** Do not introduce unrelated refactorings or reformat entire files.

---

## Coding Conventions

- **Language:** Native ECMAScript Modules (`.mjs` or `"type": "module"` in `package.json`).
- **Formatting:** 2 spaces indentation, double quotes for strings, semicolons enabled.
- **Pure Functions in Plumbing:** All functions in `src/plumbing/` must be pure and stateless.
- **Fail Fast & Explicitly:** Validate entity inputs at instantiation (e.g. `Attendee` constructor).
- **No Test Weakening:** Never skip, delete, or relax existing tests to make changes pass.

---

## Testing & Verification

CINDER relies on Node's built-in test runner (`node --test`).

```bash
# Run all tests
npm test

# Run a specific test suite
node --test tests/elasticsearch.test.mjs
node --test tests/matching-and-pods.test.mjs
node --test tests/scenario.test.mjs
```

Ensure new features have corresponding test cases covering:
- Happy paths.
- Empty or invalid input handling.
- Boundary conditions.
- Elasticsearch cluster unreachable fallback scenarios.

---

## Submitting a Pull Request

1. Push your branch to GitHub.
2. Open a Pull Request against `main`.
3. Provide a clear description referencing:
   - What was changed.
   - Why the change was made.
   - Verification record (tests run, Joyzoning check result).
4. Verify that CI passes all tests and Joyzoning checks.

---

## Need Help?

- Check the [docs/README.md](docs/README.md) hub.
- Read our [docs/kb/faq-and-edge-cases.md](docs/kb/faq-and-edge-cases.md).
- Open a GitHub issue or discussion topic.

