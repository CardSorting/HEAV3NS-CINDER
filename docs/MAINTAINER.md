<!-- [LAYER: UI] -->
# Maintainer Guide

Guidelines for repository maintainers, code reviewers, and release engineers for CINDER.

---

## 1. Review Checklist for Pull Requests

Before approving and merging any Pull Request, ensure:

- [ ] **Tests Pass:** Native test suite runs green: `npm test` (all 28 tests pass).
- [ ] **Joyzoning Passes:** Structural audit passes: `npm run check` (0 blocking violations).
- [ ] **Layer Headers Present:** Every new or edited source file has a valid layer tag (`/** [LAYER: <ZONE>] */` or `<!-- [LAYER: UI] -->`).
- [ ] **Dependency Inversion Respected:** Core controllers never instantiate infrastructure classes directly; they accept interfaces through constructor injection.
- [ ] **No New Runtime Dependencies:** CINDER maintains a strict zero external npm dependency policy. Standard Node.js APIs must be used.
- [ ] **Documentation Updated:** Any new feature or changed behavior is reflected in the appropriate Diátaxis documentation quadrant (`docs/api/`, `docs/playbooks/`, or `docs/wiki/`).

---

## 2. Triage & Issue Management

- **Bug Reports:** Reproduce the bug using an isolated test case in `tests/`. Verify if the issue occurs in live cluster mode, embedded mode, or both.
- **Architectural Drift:** If a contributor attempts to import infrastructure into domain code, politely guide them to [docs/CODEBASE_STANDARDS.md](CODEBASE_STANDARDS.md) and demonstrate how to define an interface in `src/domain/interfaces/`.
- **Feature Requests:** Evaluate against [docs/CONSTITUTION.md](CONSTITUTION.md) to ensure attendee agency and privacy are preserved.

---

## 3. Release Procedure

When cutting a new release (e.g. `1.1.0`):

1. Verify working branch is clean and synced with `main`.
2. Run full verification:
   ```bash
   npm test
   npm run check
   npm run demo
   ```
3. Update version in `package.json`.
4. Document changes in `CHANGELOG.md` under the new version header.
5. Commit and tag:
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: release v1.1.0"
   git tag -a v1.1.0 -m "Release v1.1.0"
   git push origin main --tags
   ```

See [docs/RELEASING.md](RELEASING.md) for full release governance.

