# GT7 Setup Lab

GT7 Setup Lab — Web app to generate and iterate car setups for Gran Turismo 7 (MVP).

This repository contains a static HTML/CSS/JS single-page app designed to run on GitHub Pages. It is an MVP and intentionally keeps all data and logic client-side using localStorage. Official GT7 data is not automatically scraped; vehicle data must be imported manually and marked with verification status.

What's included in this commit:
- Improved generator that also provides GT7内での検証手順（テスト1〜6）
- UI: export generated setting as JSON/CSV
- Vehicle import/export (JSON/CSV)
- Symptom-driven troubleshooting quick-help
- Compare two saved settings (diff view)

How to run
1. Clone the repository or open index.html directly in a browser.
2. Use the sample vehicle data in data/vehicles.sample.json to try features.

Limitations
- All data is client-side and stored in localStorage. No server-side sync.
- Official GT7 data must be manually imported and verified.

