<!-- [LAYER: UI] -->
# Playbook PB-03: Pod Stalls & Facilitator Recovery

## Triage at a glance
- **Trigger:** Pod channel message count remains at 0 or 1 for > 30 minutes after formation, or AI Facilitator fails to respond to meetup proposals.
- **Impact:** Attendees do not engage; conference networking value diminished.
- **Severity:** `SEV-2`
- **Owner:** Community Coordinator / AI Engineer.

## Remediation steps

### Step 1: Inspect Pod Channel State
1. Query pod details via REST API:
   ```bash
   curl -s http://localhost:3000/api/pods/pod-07 | jq .
   ```
2. Verify member roster and message history:
   - Does the initial welcome message from the facilitator appear?
   - If missing, trigger manual facilitator welcome injection.

### Step 2: Manually Re-Prompt Pod Facilitator
1. Trigger an urgent discussion prompt via the FacilitatorController:
   ```bash
   node -e '
     import { CinderApp } from "./src/core/CinderApp.mjs";
     const app = new CinderApp();
     await app.initialize();
     await app.facilitatorCtrl.broadcastSessionAlert("pod-07", "Breakout Session Starting Soon");
   '
   ```
2. Check if the Pod's pinned header reflects the prompt.

### Step 3: Check Event Bus Subscription Health
1. Verify `SimpleEventBus` has active listener registrations:
   - Topic `message:posted`
   - Topic `pod:formed`
2. If listeners were unsubscribed due to unhandled exceptions, restart server process.

## Verification
Send a test message proposing a meetup in the pod chat:
```bash
curl -X POST http://localhost:3000/api/pods/pod-07/messages \
  -H "Content-Type: application/json" \
  -d '{"from": "Alex Chen", "text": "Let us meet at the cafe at 12:30"}'
```
Verify the Facilitator posts a confirmation message and pins `"Cafe at 12:30 PM"` to the channel header.

