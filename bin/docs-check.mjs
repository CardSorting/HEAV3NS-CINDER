#!/usr/bin/env node
/** [LAYER: UI] */
/**
 * Zero-dependency CLI verifier for CINDER documentation guardrails (`npm run docs:check`).
 * Verifies required docs inventory, ADRs, Playbooks, Postmortems, Wiki, Knowledge Base,
 * [LAYER] headers, and zero broken relative links.
 */

import fs from "node:fs";
import path from "node:path";

const REQUIRED_DOCS = [
  "README.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "CHANGELOG.md",
  "ROADMAP.md",
  "SUPPORT.md",
  "THIRD_PARTY_NOTICES.md",
  "VALIDATION_REPORT.md",
  "llms.txt",
  "docs/README.md",
  "docs/GETTING_STARTED.md",
  "docs/DOCS_GUIDE.md",
  "docs/PROJECT_MAP.md",
  "docs/CODE_TO_DOC_MAP.md",
  "docs/CODEBASE_STANDARDS.md",
  "docs/CONSTITUTION.md",
  "docs/AGENT_STACK.md",
  "docs/CI_INTEGRATION.md",
  "docs/GLOSSARY.md",
  "docs/MAINTAINER.md",
  "docs/OPERATIONS.md",
  "docs/PORTABLE_TRINITY.md",
  "docs/PROPAGATION.md",
  "docs/RELEASING.md",
  "docs/SECURITY_BEST_PRACTICES.md",
  "docs/architecture/current.md",
  "docs/adr/README.md",
  "docs/adr/0000-adr-template.md",
  "docs/adr/0001-five-canonical-zones-and-geographic-alignment.md",
  "docs/adr/0002-hybrid-retrieval-dense-vector-bm25-and-rrf.md",
  "docs/adr/0003-pod-composition-and-diversity-balance.md",
  "docs/adr/0004-proactive-event-driven-ai-facilitator.md",
  "docs/adr/0005-dual-mode-elasticsearch-adapter-with-embedded-fallback.md",
  "docs/adr/0006-realtime-communication-event-bus-and-meetup-detection.md",
  "docs/adr/0007-diataxis-documentation-and-institutional-memory.md",
  "docs/playbooks/README.md",
  "docs/playbooks/architectural-violation-remediation.md",
  "docs/playbooks/elasticsearch-cluster-failover.md",
  "docs/playbooks/pod-stalls-and-facilitator-recovery.md",
  "docs/playbooks/conference-onboarding-scale-out.md",
  "docs/playbooks/attendee-moderation-and-privacy-incident.md",
  "docs/postmortems/README.md",
  "docs/postmortems/0000-postmortem-template.md",
  "docs/postmortems/PM-001-pod-formation-entropy-collapse.md",
  "docs/postmortems/PM-002-elasticsearch-connection-timeout-on-checkin-burst.md",
  "docs/postmortems/PM-003-facilitator-hallucinated-schedule-announcement.md",
  "docs/postmortems/PM-004-websocket-meetup-race-condition.md",
  "docs/postmortems/PM-005-vector-embedding-cache-poisoning.md",
  "docs/kb/README.md",
  "docs/kb/symptom-diagnosis-matrix.md",
  "docs/kb/faq-and-edge-cases.md",
  "docs/kb/knowledge-handling-architecture.md",
  "docs/papers/README.md",
  "docs/papers/companion-brief.md",
  "docs/papers/philosophy.md",
  "docs/papers/whitepaper.md",
  "docs/wiki/README.md",
  "docs/wiki/mental-models.md",
  "docs/wiki/hybrid-search-and-rrf.md",
  "docs/wiki/pod-composition-algorithms.md",
  "docs/wiki/agent-facilitator-design.md",
  "docs/api/README.md",
  "docs/api/public-api.md",
  "docs/api/cli.md",
  "docs/api/errors.md"
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file.startsWith(".") || file === "node_modules") continue;
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) results = results.concat(walk(full));
    else if (file.endsWith(".md")) results.push(full);
  }
  return results;
}

const rootDir = process.cwd();
const missingDocs = [];
for (const rel of REQUIRED_DOCS) {
  if (!fs.existsSync(path.join(rootDir, rel))) {
    missingDocs.push(rel);
  }
}

const allMarkdown = walk(rootDir);
const missingHeaders = [];
let linksChecked = 0;
const brokenLinks = [];

const EXEMPT_FILES = new Set([
  "CLAUDE.md",
  "GEMINI.md",
  "package.json",
  "llms.txt"
]);

for (const fullPath of allMarkdown) {
  const relPath = path.relative(rootDir, fullPath);
  if (relPath.startsWith(".") || EXEMPT_FILES.has(relPath)) {
    continue;
  }
  const content = fs.readFileSync(fullPath, "utf8");

  if (!content.startsWith("<!-- [LAYER:") && !content.includes("<!-- [LAYER:")) {
    missingHeaders.push(relPath);
  }

  const stripped = content.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]+`/g, "");
  const regex = /\[[^\]]+\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(stripped)) !== null) {
    const rawTarget = match[1].trim();
    if (!rawTarget || rawTarget.startsWith("http") || rawTarget.startsWith("#") || rawTarget.startsWith("mailto:")) {
      continue;
    }
    const cleanTarget = rawTarget.split("#")[0].replace(/\/+$/, "");
    if (!cleanTarget) continue;
    linksChecked++;

    const resolved = cleanTarget.startsWith("/")
      ? path.resolve(rootDir, cleanTarget.slice(1))
      : path.resolve(path.dirname(fullPath), cleanTarget);

    if (!fs.existsSync(resolved) && !fs.existsSync(`${resolved}.md`)) {
      brokenLinks.push({ file: relPath, target: rawTarget, resolved });
    }
  }
}

let passed = true;
if (missingDocs.length > 0 || missingHeaders.length > 0 || brokenLinks.length > 0) {
  passed = false;
  console.error("======================================================================");
  console.error("  CINDER DOCUMENTATION GUARDRAILS — FAILED");
  console.error("======================================================================");
  for (const m of missingDocs) console.error(`  [MISSING DOC]    ${m}`);
  for (const h of missingHeaders) console.error(`  [MISSING HEADER] ${h}`);
  for (const b of brokenLinks) console.error(`  [BROKEN LINK]    ${b.file} -> ${b.target}`);
  console.error("======================================================================");
  process.exit(1);
}

console.log(
  `docs:check OK — ${REQUIRED_DOCS.length} required docs verified, ${allMarkdown.length} markdown files scanned (100% [LAYER] tagged), ${linksChecked} relative links verified (0 broken)`
);
