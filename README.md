# Lycée Bonaparte de Doha

A local school hackathon redesign: an editorial yearbook with a cinematic entrance, interactive history and academic pathways, campus gallery, trophy room, travel scrapbook, media CD studio and eleven original clubs.

## Preview

Requires Node.js 22 or newer. No dependency installation or build step.

```powershell
cd C:\Users\Admin\Documents\Bonaparte-Hackathon
node tools/server.mjs
```

Open **http://127.0.0.1:5173**. Stop with **Ctrl+C**.

If npm is available, `npm run dev` is equivalent. Node is installed here; npm was not on PATH, so verification used Node directly. Any HTTP static server can serve the site. Do not open index.html with file:// because browsers restrict JavaScript modules. Hash navigation supports deep links and refresh without server rewrites.

## Project structure

- `index.html`: entry, metadata, native dialogs, no-script fallback.
- `src/app.js`: page templates, routing and interactive state, organized by page functions.
- `src/content.js`: all original structured content, extracted from the untouched export.
- `src/images.js`: replacement image manifest and pending Spotify URL.
- `src/styles.css`: tokens, layouts, responsive styles, motion and reduced-motion support.
- `src/fonts.css`, `assets/fonts/`: locally hosted Fraunces and Public Sans.
- `assets/`: all 36 supplied images retained with original names.
- `original/`: complete recoverable original export, README, runtime, vendor files and assets. View `/original/Main.dc.html` through the server.
- `docs/`: provenance, pending assets and audit evidence.

## Pages

- `#/accueil`: entrance, homepage, history, academic cycles, pathways, orientation, gallery and FAQ.
- `#/vie`: community, filterable facilities and original event descriptions.
- `#/academie`: four artifact exhibits with supplied images; nine competition descriptions, without undocumented award claims.
- `#/voyages`: seven original destinations, page-turn scrapbook and labeled photo placeholders.
- `#/media`: opening CD case, controlled disc rotation, pending Spotify state; no autoplay audio.
- `#/clubs`: searchable directory and dedicated themed club pages.
- `#/inscriptions`, `#/recrutement`: honest placeholders linked to the official school site.
- `#/contact`: verified contact links and official form; no simulated submission.
- `#/personnel`: official staff mail and Pronote.
- `#/sources`: content status, unverified original statistics and prototype disclosure.

## Replacing content

Edit `src` and `alt` in `src/images.js`. Trip images use landscape slots (4:3 recommended); animations do not depend on filenames. Facility and club image associations live in `src/content.js`. Set `spotifyUrl` only when the authentic school URL is supplied. See `docs/ASSETS-NEEDED.md`.

`tools/extract-content.mjs` regenerates content.js from the preserved export. Do not run it after intentionally editing that data unless you want to restore original values.

## Checks

```powershell
node --check src/app.js
node --check src/content.js
node --check src/images.js
node --check tools/server.mjs
node tools/test.mjs
```

The browser test script uses the installed Taste skill's zero-dependency Chrome helper at `~/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs`. This is a developer-only test requirement, not a website dependency. It starts an isolated server on port 5174, launches Chrome and saves results under `docs/browser-tests/`.

## Status

Unofficial local hackathon concept; nothing deployed. Contact details are verified; other school data is inherited source material, not independently certified current information. Missing trophy documentation, travel photography and Spotify links are disclosed. See `docs/QUALITY-REPORT.md` for actual checks and limitations.
