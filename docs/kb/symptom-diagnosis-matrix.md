<!-- [LAYER: UI] -->
# Symptom Diagnosis Matrix

Master symptom-to-diagnosis and remediation reference for CINDER.

---

## Diagnostic Matrix

| Symptom | Root Cause | Fix Command / Action | Reference |
| :--- | :--- | :--- | :--- |
| **`npm run check` exits with code 1** | Missing zone header or illegal cross-zone import (`SPI-206`, `SPI-201`, `SPI-107`) | Add `/** [LAYER: <ZONE>] */` or `<!-- [LAYER: UI] -->` to line 1; extract interface in `src/domain/interfaces/`. | [playbooks/architectural-violation-remediation.md](../playbooks/architectural-violation-remediation.md) |
| **`/api/status` shows `mode: "embedded-es-engine"`** | Live Elasticsearch cluster unreachable or timed out (>250ms) | Check `http://localhost:9200/_cluster/health` or ensure docker container is running. | [playbooks/elasticsearch-cluster-failover.md](../playbooks/elasticsearch-cluster-failover.md) |
| **Discovery feed returns 0 candidates** | No attendees registered yet, or all candidates were already swiped on | Register attendees via `POST /api/checkin` or re-initialize seed data via `node bin/demo.mjs`. | [api/public-api.md](../api/public-api.md) |
| **AI Facilitator does not confirm meetup** | Proposed meeting time does not match regex or falls outside conference breaks | Include clear time and location, e.g. `"Let's meet at Main Hall Cafe at 12:30"`. | [AGENT_STACK.md](../AGENT_STACK.md) |
| **HTTP 403 Forbidden on static assets** | Attempted path traversal or requested file outside `src/ui/web/public/` | Request paths must reside strictly within public directory; verify file exists. | [SECURITY_BEST_PRACTICES.md](../SECURITY_BEST_PRACTICES.md) |
| **Pods have only 2 members** | Insufficient candidate pool or strict mutual match threshold | Relax threshold or register additional attendees to reach target 4–6 cohort size. | [wiki/pod-composition-algorithms.md](../wiki/pod-composition-algorithms.md) |
| **Swipe does not trigger mutual match** | Target attendee has not swiped `LIKE` on source attendee | Swipe `LIKE` from both profiles to establish mutual connection. | [adr/0003-pod-composition-and-diversity-balance.md](../adr/0003-pod-composition-and-diversity-balance.md) |

