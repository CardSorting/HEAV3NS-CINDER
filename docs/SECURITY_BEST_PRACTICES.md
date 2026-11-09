<!-- [LAYER: UI] -->
# Security Best Practices & Hardening Guide

This document describes the threat model, security posture, and defense-in-depth measures implemented in CINDER.

---

## 1. Threat Model & Attack Vectors

| Attack Vector | Risk | Mitigation in CINDER |
| :--- | :--- | :--- |
| **Path Traversal on Static Files** | Critical: Leaking server source files via HTTP `GET ../../etc/passwd` | Strict normalization via `path.normalize()`, `path.resolve()`, and explicit prefix check ensuring all requested files remain within `src/ui/web/public/`. |
| **Prompt Injection via Pod Chat** | High: Malicious attendee attempting to hijack AI Facilitator instructions | Attendee chat inputs are stripped, length-capped, and strictly delimited when parsed by `AiFacilitatorEngine.mjs`. |
| **Profile Impersonation & PII Leak** | High: Unauthorized access to private contact details | Minimal profile fields captured; raw vectors and contact data shielded behind authenticated controller methods. |
| **Elasticsearch Cluster Poisoning** | Medium: Malicious documents injected into index | Schema validation enforced by `Attendee` entity constructor prior to indexing. |
| **Denial of Service via Heavy kNN** | Medium: Slow or expensive vector distance queries | Embeddings fixed at 32 dimensions; fast dot product computation; bounded timeout (250ms) on live HTTP cluster probes. |

---

## 2. Static File Serving Security

CINDER implements native static file serving (`src/ui/web/webServer.mjs`) with explicit directory containment:

```javascript
const safePath = path.normalize(path.join(PUBLIC_DIR, reqUrl === "/" ? "index.html" : reqUrl));

// Prevent directory traversal attacks
if (!safePath.startsWith(PUBLIC_DIR)) {
  res.writeHead(403, { "Content-Type": "text/plain" });
  res.end("Forbidden: Path traversal detected");
  return;
}
```

This defense is verified in our automated test suite (`tests/web-server.test.mjs`).

---

## 3. Safe AI Facilitator Boundaries

To ensure safe agent interactions:
1. **No Shell Access:** The AI Facilitator does not possess tools to invoke child processes, execute shell commands, or write to disk.
2. **Explicit Sender Identity:** All messages emitted by the facilitator carry `senderType: "facilitator"`. Attendees cannot forge this property via the REST API.
3. **Grounding in Canonical Schedule:** Facilitator responses regarding session tracks, talk times, and room locations are cross-referenced directly against `AgendaSession` records rather than generated freely from LLM memory.

