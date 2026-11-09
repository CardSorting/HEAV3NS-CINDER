<!-- [LAYER: UI] -->
# Programmatic API & CLI Reference

Complete reference documentation for the CINDER programming interfaces, CLI binaries, REST API routes, and error codes.

---

## API Reference Navigation

| Reference Guide | Area | Description |
| :--- | :--- | :--- |
| [public-api.md](public-api.md) | Node.js ESM | Complete programmatic reference for `CinderApp`, use-case controllers, domain entities, and infrastructure adapters |
| [cli.md](cli.md) | Command Line & REST | `bin/cinder.mjs`, `bin/demo.mjs`, `bin/server.mjs`, and all HTTP REST endpoints |
| [errors.md](errors.md) | Errors & Diagnostics | Error catalog, domain validation exceptions, and diagnostic guidance |

---

## Quick Example: Programmatic Bootstrapping

```javascript
import { CinderApp } from "./src/core/CinderApp.mjs";

// Initialize application container
const app = new CinderApp();
await app.initialize();

// Query system status
const status = await app.getStatus();
console.log(`Connected to Elasticsearch: ${status.elasticsearch.mode}`);

// Register a new conference attendee
const attendee = await app.checkInCtrl.checkIn({
  name: "Dr. Elena Rostova",
  role: "Lead Systems Researcher",
  company: "Aether Labs",
  interests: ["Vector Search", "Distributed Consensus", "eBPF"],
  expertise: "High-throughput vector indexing on NVMe",
  projects: "Building sub-millisecond approximate nearest neighbor indices",
  challenges: "Memory footprint under massive scale"
});

console.log(`Registered attendee: ${attendee.id}`);
```

