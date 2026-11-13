# Ultimate RC tools — Chrome extension

Current local version: **6.1.7**. Documentation checked against the workspace on
2026-11-13. The working folder contains newer UI changes than the existing 6.1.7
ZIP; the version number alone does not identify those changes. See CONTEXT.md for
developer handoff and RULES.md before editing.

## Current features and recent changes

- Four settings tabs: appearance, features, OCR and music.
- Appearance includes a dashboard background color, styled color swatches and
  theme-aware switches/sliders. Dashboard surfaces derive readable light/dark
  shades from the selected color rather than displaying the raw color unchanged.
- Image color extraction offers **Dark theme** (default) and **Light theme**.
  Both Rust and JavaScript palettes use the selected mode and update the dashboard
  color too. Mode changes invalidate palette reuse; stale asynchronous results
  are rejected if the image or mode changes.
- Portable themes include `dashboardBg` and `imageThemeMode`. Older version-1
  themes without those fields retain the current values. OCR and behavior settings
  are excluded from theme transfer.
- EduNext's left navigation uses SVG icons for account, home, assignments,
  upcoming slots, guide, support and FAQ. Original image nodes remain for React;
  replacements follow rerenders and resize. Button labels omit decorative emoji.
- Music accepts validated YouTube/Spotify links and provides title, real API
  position, seek, SVG playback controls, a video visibility toggle and stop.
  A separate minimize button reduces the player to a 48px corner icon. Hiding or
  minimizing does not request a pause; restoring retains video visibility.
  The gray unplayed seek track is not a measured download/buffer indicator.
- Opening music requests playback; reloading the page only restores the saved
  link. Live playback remains subject to embedding, service and autoplay limits.
- Since 6.1.2, OCR question text and formulas remain selectable text; short
  enumerated answers are retained. The old whole-line/emoji image-preservation
  experiment is disabled. Actual diagrams can still be image segments.

OCR is local, using bundled Vietnamese/English Tesseract workers in an offscreen
document. Rust/WASM accelerates pixel operations; it is not a new recognition
model. Emoji, math and ordinary text may still be recognized incorrectly. Original
React source recovery is best effort. Signed-in EduNext and live music streaming
have not been verified by the fixture tests.

## Historical 6.0.1 — image-preservation experiment (superseded)

The crop behavior below was disabled in 6.1.2; it does not describe current OCR.

- Recover Unicode, emoji and plain text from nearby message props, not only LaTeX.
  Skip history arrays and stop at multi-message DOM ancestors.
- Preserve small colored glyphs as inline original-image crops. Surrounding OCR
  text stays selectable. Formula lines containing detected math operators stay
  as original-image crops instead of displaying incorrect recognized symbols.
- Copy uses explicit placeholders for image-only glyphs/formulas. Exact Unicode
  copying requires source text from the page. This is visual preservation, not
  a new mathematical or emoji recognition model. Monochrome emoji, undetected
  formulas and text mistakes can still need the original-image toggle.
- Remove destructive trailing-token deletion; correct x/y coordinates for
  parallel strip words and symbols. Background OCR and worker pooling remain.
- Tested real OCR on the earlier formula image and synthetic colored emoji with
  one/two workers; tested Unicode source recovery, inline rendering and copying.
  No authenticated EduNext session was tested.

Reload the extension at chrome://extensions and reload EduNext to clear old OCR.

## 6.0.0 — portable themes and background OCR

- Export/import a versioned JSON theme from the Appearance tab. Includes colors,
  font, glass/blur settings and uploaded backgrounds (including video up to 14 MB).
  Linked backgrounds remain URLs. Maximum theme file size: 25 MB. OCR and other
  behavior settings are preserved when importing. Invalid files change nothing.
- OCR runs in one extension offscreen document, with no visible background tab.
  Requires Chrome 116+. Keep-warm and idle controls now retain/release workers.
  The lightweight offscreen document remains until the extension/browser closes.
- Multiple Tesseract workers process image strips in parallel. Auto chooses up to
  four based on processed image area, CPU and reported RAM; manual 1–8 remains.
  Images queue in order so language changes cannot terminate another active job.
- Reuses initialized workers, merges identical in-flight requests, and caches up
  to 16 recognized images / 16 MiB of results in memory using image-content hashes.
  Renewed signed URLs can reuse results after downloading/hash verification.
- Scrollbar: 6 px, rounded, transparent track, no arrow buttons, light/dark colors.
  Range sliders now use matching tracks and progress fills.

`V6-TEST-RESULTS.json` records local synthetic-fixture timings for 1/2/4 workers,
warm workers and repeated images. These are not live EduNext performance claims.
Multithreading can cost more startup time and RAM; it is not always faster.

## 5.15.0 — Rust/WebAssembly image processing

The packaged `extension/wasm/rc_kernels.wasm` is compiled from the included
dependency-free Rust source in `rust-kernels/src/lib.rs`. Rust now performs:

- OCR grayscale/gamma preprocessing, retaining alpha bytes.
- Text-strip detection, grouping and crop bounding boxes for parallel OCR.
- Figure bounding boxes, with text-row masking and border rejection.
- Dominant/accent color extraction and the seven theme colors from backgrounds.

Tesseract recognition remains the existing C++/WASM engine. Unicode text cleanup,
LaTeX recovery, text ordering, canvas operations, settings and GUI remain
JavaScript. The original JavaScript pixel algorithms are retained as startup
fallbacks if the Rust module cannot initialize. Loading failures are logged.

The Rust module is loaded in the extension OCR document and service worker.
Palette requests cross the bridge as 48×48 pixel samples; OCR image pixels
stay in the OCR document. The module has no network imports or third-party Rust
dependencies. Reusable input buffers limit repeated allocation; a 64 MiB input
limit is checked before allocation; larger OCR pixel buffers use the existing
JavaScript path. No SharedArrayBuffer/COOP/COEP is required.

Run `node tests/rust-parity.cjs` to compare pixels, palettes, and bounding boxes
against functions extracted from the original userscript. `RUST-TEST-RESULTS.json`
includes local kernel timings including pixel copies; these are not end-to-end
OCR speed measurements or a promise of a speedup on other machines.

To rebuild using your installed Rust toolchain, install the
`wasm32-unknown-unknown` target and run `rust-kernels/build.ps1`, then
`node build.mjs`. End users only need the prebuilt extension folder.

## 5.14.2 — video wallpaper CSP fix

The enabled `edunext_csp` ruleset in `extension/rules.json` removes the CSP and
CSP-Report-Only response headers only from HTTPS documents on the exact
`fsc-edunext.fpt.edu.vn` host. Other domains, media requests and the extension's
own CSP remain unchanged. Reload the extension in `chrome://extensions`, then
reload EduNext for the response-header change to take effect.

This removes all header-delivered CSP protections on that site, not just its
video restriction. It does not remove CSP delivered through HTML `<meta>` tags,
nor fix unsupported video codecs or broken media links. The existing video
wallpaper code already uses muted, looping, inline autoplay and places the video
in `.chat-overlay` for glass mode or `.chat-popup` for normal mode; it is retained.

Converted from Ultimate RC tools 5.14. Original settings and the three original GUI tabs,
presets, background images/videos, automatic color palettes, glass effects,
copy/paste controls, Enter behavior, OCR controls, language selection, parallel
workers, LaTeX source recovery, question boxes and image/text toggles are retained.

## Install

1. Extract this ZIP into a permanent folder.
2. Disable **Ultimate RC tools** in Tampermonkey to prevent duplicate handlers/UI.
3. Open `chrome://extensions` and enable **Developer mode**.
4. Choose **Load unpacked**, then select the **extension** folder (the folder
   containing `manifest.json`).
5. Reload `https://fsc-edunext.fpt.edu.vn/` and sign in as usual.
6. The Fe logo settings launcher and OCR button appear at bottom left. `Alt+C`
   opens settings; `Esc` closes them. Right-click OCR to scan the latest image.

No build, Node.js, Rust, server or Tampermonkey installation is needed to run it.
This is a local unpacked extension, not a Chrome Web Store publication.

## What changed internally

- Manifest V3 replaces the Tampermonkey wrapper.
- The original page feature code remains in the page world, preserving access
  to React fibers, MathLive properties and canvas drawing hooks.
- An isolated bridge provides extension storage, clipboard and media downloads.
- OCR runs in an extension-owned offscreen document. Existing language, thread,
  keep-warm and idle controls remain; disabled keep-warm releases workers after use.
- Tesseract.js 5.1.1, its WASM cores and Vietnamese/English language data are
  included in the ZIP. OCR runs locally; no OCR API or API key is used.
- Theme styles use an adopted stylesheet so restrictive page CSP does not block
  them. OCR requests use runtime messages instead of polling a storage inbox.

## Settings and permissions

The extension has separate storage from Tampermonkey. Existing userscript
preferences do not migrate automatically; the first run uses the original defaults.
Your original Tampermonkey settings remain untouched.

The extension injects its GUI only on the original EduNext domain. HTTP(S) host
access allows the existing arbitrary image/video background URL feature and FPT
image downloads. `clipboardWrite` preserves auto-copy; `storage` and
`unlimitedStorage` preserve settings and locally uploaded backgrounds/videos.
`declarativeNetRequestWithHostAccess` enables the narrowly scoped CSP header rule.
`offscreen` allows hidden DOM/canvas processing and local OCR workers.
It does not request browser history, passwords, cookies or debugger access.

## Development

`source/Ultimate-RC-tools-5.14.txt` is the unchanged input. `node build.mjs`
regenerates `extension/app.js`, `extension/ocr-core.js` and legacy `extension/ocr-engine.js`, with explicit
replacement guards that fail if the source structure changes. Other extension
files are maintained directly. `build-v6.mjs` applies the current transforms and
injects the modules in `source/`, including dashboard themes, navigation icons,
theme transfer and music. Edit those sources, not only generated files. There is
no root package.json or npm test script; run the Node commands directly.
`extension/vendor/assets.json` lists the bundled
OCR asset sources and SHA-256 checksums; licenses are under `extension/vendor`.

`tests/smoke.cjs` exercises the extension with local test fixtures on the two
original domain names. It uses a separate profile, strict page CSP, real packaged
OCR workers and mocked React properties. Set `RC_PLAYWRIGHT` to a Playwright
module path and `RC_CHROME` to Chrome for Testing, then run `node tests/smoke.cjs`.
These fixture tests do not replace testing against a signed-in live EduNext session.

`tests/video-csp.cjs` uses a local HTTPS fixture server and a generated test
certificate (no system certificate is installed). It compares video playback
with the CSP rule disabled/enabled, tests uploaded and URL wallpapers in both
normal and glass modes, checks reload persistence and verifies other hosts retain
their CSP. It also requires `node-forge` (`RC_FORGE` can point to its module path).
The bundled two-second VP8 fixture was generated with FFmpeg's `testsrc2` filter.

Additional focused tests: `node tests/question-text.cjs` checks selectable question
text/answer options; `node tests/music.cjs` checks mocked player lifecycle,
minimize/restore and no reload autoplay. These two currently use hard-coded
`.transfer/package` and `.transfer/chrome-win64/chrome.exe` paths. The historical
`tests/fidelity.cjs` crop assertions are obsolete; do not restore crops to pass it.
Existing `*-TEST-RESULTS.json` files are historical, not current release certification.

If you update runtime files, click **Reload** on the extension card and reload
EduNext. Keep the extracted extension folder in place. Documentation-only edits
do not require a build or reload.
