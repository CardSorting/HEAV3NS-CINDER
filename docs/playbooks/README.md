<!-- [LAYER: UI] -->
# Operational & Incident Playbooks

Actionable Standard Operating Procedures (SOPs) and incident triage runbooks for CINDER operators, SREs, and event coordinators.

---

## Severity Matrix

| Severity | Definition | Response Target | Example |
| :--- | :--- | :--- | :--- |
| **SEV-1** | Total system outage; attendees cannot check in or message. | Immediate (< 5 min) | Elasticsearch cluster crash with failed embedded fallback. |
| **SEV-2** | Critical functionality impaired; pods cannot form or meetups fail. | Rapid (< 15 min) | Pod formation stalls or AI Facilitator event loop hangs. |
| **SEV-3** | Degraded performance; discovery feed slow or partial latency spikes. | Standard (< 1 hour) | High check-in concurrency causing vector indexing backlog. |
| **SEV-4** | Non-blocking advisory or minor cosmetic issue in UI. | Next sprint | Minor CSS alignment issue or Joyzoning advisory warning. |

---

## Playbook Registry

| Playbook | Severity | Area | Purpose |
| :--- | :--- | :--- | :--- |
| [architectural-violation-remediation.md](architectural-violation-remediation.md) | `SEV-4` | Architecture | Remediating Joyzoning and SPI violation findings |
| [elasticsearch-cluster-failover.md](elasticsearch-cluster-failover.md) | `SEV-1` | Infrastructure | Resolving Elasticsearch cluster disconnects and fallback |
| [pod-stalls-and-facilitator-recovery.md](pod-stalls-and-facilitator-recovery.md) | `SEV-2` | AI / Social | Unblocking cold-start pod chats and facilitator prompt stalls |
| [conference-onboarding-scale-out.md](conference-onboarding-scale-out.md) | `SEV-3` | Scaling | Managing morning check-in spikes and high registration load |
| [attendee-moderation-and-privacy-incident.md](attendee-moderation-and-privacy-incident.md) | `SEV-2` | Moderation | Handling abusive content, attendee blocking, and privacy scrubbing |

