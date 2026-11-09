/** [LAYER: PLUMBING] */

/**
 * Pure conference seed dataset for CINDER demonstration scenario.
 * Encapsulates the 5 primary attendees from Section 9 of mvp.md,
 * along with conference agenda, rooms, and meetup locations.
 * Completely immutable and stateless.
 */

export const SEED_ATTENDEES = Object.freeze([
  {
    id: "att_alex_chen",
    name: "Alex Chen",
    title: "Senior Platform Engineer",
    company: "CloudScale Systems",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
    bio: "Focusing on Kubernetes self-healing clusters, declarative auto-remediation, and service mesh automation.",
    interests: ["Kubernetes", "Platform Engineering", "eBPF", "Autonomous Infrastructure", "Cloud Native"],
    expertise: ["Kubernetes Operators", "Golang", "Service Meshes", "Infrastructure as Code"],
    projects: "Building an autonomous cluster healing controller that responds to kernel-level node failures.",
    challenges: "Handling consensus splits during rapid remediation cycles and correlating eBPF signals with pod states.",
    looking_for: "Engineers working on eBPF telemetry and observability who want to integrate kernel signals with k8s controllers.",
    topics: ["Autonomous Infrastructure", "Kubernetes Scaling", "Kernel Observability"]
  },
  {
    id: "att_maya_lin",
    name: "Maya Lin",
    title: "Principal Observability Architect",
    company: "DataFlow Observability",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80",
    bio: "Deep in eBPF telemetry, OpenTelemetry distributed tracing, and real-time distributed anomaly detection.",
    interests: ["Observability", "eBPF", "OpenTelemetry", "Distributed Tracing", "Kubernetes"],
    expertise: ["eBPF / Linux Kernel", "Distributed Tracing", "C / Rust", "Telemetry Pipelines"],
    projects: "Developing zero-overhead eBPF probes for continuous tracing across microservices.",
    challenges: "High cardinality in microservices trace aggregation and connecting network telemetry to cluster autoscalers.",
    looking_for: "Platform engineers automating infrastructure responses based on high-frequency observability telemetry.",
    topics: ["eBPF Telemetry", "High-Scale Tracing", "Incident Automation"]
  },
  {
    id: "att_jordan_taylor",
    name: "Jordan Taylor",
    title: "AI Infrastructure Researcher",
    company: "NeuroCore Labs",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
    bio: "Designing coordination protocols for autonomous AI agents managing cloud platforms and multi-agent workflows.",
    interests: ["Autonomous Agents", "AI Infrastructure", "LLM Runtime", "Kubernetes", "Orchestration"],
    expertise: ["Multi-Agent Protocols", "Python / PyTorch", "Kubernetes Scheduling", "LLM Fine-Tuning"],
    projects: "Developing an autonomous agent framework that makes real-time decisions on cloud workloads.",
    challenges: "Bounded context synchronization between multiple cooperating agents and low-latency state retrieval.",
    looking_for: "Distributed systems and storage experts building vector retrieval backends for agent memory.",
    topics: ["Agent Coordination", "Autonomous Infrastructure", "Vector Retrieval"]
  },
  {
    id: "att_elena_rostova",
    name: "Elena Rostova",
    title: "Distributed Systems Lead",
    company: "VectorDB Core",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
    bio: "Specializing in Raft consensus, vector index replication, low-latency hybrid search, and Elasticsearch topologies.",
    interests: ["Distributed Systems", "Elasticsearch", "Vector Search", "Consensus Protocols", "Hybrid Retrieval"],
    expertise: ["Raft / Paxos", "C++ / Rust", "Vector Indexing (HNSW)", "Elasticsearch Internals"],
    projects: "Optimizing sub-millisecond approximate nearest neighbor retrieval in distributed clusters.",
    challenges: "Balancing strict consensus consistency with sub-millisecond vector similarity search.",
    looking_for: "AI infrastructure researchers and platform teams deploying large-scale hybrid search and agent runtimes.",
    topics: ["Hybrid Retrieval", "Elasticsearch Architecture", "Vector Search"]
  },
  {
    id: "att_marcus_vance",
    name: "Marcus Vance",
    title: "Staff SRE & Chaos Engineer",
    company: "Horizon Cloud",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
    bio: "Pioneering chaos engineering experiments and observability-driven auto-remediation for multi-region outages.",
    interests: ["Site Reliability Engineering", "Chaos Engineering", "Incident Automation", "Observability", "Cloud Native"],
    expertise: ["Chaos Mesh", "SRE Automation", "Python / Go", "Post-Mortem Analysis"],
    projects: "Automating runbook remediation actions driven by observability alerts without human paging.",
    challenges: "Preventing cascading failures and flapping during automated multi-cluster self-healing.",
    looking_for: "Platform architects and SREs interested in testing automated chaos resilience in production.",
    topics: ["Chaos Resilience", "Automated Remediation", "Site Reliability Engineering"]
  }
]);

export const SEED_CONFERENCE_AGENDA = Object.freeze([
  {
    id: "session_01",
    title: "Opening Keynote: The Intelligent Cloud",
    speakers: ["Dr. Sarah Jenkins"],
    startTime: "09:00",
    endTime: "10:00",
    room: "Main Auditorium (Hall A)",
    track: "Keynotes",
    description: "Welcome to Cloud & AI Summit 2026. The shift from passive monitoring to autonomous infrastructure."
  },
  {
    id: "session_02",
    title: "Next-Gen Observability: Kernel eBPF Telemetry in Practice",
    speakers: ["Maya Lin"],
    startTime: "10:15",
    endTime: "11:00",
    room: "Track 1 - Room 204",
    track: "Observability",
    description: "How eBPF delivers deep kernel-level visibility without application code modification."
  },
  {
    id: "session_03",
    title: "Autonomous Agents in Production: Coordination & Governance",
    speakers: ["Jordan Taylor"],
    startTime: "11:15",
    endTime: "12:00",
    room: "Track 2 - Room 301",
    track: "AI & Agents",
    description: "Designing reliable agent systems that reason, coordinate, and execute safely."
  },
  {
    id: "session_04",
    title: "Curated Pod Networking & Lunch Meetup",
    speakers: ["CINDER Facilitator"],
    startTime: "12:15",
    endTime: "13:15",
    room: "Main Hall East Patio / Tech Cafe",
    track: "Social Coordination",
    description: "Connect with your assigned Pod members for focused, structured collaboration over lunch."
  },
  {
    id: "session_05",
    title: "Keynote: The Autonomous Cloud — From Telemetry to Self-Healing Systems",
    speakers: ["Alex Chen", "Marcus Vance"],
    startTime: "13:30",
    endTime: "14:30",
    room: "Main Auditorium (Hall A)",
    track: "Autonomous Cloud",
    description: "Bridging observability, distributed consensus, and automated remediation."
  }
]);

export const VENUE_LOCATIONS = Object.freeze([
  { id: "loc_east_patio", name: "Main Hall East Patio", tag: "Outdoor & Quiet", capacity: 40 },
  { id: "loc_tech_cafe", name: "Tech Cafe (Booth 4)", tag: "Coffee & Seating", capacity: 30 },
  { id: "loc_garden_lounge", name: "Garden Networking Lounge", tag: "Casual Sofas", capacity: 25 },
  { id: "loc_hack_hub", name: "Hackathon Hub Collab Zone", tag: "Whiteboards & Power", capacity: 50 }
]);

export const DISCUSSION_PROMPTS = Object.freeze([
  "What would an autonomous infrastructure platform need to understand before taking self-healing action?",
  "How can eBPF telemetry bridge the gap between kernel signals and higher-level AI agent decisions?",
  "What is the single most common failure mode when automating incident remediation, and how do you safeguard against it?"
]);

