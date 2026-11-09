<!-- [LAYER: UI] -->
# Security Policy

The CINDER maintainers take the security of conference attendees, personal data, and infrastructure seriously. This document describes our vulnerability disclosure process, threat model, and security best practices.

---

## Supported Versions

| Version | Supported |
| :--- | :--- |
| 1.0.x | :white_check_mark: Yes |
| < 1.0.0 | :x: No |

---

## Reporting a Vulnerability

If you discover a security vulnerability in CINDER, please report it via private email rather than filing a public issue.

- **Security Contact:** `security@cinder-conference.org`
- **PGP Encryption:** Available upon request.
- **Response Window:** We acknowledge receipt within 24 hours and aim to provide a remediation plan within 72 hours.

Please include:
1. A description of the vulnerability.
2. Step-by-step reproduction instructions or proof-of-concept.
3. Potential impact on conference attendees or cluster infrastructure.

We ask that you maintain responsible disclosure and refrain from publishing details until a patch has been released.

---

## Threat Model & Defenses

CINDER operates at the intersection of attendee data, AI agent generation, and search infrastructure:

1. **Attendee Profile Privacy:**
   - Attendee contact information and raw vectors are never exposed without authorization.
   - PII is restricted to minimal profile fields required for semantic matching.
2. **AI Facilitator Sandbox:**
   - The AI Facilitator operates with strict role constraints (see [docs/AGENT_STACK.md](docs/AGENT_STACK.md)).
   - Facilitators cannot execute shell commands, alter conference master schedules, or access unauthorized channels.
3. **Prompt Injection Mitigation:**
   - Attendee messages in Pod channels are treated as untrusted user input and sanitized before being fed into prompt contexts.
4. **Elasticsearch Cluster Isolation:**
   - Dual-mode architecture ensures that an Elasticsearch outage or compromised node falls back safely without leaking query tokens or corrupting data.
5. **Static File Serving Protection:**
   - Native HTTP server prevents directory traversal attacks using normalized path resolution outside `src/ui/web/public/`.

See [docs/SECURITY_BEST_PRACTICES.md](docs/SECURITY_BEST_PRACTICES.md) for full operational hardening guidelines.

