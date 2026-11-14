# Ultimate RC tools — Chrome extension

Current version: **2.0.0** (version numbering reset at the owner's request).
Documentation reviewed **2026-11-14** against the current source and test scripts.
See [CONTEXT.md](CONTEXT.md) for developer handoff and known limitations, and
[RULES.md](RULES.md) before editing. This review is not a new packaged release.

## Project layout

| Folder | Contents |
| --- | --- |
| `extension/` | Ready-to-load Chrome extension |
| `source/` | Original userscript and maintained feature modules |
| `source/console-ui.js`, `source/console-ui.mjs` | Settings tabs and build integration |
| `source/console-size.js`, `source/console.css` | Resize interactions and panel styling |
| `source/text-source.js`, `source/source-first.mjs` | Original-content matching and fallback routing |
| `scripts/` | Build transforms used by `node build.mjs` |
| `package.json`, `package-lock.json` | CSS build dependencies and npm build script |
| `rust-kernels/` | Rust/WASM source and build script |
| `images/` | Original logo assets |
| `tests/` | Test scripts and fixtures |
| `tests/results/` | Saved test reports (historical unless stated otherwise) |
| `releases/archive/` | Old local ZIPs, excluded from Git |
| `.transfer/` | Local browser tooling, isolated profiles and staging; never ship |

The manifest is the version source; rebuild after changing its version.

## Current features and recent changes

- Four settings tabs: appearance, utilities, text (**Văn bản**) and music.
- Source-first mode is enabled by default. It recovers full original text from
  an exact message match, falling back to local OCR when content is unavailable
  or ambiguous. Explicit automatic OCR and source-first are mutually exclusive.
  Recovered LaTeX stays source text; this feature does not newly typeset it.
- Appearance includes a dashboard background color, styled color swatches and
  theme-aware switches/sliders. Dashboard surfaces derive readable light/dark
  shades from the selected color rather than displaying the raw color unchanged.
- Image color extraction offers **Dark theme** (default) and **Light theme**.
  Both Rust and JavaScript palettes use the selected mode and update the dashboard
  color too. Mode changes invalidate palette reuse; stale asynchronous results
  are rejected if the image or mode changes.
- Portable themes include `dashboardBg`, `imageThemeMode`, console accent colors
  (`consolePrimary`, `consoleSecondary`) and size (`consoleWidth`, `consoleHeight`). Older version-1
  themes without those fields retain the current values. OCR and behavior settings
  are excluded from theme transfer.
  Themes include uploaded image/video backgrounds (video up to 14 MB); the maximum
  theme file size is 25 MB. Linked backgrounds remain URLs.
- EduNext's left navigation uses SVG icons for account, home, assignments,
  upcoming slots, guide, support and FAQ. Original image nodes remain for React;
  replacements follow rerenders and resize. Button labels omit decorative emoji.
- Music accepts validated YouTube/Spotify links and provides title, real API
  position, seek, SVG playback controls, a video visibility toggle and stop.
  Both providers start with the video/embed collapsed and playback controls visible.
  A separate minimize button reduces the player to a 48px corner icon. Hiding or
  minimizing does not request a pause; restoring retains video visibility.
  The gray unplayed seek track is not a measured download/buffer indicator.
- Opening music requests playback; reloading the page only restores the saved
  link. Live playback remains subject to embedding, service and autoplay limits.
- Since pre-reset version 6.1.2, OCR question text and formulas remain selectable text; short
  enumerated answers are retained. The old whole-line/emoji image-preservation
  experiment is disabled. Actual diagrams can still be image segments.

OCR is local, using bundled Vietnamese/English Tesseract workers in an offscreen
document. Rust/WASM accelerates pixel operations; it is not a new recognition
model. Emoji, math and ordinary text may still be recognized incorrectly. Original
React source recovery is best effort. Image observation order can differ from
chat chronology; see the handoff for routing limitations. Signed-in EduNext and
live music streaming have not been verified by the fixture tests.

## Panel controls

The settings panel remains anchored at bottom-left. Size presets are **Gọn**
(320 x 520), **Mặc định** (380 x 620) and **Rộng** (560 x 820).
The readout shows the actual displayed size, capped to fit the viewport.

Hover over the top-right corner to reveal the small resize arrow and drag it.
It also appears with keyboard focus and during dragging. With the grip focused,
arrow keys adjust by 10px; Shift adjusts by 40px. Home or double-click resets
only the size. Escape cancels an active drag without closing the panel.
Dimensions save on release; viewport changes alone preserve the preferred size.
Stored width is limited to 320-560px and height to 420-820px.

The header subtitle has been removed. Its subtle gradient now fades across the
panel rather than ending at the header. Keyboard tabs and per-tab scroll positions
remain supported, with light/dark and narrow layouts.

## Install

1. Clone/download this repository (or extract a release ZIP) into a permanent folder.
2. Disable **Ultimate RC tools** in Tampermonkey to prevent duplicate handlers/UI.
3. Open `chrome://extensions` and enable **Developer mode**.
4. Choose **Load unpacked**, then select the **extension** folder (the folder
   containing `manifest.json`).
5. Reload `https://fsc-edunext.fpt.edu.vn/` and sign in as usual.
6. The Fe logo settings launcher and text button appear at bottom left. `Alt+C`
   toggles settings; `Esc` closes them unless cancelling a resize drag.
   The text button shows **Chữ gốc** in source-first mode or **OCR** in OCR mode.
   Right-click it to scan the latest observed image.

No build, Node.js, Rust, server or Tampermonkey installation is needed to run it.
This is a local unpacked extension, not a Chrome Web Store publication.
The manifest minimum is Chrome 116; use current Chrome for the latest UI.

## What changed internally

- Manifest V3 replaces the Tampermonkey wrapper.
- The original page feature code remains in the page world, preserving access
  to React fibers, MathLive properties and canvas drawing hooks.
- An isolated bridge provides extension storage, clipboard and media downloads.
- OCR runs in an extension-owned offscreen document. Auto mode chooses up to four
  workers; manual 1-8 is supported. Jobs queue, workers are reused and identical
  images are cached in memory (16 entries / 16 MiB). Keep-warm/idle controls remain;
  disabled keep-warm releases workers after use. More workers are not always faster.
- Tesseract.js 5.1.1, its WASM cores and Vietnamese/English language data are
  included in the ZIP. OCR runs locally; no OCR API or API key is used.
- Theme styles use an adopted stylesheet so restrictive page CSP does not block
  them. OCR requests use runtime messages instead of polling a storage inbox.

## Settings and permissions

The extension has separate storage from Tampermonkey. Existing userscript
preferences do not migrate automatically; the first run uses the current defaults.
Your original Tampermonkey settings remain untouched.

The extension injects its GUI only on the original EduNext domain. HTTP(S) host
access allows the existing arbitrary image/video background URL feature and FPT
image downloads. `clipboardWrite` preserves auto-copy; `storage` and
`unlimitedStorage` preserve settings and locally uploaded backgrounds/videos.
`declarativeNetRequestWithHostAccess` enables the narrowly scoped CSP header rule.
`offscreen` allows hidden DOM/canvas processing and local OCR workers.
It does not request browser history, passwords, cookies or debugger access.

The enabled `edunext_csp` rule removes CSP and CSP-Report-Only response headers
only from HTTPS documents on `fsc-edunext.fpt.edu.vn`. This removes all
header-delivered CSP protections there, not just media restrictions; HTML meta
CSP is separate. Other hosts and the extension's own CSP remain unchanged.

## Development

From the project root, with Node.js and npm installed:

```powershell
npm ci
npm run build
node --check extension/app.js
node --check extension/ocr-core.js
node --check extension/ocr-engine.js
```

`npm run build` runs `node build.mjs`. Tailwind 4 and daisyUI 5 compile
`source/console.css` to `extension/console.css`, which is also embedded in app.js.
The build copies both CSS-library licenses. Do not edit generated CSS directly.

`source/Ultimate-RC-tools-5.14.txt` is the unchanged input. `node build.mjs`
regenerates `extension/app.js`, `extension/ocr-core.js` and legacy `extension/ocr-engine.js`.
Some replacements have guards that fail if source boundaries change; inspect
generated output too. Other extension
files are maintained directly. `scripts/build-transforms.mjs` applies the current transforms and
injects the modules in `source/`, including dashboard themes, navigation icons,
theme transfer, source-first routing, console UI and music. Edit those sources,
not only generated files. There is no npm test script; run focused Node checks.
Do not run scripts/build-transforms.mjs as a standalone build.
`extension/vendor/assets.json` lists the bundled
OCR asset sources and SHA-256 checksums; licenses are under `extension/vendor`.

To rebuild Rust kernels, install the `wasm32-unknown-unknown` target, run
`rust-kernels/build.ps1`, then rebuild the extension. UI-only edits do not need
a Rust rebuild. The bundled WASM has JavaScript fallbacks.

Browser tests require separately provisioned Playwright and Chrome for Testing;
`npm ci` installs CSS build dependencies only. Verify local paths before running.

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
collapsed YouTube default, expand, minimize/restore and no reload autoplay. These two currently use hard-coded
`.transfer/package` and `.transfer/chrome-win64/chrome.exe` paths. The historical
`tests/fidelity.cjs` crop assertions are obsolete; do not restore crops to pass it.
Existing `*-TEST-RESULTS.json` files are historical, not current release certification.

- `node tests/console-ui.cjs`: resize/presets, pointer cancellation, Escape rollback,
  keyboard controls, saved dimensions, viewport bounds, tabs and themes.
- `node tests/source-first.cjs`: Node VM fixtures for content matching and fallback.
- `node tests/source-first-ui.cjs`: source-first defaults and settings in a browser.
- `node tests/rust-parity.cjs`: kernel parity and local timings, not end-to-end speed.

Console and source-first UI tests accept `RC_PLAYWRIGHT` and `RC_CHROME`, defaulting
to local `.transfer` tools. Recent UI work passed build/syntax, console and mocked
music checks. The documentation-only review did not rerun runtime suites or refresh
saved reports. These checks do not establish live EduNext or streaming behavior.

If you update runtime files, click **Reload** on the extension card and reload
EduNext. Keep the extracted extension folder in place. Documentation-only edits
do not require a build or reload.
