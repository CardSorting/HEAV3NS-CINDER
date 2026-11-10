#!/usr/bin/env python3
# [LAYER: PLUMBING]
"""
CINDER — Premium Product Story & User Journey (30.0s Visual Video Deck)
Structured, clean, non-cluttered editorial layout with clear navigation,
hero narrative, smooth step-by-step transitions, and synchronized karaoke lyrics.

Layout Architecture (Full HD 1920x1080):
- Left 52% (998px): Clear Product Narrative, Chapter Stepper, Feature Badges, What It Does.
- Right 48% (922px): Clean Device Window Showcase (Studio Phone Mockup / Live Screen Preview), zero background clutter.
- Top Bar: Brand, Current View Tab, Progress Timecode.
- Bottom Bar: Integrated Karaoke Lyrics Bar synced word-for-word with 'Find Your Pod.mp3'.
"""

import math
import os
import shutil
import subprocess
import time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT_DIR = Path(__file__).resolve().parent.parent
FRAMES_DIR = ROOT_DIR / "public" / "video-deck" / "render_clean_journey"
FRESH_SCREENS = ROOT_DIR / "public" / "video-deck" / "fresh_screens"
MOCKUPS_DIR = ROOT_DIR / "public" / "video-deck" / "mockups"
ASSETS_DIR = ROOT_DIR / "src" / "ui" / "web" / "public" / "assets"
AUDIO_FILE = ROOT_DIR / "Find Your Pod.mp3"
OUT_VIDEO_ROOT = ROOT_DIR / "CINDER_90s_Visual_Video_Deck.mp4"
OUT_VIDEO_PUB = ROOT_DIR / "public" / "video-deck" / "CINDER_90s_Visual_Video_Deck.mp4"

WIDTH = 1920
HEIGHT = 1080
FPS = 30
TOTAL_SECONDS = 30.0
TOTAL_FRAMES = int(FPS * TOTAL_SECONDS) # 900 frames

# Design Tokens (Sophisticated Dark Mode & Flame Warmth)
BG_PRIMARY = (11, 15, 23)        # #0b0f17
BG_SURFACE = (18, 24, 37)        # #121825
BG_SURFACE_ALT = (24, 32, 49)    # #182031
BORDER_COLOR = (32, 44, 68)      # #202c44
CINDER_FLAME = (255, 107, 53)    # #ff6b35 - Brand Orange
CINDER_AMBER = (247, 147, 26)    # #f7931a - Warm Glow
CYAN_ACCENT = (0, 210, 255)      # #00d2ff - Elasticsearch / Vectors
TEXT_MAIN = (248, 250, 252)      # #f8fafc
TEXT_MUTED = (148, 163, 184)     # #94a3b8
TEXT_DIM = (100, 116, 139)       # #64748b
EMERALD = (16, 185, 129)

def load_font(paths, size):
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()

SANS_BOLD = ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Helvetica.ttc"]
SANS_REG = ["/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc"]
MONO = ["/System/Library/Fonts/Menlo.ttc", "/System/Library/Fonts/Supplemental/Arial.ttf"]

FONT_LOGO = load_font(SANS_BOLD, 32)
FONT_HERO = load_font(SANS_BOLD, 46)
FONT_HERO_SUB = load_font(SANS_REG, 23)
FONT_BADGE = load_font(MONO, 15)
FONT_STEP_NUM = load_font(MONO, 14)
FONT_STEP_TEXT = load_font(SANS_BOLD, 15)
FONT_KARAOKE = load_font(SANS_BOLD, 26)
FONT_KARAOKE_SUB = load_font(MONO, 13)
FONT_DESC = load_font(SANS_REG, 19)
FONT_PILL = load_font(MONO, 13)

# 4 Core Acts mapping directly to the Audio Track & Complete User Flow
ACTS = [
    {
        "id": "act1",
        "act_num": "ACT 01",
        "start": 0.0,
        "end": 7.6,
        "nav_tab": "1. THE PROBLEM",
        "category": "THE CONFERENCE CHALLENGE",
        "hero_title": "THE PEOPLE YOU CAME\nHERE TO MEET.",
        "hero_sub": "You came for the ideas, the talks, and the possibilities.\nTraditional conferences leave genuine peer connections to chance.",
        "features": [
            "5,000+ attendees with shared missions in the room",
            "Serendipity gap: random hallway small-talk doesn't scale",
            "The need: Purpose-built social infrastructure for events"
        ],
        "screen_img": ASSETS_DIR / "cinder-editorial-hero.jpg",
        "screen_type": "editorial", # large clean display card
        "karaoke_line": {
            "start": 0.3, "end": 7.6,
            "words": [
                ("You", 0.3, 0.6), ("came", 0.6, 0.9), ("for", 0.9, 1.1), ("the", 1.1, 1.3), ("ideas.", 1.3, 2.0),
                ("The", 2.1, 2.3), ("talks.", 2.3, 2.9),
                ("The", 3.0, 3.2), ("possibilities.", 3.2, 4.3),
                ("But", 4.5, 4.7), ("what", 4.7, 4.9), ("about", 4.9, 5.2), ("the", 5.2, 5.4), ("people", 5.4, 5.9),
                ("you", 5.9, 6.1), ("came", 6.1, 6.4), ("here", 6.4, 6.7), ("to", 6.7, 6.9), ("meet?", 6.9, 7.5)
            ]
        }
    },
    {
        "id": "act2",
        "act_num": "ACT 02",
        "start": 7.6,
        "end": 15.2,
        "nav_tab": "2. DISCOVERY",
        "category": "MEET CINDER · SOCIAL INFRASTRUCTURE",
        "hero_title": "SMART ATTENDEE\nDISCOVERY & INTENT.",
        "hero_sub": "A smarter way to discover your people. Attendees check in,\nexpress technical missions, and match via dense vector clustering.",
        "features": [
            "Public Landing converts prospective attendees in seconds",
            "Elasticsearch dense vector indexing on participant profiles",
            "Turn random chance encounters into high-affinity connections"
        ],
        "screen_img": MOCKUPS_DIR / "mobile_01_landing.png",
        "screen_type": "phone",
        "karaoke_line": {
            "start": 7.6, "end": 15.2,
            "words": [
                ("Meet", 7.6, 8.0), ("CINDER.", 8.0, 8.8),
                ("A", 8.9, 9.1), ("smarter", 9.1, 9.5), ("way", 9.5, 9.8), ("to", 9.8, 10.0), ("discover", 10.0, 10.6),
                ("your", 10.6, 10.9), ("people", 10.9, 11.4),
                ("and", 11.5, 11.7), ("turn", 11.7, 12.0), ("chance", 12.0, 12.5), ("encounters", 12.5, 13.2),
                ("into", 13.2, 13.6), ("meaningful", 13.6, 14.3), ("connections.", 14.3, 15.1)
            ]
        }
    },
    {
        "id": "act3",
        "act_num": "ACT 03",
        "start": 15.2,
        "end": 22.8,
        "nav_tab": "3. FIND YOUR POD",
        "category": "POD CHANNELS & CURATED SQUADS",
        "hero_title": "FIND YOUR POD.\nSHARED CURIOSITY.",
        "hero_sub": "Meet people who complement your ideas. Curated 5–8 member\nPods with dedicated channels, shared topics, and meetup coordination.",
        "features": [
            "89% semantic alignment scores across attendee interests",
            "Intimate, collaborative Pod lounges replace crowded tables",
            "People who complement your work and change what happens next"
        ],
        "screen_img": MOCKUPS_DIR / "mobile_04_pods.png",
        "screen_type": "phone",
        "karaoke_line": {
            "start": 15.2, "end": 22.8,
            "words": [
                ("Find", 15.2, 15.6), ("your", 15.6, 15.9), ("Pod.", 15.9, 16.6),
                ("Meet", 16.7, 17.0), ("people", 17.0, 17.4), ("who", 17.4, 17.6), ("complement", 17.6, 18.3),
                ("your", 18.3, 18.6), ("ideas,", 18.6, 19.2),
                ("share", 19.3, 19.7), ("your", 19.7, 20.0), ("curiosity,", 20.0, 20.7),
                ("and", 20.8, 21.0), ("might", 21.0, 21.3), ("just", 21.3, 21.6), ("change", 21.6, 22.0),
                ("what", 22.0, 22.2), ("happens", 22.2, 22.5), ("next.", 22.5, 22.8)
            ]
        }
    },
    {
        "id": "act4",
        "act_num": "ACT 04",
        "start": 22.8,
        "end": 30.0,
        "nav_tab": "4. AI FACILITATOR",
        "category": "REAL-TIME SYNC & IN-PERSON ACTION",
        "hero_title": "MORE THAN A SCHEDULE.\nAN EXPERIENCE.",
        "hero_sub": "With an AI facilitator keeping everyone connected on the clock,\ntalk recommendations and live meetups turn into real collaboration.",
        "features": [
            "Centroid kNN talk discovery fused via weighted RRF",
            "Event-scoped notices deliver room alerts right on time",
            "Smooth transition from digital Pods to in-person meetups"
        ],
        "screen_img": MOCKUPS_DIR / "mobile_05_agenda.png",
        "screen_type": "phone",
        "karaoke_line": {
            "start": 22.8, "end": 30.0,
            "words": [
                ("With", 22.8, 23.0), ("an", 23.0, 23.2), ("AI", 23.2, 23.6), ("facilitator", 23.6, 24.3),
                ("keeping", 24.3, 24.7), ("everyone", 24.7, 25.2), ("connected,", 25.2, 25.9),
                ("your", 26.0, 26.2), ("conference", 26.2, 26.8), ("becomes", 26.8, 27.2), ("more", 27.2, 27.5),
                ("than", 27.5, 27.7), ("a", 27.7, 27.8), ("schedule.", 27.8, 28.5),
                ("It", 28.6, 28.8), ("becomes", 28.8, 29.2), ("an", 29.2, 29.4), ("experience.", 29.4, 30.0)
            ]
        }
    }
]

# Cache image files
LOADED_IMAGES = {}
for act in ACTS:
    p = act["screen_img"]
    if p not in LOADED_IMAGES:
        if os.path.exists(p):
            LOADED_IMAGES[p] = Image.open(p).convert("RGBA")
        else:
            print(f"Warning: {p} not found")

def build_phone_card(screen_img, target_h=720):
    """Clean, high-fidelity studio smartphone mockup without visual clutter"""
    sw, sh = screen_img.size
    screen_aspect = sw / sh
    phone_h = int(target_h * 0.95)
    phone_w = int(phone_h * screen_aspect)

    pad = 40
    bezel = 12
    canv_w = phone_w + bezel * 2 + pad * 2
    canv_h = phone_h + bezel * 2 + pad * 2

    canvas = Image.new("RGBA", (canv_w, canv_h), (0, 0, 0, 0))

    # Drop shadow
    sh_mask = Image.new("RGBA", (canv_w, canv_h), (0, 0, 0, 0))
    d_sh = ImageDraw.Draw(sh_mask)
    d_sh.rounded_rectangle([pad + 8, pad + 14, pad + phone_w + bezel * 2 + 8, pad + phone_h + bezel * 2 + 14], radius=42, fill=(0, 0, 0, 160))
    shadow_blurred = sh_mask.filter(ImageFilter.GaussianBlur(22))
    canvas = Image.alpha_composite(canvas, shadow_blurred)

    # Frame chassis
    chassis = Image.new("RGBA", (canv_w, canv_h), (0, 0, 0, 0))
    d_ch = ImageDraw.Draw(chassis)
    d_ch.rounded_rectangle(
        [pad, pad, pad + phone_w + bezel * 2, pad + phone_h + bezel * 2],
        radius=40,
        fill=(24, 30, 42, 255),
        outline=CINDER_FLAME,
        width=2
    )

    # Screen
    screen_resized = screen_img.resize((phone_w, phone_h), Image.Resampling.LANCZOS)
    screen_mask = Image.new("L", (phone_w, phone_h), 0)
    d_sm = ImageDraw.Draw(screen_mask)
    d_sm.rounded_rectangle([0, 0, phone_w, phone_h], radius=32, fill=255)

    screen_layer = Image.new("RGBA", (canv_w, canv_h), (0, 0, 0, 0))
    screen_layer.paste(screen_resized, (pad + bezel, pad + bezel), screen_mask)

    # Dynamic Island
    island_w = int(phone_w * 0.28)
    island_h = 22
    ix = pad + bezel + (phone_w - island_w) // 2
    iy = pad + bezel + 8
    d_sl = ImageDraw.Draw(screen_layer)
    d_sl.rounded_rectangle([ix, iy, ix + island_w, iy + island_h], radius=11, fill=(10, 12, 16, 255))

    canvas = Image.alpha_composite(canvas, chassis)
    canvas = Image.alpha_composite(canvas, screen_layer)
    return canvas

def build_editorial_card(img, target_w=780, target_h=620):
    """Clean high-resolution photo card for editorial problem scene"""
    pad = 30
    canv_w = target_w + pad * 2
    canv_h = target_h + pad * 2
    canvas = Image.new("RGBA", (canv_w, canv_h), (0, 0, 0, 0))

    # Drop shadow
    sh_mask = Image.new("RGBA", (canv_w, canv_h), (0, 0, 0, 0))
    d_sh = ImageDraw.Draw(sh_mask)
    d_sh.rounded_rectangle([pad + 6, pad + 12, pad + target_w + 6, pad + target_h + 12], radius=24, fill=(0, 0, 0, 150))
    canvas = Image.alpha_composite(canvas, sh_mask.filter(ImageFilter.GaussianBlur(20)))

    # Scaled crop
    cropped = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    mask = Image.new("L", (target_w, target_h), 0)
    d_m = ImageDraw.Draw(mask)
    d_m.rounded_rectangle([0, 0, target_w, target_h], radius=20, fill=255)

    im_layer = Image.new("RGBA", (canv_w, canv_h), (0, 0, 0, 0))
    im_layer.paste(cropped, (pad, pad), mask)

    # Border outline
    border = Image.new("RGBA", (canv_w, canv_h), (0, 0, 0, 0))
    d_b = ImageDraw.Draw(border)
    d_b.rounded_rectangle([pad, pad, pad + target_w, pad + target_h], radius=20, outline=(255, 107, 53, 180), width=2)

    canvas = Image.alpha_composite(canvas, im_layer)
    canvas = Image.alpha_composite(canvas, border)
    return canvas

def render_frame(t, frame_idx):
    # 1. Determine active act
    active_act = ACTS[-1]
    for act in ACTS:
        if act["start"] <= t < act["end"]:
            active_act = act
            break

    act_start = active_act["start"]
    act_end = active_act["end"]
    act_dur = act_end - act_start
    rel_t = (t - act_start) / max(act_dur, 0.001)

    # Smooth subtle transition fade at act boundaries (0.3s crossfade)
    fade = min(rel_t * act_dur / 0.3, 1.0)

    # 2. Base Clean Studio Background (Deep Graphite Canvas, subtle radial warmth)
    frame = Image.new("RGBA", (WIDTH, HEIGHT), BG_PRIMARY + (255,))
    draw = ImageDraw.Draw(frame)

    # Subtle ambient gradient behind the right presentation stage
    stage_glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d_sg = ImageDraw.Draw(stage_glow)
    d_sg.ellipse([1000, 150, 1850, 850], fill=(255, 107, 53, 18))
    frame = Image.alpha_composite(frame, stage_glow.filter(ImageFilter.GaussianBlur(80)))
    draw = ImageDraw.Draw(frame)

    # Subtle vertical split divider separating Narrative (Left) from Showcase (Right)
    draw.line([(1020, 100), (1020, HEIGHT - 180)], fill=BORDER_COLOR + (180,), width=1)

    # 3. TOP NAVIGATION BAR (Clear Journey Tabs & Live Timer)
    draw.rectangle([0, 0, WIDTH, 80], fill=BG_SURFACE + (255,))
    draw.line([(0, 80), (WIDTH, 80)], fill=BORDER_COLOR, width=1)

    # Brand Logo
    draw.rectangle([50, 20, 72, 60], fill=CINDER_FLAME)
    draw.polygon([(72, 20), (86, 40), (72, 60)], fill=CINDER_AMBER)
    draw.text((98, 24), "CINDER", fill=TEXT_MAIN, font=FONT_LOGO)

    # Journey Stepper Navigation Tabs
    tab_x = 340
    tab_w = 210
    for idx, act in enumerate(ACTS):
        is_active = (act["id"] == active_act["id"])
        is_done = (t >= act["end"])
        tx = tab_x + idx * (tab_w + 14)

        if is_active:
            # Active tab: highlighted with flame underline
            draw.rounded_rectangle([tx, 16, tx + tab_w, 64], radius=8, fill=BG_SURFACE_ALT, outline=CINDER_FLAME, width=1)
            draw.text((tx + 16, 23), f"STEP 0{idx+1}", fill=CINDER_AMBER, font=FONT_STEP_NUM)
            draw.text((tx + 16, 41), act["nav_tab"], fill=TEXT_MAIN, font=FONT_STEP_TEXT)
            # Underline glow
            draw.rectangle([tx + 16, 61, tx + tab_w - 16, 63], fill=CINDER_FLAME)
        else:
            # Inactive tab
            tab_fill = (14, 20, 31)
            text_color = EMERALD if is_done else TEXT_DIM
            draw.rounded_rectangle([tx, 16, tx + tab_w, 64], radius=8, fill=tab_fill, outline=BORDER_COLOR, width=1)
            draw.text((tx + 16, 23), f"STEP 0{idx+1}" + (" ✓" if is_done else ""), fill=text_color, font=FONT_STEP_NUM)
            draw.text((tx + 16, 41), act["nav_tab"], fill=TEXT_MUTED if is_done else TEXT_DIM, font=FONT_STEP_TEXT)

    # Live timecode badge (Right side)
    time_str = f"{t:05.2f}s  /  30.00s"
    draw.text((WIDTH - 240, 30), time_str, fill=CYAN_ACCENT, font=FONT_BADGE)

    # 4. LEFT SECTION: HERO NARRATIVE & CORE VALUE PROPOSITION
    left_x = 70
    narr_y = 135

    # Category Eyebrow Pill
    draw.rounded_rectangle([left_x, narr_y, left_x + 360, narr_y + 32], radius=6, fill=BG_SURFACE, outline=CINDER_FLAME, width=1)
    draw.rectangle([left_x + 10, narr_y + 8, left_x + 16, narr_y + 24], fill=CINDER_FLAME)
    draw.text((left_x + 26, narr_y + 8), active_act["category"], fill=CINDER_AMBER, font=FONT_BADGE)

    # Big Bold Hero Title
    title_lines = active_act["hero_title"].split("\n")
    ty = narr_y + 54
    for line in title_lines:
        draw.text((left_x, ty), line, fill=TEXT_MAIN, font=FONT_HERO)
        ty += 54

    # Explanatory Subtitle
    ty += 16
    for subline in active_act["hero_sub"].split("\n"):
        draw.text((left_x, ty), subline, fill=TEXT_MUTED, font=FONT_HERO_SUB)
        ty += 32

    # Key Architecture / Feature Bullets
    ty += 28
    draw.text((left_x, ty), "KEY CAPABILITIES:", fill=CYAN_ACCENT, font=FONT_PILL)
    ty += 26
    for feat in active_act["features"]:
        draw.ellipse([left_x + 4, ty + 6, left_x + 12, ty + 14], fill=CINDER_FLAME)
        draw.text((left_x + 24, ty), feat, fill=TEXT_MAIN, font=FONT_DESC)
        ty += 36

    # 5. RIGHT SECTION: CLEAN SHOWCASE STAGE (No Background Clutter)
    raw_img = LOADED_IMAGES.get(active_act["screen_img"])
    if raw_img:
        if active_act["screen_type"] == "phone":
            # Studio Phone Mockup with subtle floating physics
            card = build_phone_card(raw_img, target_h=710)
            cw, ch = card.size
            cx = 1050 + (840 - cw) // 2
            # Subtle floating motion
            float_y = math.sin(t * 2.0) * 8
            cy = int(105 + (HEIGHT - 290 - ch) // 2 + float_y)
            frame.paste(card, (cx, cy), card)
        else:
            # Large editorial photo display card
            card = build_editorial_card(raw_img, target_w=760, target_h=560)
            cw, ch = card.size
            cx = 1050 + (840 - cw) // 2
            cy = 105 + (HEIGHT - 290 - ch) // 2
            frame.paste(card, (cx, cy), card)

    # 6. BOTTOM KARAOKE LYRIC ENGINE (Integrated & Elegant)
    draw = ImageDraw.Draw(frame)
    k_y = HEIGHT - 165
    k_h = 160

    # Container Box
    draw.rectangle([0, k_y, WIDTH, HEIGHT], fill=BG_SURFACE + (255,))
    draw.line([(0, k_y), (WIDTH, k_y)], fill=BORDER_COLOR, width=1)

    # Track Header
    draw.rectangle([50, k_y + 16, 56, k_y + 32], fill=CINDER_FLAME)
    draw.text((68, k_y + 16), "SOUNDTRACK · 'FIND YOUR POD'  |  REAL-TIME VOCAL SYNC", fill=CYAN_ACCENT, font=FONT_KARAOKE_SUB)

    # Word-by-word active highlighting with bouncing ball
    k_line = active_act["karaoke_line"]
    words = k_line["words"]

    curr_kx = 68
    curr_ky = k_y + 44
    for word_text, w_start, w_end in words:
        if t < w_start:
            # Future words: soft muted slate
            w_color = (130, 145, 168)
            is_active_word = False
        elif w_start <= t <= w_end:
            # Active word: vibrant burning gold/orange with bounce
            w_color = (255, 220, 110)
            is_active_word = True
        else:
            # Already sung words: clean crisp white
            w_color = (250, 252, 255)
            is_active_word = False

        bbox = draw.textbbox((curr_kx, curr_ky), word_text + " ", font=FONT_KARAOKE)
        w_w = bbox[2] - bbox[0]

        # Wrap if exceeding right margin
        if curr_kx + w_w > WIDTH - 60:
            curr_kx = 68
            curr_ky += 36

        if is_active_word:
            # Bouncing indicator ball
            rel_w = (t - w_start) / max(w_end - w_start, 0.001)
            bounce = math.sin(rel_w * math.pi) * 8
            bx = curr_kx + (w_w - 10) / 2
            by = curr_ky - 8 - bounce
            draw.ellipse([bx - 5, by - 5, bx + 5, by + 5], fill=CINDER_FLAME, outline=TEXT_MAIN, width=1)
            # Word highlight pill
            draw.rounded_rectangle([curr_kx - 4, curr_ky - 2, curr_kx + w_w - 2, curr_ky + 32], radius=6, fill=(255, 107, 53, 50))

        draw.text((curr_kx, curr_ky), word_text, fill=w_color, font=FONT_KARAOKE)
        curr_kx += w_w

    # Bottom Progress Bar (Orange accent)
    prog_w = int((t / TOTAL_SECONDS) * WIDTH)
    draw.rectangle([0, HEIGHT - 5, prog_w, HEIGHT], fill=CINDER_FLAME)
    draw.rectangle([prog_w, HEIGHT - 5, WIDTH, HEIGHT], fill=(30, 41, 59, 200))

    return frame.convert("RGB")

def main():
    print(f"Starting Clean Product Journey & Hero Narrative Video Deck ({TOTAL_FRAMES} frames)...")
    if FRAMES_DIR.exists():
        shutil.rmtree(FRAMES_DIR)
    FRAMES_DIR.mkdir(parents=True, exist_ok=True)

    t0 = time.time()
    for frame_idx in range(TOTAL_FRAMES):
        t = frame_idx / FPS
        frame = render_frame(t, frame_idx)
        frame.save(FRAMES_DIR / f"frame_{frame_idx:05d}.jpg", quality=94)
        if frame_idx % 90 == 0 or frame_idx == TOTAL_FRAMES - 1:
            print(f"Rendered frame {frame_idx}/{TOTAL_FRAMES} ({t:.2f}s) - {time.time()-t0:.1f}s elapsed")

    print("Frames rendered! Compiling video with FFmpeg...")
    cmd = [
        "ffmpeg",
        "-y",
        "-framerate", str(FPS),
        "-i", str(FRAMES_DIR / "frame_%05d.jpg"),
        "-i", str(AUDIO_FILE),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        str(OUT_VIDEO_ROOT)
    ]
    subprocess.run(cmd, check=True)

    # Mirror to public/video-deck
    shutil.copyfile(OUT_VIDEO_ROOT, OUT_VIDEO_PUB)
    print(f"Video successfully updated at: {OUT_VIDEO_ROOT}")
    print(f"And mirrored to: {OUT_VIDEO_PUB}")

if __name__ == "__main__":
    main()

