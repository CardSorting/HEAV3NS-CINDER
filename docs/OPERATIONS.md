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

Read from `.env` at the repository root (copy [`.env.example`](../.env.example); git-ignored) merged with the process
environment, which wins. The API key is only ever used server-side.

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the CINDER web server and REST API. |
| `ES_URL` | — | Elasticsearch / Elastic Serverless endpoint. Unset = offline seed data. |
| `ES_API_KEY` | — | API key (`Authorization: ApiKey …`). Unset = offline seed data. |
| `ES_INDEX` | `eventapp` | Events index (selectable events have `cinder.enabled: true`). |
| `ES_CINDER_PREFIX` | `cinder-` | Prefix of the nine CINDER indices; `ES_INDEX_<NAME>` overrides one (e.g. `ES_INDEX_PODS`). |
| `CINDER_DEMO_EVENT_ID` | — | Event used when a request names none (`urn:ue:event:devsummit-2026`). |
| `CINDER_DEMO_TIME` | real time | Demo clock start, e.g. `2026-12-23T11:45:00-07:00`. |
| `CINDER_DEMO_FROZEN` | `false` | `true` = the demo clock does not advance. |
| `CINDER_OFFLINE` | `false` | `true` = ignore the cluster and run on offline seed data. |

### Data tooling

Run from the repository root against the cluster in `.env`; details in [elasticsearch/README.md](../elasticsearch/README.md).

```bash
python3 elasticsearch/cinder/generate.py setup     # pipelines + missing cinder-* indices (non-destructive)
python3 elasticsearch/cinder/generate.py build     # generate, embed, bulk-load the event data (~15 min)
python3 elasticsearch/cinder/generate.py reset     # delete synthetic reference docs
npm run seed:demo [-- --event <id>]                # the five scripted demo attendees, via the app's check-in path
python3 elasticsearch/cinder/verify.py [eventId]   # smoke-test the app's queries
python3 elasticsearch/cinder/compat_check.py       # src/ still fits the strict mappings
npm run eval:discovery                             # compare discovery tunings (read-only)
npm run test:live                                  # opt-in live tests
```

The runtime indices (`cinder-pods`, `cinder-interactions`, `cinder-messages`) are written by the app; a live `npm run demo`
adds one Pod, its messages and a match each run.

---

## 3. Starting the Server

### Standard Launch
```bash
npm start                      # API + React UI; live when .env is configured
CINDER_OFFLINE=true npm start  # offline seed data
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
EnvironmentFile=/opt/cinder/.env
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

- The data mode is chosen at startup: if the cluster does not answer the probe (`GET /`, 5 s timeout, one retry), CINDER starts offline on seed data and reports `dataMode: "offline"` with the `fallbackReason` in `/api/status`. A live process does not switch modes mid-run; if the cluster drops, restart (with `CINDER_OFFLINE=true` to force offline).
- For cluster failover runbooks, see [playbooks/elasticsearch-cluster-failover.md](playbooks/elasticsearch-cluster-failover.md).
- For pod chat stalls, see [playbooks/pod-stalls-and-facilitator-recovery.md](playbooks/pod-stalls-and-facilitator-recovery.md).

