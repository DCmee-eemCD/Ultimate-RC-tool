# Recon

Chrome Manifest V3 extension for EduNext: MAIN-world page UI, ISOLATED-world bridge/answer automation, service-worker storage/network broker, offscreen Tesseract OCR, Rust WASM pixel kernels with JavaScript fallback. Node build generates app/OCR code from the historical userscript and source fragments using 16 build helpers/transforms. No application database.

Trust boundaries: page-to-extension messages; content-script-to-service-worker operations; provider keys in local extension storage; remote image/provider responses; imported themes. Generated app code duplicates source fragments; repairs belong in source/transforms and must be rebuilt.

Triage: 67 files, budget 60, extended strategy; its queue excludes LOW scripts, so expanded production queue is 41 files (25 runtime + 16 scripts). 26 tests are context-only. Vendored/minified code, assets, docs and configuration are excluded. The .txt userscript is traced through its generated runtime code and build transforms.

Backend: local sequential adjudication/fixes with three bounded read-only worker scans. Ralph tools unavailable; explicit coverage artifacts track completion. Documentation fallback verified through Context7; chub unavailable. No existing threat model.

Baseline: npm run check, npm test, npm run test:byok passed. Existing dirty working tree preserved; file snapshots will isolate rollback of audit changes without stashing away the code being audited.
