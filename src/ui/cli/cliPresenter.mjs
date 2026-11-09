/** [LAYER: UI] */

/**
 * Terminal Spectacle Presenter for CINDER Hackathon Demonstration.
 * Formats rich ANSI colored output, cards, and step summaries.
 */

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const BLUE = "\x1b[34m";
const BG_DARK = "\x1b[48;5;236m";

export class CliPresenter {
  static banner() {
    console.log(`
${CYAN}${BOLD}╔═══════════════════════════════════════════════════════════════════════╗
║   ██████╗██╗███╗   ██╗██████╗ ███████╗██████╗                         ║
║  ██╔════╝██║████╗  ██║██╔══██╗██╔════╝██╔══██╗                        ║
║  ██║     ██║██╔██╗ ██║██║  ██║█████╗  ██████╔╝                        ║
║  ██║     ██║██║╚██╗██║██║  ██║██╔══╝  ██╔══██╗                        ║
║  ╚██████╗██║██║ ╚████║██████╔╝███████╗██║  ██║                        ║
║   ╚═════╝╚═╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═╝                        ║
║          THE SOCIAL INFRASTRUCTURE FOR CONFERENCES                    ║
║   Discover your people. Find your Pod. Make something happen.        ║
╚═══════════════════════════════════════════════════════════════════════╝${RESET}
`);
  }

  static renderStepHeader(stepNumber, title) {
    console.log(`\n${MAGENTA}${BOLD}▶ STEP ${stepNumber}: ${title.toUpperCase()}${RESET}`);
    console.log(`${DIM}―`.repeat(70) + RESET);
  }

  static renderAttendeeCard(attendee) {
    console.log(`  ${BLUE}●${RESET} ${BOLD}${attendee.name}${RESET}  ${DIM}|  ${attendee.title} @ ${attendee.company}${RESET}`);
    console.log(`    ${CYAN}Interests:${RESET}  ${attendee.interests.join(", ")}`);
    console.log(`    ${YELLOW}Focus:${RESET}      ${attendee.projects}`);
  }

  static renderIndexingBreakdown(details) {
    console.log(`  ${CYAN}Index:${RESET}        ${BOLD}${details.indexName}${RESET} (Cluster: ${details.clusterStatus.toUpperCase()}, Mode: ${details.mode})`);
    console.log(`  ${CYAN}Mappings:${RESET}     dense_vector (${details.mappings.embedding.dims} dims, ${details.mappings.embedding.similarity} sim) + BM25 text fields`);
    console.log(`  ${CYAN}Text Fields:${RESET}  ${details.mappings.textFields.join(", ")}`);
    console.log(`  ${CYAN}Total Docs:${RESET}   ${details.totalDocsIndexed} profiles vectorized & inverted-indexed`);
    console.log(`  ${DIM}Sample Ingested Document Vectors:${RESET}`);
    details.indexedProfiles.forEach((p) => {
      const vecPreview = `[${p.vectorSample.join(", ")}...]`;
      console.log(`    ${DIM}•${RESET} ${BOLD}${p.name}${RESET} (${p.company}): ${YELLOW}${p.tokenCount} tokens${RESET} | vector[32]=${DIM}${vecPreview}${RESET}`);
    });
  }

  static renderMatchExplanation(sourceName, candidateName, explanation, scores) {
    console.log(`  ${GREEN}${BOLD}★ MATCH CANDIDATE FOUND VIA ELASTICSEARCH HYBRID SEARCH${RESET}`);
    console.log(`    ${BOLD}${sourceName}${RESET}  ${MAGENTA}⇄${RESET}  ${BOLD}${candidateName}${RESET}`);
    console.log(`    ${CYAN}Relevance:${RESET} ${explanation.headline}`);
    console.log(`    ${YELLOW}Synergy:${RESET}   ${explanation.synergySummary}`);
    console.log(`    ${DIM}Scores: RRF=${scores.rrfScore} | BM25=${scores.bm25Score} | kNN Cosine=${scores.knnScore} (Rank #${scores.knnRank})${RESET}`);
  }

  static renderPodBanner(pod, candidateRankings = []) {
    console.log(`
  ${BG_DARK} ${GREEN}${BOLD}[POD CREATED]${RESET}${BG_DARK} ${BOLD}${pod.name}${RESET}${BG_DARK} (${pod.memberIds.length} members) ${RESET}
  ${DIM}Topic: ${pod.topic} | AI Facilitator: ${pod.facilitatorName}${RESET}`);
    if (candidateRankings && candidateRankings.length > 0) {
      console.log(`  ${DIM}Elasticsearch Hybrid Member Rankings:${RESET}`);
      candidateRankings.forEach((r, idx) => {
        console.log(`    ${CYAN}#${idx + 1}${RESET} ${BOLD}${r.name}${RESET} (${r.title}) — RRF=${r.rrfScore} (BM25=${r.bm25Score}, kNN=${r.knnScore})`);
      });
    }
  }

  static renderChannelCreated(details) {
    console.log(`  ${GREEN}${BOLD}✔ DEDICATED COMMUNICATION SPACE PROVISIONED${RESET}`);
    console.log(`    ${CYAN}Channel:${RESET}     ${BOLD}${details.channel}${RESET} (${details.status})`);
    console.log(`    ${CYAN}Facilitator:${RESET} ${details.facilitatorName}`);
    console.log(`    ${CYAN}Features:${RESET}    ${details.capabilities.join(" • ")}`);
  }

  static renderChatMessage(sender, text, isFacilitator = false, isPinned = false) {
    const badge = isFacilitator
      ? `${MAGENTA}${BOLD}[AI FACILITATOR]${RESET}`
      : `${BLUE}[ATTENDEE]${RESET}`;
    const pinBadge = isPinned ? ` ${YELLOW}📌 PINNED${RESET}` : "";
    console.log(`  ${badge} ${BOLD}${sender}${RESET}${pinBadge}:`);
    const formatted = text.split("\n").map((line) => `    ${line}`).join("\n");
    console.log(formatted);
  }

  static renderSummary(status) {
    console.log(`\n${GREEN}${BOLD}✔ DEMONSTRATION COMPLETE — ALL 10 STEPS VERIFIED${RESET}`);
    console.log(`${CYAN}Total Attendees:${RESET} ${status.attendeeCount}  |  ${CYAN}Pods Formed:${RESET} ${status.podCount}  |  ${CYAN}Elasticsearch:${RESET} ${status.elasticsearch.status} (${status.elasticsearch.mode})`);
    console.log(`${DIM}CINDER turned passive conference attendance into intentional, coordinated human connection.${RESET}\n`);
  }
}

