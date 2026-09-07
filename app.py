"""
Lokesh Panditi — Portfolio Web Application
Built with Flask for embedded systems & firmware projects showcase.
"""

import os
from flask import Flask, render_template, send_from_directory, redirect, url_for

app = Flask(__name__, static_folder="static", template_folder="templates")


@app.route("/")
def index():
    """Renders the main portfolio landing page."""
    return render_template("index.html")


@app.route("/projects/glyph")
def project_glyph():
    """Renders the Glyph Graphics Library deep dive."""
    return render_template("projects/glyph.html")


@app.route("/projects/esp32-mesh")
def project_esp32_mesh():
    """Renders the ESP32 Mesh Network deep dive."""
    return render_template("projects/esp32_mesh.html")


@app.route("/projects/radio-kit")
def project_radio_kit():
    """Renders the Radio_Kit Ada RF framework deep dive."""
    return render_template("projects/radio_kit.html")


@app.route("/projects/embedded-shell")
def project_embedded_shell_redirect():
    """Redirect legacy embedded shell route to radio-kit."""
    return redirect(url_for("project_radio_kit"), code=301)


# Static file helpers for root level assets
@app.route("/robots.txt")
def robots_txt():
    return send_from_directory(app.static_folder, "robots.txt", mimetype="text/plain")


@app.route("/sitemap.xml")
def sitemap_xml():
    return send_from_directory(app.static_folder, "sitemap.xml", mimetype="application/xml")


@app.route("/site.webmanifest")
def site_webmanifest():
    return send_from_directory(app.static_folder, "site.webmanifest", mimetype="application/manifest+json")


@app.route("/favicon.ico")
@app.route("/favicon.svg")
def favicon():
    return send_from_directory(app.static_folder, "favicon.svg", mimetype="image/svg+xml")


@app.route("/favicon-32x32.png")
def favicon_32():
    return send_from_directory(app.static_folder, "favicon-32x32.png", mimetype="image/png")


@app.route("/apple-touch-icon.png")
def apple_touch_icon():
    return send_from_directory(app.static_folder, "apple-touch-icon.png", mimetype="image/png")


@app.route("/og-image.png")
def og_image():
    return send_from_directory(app.static_folder, "og-image.png", mimetype="image/png")


@app.route("/LOKESH_PANDITI.pdf")
def resume_pdf():
    return send_from_directory(app.static_folder, "LOKESH_PANDITI.pdf", mimetype="application/pdf")


import random


def get_random_gif():
    """Returns a random GIF filename from static/gifs."""
    gif_dir = os.path.join(app.static_folder, "gifs")
    if os.path.exists(gif_dir):
        gifs = [f for f in os.listdir(gif_dir) if f.lower().endswith(".gif")]
        if gifs:
            return random.choice(gifs)
    return "1.gif"


@app.route("/404")
def not_found_page():
    """Explicit route to preview the 404 page."""
    return render_template("404.html", gif_file=get_random_gif()), 404


@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html", gif_file=get_random_gif()), 404


@app.errorhandler(500)
def server_error(e):
    return render_template("404.html", gif_file=get_random_gif()), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 50009))
    app.run(host="0.0.0.0", port=port, debug=True)
