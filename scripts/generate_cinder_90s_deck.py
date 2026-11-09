#!/usr/bin/env python3
# [LAYER: PLUMBING]
"""
CINDER — 90-Second Visual Video Deck & Presentation Generator
Modeled after HEAV3NS Ensign 2-Minute Visual Deck, customized for 90-second Judge Presentation.

Generates:
1. 8 Full-HD (1920x1080) slide PNGs in public/video-deck/slides/slide-01.png .. slide-08.png
2. Full-HD (1920x1080, 30 FPS, 90.0s / 01:30) MP4 video in:
   - public/video-deck/CINDER_90s_Visual_Video_Deck.mp4
   - CINDER_90s_Visual_Video_Deck.mp4 (workspace root)
3. Clean, send-ready PDF pitch deck in:
   - public/video-deck/CINDER_90s_Presentation_Deck.pdf
   - CINDER_90s_Presentation_Deck.pdf (workspace root)
"""

import os
import shutil
import subprocess
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Image as RLImage,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT_DIR = Path(__file__).resolve().parent.parent
SLIDES_DIR = ROOT_DIR / "public" / "video-deck" / "slides"
VIDEO_DIR = ROOT_DIR / "public" / "video-deck"
AUDIO_DIR = ROOT_DIR / "public" / "video-deck" / "audio_90s"
ART_DIR = ROOT_DIR / "public" / "video-deck" / "art"
SCREENS_DIR = ROOT_DIR / "public" / "video-deck" / "screens"

SLIDES_DIR.mkdir(parents=True, exist_ok=True)
VIDEO_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

WIDTH, HEIGHT = 1920, 1080

# CINDER Brand Palette (Flame Orange + Deep Graphite + Tech Cyan + Verification Emerald)
BG_DARK = (10, 14, 20)           # #0a0e14
BG_CARD = (18, 24, 34)           # #121822
BG_CARD_ALT = (24, 32, 45)       # #18202d
BG_HEADER = (6, 9, 13)           # #06090d
CINDER_FLAME = (255, 107, 53)    # #ff6b35 - Core Accent
CINDER_AMBER = (247, 147, 26)    # #f7931a - Warm Glow
TECH_CYAN = (0, 210, 255)        # #00d2ff - Elasticsearch / Vector
TECH_EMERALD = (16, 185, 129)    # #10b981 - Verified / Green Cluster
TEXT_PRIMARY = (244, 248, 252)   # #f4f8fc
TEXT_SECONDARY = (160, 178, 196) # #a0b2c4
TEXT_MUTED = (100, 116, 139)     # #64748b
BORDER_SUBTLE = (34, 46, 64)     # #222e40
BORDER_BRIGHT = (255, 107, 53)

def load_font(path_candidates, size):
    for p in path_candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

SANS_REG = ["/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc"]
SANS_BOLD = ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Helvetica.ttc"]
SERIF_BOLD = ["/System/Library/Fonts/Supplemental/Georgia Bold.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"]
MONO_FONT = ["/System/Library/Fonts/Menlo.ttc", "/System/Library/Fonts/Supplemental/Arial.ttf"]

FONT_EYEBROW = load_font(MONO_FONT, 18)
FONT_TITLE = load_font(SANS_BOLD, 36)
FONT_SUBTITLE = load_font(SANS_REG, 21)
FONT_CARD_TAG = load_font(MONO_FONT, 16)
FONT_CARD_TITLE = load_font(SANS_BOLD, 23)
FONT_CARD_BODY = load_font(SANS_REG, 19)
FONT_CARD_BOLD = load_font(SANS_BOLD, 19)
FONT_STAT_BIG = load_font(SANS_BOLD, 42)
FONT_STAT_LABEL = load_font(MONO_FONT, 15)
FONT_VO_LABEL = load_font(MONO_FONT, 15)
FONT_VO_TEXT = load_font(SANS_REG, 19)
FONT_TIMER = load_font(MONO_FONT, 20)

SCENES = [
    {
        "index": 1,
        "id": "scene-01",
        "act": "ACT I · THE IDEATION & THE PROBLEM",
        "start": 0,
        "end": 10,
        "duration": 10,
        "timecode": "00:00 – 00:10",
        "eyebrow": "SCENE 01 OF 08 · THE NETWORKING PARADOX: LOST SERENDIPITY",
        "title": "The $2,500 Paradox: 4,000 Engineers, Staring at Phones",
        "subtitle": "Why High-Value Technical Networking Is Left to Pure Random Chance",
        "visual_type": "art",
        "visual_file": "cinder-hero-01.jpg",
        "stats": [
            ("$2,500+", "TICKET & TRAVEL"),
            ("4,000+", "ISOLATED MINDS"),
            ("<5%", "MEANINGFUL TIES"),
        ],
        "cards": [
            (
                "THE HALLWAY TRACK FAILURE",
                "Brilliant Minds Left in Isolation",
                [
                    "• Keynotes are uploaded to YouTube the next week",
                    "• The true conference ROI is serendipitous human connection",
                    "• Yet networking is left to awkward coffee line encounters",
                ],
            ),
            (
                "WHAT ATTENDEES ACTUALLY NEED",
                "Intentional Social Infrastructure",
                [
                    "• Not another passive schedule app or QR badge scanner",
                    "• Intentional discovery based on active problem alignment",
                    "• Coordinated group momentum with zero social friction",
                ],
            ),
        ],
        "banner": "THE PROBLEM: We spend millions bringing the world's brightest minds together, then abandon them to chance.",
        "vo": "\"Every year, millions of engineers attend conferences paying thousands of dollars. The keynote slides are online next week. The real value is the hallway track, yet networking remains completely left to chance.\"",
        "speech": "Every year, millions of engineers attend conferences paying thousands of dollars. The keynote slides are online next week. The real value is the hallway track, yet networking remains completely left to chance.",
    },
    {
        "index": 2,
        "id": "scene-02",
        "act": "ACT I · THE IDEATION & THE PROBLEM",
        "start": 10,
        "end": 20,
        "duration": 10,
        "timecode": "00:10 – 00:20",
        "eyebrow": "SCENE 02 OF 08 · THE GENESIS: ELASTICSEARCH HYBRID RETRIEVAL",
        "title": "How We Came Up With CINDER: The Intelligence Core",
        "subtitle": "Pairing BM25 Lexical Precision & Dense Vector Semantics with Autonomous Pod Agents",
        "visual_type": "screen",
        "visual_file": "screen-08-vector-radar.png",
        "stats": [
            ("32-DIM DENSE", "COSINE SIMILARITY"),
            ("BM25 + kNN", "RECIPROCAL RANK FUSION"),
            ("SUB-5MS", "MATCH LATENCY"),
        ],
        "cards": [
            (
                "THE CORE BREAKTHROUGH",
                "Vector Semantics Meets Exact Lexical Search",
                [
                    "• Discarded shallow keyword forms and generic chatbot boxes",
                    "• Combined BM25 lexical precision with dense vector embeddings",
                    "• RRF scoring ranks true conceptual and technical resonance",
                ],
            ),
            (
                "THREE PRODUCT PILLARS",
                "Discovery · Coordination · Facilitation",
                [
                    "• 1. Discovery: Swipe interface with explicit 'Why this match'",
                    "• 2. Coordination: High-affinity 4 to 6 person Pod formation",
                    "• 3. Facilitation: Autonomous agent orchestrating meetups",
                ],
            ),
        ],
        "banner": "THE GENESIS: What if conference networking wasn't random serendipity, but high-precision computational matchmaking?",
        "vo": "\"We realized: discovering collaborators isn't keyword filtering, and it isn't passive chatting. By combining Elasticsearch dense vectors with BM25 hybrid search, we compute true multi-dimensional affinity.\"",
        "speech": "We realized: discovering collaborators isn't keyword filtering, and it isn't passive chatting. By combining Elasticsearch dense vectors with BM25 hybrid search, we compute true multi-dimensional affinity.",
    },
    {
        "index": 3,
        "id": "scene-03",
        "act": "ACT II · THE HERO STORY & SEMANTIC DISCOVERY",
        "start": 20,
        "end": 32,
        "duration": 12,
        "timecode": "00:20 – 00:32",
        "eyebrow": "SCENE 03 OF 08 · HERO CHECK-IN: FROM PROFILE TO DENSE VECTORS",
        "title": "Meet Alex Chen: Stuck on Autonomous Cluster Healing",
        "subtitle": "Profile Ingestion Vectorizes Complex Challenges Into Instant Semantic Coordinates",
        "visual_type": "screen",
        "visual_file": "screen-01-dashboard.png",
        "stats": [
            ("ALEX CHEN", "PLATFORM ENGINEER"),
            ("CHALLENGE", "eBPF CLUSTER HEALING"),
            ("INGESTION", "32-DIM DENSE VECTOR"),
        ],
        "cards": [
            (
                "HERO PROFILE & BOTTLENECK",
                "Senior Platform Engineer @ CloudScale",
                [
                    "• Senior Platform Engineer building autonomous k8s recovery",
                    "• Controller must heal node failures driven by kernel signals",
                    "• Stuck correlating eBPF telemetry with orchestrator state",
                ],
            ),
            (
                "ZERO-FRICTION INGESTION",
                "Instant Profile Vectorization",
                [
                    "• Alex checks in and states what he's building and seeking",
                    "• CINDER indexes profiles into cinder_attendees in real time",
                    "• Dense vectors capture semantic intent without manual tags",
                ],
            ),
        ],
        "banner": "THE HERO'S SEARCH: Alex doesn't need to meet 100 people—he needs to meet the ONE engineer who solved eBPF kernel tracing.",
        "vo": "\"Meet our hero, Alex Chen, Senior Platform Engineer at CloudScale Systems. Alex is building an autonomous cluster healing controller, but he's hitting a wall correlating kernel-level eBPF state with cloud workloads.\"",
        "speech": "Meet our hero, Alex Chen, Senior Platform Engineer at CloudScale Systems. Alex is building an autonomous cluster healing controller, but he's hitting a wall correlating kernel-level eBPF state with cloud workloads.",
    },
    {
        "index": 4,
        "id": "scene-04",
        "act": "ACT II · THE HERO STORY & SEMANTIC DISCOVERY",
        "start": 32,
        "end": 45,
        "duration": 13,
        "timecode": "00:32 – 00:45",
        "eyebrow": "SCENE 04 OF 08 · SWIPE DISCOVERY: RELEVANCE EXPLAINED",
        "title": "Discovering Maya Lin: 89% Hybrid Resonance",
        "subtitle": "Zero-Friction Swipe Interface Backed by Reciprocal Rank Fusion & Transparent Rationale",
        "visual_type": "art",
        "visual_file": "cinder-hero-02.jpg",
        "stats": [
            ("89% MATCH", "HYBRID AFFINITY"),
            ("BM25: 11.82", "KEYWORD ALIGNMENT"),
            ("kNN: 0.615", "VECTOR SIMILARITY"),
        ],
        "cards": [
            (
                "TRANSPARENT MATCH RATIONALE",
                "Why This Match: Observability Architect",
                [
                    "• Maya Lin: Principal Observability Architect at DataFlow",
                    "• Focus: Zero-overhead eBPF probes for continuous tracing",
                    "• CINDER highlights exact complementarity: tracing × healing",
                ],
            ),
            (
                "MUTUAL CONNECTION FORGED",
                "Low-Friction Swipe UX",
                [
                    "• Alex swipes right; Maya swipes right; mutual match triggers",
                    "• No cold outreach or awkward pitching required",
                    "• Staged immediately into candidate pool for Pod clustering",
                ],
            ),
        ],
        "banner": "SWIPE MATCH: Alex swipes right. Maya swipes right. A high-value mutual connection is forged in seconds.",
        "vo": "\"CINDER's discovery card surfaces Maya Lin, an Observability Architect who builds zero-overhead eBPF tracing probes. CINDER explains exactly why: complementary expertise, shared tooling, mutual benefit. Both swipe right.\"",
        "speech": "CINDER's discovery card surfaces Maya Lin, an Observability Architect who builds zero-overhead eBPF tracing probes. CINDER explains exactly why: complementary expertise, shared tooling, mutual benefit. Both swipe right.",
    },
    {
        "index": 5,
        "id": "scene-05",
        "act": "ACT III · POD FORMATION & AI FACILITATION",
        "start": 45,
        "end": 57,
        "duration": 12,
        "timecode": "00:45 – 00:57",
        "eyebrow": "SCENE 05 OF 08 · BEYOND 1-ON-1: INTELLIGENT POD FORMATION",
        "title": "Pod 07: Autonomous Cloud & Systems Assembled",
        "subtitle": "Clustering 5 Complementary Specialists for Maximum Conversational Density",
        "visual_type": "art",
        "visual_file": "cinder-hero-03.jpg",
        "stats": [
            ("POD 07", "5 SPECIALISTS"),
            ("CURATION", "BALANCED PERSPECTIVES"),
            ("DEDICATED", "PRIVATE COMMS SPACE"),
        ],
        "cards": [
            (
                "DIVERSITY-AWARE CLUSTERING",
                "High-Density Technical Cohorts",
                [
                    "• 1-on-1 networking is often intimidating and high pressure",
                    "• Pods gather 4 to 6 people around shared technical intersections",
                    "• Members: Alex, Maya, Jordan (Agents), Marcus (SRE), Elena (DB)",
                ],
            ),
            (
                "DEDICATED COORDINATION HUB",
                "Realtime Event-Driven Collaboration",
                [
                    "• Private channel provisioned: #pod-07-autonomous-cloud",
                    "• Live SSE event bus syncs state instantly across attendees",
                    "• Integrated with conference schedule and venue locations",
                ],
            ),
        ],
        "banner": "POD ARCHITECTURE: Curated cohorts turn awkward 1-on-1 chats into collaborative working groups.",
        "vo": "\"1-on-1 chats are awkward. CINDER clusters matched attendees into Pods of 4 to 6 specialists. Meet Pod 07: Alex, Maya, Jordan in AI agents, Elena in vector search, and Marcus in chaos engineering.\"",
        "speech": "One-on-one chats are awkward. CINDER clusters matched attendees into Pods of four to six specialists. Meet Pod 07: Alex, Maya, Jordan in AI agents, Elena in vector search, and Marcus in chaos engineering.",
    },
    {
        "index": 6,
        "id": "scene-06",
        "act": "ACT III · POD FORMATION & AI FACILITATION",
        "start": 57,
        "end": 70,
        "duration": 13,
        "timecode": "00:57 – 01:10",
        "eyebrow": "SCENE 06 OF 08 · ACTIVE FACILITATION & PHYSICAL COORDINATION",
        "title": "From Digital Chat to Real-World Table: 12:15 PM Meetup",
        "subtitle": "Autonomous AI Facilitator Breaks the Ice, Aligns Agendas, and Pins Meetup Location",
        "visual_type": "screen",
        "visual_file": "screen-05-chat-meetup.png",
        "stats": [
            ("AI CONCIERGE", "PROACTIVE AGENT"),
            ("PINNED MEETUP", "EAST PATIO @ 12:15"),
            ("KEYNOTE ALERT", "HALL A @ 13:30"),
        ],
        "cards": [
            (
                "PROACTIVE ICEBREAKING & DIALOGUE",
                "Not a Chatbot — An Active Coordinator",
                [
                    "• AI Facilitator welcomes the group with a targeted technical prompt",
                    "• Bridges the gap between kernel eBPF signals and AI controllers",
                    "• Marcus proposes: 'Let's grab lunch at Main Hall East Patio'",
                ],
            ),
            (
                "AUTONOMOUS VENUE COORDINATION",
                "Pinned Meetups & Schedule Guidance",
                [
                    "• Facilitator verifies venue schedule and pins confirmed meetup",
                    "• Pinned to Pod header with live countdown and location details",
                    "• Recommends upcoming Keynote: 'The Autonomous Cloud' at 13:30",
                ],
            ),
        ],
        "banner": "PHYSICAL COORDINATION: The AI Facilitator translates digital alignment into a physical table of 5 engineers talking code.",
        "vo": "\"Enter the AI Facilitator. It doesn't wait to be prompted. It welcomes the Pod, prompts a technical icebreaker, detects Marcus's lunch suggestion, and autonomously pins a confirmed meetup at the East Patio at 12:15 PM.\"",
        "speech": "Enter the AI Facilitator. It doesn't wait to be prompted. It welcomes the Pod, prompts a technical icebreaker, detects Marcus's lunch suggestion, and autonomously pins a confirmed meetup at the East Patio at twelve fifteen PM.",
    },
    {
        "index": 7,
        "id": "scene-07",
        "act": "ACT IV · LIVE ARCHITECTURE & THE PAYOFF",
        "start": 70,
        "end": 80,
        "duration": 10,
        "timecode": "01:10 – 01:20",
        "eyebrow": "SCENE 07 OF 08 · SYSTEM ARCHITECTURE & 100% SOVEREIGN CODE",
        "title": "Under the Hood: Dual-Mode Elasticsearch & Joyzoning",
        "subtitle": "Sub-5ms Hybrid Retrieval, Zero External UI Frameworks, Complete Architectural Sovereignty",
        "visual_type": "screen",
        "visual_file": "screen-07-story-modal.png",
        "stats": [
            ("DUAL MODE", "EMBEDDED + LIVE ES"),
            ("<5MS LATENCY", "HYBRID RETRIEVAL"),
            ("100% SOVEREIGN", "JOYZONING GRADE A"),
        ],
        "cards": [
            (
                "DUAL-MODE ELASTICSEARCH ENGINE",
                "Zero Setup Offline + Enterprise Production",
                [
                    "• Embedded mode: zero-dependency in-memory vector/inverted index",
                    "• Live cluster mode: connects seamlessly to Elasticsearch 8.x",
                    "• Real-time SSE streaming for instant client state updates",
                ],
            ),
            (
                "CLEAN ENTERPRISE ARCHITECTURE",
                "Pure Node HTTP · 100% Joyzoning Sovereign",
                [
                    "• Strict Joyzoning layers: Domain, Core, Infrastructure, Plumbing, UI",
                    "• Zero runtime circular dependencies; strict interface contracts",
                    "• All 10 hackathon demonstration steps pass end-to-end",
                ],
            ),
        ],
        "banner": "ENGINEERING RIGOR: Production-ready Elasticsearch hybrid architecture, zero dependencies, verified by 10 continuous tests.",
        "vo": "\"Under the hood, CINDER runs dual-mode Elasticsearch: embedded for zero-setup offline demos, or live cluster connected. Pure Node HTTP and SSE, zero frontend bloat, and 100% Joyzoning architectural sovereign compliance.\"",
        "speech": "Under the hood, CINDER runs dual-mode Elasticsearch: embedded for zero-setup offline demos, or live cluster connected. Pure Node HTTP and SSE, zero frontend bloat, and one hundred percent Joyzoning sovereign compliance.",
    },
    {
        "index": 8,
        "id": "scene-08",
        "act": "ACT IV · LIVE ARCHITECTURE & THE PAYOFF",
        "start": 80,
        "end": 90,
        "duration": 10,
        "timecode": "01:20 – 01:30",
        "eyebrow": "SCENE 08 OF 08 · THE HERO'S PAYOFF & CALL TO ACTION",
        "title": "Making Something Happen: The Future of Conferences",
        "subtitle": "From a 12:15 Lunch to an Open-Source Autonomous Controller in 90 Days",
        "visual_type": "screen",
        "visual_file": "screen-04-pod-channels.png",
        "stats": [
            ("90 DAYS", "FROM CHAT TO CODE"),
            ("5 POD MEMBERS", "LIFELONG NETWORK"),
            ("CINDER", "CONFERENCES, TOGETHER"),
        ],
        "cards": [
            (
                "THE HERO PAYOFF",
                "Turning Serendipity Into Software",
                [
                    "• Alex found his collaborator; Maya found her platform engineer",
                    "• Pod 07 collaborated throughout the rest of the conference",
                    "• 3 months later: released an open-source autonomous eBPF controller",
                ],
            ),
            (
                "EXPERIENCE CINDER LIVE",
                "World-Class Launch & Verification",
                [
                    "• Live web platform running at localhost:3000",
                    "• 45s real recorded live session video included",
                    "• Complete Diátaxis documentation and architectural ADRs",
                ],
            ),
        ],
        "banner": "DISCOVER YOUR PEOPLE. FIND YOUR POD. MAKE SOMETHING HAPPEN.",
        "vo": "\"At 12:15 PM, Alex and Maya sat down. Three months later, they open-sourced an autonomous eBPF healing controller. CINDER transforms serendipity into software. Try CINDER today.\"",
        "speech": "At twelve fifteen PM, Alex and Maya sat down. Three months later, they open-sourced an autonomous eBPF healing controller. CINDER transforms serendipity into software. Try CINDER today.",
    },
]

def draw_rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def render_base_slide(scene):
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img)

    # Top Brand Bar
    draw.rectangle([0, 0, WIDTH, 86], fill=BG_HEADER)
    draw.rectangle([0, 0, WIDTH, 6], fill=CINDER_FLAME)
    draw.line([0, 86, WIDTH, 86], fill=BORDER_SUBTLE, width=2)

    # Brand badge in top bar
    draw_rounded_rect(draw, [56, 20, 360, 68], radius=8, fill=BG_CARD, outline=CINDER_FLAME, width=1)
    draw.text((74, 32), "🔥 CINDER × ELASTICSEARCH", font=FONT_EYEBROW, fill=TEXT_PRIMARY)

    # Act pill
    act_text_w = draw.textlength(scene["act"], font=FONT_EYEBROW)
    act_x0 = 380
    act_x1 = int(act_x0 + act_text_w + 44)
    draw_rounded_rect(draw, [act_x0, 20, act_x1, 68], radius=8, fill=BG_CARD, outline=BORDER_SUBTLE, width=1)
    draw.text((act_x0 + 22, 32), scene["act"], font=FONT_EYEBROW, fill=CINDER_AMBER)

    # Scene Eyebrow & Title block
    draw.text((56, 98), scene["eyebrow"], font=FONT_EYEBROW, fill=TECH_CYAN)
    draw.text((56, 124), scene["title"], font=FONT_TITLE, fill=TEXT_PRIMARY)

    # Left: Visual Artwork / Real Screen Panel (exact 1184x666 16:9 proportion)
    art_x0, art_y0 = 56, 174
    art_w, art_h = 1184, 666
    
    # Determine visual file path
    if scene["visual_type"] == "art":
        v_path = ART_DIR / scene["visual_file"]
    else:
        v_path = SCREENS_DIR / scene["visual_file"]

    draw_rounded_rect(
        draw,
        [art_x0 - 3, art_y0 - 3, art_x0 + art_w + 3, art_y0 + art_h + 3],
        radius=12,
        fill=BG_CARD,
        outline=CINDER_FLAME if scene["visual_type"] == "art" else TECH_CYAN,
        width=2,
    )

    if v_path.exists():
        try:
            art_img = Image.open(v_path).convert("RGB")
            art_img = art_img.resize((art_w, art_h), Image.Resampling.LANCZOS)
            img.paste(art_img, (art_x0, art_y0))
        except Exception as e:
            draw.rectangle([art_x0, art_y0, art_x0 + art_w, art_y0 + art_h], fill=BG_CARD)
            draw.text((art_x0 + 40, art_y0 + 40), f"Visual: {scene['visual_file']}", font=FONT_TITLE, fill=TEXT_MUTED)
    else:
        draw.rectangle([art_x0, art_y0, art_x0 + art_w, art_y0 + art_h], fill=BG_CARD)
        draw.text((art_x0 + 40, art_y0 + 40), f"Visual Pending: {scene['visual_file']}", font=FONT_TITLE, fill=TEXT_MUTED)

    # Visual badge overlay
    badge_label = "AI GENERATED PRODUCT SHOT" if scene["visual_type"] == "art" else "REAL LIVE APP RECORDED SCREEN"
    badge_color = CINDER_FLAME if scene["visual_type"] == "art" else TECH_EMERALD
    draw_rounded_rect(draw, [art_x0 + 16, art_y0 + 16, art_x0 + 380, art_y0 + 52], radius=6, fill=BG_HEADER, outline=badge_color, width=1)
    draw.text((art_x0 + 28, art_y0 + 24), f"●  {badge_label}", font=FONT_CARD_TAG, fill=badge_color)

    # Right Column: Stats & Insight Cards (x: 1264 -> 1864, width: 600)
    rx0, rw = 1264, 600
    
    # Stat strip
    stat_box_w = (rw - 24) // 3
    for si, (s_val, s_lbl) in enumerate(scene["stats"]):
        sx = rx0 + si * (stat_box_w + 12)
        draw_rounded_rect(draw, [sx, art_y0, sx + stat_box_w, art_y0 + 110], radius=10, fill=BG_CARD, outline=BORDER_SUBTLE, width=1)
        draw.text((sx + 16, art_y0 + 18), s_val, font=FONT_STAT_BIG, fill=CINDER_FLAME if si == 0 else TECH_CYAN)
        draw.text((sx + 16, art_y0 + 72), s_lbl, font=FONT_STAT_LABEL, fill=TEXT_SECONDARY)

    # 2 Structured Content Cards
    card_y = art_y0 + 126
    card_h = 260
    for ci, (tag, c_title, bullets) in enumerate(scene["cards"]):
        cy0 = card_y + ci * (card_h + 16)
        draw_rounded_rect(draw, [rx0, cy0, rx0 + rw, cy0 + card_h], radius=10, fill=BG_CARD, outline=BORDER_SUBTLE, width=1)
        draw.text((rx0 + 22, cy0 + 18), tag, font=FONT_CARD_TAG, fill=CINDER_AMBER)
        draw.text((rx0 + 22, cy0 + 44), c_title, font=FONT_CARD_TITLE, fill=TEXT_PRIMARY)
        draw.line([rx0 + 22, cy0 + 80, rx0 + rw - 22, cy0 + 80], fill=BORDER_SUBTLE, width=1)

        by = cy0 + 94
        for bullet in bullets:
            draw.text((rx0 + 22, by), bullet, font=FONT_CARD_BODY, fill=TEXT_SECONDARY)
            by += 44

    # Bottom Area: Central Takeaway Banner & Spoken Voice-Over Script
    ban_y = 852
    draw_rounded_rect(draw, [56, ban_y, WIDTH - 56, ban_y + 48], radius=8, fill=BG_CARD_ALT, outline=CINDER_FLAME, width=1)
    draw.text((74, ban_y + 14), scene["banner"], font=FONT_CARD_BOLD, fill=CINDER_AMBER)

    vo_y = 910
    draw_rounded_rect(draw, [56, vo_y, WIDTH - 56, 1024], radius=10, fill=BG_HEADER, outline=BORDER_SUBTLE, width=1)
    draw_rounded_rect(draw, [74, vo_y + 16, 280, vo_y + 48], radius=6, fill=BG_CARD, outline=BORDER_SUBTLE, width=1)
    draw.text((88, vo_y + 24), "🎤 SPOKEN VOICE-OVER", font=FONT_VO_LABEL, fill=TECH_CYAN)

    draw.text((74, vo_y + 60), scene["vo"], font=FONT_VO_TEXT, fill=TEXT_PRIMARY)

    # Bottom Progress Bar strip (y: 1040 -> 1080)
    draw.rectangle([0, 1040, WIDTH, 1080], fill=BG_HEADER)
    draw.line([0, 1040, WIDTH, 1040], fill=BORDER_SUBTLE, width=1)

    return img

def stamp_second_frame(base_img, scene, current_sec):
    frame = base_img.copy()
    draw = ImageDraw.Draw(frame)

    # Timecode text
    m = int(current_sec // 60)
    s = int(current_sec % 60)
    time_str = f"⏱  {m:02d}:{s:02d} / 01:30  ·  {scene['timecode']} ({scene['duration']}s)"
    draw.text((WIDTH - 480, 32), time_str, font=FONT_TIMER, fill=TEXT_PRIMARY)

    # Bottom Timeline Bar
    prog_pct = current_sec / 90.0
    prog_w = int(prog_pct * WIDTH)
    draw.rectangle([0, 1074, prog_w, 1080], fill=CINDER_FLAME)

    # Scene tick marks
    for s_item in SCENES:
        tx = int((s_item["start"] / 90.0) * WIDTH)
        draw.line([tx, 1050, tx, 1074], fill=BORDER_SUBTLE, width=2)
        if s_item["start"] <= current_sec < s_item["end"]:
            draw.text((tx + 8, 1052), f"SCENE {s_item['index']:02d}", font=FONT_CARD_TAG, fill=CINDER_FLAME)

    return frame

def synthesize_audio():
    print("1. Synthesizing 90-Second Voiceover Audio Tracks...")
    segment_wavs = []
    for s in SCENES:
        aiff_p = AUDIO_DIR / f"{s['id']}.aiff"
        wav_p = AUDIO_DIR / f"{s['id']}.wav"
        
        subprocess.run([
            "say", "-v", "Samantha", "-r", "165", s["speech"], "-o", str(aiff_p)
        ], check=True)
        
        subprocess.run([
            "ffmpeg", "-y", "-i", str(aiff_p), "-ar", "48000", "-ac", "2", str(wav_p)
        ], stderr=subprocess.DEVNULL, check=True)
        segment_wavs.append((s, wav_p))
    
    master_wav = AUDIO_DIR / "master_90s_voiceover.wav"
    filter_complex = []
    inputs = []
    for i, (s, wpath) in enumerate(segment_wavs):
        inputs.extend(["-i", str(wpath)])
        delay_ms = int(s["start"] * 1000)
        filter_complex.append(f"[{i}]adelay={delay_ms}|{delay_ms}[a{i}]")
    
    mix_inputs = "".join(f"[a{i}]" for i in range(len(segment_wavs)))
    filter_complex.append(f"{mix_inputs}amix=inputs={len(segment_wavs)}:dropout_transition=0:normalize=0[aout]")
    
    cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", ";".join(filter_complex),
        "-map", "[aout]",
        "-t", "90.0",
        "-ar", "48000",
        str(master_wav)
    ]
    subprocess.run(cmd, stderr=subprocess.DEVNULL, check=True)
    print("   ✓ Master 90.0s voiceover track generated successfully!")
    return master_wav

def generate_slides_and_video(master_audio):
    print("2. Generating 8 Full-HD Slide PNGs...")
    base_slides = {}
    for s in SCENES:
        base_img = render_base_slide(s)
        base_slides[s["index"]] = base_img
        stamped = stamp_second_frame(base_img, s, s["start"])
        slide_path = SLIDES_DIR / f"slide-0{s['index']}.png"
        stamped.save(slide_path, format="PNG", optimize=True)
        print(f"   ✓ Saved {slide_path.relative_to(ROOT_DIR)}")

    print("3. Encoding 90.0s 1920x1080 30fps MP4 Video Deck...")
    mp4_out = VIDEO_DIR / "CINDER_90s_Visual_Video_Deck.mp4"
    root_mp4_out = ROOT_DIR / "CINDER_90s_Visual_Video_Deck.mp4"

    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-pix_fmt", "rgb24",
        "-r", "1",
        "-i", "-",
        "-i", str(master_audio),
        "-vf", "fps=30,format=yuv420p",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", "90.0",
        "-movflags", "+faststart",
        str(mp4_out)
    ]

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
    assert proc.stdin is not None

    for sec in range(90):
        active_scene = SCENES[-1]
        for s in SCENES:
            if s["start"] <= sec < s["end"]:
                active_scene = s
                break
        base_img = base_slides[active_scene["index"]]
        frame = stamp_second_frame(base_img, active_scene, sec)
        proc.stdin.write(frame.tobytes())

    proc.stdin.close()
    proc.wait()

    shutil.copy2(mp4_out, root_mp4_out)
    print(f"   ✓ Video generated successfully:")
    print(f"     - {mp4_out}")
    print(f"     - {root_mp4_out}")

def generate_pdf():
    print("4. Generating Clean Send-Ready PDF Presentation Deck...")
    pdf_out = VIDEO_DIR / "CINDER_90s_Presentation_Deck.pdf"
    root_pdf_out = ROOT_DIR / "CINDER_90s_Presentation_Deck.pdf"

    # Use landscape letter (11 x 8.5 inches) for slide-like presentation
    doc = SimpleDocTemplate(
        str(pdf_out),
        pagesize=landscape(letter),
        leftMargin=0.5 * inch,
        rightMargin=0.5 * inch,
        topMargin=0.4 * inch,
        bottomMargin=0.4 * inch,
    )

    styles = getSampleStyleSheet()
    normal = styles["Normal"]

    style_title = ParagraphStyle(
        "PDFTitle",
        parent=normal,
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0a0e14"),
    )
    style_subtitle = ParagraphStyle(
        "PDFSubtitle",
        parent=normal,
        fontName="Helvetica",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#ff6b35"),
    )
    style_body = ParagraphStyle(
        "PDFBody",
        parent=normal,
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#334155"),
    )
    style_bullet = ParagraphStyle(
        "PDFBullet",
        parent=normal,
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
    )

    story = []
    
    # Title Cover Page
    story.append(Paragraph("<b>CINDER — The Social Infrastructure for Conferences</b>", style_title))
    story.append(Paragraph("<b>90-Second World-Class Product Launch & Judge Presentation Deck</b>", style_subtitle))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<i>Discover your people. Find your Pod. Make something happen.</i>", style_body))
    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#ff6b35"), spaceAfter=15))

    # Add each slide as an embedded full image with metadata
    for s in SCENES:
        slide_img_p = SLIDES_DIR / f"slide-0{s['index']}.png"
        if slide_img_p.exists():
            story.append(Paragraph(f"<b>SCENE {s['index']:02d}: {s['title']}</b> ({s['timecode']})", style_title))
            story.append(Paragraph(f"<i>{s['subtitle']}</i>", style_subtitle))
            story.append(Spacer(1, 8))
            story.append(RLImage(str(slide_img_p), width=9.5 * inch, height=5.34 * inch))
            story.append(Spacer(1, 8))
            story.append(Paragraph(f"<b>Spoken Narration:</b> \"{s['speech']}\"", style_body))
            story.append(Spacer(1, 20))

    doc.build(story)
    shutil.copy2(pdf_out, root_pdf_out)
    print(f"   ✓ PDF generated successfully:")
    print(f"     - {pdf_out}")
    print(f"     - {root_pdf_out}")

if __name__ == "__main__":
    audio = synthesize_audio()
    generate_slides_and_video(audio)
    generate_pdf()
