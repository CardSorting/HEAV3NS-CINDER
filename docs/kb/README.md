<!-- [LAYER: UI] -->
# Knowledge Base & Troubleshooting Portal

This knowledge base collects symptoms, diagnostic checklists, technical FAQs, edge cases, and architectural knowledge handling guides for CINDER.

---

## Knowledge Base Articles

| Article | Focus | Key Topics |
| :--- | :--- | :--- |
| [symptom-diagnosis-matrix.md](symptom-diagnosis-matrix.md) | Operational Diagnostics | Master Symptom → Root Cause → Fix Command table |
| [faq-and-edge-cases.md](faq-and-edge-cases.md) | Technical FAQ | Design choices, offline operation, vector dimensions, and edge cases |
| [knowledge-handling-architecture.md](knowledge-handling-architecture.md) | Knowledge Architecture | 3-Tier Knowledge handling: runtime state, event logs, and persistent docs |

---

## Top 5 Quick Diagnostic Shortcuts

1. **"Is Elasticsearch connected or running in embedded mode?"**
   ```bash
   curl -s http://localhost:3000/api/status | jq .elasticsearch.mode
   ```
2. **"Why did my Joyzoning check fail?"**
   ```bash
   node /Users/bozoegg/Desktop/HEAV3NS-JOY/bin/joy-check.mjs . --format compact
   ```
3. **"How do I run the full 10-step conference scenario from CLI?"**
   ```bash
   npm run demo
   ```
4. **"How do I verify all test assertions pass?"**
   ```bash
   npm test
   ```
5. **"How do I inspect registered attendees?"**
   ```bash
   curl -s http://localhost:3000/api/attendees | jq .
   ```

