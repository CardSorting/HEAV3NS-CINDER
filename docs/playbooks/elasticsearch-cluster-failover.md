<!-- [LAYER: UI] -->
# Playbook PB-02: Elasticsearch Cluster Failover & Recovery

## Triage at a glance
- **Trigger:** Health endpoint `/api/status` reports `elasticsearch.mode: "embedded-es-engine"` when live cluster was expected, or cluster latency exceeds 500ms.
- **Impact:** Live cluster indexing paused; fallback engine active in process memory.
- **Severity:** `SEV-1` (during live conference) / `SEV-3` (during pre-event testing).
- **Owner:** On-call SRE / Infrastructure Lead.

## Remediation steps

### Step 1: Check Live Cluster Connectivity
1. Test external Elasticsearch cluster directly:
   ```bash
   curl -I http://localhost:9200/_cluster/health
   ```
2. If connection refused:
   - Check if Elasticsearch service is running: `systemctl status elasticsearch` or `docker ps`.
   - Start the service: `systemctl start elasticsearch` or `docker compose up -d elasticsearch`.
3. Check cluster logs for disk watermarks or out-of-memory errors:
   ```bash
   tail -n 100 /var/log/elasticsearch/elasticsearch.log
   ```

### Step 2: Verify Embedded Engine Fallback Health
1. Verify CINDER web server continues serving discovery queries:
   ```bash
   curl -s http://localhost:3000/api/status | jq .elasticsearch
   ```
2. Verify that `docCount` reflects registered attendees and `status` is `"green"`.
3. Test a discovery feed query:
   ```bash
   curl -s http://localhost:3000/api/discovery?attendeeId=att-alex-01 | jq .
   ```

### Step 3: Re-attach and Synchronize Indices
1. Once the live cluster is restored:
   - Run `POST /api/admin/reindex` or restart CINDER:
   ```bash
   pm2 restart cinder-platform
   ```
2. Confirm cluster reconnect in `/api/status`:
   - `mode: "live-elasticsearch-cluster"`
   - `live: true`

## Verification
1. Run automated Elasticsearch test:
   ```bash
   node --test tests/elasticsearch.test.mjs
   ```
2. Confirm latency is < 250ms and hybrid search yields candidates.

