<!-- [LAYER: UI] -->
# Release Policy & Governance

This document describes the release engineering cycle, semantic versioning rules, and verification checklists for CINDER.

---

## 1. Semantic Versioning

CINDER adheres strictly to [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR (X.0.0):** Breaking architectural changes, incompatible domain model updates, or removed API endpoints.
- **MINOR (1.X.0):** New backwards-compatible features (e.g. multi-track schedule ingestion, new discovery filters, enhanced facilitator capabilities).
- **PATCH (1.0.X):** Backwards-compatible bug fixes, performance optimizations, or documentation corrections.

---

## 2. Release Verification Gate

No release may be tagged or published without passing the verification triad:

```bash
# 1. Native Unit & Integration Tests (100% pass)
npm test

# 2. Joyzoning Sovereign Architecture Check (0 violations)
npm run check

# 3. 10-Step Scenario Smoke Run (all 10 steps green)
npm run demo
```

---

## 3. Step-by-Step Release Procedure

1. **Verify Branch Cleanliness:**
   ```bash
   git status
   git checkout main
   git pull origin main
   ```
2. **Execute Full Test Triad:**
   ```bash
   npm test && npm run check && npm run demo
   ```
3. **Bump Version:**
   Update `"version"` in `package.json`:
   ```bash
   npm version 1.1.0 --no-git-tag-version
   ```
4. **Update Changelog:**
   Add new release section in `CHANGELOG.md` with:
   - Added features
   - Fixed issues
   - Security improvements
5. **Commit and Tag:**
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore(release): v1.1.0"
   git tag -a v1.1.0 -m "Release v1.1.0"
   git push origin main --tags
   ```

