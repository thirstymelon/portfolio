# Lokesh Panditi — Portfolio

Flask app serving the portfolio landing page, three project deep dives, and a themed 404 page.

## Layout

```
app.py                    routes + the per-page metadata / project registry
requirements.txt
pytest.ini requirements-dev.txt
tests/test_app.py         smoke suite (routes, redirects, gif picker)
style.scss project.scss   stylesheet sources (build inputs, kept at the repo root)
static/
  style.css project.css   compiled stylesheets (generated — do not edit by hand)
  theme.js                light/dark switching + <meta name="theme-color"> sync
  cursor.js               custom cursor + card spotlight (landing, 404)
  project.js              reading progress, nav hide, TOC scrollspy, copy buttons (project pages)
  landing.js              skills / projects popovers + keyboard navigation (landing)
  favicon.svg
templates/
  base.html               shared <head>, OG/Twitter tags, fonts, script wiring
  index.html              404.html
  projects/{glyph,meshos,radiokit}.html
  partials/
    theme_init.html       pre-paint theme script (no light/dark flash)
    nav.html              landing + 404 nav
    project_nav.html      project page chrome + nav (tabs built from the registry)
    project_pagination.html
```

Every page renders through `base.html`, which owns the head, the anti-flash theme script, the
fonts, and the script tags. Page chrome and the page's own metadata come from `app.py`.

## Run it

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/flask --app app run --debug      # http://127.0.0.1:5000
```

## Tests

```bash
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/pytest
```

The suite covers every public route, the legacy 301 redirects, the themed 404
(including that the random gif picker can reach every gif in `static/gifs/`),
and the cyclic previous/next pagination between project pages.

## Routes

| URL | Page |
| --- | --- |
| `/` | landing page |
| `/projects/<slug>` (`glyph`, `meshos`, `radiokit`) | project deep dives |
| `/404` | themed error page (also the handler for any unknown URL) |
| `/index.html`, `/projects/<slug>.html`, `/404.html` | 301 redirects to the clean URLs above |

To add a project: add an entry to `PROJECTS` in `app.py` and its slug to `PROJECT_ORDER`, create
`templates/projects/<slug>.html`, and add a card to the landing page's projects popover.

## Production Deployment

The project includes `gunicorn` in `requirements.txt` and a `Procfile` for production deployment on platforms like Render, Railway, Fly.io, or Heroku:

```bash
gunicorn app:app
```

## Stylesheets

The SCSS files are the source of truth; the compiled CSS is committed because the app serves it.

```bash
sass --no-source-map style.scss static/style.css
sass --no-source-map project.scss static/project.css
```

