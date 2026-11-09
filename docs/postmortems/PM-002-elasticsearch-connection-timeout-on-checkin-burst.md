<!-- [LAYER: UI] -->
# PM-002: Elasticsearch Connection Timeout on Check-In Burst

## Summary
- **Incident Date:** 2026-11-09
- **Severity:** `SEV-1`
- **Impact Duration:** 12 minutes
- **Customer Impact:** Attendees scanning QR codes at conference registration were greeted with HTTP 504 Gateway Timeout errors; check-in queue stalled at the front door.
- **Lead Investigator:** Infrastructure Team Lead

## Root cause
During morning registration, 300 attendees scanned QR codes within a 90-second window. The node-fetch call to external Elasticsearch at `http://localhost:9200` lacked a strict connection timeout, causing worker threads to hang indefinitely on a saturated TCP socket backlog.

### 5 Whys
1. **Why did check-in requests hang?** The HTTP calls to Elasticsearch did not complete or abort.
2. **Why didn't they complete?** Elasticsearch was under high garbage collection pressure from bulk indexing requests.
3. **Why didn't the client abort the request?** The fetch call lacked an `AbortSignal.timeout()` parameter.
4. **Why didn't CINDER fall back to embedded mode?** Embedded mode was only activated if an error was caught, but pending promises never resolved or threw.
5. **Why was there no timeout safeguard?** Development environments had sub-millisecond local network response times, obscuring high-load network stalls.

## Action items
| Item | Type | Owner | Status | Tracking Issue / PR |
| :--- | :--- | :--- | :--- | :--- |
| Add bounded 250ms `AbortSignal.timeout(250)` to all Elasticsearch probes in `ElasticsearchClient.mjs` | Preventative | Infra Team | Done | PR #18 |
| Implement zero-dependency embedded fallback engine that activates instantly on probe timeout | Architectural | Architecture Lead | Done | PR #19 |
| Add test suite `tests/elasticsearch.test.mjs` testing latency-bounded fallback | Preventative | SRE | Done | PR #21 |

## Lessons learned
- **What went well:** The embedded fallback engine architecture design allowed seamless in-process failover without needing separate microservices.
- **What went poorly:** The lack of bounded fetch timeouts allowed unhandled network stalls to exhaust the Node event loop.
- **Where we got lucky:** The on-site infrastructure team was able to switch the server to embedded mode via environment variable within 12 minutes.

