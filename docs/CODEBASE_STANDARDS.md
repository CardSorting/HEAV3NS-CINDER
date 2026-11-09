<!-- [LAYER: UI] -->
# Codebase Standards & Engineering Discipline

This guide defines the architectural standards, coding conventions, testing rules, and design discipline enforced across the CINDER repository.

---

## 1. Architectural Sovereignty & Joyzoning

Every source file belongs to exactly one architectural zone and is tagged with its zone header in its first lines:

```
DOMAIN        Pure business models & contracts (zero I/O)
CORE          Use-case orchestration controllers (depends on domain interfaces)
INFRASTRUCTURE Concrete adapters implementing domain interfaces (Elasticsearch, HTTP, memory)
PLUMBING      Stateless leaf mathematical & string primitives (zero imports from other zones)
UI            CLI presenters, web server, public web assets, and documentation
```

### Boundary Invariants
1. **Domain Isolation:** `src/domain/` contains zero network or disk I/O, no framework imports, and no references to `src/infrastructure/` or `src/ui/`.
2. **Dependency Inversion:** `src/core/` depends only on domain entity models and domain interfaces in `src/domain/interfaces/I*.mjs`. Concrete adapters in `src/infrastructure/` are injected via constructor composition.
3. **Plumbing Purity:** `src/plumbing/` contains only pure functions. No mutable global variables or singletons.
4. **Single Composition Root:** Wires the application together in `src/core/CinderApp.mjs` and starts it from `bin/`.
5. **Zone Tagging:** Every `.mjs` file must start with `/** [LAYER: <ZONE>] */`, and every `.md` file with `<!-- [LAYER: UI] -->`.

---

## 2. ESM & Module Structure

- **Standard ES Modules:** Node.js native ESM (`import` / `export`). Always include the explicit `.mjs` file extension in import statements.
- **Relative Path Depths:** Keep import depth strictly within 3 directory steps (`../../../`).
- **No Circular Imports:** Runtime import cycles are strictly blocked (`SPI-201`).
- **File Length:** Target file size under 400 lines; maximum threshold 800 lines. Split sprawling modules before they breach the simplicity cap.

---

## 3. Error Handling Discipline

- **Constructors Validate Invariants:** Entities throw meaningful, actionable errors when instantiated with missing or invalid fields:
  ```javascript
  if (!name || typeof name !== "string") {
    throw new Error("Attendee name is required and must be a string.");
  }
  ```
- **Resilient Network I/O:** All HTTP requests to external services (like live Elasticsearch clusters) must be guarded with `AbortSignal.timeout()`:
  ```javascript
  const res = await fetch(`${this.nodeUrl}/_cluster/health`, {
    signal: AbortSignal.timeout(timeoutMs)
  });
  ```
- **Graceful Fallbacks:** Network errors must never crash the process. Fall back gracefully to embedded zero-dependency engines.

---

## 4. Testing Standards

- **Zero-Dependency Native Tests:** Tests use Node's built-in `node:test` and `node:assert/strict`.
- **Test What Matters:** Cover entity validation, algorithmic accuracy (e.g. cosine distance edge cases), controller orchestration, and API HTTP routes.
- **Do Not Weaken Tests:** Never delete, skip, or lower assertions to make code pass. If a test fails, fix the code.

---

## 5. Verification Commands

Run before every commit:

```bash
# Verify all tests pass
npm test

# Verify architectural integrity (Joyzoning audit)
npm run check
```

