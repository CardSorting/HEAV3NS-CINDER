/** [LAYER: UI] */

// CINDER Client-side Application Controller
let currentAttendeeId = "att_alex_chen";
let currentPodId = null;
let currentCandidate = null;
let eventSource = null;

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupSSE();
  setupEventListeners();
  loadInitialData();
});

function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add("active");

      if (btn.dataset.tab === "tab-discover") {
        loadDiscoveryFeed();
      } else if (btn.dataset.tab === "tab-pods") {
        loadPods();
      }
    });
  });
}

function setupSSE() {
  try {
    eventSource = new EventSource("/api/events");
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleRealtimeEvent(data);
    };
  } catch (err) {
    console.error("SSE connection error", err);
  }
}

function handleRealtimeEvent(event) {
  if (event.type === "message.sent" || event.type === "facilitator.announcement") {
    if (currentPodId && event.payload.podId === currentPodId) {
      appendChatMessage(event.payload.message);
    }
  } else if (event.type === "meetup.pinned") {
    if (currentPodId && event.payload.podId === currentPodId) {
      updatePinnedMeetup(event.payload.location, event.payload.time);
    }
  } else if (event.type === "pod.formed") {
    loadPods();
    highlightMilestone(3);
  } else if (event.type === "match.mutual") {
    highlightMilestone(2);
    alert(`🎉 Mutual Connection with ${event.payload.fromAttendeeId === currentAttendeeId ? event.payload.toAttendeeId : event.payload.fromAttendeeId}! Both expressed interest.`);
  }
}

function setupEventListeners() {
  document.getElementById("btn-pass")?.addEventListener("click", () => handleSwipe("pass"));
  document.getElementById("btn-connect")?.addEventListener("click", () => handleSwipe("like"));

  document.getElementById("chat-send-btn")?.addEventListener("click", sendChatMessage);
  document.getElementById("chat-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChatMessage();
  });

  document.getElementById("btn-run-story")?.addEventListener("click", runStoryModal);
  document.getElementById("btn-close-modal")?.addEventListener("click", () => {
    document.getElementById("story-modal").classList.remove("open");
  });

  document.getElementById("attendee-select")?.addEventListener("change", (e) => {
    currentAttendeeId = e.target.value;
    loadDiscoveryFeed();
    loadPods();
  });
}

async function loadInitialData() {
  try {
    const res = await fetch("/api/status");
    const status = await res.json();
    document.getElementById("es-mode-text").textContent =
      `ES: ${status.elasticsearch.status.toUpperCase()} (${status.elasticsearch.mode})`;

    const attRes = await fetch("/api/attendees");
    const attendees = await attRes.json();
    const select = document.getElementById("attendee-select");
    if (select) {
      select.replaceChildren();
      attendees.forEach((a) => {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.textContent = `${a.name} (${a.title})`;
        if (a.id === currentAttendeeId) opt.selected = true;
        select.appendChild(opt);
      });
    }

    loadDiscoveryFeed();
    loadPods();
  } catch (err) {
    console.error("Failed to load initial data", err);
  }
}

async function loadDiscoveryFeed() {
  try {
    const res = await fetch(`/api/discovery?attendeeId=${currentAttendeeId}`);
    const data = await res.json();

    const queryBox = document.getElementById("es-query-json");
    if (queryBox && data.esQuerySpec) {
      queryBox.textContent = JSON.stringify(data.esQuerySpec, null, 2);
    }
    const scoreStats = document.getElementById("es-score-stats");
    if (scoreStats) {
      scoreStats.textContent = `Latency: ${data.tookMs}ms | Candidates: ${data.totalFound}`;
    }

    if (data.candidates && data.candidates.length > 0) {
      currentCandidate = data.candidates[0];
      renderSwipeCard(currentCandidate);
    } else {
      currentCandidate = null;
      renderEmptyCard();
    }
  } catch (err) {
    console.error("Failed to load discovery feed", err);
  }
}

function renderSwipeCard(candidateData) {
  const p = candidateData.profile;
  const exp = candidateData.explanation;

  document.getElementById("card-avatar").src = p.avatar;
  document.getElementById("card-name").textContent = p.name;
  document.getElementById("card-headline").textContent = `${p.title} @ ${p.company}`;
  document.getElementById("card-why-headline").textContent = exp.headline;
  document.getElementById("card-why-details").textContent = exp.synergySummary;
  document.getElementById("card-score").textContent = `${exp.scorePercent}% Match`;

  const tagsContainer = document.getElementById("card-tags");
  tagsContainer.replaceChildren();

  p.interests.forEach((tag) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = tag;
    tagsContainer.appendChild(span);
  });

  p.expertise.forEach((tag) => {
    const span = document.createElement("span");
    span.className = "tag accent";
    span.textContent = tag;
    tagsContainer.appendChild(span);
  });

  document.getElementById("card-projects").textContent = p.projects;
  document.getElementById("card-looking").textContent = p.looking_for;
  document.getElementById("swipe-card-element").style.display = "flex";
  document.getElementById("no-candidates-card").style.display = "none";
}

function renderEmptyCard() {
  document.getElementById("swipe-card-element").style.display = "none";
  document.getElementById("no-candidates-card").style.display = "flex";
}

async function handleSwipe(action) {
  if (!currentCandidate) return;

  try {
    const res = await fetch("/api/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromAttendeeId: currentAttendeeId,
        toAttendeeId: currentCandidate.profile.id,
        action
      })
    });
    const result = await res.json();
    if (result.isMutual) {
      highlightMilestone(2);
      alert(`🎉 Mutual Connection with ${currentCandidate.profile.name}! Added to Pod candidate pool.`);
    }

    loadDiscoveryFeed();
  } catch (err) {
    console.error("Error during swipe", err);
  }
}

async function loadPods() {
  try {
    const res = await fetch("/api/pods");
    const pods = await res.json();
    const sidebar = document.getElementById("pod-list");
    if (!sidebar) return;

    sidebar.replaceChildren();
    if (pods.length === 0) {
      const p = document.createElement("p");
      p.style.fontSize = "0.8rem";
      p.style.color = "var(--text-muted)";
      p.textContent = "No Pods formed yet. Complete discovery to trigger Pod formation!";
      sidebar.appendChild(p);
      return;
    }

    highlightMilestone(3);
    pods.forEach((pod) => {
      const card = document.createElement("div");
      card.className = `pod-card-item ${pod.id === currentPodId ? "active" : ""}`;
      card.onclick = () => selectPod(pod.id);

      const h4 = document.createElement("h4");
      h4.style.fontSize = "0.85rem";
      h4.style.color = "#fff";
      h4.textContent = pod.name;

      const p = document.createElement("p");
      p.style.fontSize = "0.75rem";
      p.style.color = "var(--text-secondary)";
      p.style.marginTop = "2px";
      p.textContent = `${pod.memberIds.length} Members`;

      card.appendChild(h4);
      card.appendChild(p);
      sidebar.appendChild(card);
    });

    if (!currentPodId && pods.length > 0) {
      selectPod(pods[0].id);
    }
  } catch (err) {
    console.error("Error loading pods", err);
  }
}

window.selectPod = async function (podId) {
  currentPodId = podId;
  const res = await fetch(`/api/pods/${podId}/messages`);
  const messages = await res.json();

  const chatContainer = document.getElementById("chat-messages-container");
  if (chatContainer) {
    chatContainer.replaceChildren();
    messages.forEach((msg) => appendChatMessage(msg));
  }

  const podRes = await fetch("/api/pods");
  const pods = await podRes.json();
  const pod = pods.find((p) => p.id === podId);
  if (pod) {
    document.getElementById("pod-title").textContent = pod.name;
    document.getElementById("pod-members-subtitle").textContent = `${pod.memberIds.length} Members • Facilitator: ${pod.facilitatorName}`;
    if (pod.pinnedMeetup && pod.pinnedMeetup.confirmed) {
      updatePinnedMeetup(pod.pinnedMeetup.location, pod.pinnedMeetup.time);
    } else {
      const strip = document.getElementById("pinned-meetup-bar");
      if (strip) strip.style.display = "none";
    }
  }

  highlightMilestone(4);
};

function updatePinnedMeetup(location, time) {
  const strip = document.getElementById("pinned-meetup-bar");
  if (strip) {
    strip.style.display = "flex";
    document.getElementById("pinned-meetup-text").textContent = `📌 Pinned Meetup: ${location} at ${time}`;
  }
}

function appendChatMessage(msg) {
  const chatContainer = document.getElementById("chat-messages-container");
  if (!chatContainer) return;

  const isFacilitator = msg.senderType === "facilitator";
  const isMine = msg.senderId === currentAttendeeId;

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${isFacilitator ? "facilitator" : isMine ? "mine" : ""}`;

  const sender = document.createElement("div");
  sender.className = "chat-bubble-sender";
  sender.textContent = msg.senderName;

  const content = document.createElement("div");
  content.className = "chat-bubble-content";
  content.textContent = msg.content;

  bubble.appendChild(sender);
  bubble.appendChild(content);
  chatContainer.appendChild(bubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById("chat-input");
  const content = input?.value?.trim();
  if (!content || !currentPodId) return;

  input.value = "";

  try {
    await fetch(`/api/pods/${currentPodId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId: currentAttendeeId,
        content
      })
    });
  } catch (err) {
    console.error("Failed to send message", err);
  }
}

async function runStoryModal() {
  const modal = document.getElementById("story-modal");
  const stepper = document.getElementById("story-stepper");
  stepper.replaceChildren();

  const initP = document.createElement("p");
  initP.style.fontSize = "0.85rem";
  initP.style.color = "var(--text-secondary)";
  initP.textContent = "Initializing 10-step hackathon attendee scenario...";
  stepper.appendChild(initP);
  modal.classList.add("open");

  try {
    const res = await fetch("/api/scenario/run", { method: "POST" });
    const data = await res.json();

    stepper.replaceChildren();
    data.steps.forEach((step, idx) => {
      setTimeout(() => {
        const stepCard = document.createElement("div");
        stepCard.className = "step-card active";

        const num = document.createElement("div");
        num.className = "step-card-num";
        num.textContent = `STEP ${step.step < 10 ? "0" : ""}${step.step}`;

        const title = document.createElement("div");
        title.className = "step-card-title";
        title.textContent = step.title;

        const desc = document.createElement("div");
        desc.className = "step-card-desc";
        desc.appendChild(formatStepCardContent(step));

        stepCard.appendChild(num);
        stepCard.appendChild(title);
        stepCard.appendChild(desc);
        stepper.appendChild(stepCard);
        stepper.scrollTop = stepper.scrollHeight;

        if (step.step <= 2) highlightMilestone(1);
        if (step.step === 3 || step.step === 4) highlightMilestone(2);
        if (step.step === 5) highlightMilestone(3);
        if (step.step >= 6 && step.step <= 8) highlightMilestone(4);
        if (step.step >= 9) highlightMilestone(5);
      }, idx * 250);
    });

    setTimeout(() => {
      loadInitialData();
    }, data.steps.length * 250 + 300);
  } catch (err) {
    console.error("Error running story", err);
    const errP = document.createElement("p");
    errP.style.color = "#ff5c77";
    errP.textContent = `Error running story: ${err.message}`;
    stepper.appendChild(errP);
  }
}

function makeEl(tag, text = "", styleObj = {}, className = "") {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (className) el.className = className;
  for (const [k, v] of Object.entries(styleObj)) {
    el.style[k] = v;
  }
  return el;
}

function formatStepCardContent(step) {
  const container = makeEl("div", "", {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem"
  });

  const d = step.details;

  if (step.step === 1) {
    const list = makeEl("div", "", { display: "flex", flexDirection: "column", gap: "4px" });
    d.attendees.forEach((a) => {
      const row = makeEl("div", "", { fontSize: "0.78rem", color: "var(--text-secondary)" });
      const nameStrong = makeEl("strong", a.name, { color: "#fff" });
      const roleSpan = makeEl("span", ` • ${a.title} @ `);
      const compSpan = makeEl("span", a.company, { color: "var(--accent-cyan)" });
      row.append(nameStrong, roleSpan, compSpan);
      list.appendChild(row);
    });
    container.appendChild(list);
  } else if (step.step === 2) {
    const box = makeEl("div", "", {
      background: "rgba(0,240,255,0.05)",
      border: "1px solid rgba(0,240,255,0.2)",
      borderRadius: "6px",
      padding: "8px",
      fontSize: "0.75rem"
    });
    const header = makeEl("div", "Elasticsearch Schema Mappings & Index Breakdown", {
      color: "var(--accent-cyan)",
      fontWeight: "700",
      marginBottom: "4px"
    });
    const idxLine = makeEl("div", `Index: ${d.indexName} (${d.clusterStatus.toUpperCase()} • ${d.mode})`);
    const vecLine = makeEl("div", "Vector: dense_vector(dims=32, similarity=cosine)");
    const txtLine = makeEl("div", `Text Fields: ${d.mappings.textFields.join(", ")}`);
    const samples = makeEl("div", "", { marginTop: "6px", color: "var(--text-muted)", fontSize: "0.72rem" });
    d.indexedProfiles.forEach((p) => {
      const pLine = makeEl("div", `${p.name}: ${p.tokenCount} tokens, vector[32]=[${p.vectorSample.join(", ")}...]`);
      samples.appendChild(pLine);
    });
    box.append(header, idxLine, vecLine, txtLine, samples);
    container.appendChild(box);
  } else if (step.step === 3) {
    const box = makeEl("div", "", {
      background: "rgba(0,255,170,0.06)",
      border: "1px solid rgba(0,255,170,0.25)",
      borderRadius: "6px",
      padding: "8px",
      fontSize: "0.78rem"
    });
    const candTitle = makeEl("div", `★ Top Candidate: ${d.topCandidate} (${d.candidatesCount} found in ${d.tookMs}ms)`, {
      fontWeight: "700",
      color: "var(--accent-green)",
      marginBottom: "2px"
    });
    const headline = makeEl("div", d.relevanceExplanation.headline, {
      color: "#fff",
      fontSize: "0.8rem",
      marginTop: "2px"
    });
    const synergy = makeEl("div", d.relevanceExplanation.synergySummary, {
      color: "var(--text-secondary)",
      fontSize: "0.74rem",
      marginTop: "2px"
    });
    box.append(candTitle, headline, synergy);
    container.appendChild(box);
  } else if (step.step === 4) {
    const box = makeEl("div", "", {
      background: "rgba(240,0,255,0.08)",
      border: "1px solid rgba(240,0,255,0.3)",
      borderRadius: "6px",
      padding: "8px",
      fontSize: "0.8rem"
    });
    const matchHead = makeEl("div", "⚡ Mutual Connection Established!", {
      fontWeight: "700",
      color: "var(--accent-magenta)"
    });
    const matchPair = makeEl("div", `${d.initiator} ⇄ ${d.partner}`, {
      color: "#fff",
      fontWeight: "600",
      marginTop: "2px"
    });
    const matchId = makeEl("div", `Match ID: ${d.matchId} • Added to Pod candidate pool`, {
      fontSize: "0.72rem",
      color: "var(--text-muted)"
    });
    box.append(matchHead, matchPair, matchId);
    container.appendChild(box);
  } else if (step.step === 5) {
    const box = makeEl("div", "", {
      background: "rgba(255,183,3,0.08)",
      border: "1px solid rgba(255,183,3,0.3)",
      borderRadius: "6px",
      padding: "8px",
      fontSize: "0.78rem"
    });
    const title = makeEl("div", `Pod Formed: ${d.podName} (${d.memberCount} Members)`, {
      fontWeight: "700",
      color: "var(--accent-yellow)"
    });
    const topic = makeEl("div", `Topic: ${d.topic}`, {
      color: "var(--text-secondary)",
      fontSize: "0.74rem"
    });
    const rankHeader = makeEl("div", "Elasticsearch Hybrid Member Rankings:", {
      marginTop: "6px",
      fontSize: "0.72rem",
      color: "var(--accent-cyan)"
    });
    const rankRow = makeEl("div", "", { marginTop: "2px" });
    (d.candidateRankings || []).forEach((r, i) => {
      const chip = makeEl("span", `#${i + 1} ${r.name} (RRF: ${r.rrfScore}) `, {
        display: "inline-block",
        marginRight: "8px",
        fontSize: "0.72rem",
        color: "var(--text-secondary)"
      });
      rankRow.appendChild(chip);
    });
    box.append(title, topic, rankHeader, rankRow);
    container.appendChild(box);
  } else if (step.step === 6) {
    const box = makeEl("div", "", {
      background: "rgba(0,240,255,0.06)",
      border: "1px solid rgba(0,240,255,0.25)",
      borderRadius: "6px",
      padding: "8px",
      fontSize: "0.78rem"
    });
    const chLine = makeEl("div", `Channel Active: ${d.channel} (${d.status})`, {
      color: "var(--accent-cyan)",
      fontWeight: "700"
    });
    const facLine = makeEl("div", `Assigned Facilitator: ${d.facilitatorName}`, {
      color: "var(--text-secondary)",
      fontSize: "0.74rem",
      marginTop: "2px"
    });
    const feats = makeEl("div", d.capabilities.join(" • "), {
      fontSize: "0.72rem",
      color: "var(--text-muted)",
      marginTop: "4px"
    });
    box.append(chLine, facLine, feats);
    container.appendChild(box);
  } else if (step.step === 7) {
    const box = makeEl("div", "", { fontSize: "0.78rem" });
    const facBox = makeEl("div", "", {
      background: "rgba(240,0,255,0.08)",
      borderLeft: "3px solid var(--accent-magenta)",
      padding: "6px 10px",
      borderRadius: "4px",
      marginBottom: "6px"
    });
    const facTag = makeEl("span", "[AI FACILITATOR]", {
      fontSize: "0.7rem",
      fontWeight: "700",
      color: "var(--accent-magenta)"
    });
    const facText = makeEl("div", d.welcomeMessage, {
      color: "var(--text-primary)",
      fontSize: "0.75rem",
      whiteSpace: "pre-wrap",
      marginTop: "2px"
    });
    facBox.append(facTag, facText);
    box.appendChild(facBox);

    d.dialogue.forEach((msg) => {
      const row = makeEl("div", "", {
        padding: "4px 0",
        fontSize: "0.75rem",
        color: "var(--text-secondary)"
      });
      const sender = makeEl("strong", `${msg.from}: `, { color: "var(--accent-cyan)" });
      const text = document.createTextNode(msg.text);
      row.append(sender, text);
      box.appendChild(row);
    });
    container.appendChild(box);
  } else if (step.step === 8) {
    const box = makeEl("div", "", {
      background: "rgba(0,255,170,0.06)",
      border: "1px solid rgba(0,255,170,0.25)",
      borderRadius: "6px",
      padding: "8px",
      fontSize: "0.78rem"
    });
    const propHeader = makeEl("div", `MEETUP PROPOSAL BY ${d.sender.toUpperCase()}`, {
      fontSize: "0.72rem",
      color: "var(--accent-green)",
      fontWeight: "700",
      marginBottom: "2px"
    });
    const propMsg = makeEl("div", `"${d.proposalMessage}"`, {
      color: "#fff",
      fontSize: "0.8rem"
    });
    const propLoc = makeEl("div", `📍 Proposed: ${d.proposedLocation} at ${d.proposedTime}`, {
      marginTop: "4px",
      fontSize: "0.72rem",
      color: "var(--accent-cyan)"
    });
    box.append(propHeader, propMsg, propLoc);
    container.appendChild(box);
  } else if (step.step === 9) {
    const box = makeEl("div", "", {
      background: "rgba(255,183,3,0.1)",
      border: "1px solid var(--accent-yellow)",
      borderRadius: "6px",
      padding: "8px",
      fontSize: "0.78rem"
    });
    const pinTitle = makeEl("div", `📌 PINNED MEETUP: ${d.pinnedLocation} at ${d.meetupTime} [${d.status}]`, {
      color: "var(--accent-yellow)",
      fontWeight: "700"
    });
    const confText = makeEl("div", d.facilitatorConfirmation, {
      color: "var(--text-secondary)",
      fontSize: "0.75rem",
      marginTop: "4px"
    });
    box.append(pinTitle, confText);
    container.appendChild(box);
  } else if (step.step === 10) {
    const box = makeEl("div", "", { fontSize: "0.78rem" });
    const agBox = makeEl("div", "", {
      background: "rgba(0,240,255,0.06)",
      border: "1px solid rgba(0,240,255,0.25)",
      borderRadius: "6px",
      padding: "8px",
      marginBottom: "6px"
    });
    const agTag = makeEl("div", "AGENDA NOTIFICATION", {
      fontSize: "0.7rem",
      fontWeight: "700",
      color: "var(--accent-cyan)"
    });
    const agText = makeEl("div", d.agendaAnnouncement, {
      color: "#fff",
      fontSize: "0.75rem",
      marginTop: "2px"
    });
    agBox.append(agTag, agText);

    const prBox = makeEl("div", "", {
      background: "rgba(240,0,255,0.06)",
      border: "1px solid rgba(240,0,255,0.25)",
      borderRadius: "6px",
      padding: "8px"
    });
    const prTag = makeEl("div", "FACILITATOR DISCUSSION PROMPT", {
      fontSize: "0.7rem",
      fontWeight: "700",
      color: "var(--accent-magenta)"
    });
    const prText = makeEl("div", d.discussionPrompt, {
      color: "#fff",
      fontSize: "0.75rem",
      marginTop: "2px"
    });
    prBox.append(prTag, prText);

    box.append(agBox, prBox);
    container.appendChild(box);
  }

  const detailsEl = document.createElement("details");
  detailsEl.style.marginTop = "4px";
  const summaryEl = document.createElement("summary");
  summaryEl.style.cursor = "pointer";
  summaryEl.style.fontSize = "0.7rem";
  summaryEl.style.color = "var(--text-muted)";
  summaryEl.textContent = "View Raw Step Payload (JSON)";
  const pre = document.createElement("pre");
  pre.style.fontSize = "0.7rem";
  pre.style.whiteSpace = "pre-wrap";
  pre.style.marginTop = "4px";
  pre.style.color = "var(--text-secondary)";
  pre.textContent = JSON.stringify(d, null, 2);
  detailsEl.appendChild(summaryEl);
  detailsEl.appendChild(pre);

  container.appendChild(detailsEl);
  return container;
}

function highlightMilestone(num) {
  for (let i = 1; i <= num; i++) {
    document.getElementById(`ms-${i}`)?.classList.add("done");
  }
}
