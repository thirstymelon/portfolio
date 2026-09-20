"""Flask app for the Lokesh Panditi portfolio.

Templates live in templates/ (shared chrome in templates/partials), assets in static/.
The SCSS sources stay at the repo root as build inputs and are compiled into static/:

    sass --no-source-map style.scss static/style.css
    sass --no-source-map project.scss static/project.css
"""
from pathlib import Path
import random

from flask import Flask, abort, redirect, render_template, send_from_directory, url_for

app = Flask(__name__)

# --bg-outer in each stylesheet; the live value is mirrored into <meta name="theme-color">
# by static/theme.js, these are only the pre-JS defaults.
LANDING_BG = "#0b0b0d"
PROJECT_BG = "#070709"

SITE = {
    "og_site_name": "Lokesh Panditi Portfolio",
    "base_url": "https://lokeshpanditi.qzz.io",
}


def page_meta(title, description, *, og_title=None, og_description=None, og_type="website",
              og_image="/static/og-image.png", robots=None, keywords=None,
              theme_color=LANDING_BG, stylesheet="style.css"):
    """Per-page <head> metadata, consumed by templates/base.html."""
    return {
        "title": title,
        "description": description,
        "og_title": og_title or title,
        "og_description": og_description or description,
        "og_type": og_type,
        "og_image": og_image,
        "robots": robots,
        "keywords": keywords,
        "theme_color": theme_color,
        "stylesheet": stylesheet,
    }


PROJECT_ORDER = ("glyph", "meshos", "radiokit")

PROJECTS = {
    "glyph": {
        "slug": "glyph",
        "tab": "✦ Glyph",
        "nav_title": "Glyph Graphics Library",
        "card_label": "✦ Glyph Graphics Framework",
        "repo": "https://github.com/thirstymelon/glyph",
        "title": "Glyph — Building a Portable Graphics Framework for Bare-Metal Ada | Lokesh Panditi",
        "og_title": "Glyph — Building a Portable Graphics Framework for Bare-Metal Ada",
        "description": "Technical deep dive into Glyph, a lightweight, portable graphics "
                       "framework written in Ada 2022 for bare-metal and embedded systems "
                       "like the RP2040 and SSD1306 OLED.",
    },
    "meshos": {
        "slug": "meshos",
        "tab": "⚡ MeshOS",
        "nav_title": "MeshOS ESP-NOW Network",
        "card_label": "⚡ MeshOS Mesh Network",
        "repo": "https://github.com/thirstymelon/esp32Mesh",
        "title": "MeshOS — Building an Offline, Encrypted Communication Network with ESP32 | Lokesh Panditi",
        "og_title": "MeshOS — Building an Offline, Encrypted Communication Network with ESP32",
        "description": "Technical deep dive into MeshOS, an offline, encrypted peer-to-peer "
                       "multi-hop mesh communication network using ESP32, ESP-NOW, and native "
                       "iOS/macOS SwiftUI companion apps.",
    },
    "radiokit": {
        "slug": "radiokit",
        "tab": "∿ Radio_Kit",
        "nav_title": "Radio_Kit RF Synthesizer",
        "card_label": "∿ Radio_Kit Framework",
        "repo": "https://github.com/thirstymelon/Radio_Kit",
        "title": "Radio_Kit — Turning an RP2040's Clock Tree into an Experimental RF Source | Lokesh Panditi",
        "og_title": "Radio_Kit — Turning an RP2040's Clock Tree into an Experimental RF Source",
        "description": "Technical deep dive into Radio_Kit, an experimental Ada framework for "
                       "the RP2040 that generates programmable 6 Hz to 90 MHz digital RF "
                       "carriers directly from on-chip clock dividers.",
    },
}

for _project in PROJECTS.values():
    _project["meta"] = page_meta(
        _project["title"],
        _project["description"],
        og_title=_project["og_title"],
        og_type="article",
        theme_color=PROJECT_BG,
        stylesheet="project.css",
    )

PAGES = {
    "home": page_meta(
        "Lokesh Panditi — Embedded Systems & Firmware",
        "Lokesh Panditi — Embedded Systems & Firmware Engineer. Building bare-metal systems, "
        "high-integrity firmware, and real-time silicon architecture in C, C++, Ada, and Rust.",
        og_description="Bare-metal firmware, deterministic hardware drivers, and real-time "
                       "silicon architecture.",
        keywords="Lokesh Panditi, Embedded Systems, Firmware, RP2040, Ada, C, C++, Rust, "
                 "Microcontrollers, Bare Metal",
    ),
    "404": page_meta(
        "404 — Page Not Found | Lokesh Panditi",
        "That page doesn't exist on this site. Head back to Lokesh Panditi's embedded "
        "systems and firmware portfolio.",
        og_title="404 — Page Not Found",
        robots="noindex",
    ),
}

NAV_TAGS = {
    "home": "EMBEDDED SYSTEMS ENGINEER • FIRMWARE DEVELOPER",
    "404": "ERROR 404 • PAGE NOT FOUND",
}


LEGACY_SLUG_ALIASES = {
    "esp32-mesh": "meshos",
    "esp32_mesh": "meshos",
    "radio-kit": "radiokit",
    "radio_kit": "radiokit",
    "embedded-shell": "radiokit",
    "embedded_shell": "radiokit",
}


@app.context_processor
def inject_globals():
    """Site-wide template globals: the project registry, in tab order."""
    return {"site": SITE, "projects": [PROJECTS[slug] for slug in PROJECT_ORDER]}


@app.route("/")
def home():
    return render_template("index.html", meta=PAGES["home"], nav_tag=NAV_TAGS["home"])


@app.route("/projects/<slug>")
def project_page(slug):
    if slug in LEGACY_SLUG_ALIASES:
        return redirect(url_for("project_page", slug=LEGACY_SLUG_ALIASES[slug]), code=301)

    project = PROJECTS.get(slug)
    if project is None:
        abort(404)

    index = PROJECT_ORDER.index(slug)
    return render_template(
        f"projects/{slug}.html",
        project=project,
        meta=project["meta"],
        pager={
            "prev": PROJECTS[PROJECT_ORDER[index - 1]],
            "next": PROJECTS[PROJECT_ORDER[(index + 1) % len(PROJECT_ORDER)]],
        },
    )


# Every 404 render picks one of these at random, so the error page gets a fresh
# gif on each visit. Scanned once at startup; drop files into static/gifs/ and restart.
GIFS_DIR = Path(app.static_folder) / "gifs"
ERROR_GIFS = sorted(
    p.name for p in GIFS_DIR.glob("*.gif") if p.is_file()
) if GIFS_DIR.is_dir() else []


def render_not_found():
    error_gif = random.choice(ERROR_GIFS) if ERROR_GIFS else None
    return render_template(
        "404.html",
        meta=PAGES["404"],
        nav_tag=NAV_TAGS["404"],
        error_gif=error_gif,
    ), 404


@app.route("/404")
def error_page():
    """Real URL for the error page, so it can be linked and previewed directly."""
    return render_not_found()


@app.errorhandler(404)
def not_found(_error):
    return render_not_found()


@app.route("/favicon.ico")
@app.route("/favicon.svg")
def favicon():
    """Some browsers still ask for /favicon.ico first; serve the SVG mark for it."""
    return send_from_directory(app.static_folder, "favicon.svg", mimetype="image/svg+xml")


@app.route("/favicon-32x32.png")
def favicon_32():
    return send_from_directory(app.static_folder, "favicon-32x32.png", mimetype="image/png")


@app.route("/apple-touch-icon.png")
def apple_touch_icon():
    return send_from_directory(app.static_folder, "apple-touch-icon.png", mimetype="image/png")


@app.route("/og-image.png")
def og_image_route():
    return send_from_directory(app.static_folder, "og-image.png", mimetype="image/png")


@app.route("/robots.txt")
def robots_txt():
    return send_from_directory(app.static_folder, "robots.txt", mimetype="text/plain")


@app.route("/sitemap.xml")
def sitemap_xml():
    return send_from_directory(app.static_folder, "sitemap.xml", mimetype="application/xml")


@app.route("/site.webmanifest")
def site_webmanifest():
    return send_from_directory(app.static_folder, "site.webmanifest", mimetype="application/manifest+json")


@app.route("/LOKESH_PANDITI.pdf")
def resume_pdf():
    return send_from_directory(app.static_folder, "LOKESH_PANDITI.pdf", mimetype="application/pdf")


# The site used to be plain .html files; keep those URLs working.
@app.route("/index.html")
def legacy_index():
    return redirect(url_for("home"), code=301)


@app.route("/projects/<slug>.html")
def legacy_project(slug):
    target_slug = LEGACY_SLUG_ALIASES.get(slug, slug)
    if target_slug not in PROJECTS:
        abort(404)
    return redirect(url_for("project_page", slug=target_slug), code=301)


@app.route("/404.html")
def legacy_404():
    return redirect(url_for("error_page"), code=301)


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
