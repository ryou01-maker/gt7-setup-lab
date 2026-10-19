# GT7 Setup Lab — MVP

Static single-page app to generate and persist simple car setups for Gran Turismo 7. Intended as an MVP (static HTML/CSS/JS) deployable to GitHub Pages.

What I added
- index.html: UI with vehicle selector, setup controls, save/load/generate actions
- css/styles.css: minimal styling
- js/app.js: client-side logic, localStorage per-vehicle save/load, simple generator
- LICENSE: MIT

How to preview locally
1. Open index.html in a browser (no server required) or run a local static server:
   - Python 3: `python -m http.server 8000` then open http://localhost:8000
2. Try selecting a vehicle, click "Generate Setup", then "Save Current" and "Load Saved".

Next steps (suggested)
- Add more vehicle data and presets (JSON files)
- Improve generator to use track/driver inputs
- Add CSV export / import
- Add GitHub Actions to deploy to Pages

