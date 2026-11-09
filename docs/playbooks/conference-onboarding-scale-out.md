<!-- [LAYER: UI] -->
# Playbook PB-04: Conference Onboarding Scale-Out & Registration Surge

## Triage at a glance
- **Trigger:** Surge in check-in requests during 08:00–09:30 morning registration causing HTTP response latency > 1,000ms.
- **Impact:** Attendees experience lag registering profiles or loading initial swipe feed.
- **Severity:** `SEV-3`
- **Owner:** On-call Operator.

## Remediation steps

### Step 1: Scale Web Server Instances
1. If using PM2, scale cluster workers to match available CPU cores:
   ```bash
   pm2 scale cinder-platform +2
   ```
2. If running under container orchestration, increase replica count:
   ```bash
   kubectl scale deployment cinder-web --replicas=5
   ```

### Step 2: Enable Batch Profile Ingestion
1. Pre-seed verified attendee registrations from ticketing export before doors open:
   ```bash
   node -e '
     import { CinderApp } from "./src/core/CinderApp.mjs";
     import fs from "node:fs";
     const profiles = JSON.parse(fs.readFileSync("attendees.json", "utf-8"));
     const app = new CinderApp();
     await app.initialize();
     for (const p of profiles) {
       await app.checkInCtrl.checkIn(p);
     }
     console.log("Seeded " + profiles.length + " attendees");
   '
   ```
2. Pre-computing embeddings avoids CPU spikes during on-site badge scanning.

### Step 3: Monitor Inverted Index Memory
1. Check process memory consumption:
   ```bash
   node bin/cinder.mjs status | jq .attendeeCount
   ```
2. Verify system remains well within Node heap boundaries (< 1.4 GB).

## Verification
Send 10 concurrent health check probes:
```bash
for i in {1..10}; do curl -s -w "%{time_total}\n" -o /dev/null http://localhost:3000/api/status; done
```
Verify average total request latency is under 50ms.

