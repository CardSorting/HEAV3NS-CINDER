<!-- [LAYER: UI] -->
# Error Catalog & Diagnostic Guidance

This document catalogs domain validation errors, network exceptions, HTTP status codes, and Joyzoning violation codes in CINDER.

---

## 1. Domain Validation Errors

Thrown synchronously by entity constructors in `src/domain/`:

| Error Message | Originating Entity | Cause | Solution |
| :--- | :--- | :--- | :--- |
| `"Attendee name is required and must be a string."` | `Attendee` | Registration payload omitted name or passed non-string. | Provide valid attendee full name. |
| `"Attendee role is required."` | `Attendee` | Missing role or title during check-in. | Provide title/role (e.g. "Senior Platform Engineer"). |
| `"Pod name is required."` | `Pod` | Attempted to create a Pod without a name. | Provide descriptive Pod name. |
| `"Message text is required."` | `Message` | Blank or whitespace-only message submitted. | Ensure message text contains at least one character. |
| `"AgendaSession title, startTime, and endTime are required."` | `AgendaSession` | Incomplete schedule session record. | Verify agenda seed data provides complete time boundaries. |

---

## 2. Infrastructure & Network Exceptions

Handled by adapters in `src/infrastructure/`:

| Exception Condition | Adapter | Behavior | Remediation |
| :--- | :--- | :--- | :--- |
| **Fetch Timeout (> 250ms)** | `ElasticsearchClient` | Automatically catches `AbortError` and switches to embedded engine. | No action required; system runs in embedded fallback. Inspect cluster health if live mode desired. |
| **Connection Refused (ECONNREFUSED)** | `ElasticsearchClient` | Catches connection error, logs advisory, activates embedded engine. | Check if Elasticsearch service is running on `http://localhost:9200`. |
| **Malformed JSON Body** | `webServer.mjs` | Catches `SyntaxError` during request body parsing, responds `400 Bad Request`. | Verify client sends valid JSON with `Content-Type: application/json`. |
| **Path Traversal Attack** | `webServer.mjs` | Path does not start with `PUBLIC_DIR`, responds `403 Forbidden`. | Request valid static assets within `src/ui/web/public/`. |

---

## 3. Joyzoning Diagnostic Codes

Reported by `npm run check`:

| Code | Type | Description |
| :--- | :--- | :--- |
| **`SPI-107`** | Blocking | Missing zone header tag on source file. |
| **`SPI-201`** | Blocking | Circular dependency cycle detected. |
| **`SPI-206`** | Blocking | Domain layer violates isolation by importing infrastructure or UI. |
| **`SPI-105`** | Blocking | Relative import path exceeds allowed depth (`> 3`). |
| **`SPI-207`** | Advisory | Tarjan articulation bridge node detected in module graph (informational). |

