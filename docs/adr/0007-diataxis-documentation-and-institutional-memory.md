<!-- [LAYER: UI] -->
# ADR-0007: Diátaxis + Institutional Memory Documentation Architecture

## Status
Accepted

## Context
Codebases suffer from fragmented, outdated, or unstructured documentation. Without a clear governance model, onboarding is painful, architectural decisions are forgotten, and incidents repeat because operational lessons are not codified into living runbooks.

## Decision
We adopted the **Diátaxis + Institutional Memory Documentation Architecture**:
1. **Four Diátaxis Quadrants:**
   - **Tutorials:** [docs/GETTING_STARTED.md](../GETTING_STARTED.md) for 10-minute newcomer onboarding.
   - **How-To / Playbooks:** [docs/playbooks/](../playbooks/README.md) for operational incident remediation.
   - **Reference:** [docs/api/](../api/README.md), [docs/PROJECT_MAP.md](../PROJECT_MAP.md), and [docs/GLOSSARY.md](../GLOSSARY.md).
   - **Explanation:** [docs/wiki/](../wiki/README.md) and [docs/papers/](../papers/README.md).
2. **Three Institutional Memory Pillars:**
   - **ADRs:** [docs/adr/](README.md) capturing decision provenance.
   - **Postmortems:** [docs/postmortems/](../postmortems/README.md) capturing blameless failure analysis.
   - **Knowledge Base:** [docs/kb/](../kb/README.md) with symptom diagnosis and technical FAQs.
3. **Joyzoning Tagging:** All documentation markdown files are tagged with `<!-- [LAYER: UI] -->` and audited for dead links and structural validity.

## Consequences
- **Positive:** World-class developer onboarding; institutional memory preserved across contributors and AI agents; complete traceability between code and docs.
- **Negative:** Requires maintainers to write ADRs and update docs when modifying architectural patterns.
- **Neutral:** Directory setup mirrors industry-leading engineering organizations (e.g. Stripe, Backstage, Google SRE).

## Verification
Verified via `npm run check` and manual link audit across all markdown files.

