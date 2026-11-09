<!-- [LAYER: UI] -->
# CI Integration & Automated Verification

This document specifies the continuous integration pipelines, automated test runs, and Joyzoning architectural verification checks required for CINDER.

---

## 1. Automated Verification Pipeline

Every commit and pull request must execute two verification commands:

```bash
# 1. Native Unit & Integration Test Suite
npm test

# 2. Joyzoning Sovereign Architectural Audit
npm run check
```

Both commands must exit with status `0` for a build to be considered green.

---

## 2. GitHub Actions Workflow Configuration

To integrate CINDER into GitHub Actions, create `.github/workflows/ci.yml`:

```yaml
name: CINDER Continuous Integration

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  verify:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Run Automated Test Suites
        run: npm test

      - name: Run Joyzoning Architectural Audit
        run: npm run check
```

---

## 3. Git Pre-Commit Hook

To catch violations before pushing code, install a pre-commit hook in `.git/hooks/pre-commit`:

```bash
#!/bin/sh
set -e

echo "Running CINDER pre-commit verification..."
npm test
npm run check
echo "Pre-commit checks passed successfully!"
```

Make the hook executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## 4. Gating Criteria

A pull request will be blocked if:
- Any unit or integration test fails.
- Any source file lacks a valid zone header (`/** [LAYER: <ZONE>] */` or `<!-- [LAYER: UI] -->`).
- Any circular runtime import is detected (`SPI-201`).
- Domain logic directly imports infrastructure or UI (`SPI-206`).
- A relative import exceeds a directory depth of 3 (`SPI-105`).
- A module exceeds the hard simplicity threshold (>800 lines).

