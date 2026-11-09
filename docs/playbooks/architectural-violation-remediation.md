<!-- [LAYER: UI] -->
# Playbook PB-01: Architectural Violation Remediation

## Triage at a glance
- **Trigger:** `npm run check` fails with exit code `1` or reports blocking violations (`SPI-201`, `SPI-206`, `SPI-105`, `SPI-107`).
- **Impact:** Pull requests blocked; potential architecture erosion.
- **Severity:** `SEV-4`
- **Owner:** Author of the offending commit.

## Remediation steps

### Case 1: Missing Zone Header (`SPI-107`)
1. Determine the correct zone of the file by inspecting its directory path:
   - `src/domain/` → `DOMAIN`
   - `src/core/` → `CORE`
   - `src/infrastructure/` → `INFRASTRUCTURE`
   - `src/plumbing/` → `PLUMBING`
   - `src/ui/`, `bin/`, `docs/` → `UI`
2. Add the zone header at line 1 of the file:
   - For JavaScript: `/** [LAYER: <ZONE>] */`
   - For Markdown: `<!-- [LAYER: <ZONE>] -->`
3. Rerun `npm run check`.

### Case 2: Domain Layer Leaking Infrastructure (`SPI-206`)
1. Identify the file in `src/domain/` that imports from `src/infrastructure/` or `src/ui/`.
2. Extract the dependency into an interface in `src/domain/interfaces/I<Name>.mjs`.
3. Have the infrastructure class implement that interface.
4. Inject the interface into the core controller rather than calling it directly from domain entities.

### Case 3: Circular Dependency (`SPI-201`)
1. Run `node /Users/bozoegg/Desktop/HEAV3NS-JOY/bin/joy-check.mjs . --format verbose` to inspect the cycle path (e.g. `A -> B -> A`).
2. Extract the shared types or functions into a stateless helper in `src/plumbing/` or a domain model in `src/domain/`.
3. Update imports in both files to import from the new leaf location.

## Verification
Run the Joyzoning audit:
```bash
npm run check
```
Must report `Blocking Violations (0): None. 100% Joyzoning Conformance.` and exit with code `0`.

