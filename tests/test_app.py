"""Smoke tests for the Flask portfolio app.

Covers the public routes, the legacy 301 redirects, the 404 page (template +
random gif picker), and the cyclic previous/next pagination between projects.

Run with:  pytest
"""

import re
import random
from pathlib import Path

import pytest

import app as app_module


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def client():
    app_module.app.config["TESTING"] = True
    with app_module.app.test_client() as client:
        yield client


@pytest.fixture()
def project_slugs():
    return list(app_module.PROJECT_ORDER)


# ---------------------------------------------------------------------------
# Landing page
# ---------------------------------------------------------------------------

class TestLanding:
    def test_home_returns_200(self, client):
        resp = client.get("/")
        assert resp.status_code == 200

    def test_home_renders_index_template(self, client):
        html = client.get("/").get_data(as_text=True)
        assert "cursorRing" in html          # shared custom-cursor element
        assert "Lokesh Panditi" in html

    def test_home_has_canonical_assets(self, client):
        html = client.get("/").get_data(as_text=True)
        assert "/static/style.css" in html
        assert "/static/cursor.js" in html


# ---------------------------------------------------------------------------
# Project pages
# ---------------------------------------------------------------------------

class TestProjectPages:
    def test_every_registered_project_returns_200(self, client, project_slugs):
        for slug in project_slugs:
            resp = client.get(f"/projects/{slug}")
            assert resp.status_code == 200, slug

    def test_unknown_project_404s_and_renders_error_page(self, client):
        resp = client.get("/projects/does-not-exist")
        assert resp.status_code == 404
        html = resp.get_data(as_text=True)
        assert "error-title" in html          # themed 404, not Flask's plain page
        assert "Page not found" in html

    def test_project_links_back_to_home(self, client, project_slugs):
        for slug in project_slugs:
            html = client.get(f"/projects/{slug}").get_data(as_text=True)
            assert 'href="/"' in html, slug

    def test_pagination_links_present_and_cyclic(self, client, project_slugs):
        """Each project must link to its ordered neighbours, wrapping around."""
        for i, slug in enumerate(project_slugs):
            html = client.get(f"/projects/{slug}").get_data(as_text=True)
            prev_slug = project_slugs[i - 1]
            next_slug = project_slugs[(i + 1) % len(project_slugs)]
            assert f"/projects/{prev_slug}" in html, f"{slug}: prev link"
            assert f"/projects/{next_slug}" in html, f"{slug}: next link"


# ---------------------------------------------------------------------------
# Legacy redirects
# ---------------------------------------------------------------------------

class TestLegacyRedirects:
    @pytest.mark.parametrize(
        ("legacy_path", "target"),
        [
            ("/index.html", "/"),
            ("/404.html", "/404"),
        ],
    )
    def test_legacy_redirects_301(self, client, legacy_path, target):
        resp = client.get(legacy_path)
        assert resp.status_code == 301
        assert resp.headers["Location"].endswith(target)

    @pytest.mark.parametrize("slug", ["glyph", "meshos", "radiokit"])
    def test_legacy_project_redirects_301(self, client, slug):
        resp = client.get(f"/projects/{slug}.html")
        assert resp.status_code == 301
        assert resp.headers["Location"].endswith(f"/projects/{slug}")

    @pytest.mark.parametrize(
        ("legacy_url", "expected_target"),
        [
            ("/projects/esp32-mesh", "/projects/meshos"),
            ("/projects/esp32-mesh.html", "/projects/meshos"),
            ("/projects/radio-kit", "/projects/radiokit"),
            ("/projects/radio-kit.html", "/projects/radiokit"),
            ("/projects/embedded-shell", "/projects/radiokit"),
            ("/projects/embedded-shell.html", "/projects/radiokit"),
        ],
    )
    def test_legacy_project_slug_aliases_301(self, client, legacy_url, expected_target):
        resp = client.get(legacy_url)
        assert resp.status_code == 301
        assert resp.headers["Location"].endswith(expected_target)

    def test_legacy_redirect_for_unknown_project_404s(self, client):
        assert client.get("/projects/nope.html").status_code == 404


# ---------------------------------------------------------------------------
# 404 page & gif picker
# ---------------------------------------------------------------------------

class TestNotFoundPage:
    def test_unknown_url_returns_themed_404(self, client):
        resp = client.get("/this/page/never/existed")
        assert resp.status_code == 404
        html = resp.get_data(as_text=True)
        assert "Page not found" in html
        assert "error-gif-window" in html

    def test_explicit_404_route_renders(self, client):
        assert client.get("/404").status_code == 404

    def test_renders_exactly_one_gif_window(self, client):
        html = client.get("/404").get_data(as_text=True)
        assert html.count("error-gif-window") == 1
        assert html.count("error-code") == 1

    def test_gif_src_points_at_static_gifs(self, client):
        html = client.get("/404").get_data(as_text=True)
        match = re.search(r"/static/gifs/([^\"']+)", html)
        assert match, "no gif rendered"
        gif_name = match.group(1)
        assert gif_name.endswith(".gif")
        assert (Path(app_module.app.static_folder) / "gifs" / gif_name).is_file()


class TestGifPicker:
    def test_gifs_discovered_at_startup(self):
        assert len(app_module.ERROR_GIFS) > 0
        assert all(name.endswith(".gif") for name in app_module.ERROR_GIFS)
        assert app_module.ERROR_GIFS == sorted(app_module.ERROR_GIFS)

    def test_every_registered_gif_is_on_disk(self):
        gifs_dir = Path(app_module.app.static_folder) / "gifs"
        for name in app_module.ERROR_GIFS:
            assert (gifs_dir / name).is_file()

    def test_render_not_found_uses_only_known_gifs(self):
        for _ in range(30):
            with app_module.app.test_request_context("/404"):
                _, status = app_module.render_not_found()
            assert status == 404

    def test_picker_can_produce_all_gifs(self):
        """With a patched RNG, every discovered gif must be reachable — catches
        off-by-one / filtering bugs in the random selection."""
        rendered = set()
        original_choice = random.choice
        for gif in app_module.ERROR_GIFS:
            random.choice = lambda seq, gif=gif: gif
            try:
                with app_module.app.test_request_context("/404"):
                    html, _ = app_module.render_not_found()
                match = re.search(r"/static/gifs/([^\"']+)", html)
                rendered.add(match.group(1))
            finally:
                random.choice = original_choice
        assert rendered == set(app_module.ERROR_GIFS)

    def test_gifs_vary_across_requests(self):
        """Statistical smoke: 30 requests on a 22-gif pool should yield >1 unique.
        Flaky only if random.choice is pinned, which it isn't here."""
        seen = set()
        for _ in range(30):
            with app_module.app.test_request_context("/404"):
                html, _ = app_module.render_not_found()
            match = re.search(r"/static/gifs/([^\"']+)", html)
            seen.add(match.group(1))
        assert len(seen) > 1, "gif picker returned the same gif every time"


# ---------------------------------------------------------------------------
# Misc endpoints & static asset integrity
# ---------------------------------------------------------------------------

class TestMisc:
    def test_favicon_serves_svg(self, client):
        resp = client.get("/favicon.ico")
        assert resp.status_code == 200
        assert resp.mimetype == "image/svg+xml"

        resp_svg = client.get("/favicon.svg")
        assert resp_svg.status_code == 200
        assert resp_svg.mimetype == "image/svg+xml"

    def test_icons_and_manifest(self, client):
        assert client.get("/favicon-32x32.png").status_code == 200
        assert client.get("/apple-touch-icon.png").status_code == 200
        manifest_resp = client.get("/site.webmanifest")
        assert manifest_resp.status_code == 200
        assert "application/manifest+json" in manifest_resp.mimetype

    def test_seo_files(self, client):
        robots_resp = client.get("/robots.txt")
        assert robots_resp.status_code == 200
        assert "User-agent" in robots_resp.get_data(as_text=True)

        sitemap_resp = client.get("/sitemap.xml")
        assert sitemap_resp.status_code == 200
        assert "urlset" in sitemap_resp.get_data(as_text=True)

    def test_resume_and_og_image(self, client):
        assert client.get("/LOKESH_PANDITI.pdf").status_code == 200
        assert client.get("/og-image.png").status_code == 200

    def test_meta_social_tags(self, client):
        html = client.get("/").get_data(as_text=True)
        assert 'property="og:image"' in html
        assert 'name="twitter:image"' in html
        assert 'rel="apple-touch-icon"' in html
        assert 'rel="manifest"' in html

    def test_theme_init_renders_before_stylesheets(self, client):
        """The anti-flash theme script must appear in <head> ahead of the CSS link
        (that ordering is what prevents a light/dark flash on load)."""
        html = client.get("/").get_data(as_text=True)
        theme_pos = html.find("data-theme")
        css_pos = html.find('rel="stylesheet"')
        assert 0 <= theme_pos < css_pos

    def test_all_rendered_static_assets_resolve_200(self, client, project_slugs):
        """Scan all rendered HTML pages and ensure every referenced static asset exists."""
        routes = ["/", "/404"] + [f"/projects/{s}" for s in project_slugs]
        for route in routes:
            resp = client.get(route)
            html = resp.get_data(as_text=True)
            for match in re.finditer(r'/static/[^\"\' >)]+', html):
                asset_path = match.group(0).split("?")[0].split("#")[0]
                asset_resp = client.get(asset_path)
                assert asset_resp.status_code == 200, f"Missing asset {asset_path} referenced on {route}"

