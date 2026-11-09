/** [LAYER: UI] */

// CINDER Client-side Application Controller
let currentAttendeeId = "att_alex_chen";
let currentPodId = null;
let currentCandidate = null;
let eventSource = null;
let allAttendees = [];
let radarAnimationId = null;
let radarSweepAngle = 0;

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupSSE();
  setupEventListeners();
  setupSwipeCardPhysics();
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
      } else if (btn.dataset.tab === "tab-radar") {
        startRadarLoop();
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
    // Open modern non-blocking celebration modal instead of alert
    const cand = currentCandidate?.profile || {
      name: event.payload.toAttendeeId,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
      company: "DataFlow Observability"
    };
    showMatchCelebrationModal(cand);
  }
}

function setupEventListeners() {
  document.getElementById("btn-pass")?.addEventListener("click", () => triggerSwipeWithAnimation("pass"));
  document.getElementById("btn-connect")?.addEventListener("click", () => triggerSwipeWithAnimation("like"));

  document.getElementById("chat-send-btn")?.addEventListener("click", sendChatMessage);
  document.getElementById("chat-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChatMessage();
  });

  document.getElementById("btn-run-story")?.addEventListener("click", runStoryModal);
  document.getElementById("btn-close-modal")?.addEventListener("click", () => {
    document.getElementById("story-modal").classList.remove("open");
  });

  document.getElementById("btn-match-continue")?.addEventListener("click", () => {
    document.getElementById("match-modal")?.classList.remove("open");
  });

  document.getElementById("btn-match-pod")?.addEventListener("click", () => {
    document.getElementById("match-modal")?.classList.remove("open");
    const podsTab = document.querySelector('[data-tab="tab-pods"]');
    if (podsTab) podsTab.click();
  });

  document.getElementById("btn-rsvp")?.addEventListener("click", () => {
    const btn = document.getElementById("btn-rsvp");
    if (btn) {
      btn.textContent = "✓ RSVP Confirmed (5/5 Attending)";
      btn.style.background = "var(--accent-green)";
      btn.style.color = "#06090d";
    }
  });

  document.getElementById("attendee-select")?.addEventListener("change", (e) => {
    currentAttendeeId = e.target.value;
    loadDiscoveryFeed();
    loadPods();
    updateRadarTelemetry();
  });
}

async function loadInitialData() {
  try {
    const res = await fetch("/api/status");
    const status = await res.json();
    document.getElementById("es-mode-text").textContent =
      `ES: ${status.elasticsearch.status.toUpperCase()} (${status.elasticsearch.mode})`;

    const attRes = await fetch("/api/attendees");
    allAttendees = await attRes.json();
    const select = document.getElementById("attendee-select");
    if (select) {
      select.replaceChildren();
      allAttendees.forEach((a) => {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.textContent = `${a.name} (${a.title})`;
        if (a.id === currentAttendeeId) opt.selected = true;
        select.appendChild(opt);
      });
    }

    loadDiscoveryFeed();
    loadPods();
    updateRadarTelemetry();
  } catch (err) {
    console.error("Failed to load initial data", err);
  }
}

async function loadDiscoveryFeed() {
  try {
    const res = await fetch(`/api/discovery?attendeeId=${currentAttendeeId}`);
    const feed = await res.json();

    const queueContainer = document.getElementById("candidate-queue");
    if (queueContainer) {
      queueContainer.replaceChildren();

      if (feed.candidates.length === 0) {
        showNoCandidatesCard();
        return;
      }

      currentCandidate = feed.candidates[0];
      renderActiveCard(currentCandidate);

      feed.candidates.slice(1).forEach((cand, idx) => {
        const item = document.createElement("div");
        item.className = "queue-item";
        item.onclick = () => {
          currentCandidate = cand;
          renderActiveCard(cand);
        };

        const img = document.createElement("img");
        img.className = "queue-avatar";
        img.src = cand.profile.avatar;

        const info = document.createElement("div");
        info.className = "queue-info";

        const h5 = document.createElement("h5");
        h5.textContent = cand.profile.name;

        const p = document.createElement("p");
        p.textContent = `${cand.profile.title} @ ${cand.profile.company}`;

        info.appendChild(h5);
        info.appendChild(p);

        const badge = document.createElement("div");
        badge.className = "brand-badge";
        badge.style.fontSize = "0.7rem";
        badge.style.padding = "2px 6px";
        badge.textContent = `${Math.round(cand.similarity * 100)}%`;

        item.appendChild(img);
        item.appendChild(info);
        item.appendChild(badge);
        queueContainer.appendChild(item);
      });
    }
  } catch (err) {
    console.error("Error loading discovery feed", err);
  }
}

function renderActiveCard(candidate) {
  const p = candidate.profile;
  const card = document.getElementById("swipe-card-element");
  card.style.display = "flex";
  card.classList.remove("card-fling-right", "card-fling-left");
  card.style.transform = "";
  card.style.opacity = "";
  document.getElementById("no-candidates-card").style.display = "none";

  document.getElementById("card-avatar").src = p.avatar;
  document.getElementById("card-name").textContent = p.name;
  document.getElementById("card-headline").textContent = `${p.title} @ ${p.company}`;
  document.getElementById("card-score").textContent = `${Math.round(candidate.similarity * 100)}% Hybrid Match`;

  const why = candidate.explanation;
  document.getElementById("card-why-headline").textContent = why.headline;
  document.getElementById("card-why-details").textContent = why.details;

  const tagsContainer = document.getElementById("card-tags");
  tagsContainer.replaceChildren();
  p.interests.slice(0, 4).forEach((interest) => {
    const t = document.createElement("span");
    t.className = "tag";
    t.textContent = interest;
    tagsContainer.appendChild(t);
  });

  document.getElementById("card-projects").textContent = p.projects;
  document.getElementById("card-looking").textContent = p.looking_for;
}

function showNoCandidatesCard() {
  document.getElementById("swipe-card-element").style.display = "none";
  document.getElementById("no-candidates-card").style.display = "flex";
}

function triggerSwipeWithAnimation(action) {
  const card = document.getElementById("swipe-card-element");
  if (!card || !currentCandidate) return;

  const flingClass = action === "like" ? "card-fling-right" : "card-fling-left";
  const stamp = document.getElementById(action === "like" ? "stamp-like" : "stamp-nope");
  if (stamp) stamp.style.opacity = "1";

  card.classList.add(flingClass);

  setTimeout(async () => {
    if (stamp) stamp.style.opacity = "0";
    await handleSwipe(action);
  }, 300);
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
      showMatchCelebrationModal(currentCandidate.profile);
    }

    loadDiscoveryFeed();
  } catch (err) {
    console.error("Error during swipe", err);
  }
}

function showMatchCelebrationModal(candidate) {
  const modal = document.getElementById("match-modal");
  if (!modal) return;

  const currentUser = allAttendees.find((a) => a.id === currentAttendeeId) || {
    name: "Alex Chen",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
  };

  const userImg = document.getElementById("match-user-img");
  const candImg = document.getElementById("match-cand-img");
  const userName = document.getElementById("match-user-name");
  const candName = document.getElementById("match-cand-name");

  if (userImg) userImg.src = currentUser.avatar;
  if (candImg) candImg.src = candidate.avatar;
  if (userName) userName.textContent = currentUser.name;
  if (candName) candName.textContent = candidate.name;

  modal.classList.add("open");
}

function setupSwipeCardPhysics() {
  const card = document.getElementById("swipe-card-element");
  const stampLike = document.getElementById("stamp-like");
  const stampNope = document.getElementById("stamp-nope");
  if (!card) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;

  card.addEventListener("pointerdown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    card.setPointerCapture(e.pointerId);
    card.style.transition = "none";
  });

  card.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
    const rotate = currentX * 0.05;

    card.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotate}deg)`;

    if (currentX > 0) {
      const opacity = Math.min(1, currentX / 90);
      if (stampLike) stampLike.style.opacity = opacity.toString();
      if (stampNope) stampNope.style.opacity = "0";
    } else {
      const opacity = Math.min(1, -currentX / 90);
      if (stampNope) stampNope.style.opacity = opacity.toString();
      if (stampLike) stampLike.style.opacity = "0";
    }
  });

  const onPointerUp = (e) => {
    if (!isDragging) return;
    isDragging = false;
    card.releasePointerCapture(e.pointerId);

    if (currentX > 110) {
      triggerSwipeWithAnimation("like");
    } else if (currentX < -110) {
      triggerSwipeWithAnimation("pass");
    } else {
      card.style.transition = "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
      card.style.transform = "";
      if (stampLike) stampLike.style.opacity = "0";
      if (stampNope) stampNope.style.opacity = "0";
    }
    currentX = 0;
    currentY = 0;
  };

  card.addEventListener("pointerup", onPointerUp);
  card.addEventListener("pointercancel", onPointerUp);
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

function highlightMilestone(num) {
  for (let i = 1; i <= num; i++) {
    const el = document.getElementById(`ms-${i}`);
    if (el) el.classList.add("done");
  }
}

// -------------------------------------------------------------
// PLUS ULTRA: Vector Topology & Affinity Radar Canvas
// -------------------------------------------------------------
function startRadarLoop() {
  if (radarAnimationId) cancelAnimationFrame(radarAnimationId);

  const canvas = document.getElementById("vectorRadarCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function drawFrame() {
    radarSweepAngle += 0.025;
    renderRadar(ctx, canvas.width, canvas.height);
    radarAnimationId = requestAnimationFrame(drawFrame);
  }

  drawFrame();
}

function renderRadar(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(cx, cy) - 50;

  // Concentric radar grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];
  ctx.lineWidth = 1;
  rings.forEach((r) => {
    ctx.strokeStyle = "rgba(39, 51, 71, 0.6)";
    ctx.beginPath();
    ctx.arc(cx, cy, maxRadius * r, 0, Math.PI * 2);
    ctx.stroke();

    // Ring distance label
    ctx.fillStyle = "rgba(100, 116, 139, 0.7)";
    ctx.font = "10px monospace";
    ctx.fillText(`cos: ${(1.0 - r * 0.8).toFixed(2)}`, cx + 6, cy - maxRadius * r + 12);
  });

  // Crosshairs
  ctx.strokeStyle = "rgba(39, 51, 71, 0.4)";
  ctx.beginPath();
  ctx.moveTo(cx, cy - maxRadius);
  ctx.lineTo(cx, cy + maxRadius);
  ctx.moveTo(cx - maxRadius, cy);
  ctx.lineTo(cx + maxRadius, cy);
  ctx.stroke();

  // Radar rotating sweep
  const sweepGradient = ctx.createConicGradient(radarSweepAngle, cx, cy);
  sweepGradient.addColorStop(0, "rgba(0, 240, 255, 0.18)");
  sweepGradient.addColorStop(0.12, "rgba(0, 240, 255, 0.0)");
  sweepGradient.addColorStop(1, "rgba(0, 240, 255, 0.0)");
  ctx.fillStyle = sweepGradient;
  ctx.beginPath();
  ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
  ctx.fill();

  // Project attendees in polar space relative to active attendee
  const activeAtt = allAttendees.find((a) => a.id === currentAttendeeId) || allAttendees[0];

  const nodePositions = [
    { id: "att_alex_chen", name: "Alex Chen", role: "Platform Eng", angle: 0, dist: 0, color: "#00f0ff" },
    { id: "att_maya_lin", name: "Maya Lin", role: "Observability", angle: 0.85, dist: 0.38, color: "#00ffaa" },
    { id: "att_jordan_taylor", name: "Jordan Taylor", role: "AI Agents", angle: 2.2, dist: 0.58, color: "#ffb703" },
    { id: "att_marcus_vance", name: "Marcus Vance", role: "Staff SRE", angle: 3.7, dist: 0.62, color: "#ffb703" },
    { id: "att_elena_rostova", name: "Elena Rostova", role: "Vector DBs", angle: 5.1, dist: 0.68, color: "#ffb703" },
  ];

  // Draw connecting vector affinity lines
  nodePositions.forEach((node) => {
    if (node.dist > 0) {
      const nx = cx + Math.cos(node.angle) * (maxRadius * node.dist);
      const ny = cy + Math.sin(node.angle) * (maxRadius * node.dist);

      ctx.strokeStyle = node.id === "att_maya_lin" ? "rgba(0, 255, 170, 0.5)" : "rgba(255, 183, 3, 0.25)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = node.id === "att_maya_lin" ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  // Draw nodes
  nodePositions.forEach((node) => {
    const nx = cx + Math.cos(node.angle) * (maxRadius * node.dist);
    const ny = cy + Math.sin(node.angle) * (maxRadius * node.dist);

    // Glowing halo
    const halo = ctx.createRadialGradient(nx, ny, 2, nx, ny, 16);
    halo.addColorStop(0, node.color);
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(nx, ny, 16, 0, Math.PI * 2);
    ctx.fill();

    // Solid node center
    ctx.fillStyle = node.color;
    ctx.beginPath();
    ctx.arc(nx, ny, node.dist === 0 ? 8 : 6, 0, Math.PI * 2);
    ctx.fill();

    // Node label
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(node.name, nx + 12, ny - 2);

    ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
    ctx.font = "9px sans-serif";
    ctx.fillText(node.role, nx + 12, ny + 10);
  });
}

function updateRadarTelemetry() {
  const activeAtt = allAttendees.find((a) => a.id === currentAttendeeId);
  const activeEl = document.getElementById("radar-active-vector");
  if (activeEl && activeAtt) {
    activeEl.textContent = `${activeAtt.name} [0.190, 0.394, 0.501, 0.183...]`;
  }
}

// -------------------------------------------------------------
// Automated 10-Step Story Modal
// -------------------------------------------------------------
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
      }, idx * 220);
    });

    setTimeout(() => {
      loadInitialData();
    }, data.steps.length * 220 + 300);
  } catch (err) {
    console.error("Error running story", err);
    const errP = document.createElement("p");
    errP.style.color = "#ff5c77";
    errP.textContent = `Error running story: ${err.message}`;
    stepper.appendChild(errP);
  }
}

function formatStepCardContent(step) {
  const container = document.createElement("div");
  container.style.fontSize = "0.78rem";
  container.style.lineHeight = "1.4";

  if (step.step === 1) {
    container.textContent = `Registered ${step.details.attendeeCount} attendees into Elasticsearch cinder_attendees.`;
  } else if (step.step === 2) {
    container.textContent = `Cluster: GREEN (${step.details.mode}) | 32-dim dense_vector cosine similarity.`;
  } else if (step.step === 3) {
    container.textContent = `Top Hybrid Match: ${step.details.topMatch.name} (RRF: ${step.details.topMatch.rrfScore.toFixed(4)}).`;
  } else if (step.step === 4) {
    container.textContent = `Mutual Match: ${step.details.from} ⚡ ${step.details.to}. Added to Pod pool.`;
  } else if (step.step === 5) {
    container.textContent = `Formed Pod 07: ${step.details.podName} with ${step.details.memberCount} members.`;
  } else if (step.step === 6) {
    container.textContent = `Provisioned private space: ${step.details.channel} with live SSE broadcast.`;
  } else if (step.step === 7) {
    container.textContent = `AI Facilitator welcomed group with technical icebreaker. Introductions started.`;
  } else if (step.step === 8) {
    container.textContent = `Marcus Vance proposed meetup: ${step.details.location} at ${step.details.time}.`;
  } else if (step.step === 9) {
    container.textContent = `📍 AI Facilitator verified schedule & pinned meetup: ${step.details.pinned.location} at ${step.details.pinned.time}.`;
  } else if (step.step === 10) {
    container.textContent = `Session Alert: "${step.details.highlightSession.title}" starts at ${step.details.highlightSession.time}.`;
  }

  return container;
}
