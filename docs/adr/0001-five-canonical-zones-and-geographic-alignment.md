<!-- [LAYER: UI] -->
# ADR-0001: Five Canonical Zones & Geographic Alignment

## Status
Accepted

## Context
In rapid application development and AI-assisted pair programming, architectural boundaries rapidly decay. Business logic becomes entangled with HTTP servers, retrieval adapters leak into UI templates, and circular dependencies create brittle codebases that resist change and testing.

We required an architectural governance model that is machine-checkable, language-agnostic, and strictly prevents architectural erosion.

## Decision
We adopted the **Joyzoning Architectural Standard** with five canonical zones:
1. `DOMAIN` (`src/domain/`): Pure business entities and formal contracts with zero external I/O.
2. `CORE` (`src/core/`): Use case orchestrators depending on domain interfaces, never on UI.
3. `INFRASTRUCTURE` (`src/infrastructure/`): Concrete I/O adapters implementing domain interfaces.
4. `PLUMBING` (`src/plumbing/`): Stateless mathematical and algorithmic leaf helpers with zero imports from other zones.
5. `UI` (`src/ui/`, `bin/`, `docs/`): User presentation, servers, and documentation.

Every source file MUST declare its zone in its header (`/** [LAYER: <ZONE>] */` or `<!-- [LAYER: UI] -->`), and its physical directory on disk must match its zone declaration (Principle of Geographic Alignment).

## Consequences
- **Positive:** Clear mental model; 100% testable domain logic; modular architecture easily navigated by human developers and AI coding agents.
- **Negative:** Requires declaring formal interfaces in `src/domain/interfaces/` before connecting infrastructure adapters to core controllers.
- **Neutral:** Files are strictly bounded by size limits (<800 lines) and relative import depth (<=3).

## Verification
Verified via `npm run check` (`node /Users/bozoegg/Desktop/HEAV3NS-JOY/bin/joy-check.mjs .`). Must report 0 blocking violations and 100% Stability Index.

