<!-- [LAYER: UI] -->
# CLI & HTTP REST API Reference

Comprehensive reference for CINDER command line interfaces and REST API routes.

---

## 1. Command Line Interface

The main CLI entry point is `bin/cinder.mjs`:

```bash
node bin/cinder.mjs <command> [options]
```

### Commands

| Command | Action | Description |
| :--- | :--- | :--- |
| `demo` | Run 10-step demonstration | Executes the end-to-end hackathon workflow across check-in, search, swipes, pods, and facilitation. |
| `server` or `start` | Launch web application | Starts the HTTP server on port 3000 serving the SPA and REST endpoints. |
| `status` | Output system state | Probes Elasticsearch cluster and outputs complete state as formatted JSON. |
| `help` | Display help | Outputs available CLI commands and usage hints. |

---

## 2. HTTP REST API Reference

The CINDER web server exposes RESTful JSON endpoints on `http://localhost:3000`:

### `GET /api/status`
Returns system health, cluster latency, active mode, and entity counts.
- **Response `200 OK`:**
  ```json
  {
    "appName": "CINDER",
    "status": "healthy",
    "elasticsearch": {
      "live": true,
      "mode": "live-elasticsearch-cluster",
      "latencyMs": 1.42,
      "docCount": 5
    },
    "attendeeCount": 5,
    "podCount": 1
  }
  ```

### `GET /api/attendees`
Returns array of all registered conference attendees.

### `POST /api/checkin`
Registers a new attendee profile.
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "role": "Staff SRE",
    "company": "Cloud Corp",
    "interests": ["Kubernetes", "Observability"],
    "expertise": "eBPF tracing in production",
    "challenges": "High cardinality metric aggregation"
  }
  ```
- **Response `201 Created`:** JSON representation of the registered `Attendee`.

### `GET /api/discovery?attendeeId=<id>`
Returns ranked candidate recommendation cards for the specified attendee using hybrid Elasticsearch retrieval with synergy explanations.

### `POST /api/swipe`
Records a swipe action between two attendees.
- **Request Body:**
  ```json
  {
    "sourceId": "att-alex-01",
    "targetId": "att-maya-02",
    "action": "LIKE"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "status": "success",
    "mutualMatch": true,
    "matchId": "match-987"
  }
  ```

### `GET /api/pods`
Returns array of all formed pods with channel metadata, members, and pinned headers.

### `POST /api/pods/:id/messages`
Sends a message into a pod channel.
- **Request Body:**
  ```json
  {
    "from": "Alex Chen",
    "text": "Let us meet outside Room 302 at 12:30 for lunch"
  }
  ```
- **Response `201 Created`:** Pinned location updated if meetup intent confirmed.

### `POST /api/scenario/run`
Executes the full 10-step demonstration scenario server-side and returns the complete step execution transcript.

