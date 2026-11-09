<!-- joy:begin agents -->
## Joyzoning — architecture protocol (HEAV3NS-JOY 1.0.0)

Every source file belongs to exactly one zone, tagged in its first 10,000 characters
(`/** [LAYER: DOMAIN] */`, `# [LAYER: CORE]`, `<!-- [LAYER: UI] -->` …) and matching its folder.

| Zone | Folder | Rule |
| :--- | :--- | :--- |
| `DOMAIN` | `src/domain/` | pure business rules and interfaces (`src/domain/interfaces/I*`); zero I/O; imports nothing from infrastructure or ui |
| `CORE` | `src/core/` | use-case orchestration; depends on domain interfaces, never on ui |
| `INFRASTRUCTURE` | `src/infrastructure/` | concrete I/O adapters implementing domain interfaces; never imports ui |
| `PLUMBING` | `src/plumbing/ or src/utils/` | stateless leaf helpers; imports no other zone; no mutable top-level state |
| `UI` | `src/ui/` | rendering and user intent; reaches infrastructure only through core |

Also: relative imports use at most 3 `../`; no runtime import cycles; core depends on `I<Name>` interfaces in `src/domain/interfaces/`;
files stay under ~800 lines. Build producers (plumbing, domain, infrastructure) before consumers (core, ui).

### Loop (cheap in tokens)
1. Before editing: `npx -y heav3ns-joy@1.0.0 check . --phase pre-edit --scope <file> --neighborhood 1 --format compact`
2. After editing: `npx -y heav3ns-joy@1.0.0 check . --phase post-edit --scope <file> --format compact`
3. Exit `0` = done (`[INFO]` is optional) · `1` = fix each blocking finding · `2` = you mis-invoked the tool (never treat as success).
4. Explain any code: `npx -y heav3ns-joy@1.0.0 check --explain SPI-206`. Fix headers: `npx -y heav3ns-joy@1.0.0 check . --heal --dry-run`, review, then `--heal`.
5. Never weaken config to make a check pass; report the finding instead. Stop after 3 failed attempts on one finding.

### Durable work primitives (no harness integration needed)
- `npx -y heav3ns-joy@1.0.0 trinity selftest` then `npx -y heav3ns-joy@1.0.0 trinity --help`: durable queue (`queue add|list|drain`), buffered tables (`db push|select`), specialist swarm.
- Swarm without touching your harness: `swarm plan --task "<goal>" --id f1` → loop `swarm next f1` / `swarm report f1 --assignment <id> --status completed --summary "<evidence>"` → `swarm finish f1`.
- Output is one JSON document on stdout; exit `0` ok, `1` failure (read `error.message`), `2` usage error (follow the `hint`).
- If MCP tools named `joy_*` are available, prefer them: same operations, typed arguments.

Skills `joyzoning`, `joy-trinity`, `joy-swarm` hold the details; `SOUL.md` holds the working principles. Health check: `npx -y heav3ns-joy@1.0.0 doctor`.
<!-- joy:end agents -->
