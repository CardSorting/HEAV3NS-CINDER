<!-- [LAYER: UI] -->
# Playbook PB-05: Attendee Moderation & Privacy Scrubbing

## Triage at a glance
- **Trigger:** Attendee report of offensive language in Pod chat, unwanted messaging, or attendee request for immediate profile erasure (GDPR/CCPA compliance).
- **Impact:** Community safety; attendee comfort; legal privacy compliance.
- **Severity:** `SEV-2`
- **Owner:** Community Lead & Security Officer.

## Remediation steps

### Step 1: Mute or Remove Attendee from Pod
1. Identify the attendee ID and target Pod ID from report.
2. Remove attendee from Pod membership:
   ```bash
   node -e '
     import { CinderApp } from "./src/core/CinderApp.mjs";
     const app = new CinderApp();
     await app.initialize();
     const pod = await app.podRepo.findById("pod-07");
     pod.memberIds = pod.memberIds.filter(id => id !== "att-offending-01");
     await app.podRepo.save(pod);
     console.log("Attendee removed from pod");
   '
   ```

### Step 2: Delete Offensive Message from History
1. Load pod entity and filter message array:
   ```bash
   node -e '
     import { CinderApp } from "./src/core/CinderApp.mjs";
     const app = new CinderApp();
     await app.initialize();
     const pod = await app.podRepo.findById("pod-07");
     pod.messages = pod.messages.filter(m => m.id !== "msg-offensive-01");
     await app.podRepo.save(pod);
     console.log("Message deleted from channel history");
   '
   ```

### Step 3: Complete Privacy Scrubbing (Right to be Forgotten)
1. Delete attendee from memory repository and Elasticsearch:
   ```bash
   curl -X DELETE http://localhost:9200/cinder_attendees/_doc/att-offending-01
   ```
2. Invalidate discovery matches involving the deleted attendee.

## Verification
1. Query discovery feed for the removed attendee ID:
   ```bash
   curl -s http://localhost:3000/api/attendees | jq '.[] | select(.id=="att-offending-01")'
   ```
2. Confirm empty result (document completely expunged).

