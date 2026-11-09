<!-- [LAYER: UI] -->
# Operations & Deployment Runbook

Operating guidelines, environment configuration, server management, health checks, and cluster monitoring for CINDER in production and conference settings.

---

## 1. System Requirements

- **Node.js:** v18.0.0 or higher
- **Memory:** Minimum 512 MB RAM (1 GB recommended for 5,000+ attendees)
- **Disk:** 50 MB for application files and in-memory caches
- **Network:** Standard HTTP port 3000 (configurable via `PORT`)
- **Elasticsearch:** (Optional) Cluster running Elasticsearch 8.x with vector search enabled.

---

## 2. Environment Variables

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the CINDER web server and REST API. |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | URL of the live Elasticsearch cluster. If unreachable, CINDER automatically falls back to embedded mode. |
| `CINDER_INDEX_NAME`| `cinder_attendees` | Index name for storing attendee profiles and dense vectors. |
| `NODE_ENV` | `production` | Environment mode (`development` or `production`). |

---

## 3. Starting the Server

### Standard Launch
```bash
PORT=3000 ELASTICSEARCH_URL="http://localhost:9200" npm start
```

### Background Daemon with Process Management (PM2)
```bash
npm install -g pm2
pm2 start bin/server.mjs --name "cinder-platform" -i max
pm2 save
```

### Systemd Service Configuration
`/etc/systemd/system/cinder.service`:
```ini
[Unit]
Description=CINDER Conference Social Infrastructure
After=network.target

[Service]
Type=simple
User=cinder
WorkingDirectory=/opt/cinder
ExecStart=/usr/bin/node bin/server.mjs
Restart=always
RestartSec=5
Environment=PORT=3000
Environment=ELASTICSEARCH_URL=http://localhost:9200
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

---

## 4. Health Checks & Monitoring

CINDER exposes a standardized JSON status and health endpoint:

```bash
curl -s http://localhost:3000/api/status | jq .
```

Sample Response:
```json
{
  "appName": "CINDER",
  "tagline": "The Social Infrastructure for Conferences",
  "status": "healthy",
  "elasticsearch": {
    "live": true,
    "status": "green",
    "clusterName": "cinder-es-cluster",
    "mode": "live-elasticsearch-cluster",
    "latencyMs": 1.42,
    "docCount": 5
  },
  "attendeeCount": 5,
  "podCount": 1,
  "agendaSessionsCount": 5
}
```

### Key Health Indicators
- **`status`:** Must be `"healthy"`.
- **`elasticsearch.mode`:** `"live-elasticsearch-cluster"` when attached to a live cluster, or `"embedded-es-engine"` when running in self-contained mode.
- **`elasticsearch.latencyMs`:** Cluster ping latency; should remain under 50ms in on-premise conference networks.
- **`attendeeCount`:** Current total registered attendees.

---

## 5. Failover & Incident Response

- If Elasticsearch cluster drops, CINDER automatically reroutes queries to its in-memory BM25 and vector math engine within 250ms without dropping HTTP connections.
- For cluster failover runbooks, see [playbooks/elasticsearch-cluster-failover.md](playbooks/elasticsearch-cluster-failover.md).
- For pod chat stalls, see [playbooks/pod-stalls-and-facilitator-recovery.md](playbooks/pod-stalls-and-facilitator-recovery.md).

