# Ultimate RC tools — Chrome extension

Current version: **2.0.0** (version numbering reset at the owner's request).
Documentation reviewed **2026-11-17** against the current source and test scripts.
This review is not a new packaged release or a fresh runtime test pass.

Ultimate RC tools customizes EduNext's appearance, recovers original message text
when available, provides local Vietnamese/English OCR, adds background music,
and automatically answers new questions through your own OpenAI-compatible API.
Follow the supplied AGENTS.md instructions and local `RULES.md` for maintenance.
`RULES.md` and the optional `CONTEXT.md` handoff are excluded from Git, so they
may not exist in a fresh clone; setup and limitations are documented here.

## BYOK short answers

Reload the unpacked extension at `chrome://extensions`, then refresh EduNext.
Open the main Ultimate RC console, then click the **bot icon** beside its top
edge to open the companion **Trợ lý AI** panel. Click **Cài đặt API** there to
edit settings directly inside the console. Enter your OpenAI-compatible API base URL (for example
`https://api.openai.com/v1`), your provider's model ID, and your own API key, then
save. A full `/chat/completions` URL is also accepted. When switching providers,
enter the key for the new endpoint.
Endpoint API can be saved blank and stays blank after reopening. No default is inserted.
Enter an endpoint before sending an AI request.
Other providers still need their own URL; the key does not identify it automatically.
Endpoint autocorrection is disabled: saving and reopening preserve your address
(apart from surrounding spaces). No provider paths are guessed. Scheme-less
addresses use HTTPS internally for requests, or HTTP for localhost.
Model ID remains required. Saving shows the resolved endpoint explicitly.
Changing to a new endpoint requires entering its key; saved keys are not silently reused.

The AI panel previews the current question. Use **Đọc lại** to refresh this preview
without calling the provider. The status area shows progress, completion, or a
problem that needs attention. Opening **Cài đặt API** switches to the connection
form; the outlined **Quay lại trợ lý** button with a left arrow returns to the question.
The question leads the panel, followed by an automatic-mode switch, answer controls,
and a separate status area. Automatic-mode controls stay in the assistant view.

API settings use a single-column form grouped into **Kết nối** and **Khóa truy cập**.
Both screens follow the saved light/dark palette. **Hiện khóa** sits inside the
key field; saved-key status and **Xóa khóa** sit directly below it. **Lưu cấu hình**
is the full-width primary action. The same form is available in extension options.

With a chat open, AI automatically reads the **Câu hỏi** box in the latest
assistant message once its text settles, requests a short Vietnamese answer,
fills the empty Text composer, and clicks **Nộp câu trả lời**. The AI panel can
stay closed. **Tự động: Bật/Tắt** pauses or resumes automatic answering; it starts
enabled when the page loads. **AI trả lời & gửi** remains available for manual
retries. Failed questions are not retried automatically until you resume automatic
answering or save API settings. **Dừng** pauses automatic answering and
prevents a pending answer from being sent; the provider request may still incur
a charge. Existing drafts are preserved, changed questions cancel stale results,
and a question already submitted by this feature is not sent again on that page.

Only extracted question text is sent to the configured API provider. Image-based
questions need readable text from source recovery/OCR first; questions containing
diagrams are not supported by this text-only feature. Model answers can be wrong.
The feature uses your API balance and does not use a ChatGPT subscription.

The key is stored locally in Chrome extension storage, not in theme exports or
the website's storage. Local storage is not an encrypted password vault. Use
**Xóa khóa** on the settings page to remove it. No credentials are bundled.
API calls run in the extension background, not through the page's message bridge.

BYOK checks: `npm run test:byok` covers mocked provider calls, key isolation and
browser submission fixtures. These checks do not certify a live paid provider
or a submitted answer on a signed-in course.

## Project layout

| Folder | Contents |
| --- | --- |
| `extension/` | Ready-to-load Chrome extension |
| `source/` | Base userscript and maintained feature modules |
| `source/console-ui.js` | Settings tabs (injected by the build) |
| `source/console-size.js`, `source/console.css` | Resize interactions and panel styling |
| `source/tokens.css`, `source/base.css` | Shared UI tokens, focus and reduced-motion foundations, imported by console.css |
| `source/text-source.js` | Original-content matching |
| `source/auto-answer.js` | Maintained isolated AI panel and answer lifecycle |
| `source/assistant.css` | Assistant layout and control styles, bundled into the isolated AI runtime |
| `extension/auto-answer.js` | Generated AI runtime, including bundled CSS |
| `extension/llm.js` | Provider requests and private local API configuration |
| `extension/llm-settings.html`, `.js`, `.css` | API form, embedded in the AI panel or opened as extension options |
| `source/ocr-fidelity.js` | Active OCR text repair and inline colored-glyph preservation; no whole-line image fallback |
| `scripts/transforms/` | One build transform per feature, applied by `build.mjs` |
| `scripts/lib/` | Guarded text-patching and project-path helpers |
| `package.json`, `package-lock.json` | CSS build dependencies and npm build script |
| `rust-kernels/` | Rust/WASM source and build script |
| `images/` | Original logo assets |
| `tests/` | Test scripts and fixtures (`tests/lib/browser.cjs`: shared browser setup) |
| `tests/results/` | Saved test reports (historical unless stated otherwise) |
| `releases/archive/` | Old local ZIPs, excluded from Git |
| `.transfer/` | Local browser tooling, isolated profiles and staging; never ship |

The manifest is the version source; rebuild after changing its version.

## Current features and recent changes

- Four settings tabs: **Giao diện**, **Tiện ích**, **Văn bản**, and **Nhạc**.
  Each tab opens with a short description; flat settings rows and sentence-case
  group headings keep the controls easy to scan. Horizontal palette choices and
  flat color rows share the same saved theme colors. Wide panels arrange related
  settings groups in columns; narrow panels keep a single scrolling column.
- Main actions use the primary theme color. Utility pairs use quiet primary and
  secondary tints with neutral borders, including upload/remove background,
  import/export theme and play/stop music. API settings have one full-width Save
  action and a quiet key-deletion control beside the saved-key status.
- Source-first mode is enabled by default. It recovers full original text from
  an exact message match, falling back to local OCR when content is unavailable
  or ambiguous. Explicit automatic OCR and source-first are mutually exclusive.
  Recovered LaTeX stays source text; this feature does not newly typeset it.
- Appearance includes a dashboard background color, styled color swatches and
  theme-aware switches/sliders. Dashboard surfaces derive readable light/dark
  shades from the selected color rather than displaying the raw color unchanged.
- Every quick theme and image palette supports **Dark**, **Light**, and
  **Automatic by time**, using the appearance selector above the quick themes.
  Automatic uses light from 07:00 to 19:00 and dark otherwise, in the computer's
  local time; open tabs check every 30 seconds and when resumed. Choosing a quick
  theme turns off automatic image color matching so the selected theme stays active.
  Both Rust and JavaScript palettes use the selected mode and update the dashboard
  color too. Mode changes invalidate palette reuse; stale asynchronous results
  are rejected if the image or mode changes.
- The Discord preset has a dedicated light palette. Sidebar hover states,
  account menus, late-loaded headings and table headers follow the active theme.
  Appearance mode buttons show labels on hover or keyboard focus.
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
  enumerated answers are retained. Whole-line image replacement is disabled;
  isolated colored glyphs may remain inline images alongside selectable words.
  Actual diagrams can still be image segments.

OCR is local, using bundled Vietnamese/English Tesseract workers in an offscreen
document. Rust/WASM accelerates pixel operations; it is not a new recognition
model. Emoji, math and ordinary text may still be recognized incorrectly. Original
React source recovery is best effort. Image observation order can differ from
chat chronology: the latest observed image is not necessarily the newest message.
Source recovery requires an unambiguous matching assistant message and nonempty
content; it does not reconstruct missing original text. Signed-in EduNext and
live music streaming have not been verified by the fixture tests.

## Panel controls

The settings panel remains anchored at bottom-left. Size presets are **Gọn**
(320 x 520), **Mặc định** (380 x 620) and **Rộng** (560 x 820).
The size controls sit below the scrolling settings, above the footer.
The readout shows the actual displayed size, capped to fit the viewport.
Preset changes animate over 240 ms unless reduced motion is enabled; dragging
updates the size directly.

Drag the faint resize arrow in the top-right corner; it becomes more prominent
on hover, keyboard focus and during dragging. With the grip focused,
arrow keys adjust by 10px; Shift adjusts by 40px. Home or double-click resets
only the size. Escape cancels an active drag without closing the panel.
Dimensions save on release; viewport changes alone preserve the preferred size.
Stored width is limited to 320-560px and height to 420-820px.

The panel uses a plain surface, compact header and understated tab strip.
Keyboard tabs and per-tab scroll positions remain supported, with light/dark
and narrow layouts. The interface uses Segoe UI and system-font fallbacks.
The shared tab underline slides to the selected tab in 220 ms, follows resizing,
and moves immediately when the system's reduced-motion preference is enabled.

The bot-icon button opens a separate, theme-matched AI panel beside the main
console. Both the assistant and API settings are 340px wide, shrinking to fit
narrow screens. Escape closes the AI
panel first; closing the main console hides both. API settings use an isolated
extension-origin frame inside the AI panel. Opening uses a 180 ms fade/slide
(60 ms fade with reduced motion). The assistant uses a 6px rounded scrollbar.
API settings use a slim, theme-matched scrollbar and support the mouse
wheel, touch or keyboard. The form fits its frame automatically, so there is
only one scrolling area when it is taller than the available screen space.

## Install in Chrome

### 1. Download and extract

1. Open the [GitHub Releases page](https://github.com/DCmee-eemCD/Ultimate-RC-tool/releases).
2. Under the release's **Assets**, download **Ultimate-RC-tools-v2.0.0-unpacked.zip**
   (or the equivalent unpacked ZIP for a newer version).
3. Right-click the downloaded ZIP and choose **Extract All...** on Windows.
4. Extract it into a permanent folder, such as `Documents/Ultimate-RC-tools`.
   Keep this folder after installation: Chrome loads the extension from it.

The release ZIP contains an **extension** folder, **INSTALL.txt**, **README.md**,
and **LICENSE**. Use the unpacked ZIP attached to the release for these steps;
GitHub's automatic **Source code** downloads contain the full development project.

### 2. Load the extension

1. If you previously installed Ultimate RC tools in Tampermonkey, disable that
   userscript to prevent duplicate buttons and actions.
2. Paste `chrome://extensions` into Chrome's address bar and press **Enter**.
3. Turn on **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Open the folder you extracted and select its **extension** folder.
   This is the folder containing `manifest.json`; do not select the ZIP or its
   outer folder.
6. Confirm that **Ultimate RC tools** appears in the extension list and is enabled.

No build, Node.js, Rust, server or Tampermonkey installation is needed.
This is an unpacked extension, not a Chrome Web Store installation.
The manifest requires Chrome 116 or newer.

### 3. Open EduNext

1. Open [EduNext](https://fsc-edunext.fpt.edu.vn/) and sign in as usual.
   If it is already open, refresh the page.
2. Look for the **Fe logo** settings launcher and text button at the bottom left.
3. Click the Fe logo or press **Alt+C** to open settings. Press **Esc** to close
   them unless cancelling a resize drag.

The text button shows **Chữ gốc** in source-first mode or **OCR** in OCR mode.
Right-click it to scan the latest observed image. OCR runs locally and needs no
API key. The optional AI assistant needs your own provider settings; see
[BYOK short answers](#byok-short-answers).

### Update an existing installation

1. Download and extract the new release ZIP.
2. Close any open EduNext tabs, then copy the contents of the new **extension**
   folder into the same **extension** folder you originally loaded. Choose to
   replace existing files.
3. Open `chrome://extensions`, find **Ultimate RC tools**, and click its
   **Reload** button (the circular arrow).
4. Reopen EduNext.

Keep the same installation folder and reload the existing extension to retain
its saved settings. You do not need to remove and reinstall it.

### If it does not load

- **Manifest file is missing or unreadable:** extract the ZIP first, then select
  the **extension** folder containing `manifest.json`.
- **No Load unpacked button:** turn on **Developer mode** at
  `chrome://extensions`.
- **No buttons on EduNext:** make sure the extension is enabled, check that you
  are on `https://fsc-edunext.fpt.edu.vn/`, and refresh the page.
- **Duplicate buttons:** disable the old Ultimate RC tools Tampermonkey
  userscript or any duplicate installation, then refresh EduNext.
- **Extension stopped working after moving files:** restore the extracted folder
  to its original location, then reload the extension.

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
  them. After the first successful update, the legacy style element is disabled
  and no longer rewritten. Each theme switch updates only the adopted stylesheet,
  avoiding duplicate CSS publication. This reduces unnecessary work; it is not a
  measured guarantee of lag-free switching on live pages.
  OCR requests use runtime messages instead of polling a storage inbox.

## Settings and permissions

The extension has separate storage from Tampermonkey. Existing userscript
preferences do not migrate automatically; the first run uses the current defaults.
Your original Tampermonkey settings remain untouched.

The extension injects its GUI only on the original EduNext domain. HTTP(S) host
access allows arbitrary image/video background URLs, FPT image downloads, and
requests to the configured LLM provider. The API form and its bundled resources
are web-accessible only to EduNext so it can be embedded without exposing its
document or key to page scripts. `clipboardWrite` preserves auto-copy; `storage` and
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
npm run build   # regenerate extension/ files
npm run check   # syntax-check generated scripts
npm test        # Node-only source-first fixtures
npm run test:byok # provider, secret isolation, AI panel and settings fixtures
```

`npm run check` checks syntax in app, OCR core/engine, auto-answer, LLM backend,
LLM settings, background and bridge scripts. It does not run browser tests or
cover every maintained module. `npm test` runs only `tests/source-first.cjs`.

`npm run build` runs `node build.mjs`. Tailwind 4 and daisyUI 5 compile
`source/console.css` to `extension/console.css`, which is also embedded in app.js.
The source stylesheet imports `source/tokens.css` and `source/base.css`.
The build copies both CSS-library licenses. Do not edit generated CSS directly.

`source/Ultimate-RC-tools-5.14.txt` is the base build input, with maintained edits
to message and sidebar styling; its filename reflects its origin, not the current
extension version. `node build.mjs`
regenerates `extension/app.js`, `extension/auto-answer.js`, `extension/ocr-core.js` and legacy `extension/ocr-engine.js`
using paths relative to the project root. From another working directory, invoke
`node` with the full path to `build.mjs`; npm commands above run from the project
root. Other extension files are maintained directly.

Build layout:

- `scripts/transforms/ocr-engine.mjs` builds the OCR engine (runtime hooks, Rust
  kernels with JS fallbacks); `ocr-core.mjs` derives the active OCR pipeline from it.
- `scripts/transforms/page-base.mjs` adapts the page features to the extension runtime.
- `scripts/transforms/index.mjs` lists the feature transforms in order (navigation
  icons, dashboard theme, offscreen OCR, theme transfer, text source, launcher,
  music, button labels, OCR toolbar, source-first, console UI). Order matters:
  later transforms anchor on text produced by earlier ones.
- Runtime code injected into app.js lives in `source/*.js`; edit those sources,
  not the generated files.

Directly maintained extension files include `runtime.js` (page compatibility API),
`bridge.js` (isolated-world messaging), `background.js` (service worker and media
requests), `offscreen.js` (OCR queue/workers), and `wasm-kernels.js` (kernel loading
and fallbacks). The normal request path is page code → bridge → service worker →
offscreen OCR → result returned to the page.

AI uses a separate route: isolated `auto-answer.js` → background `llm.js` →
configured provider. API configuration lives under `rcLlmConfig`; bridge snapshots
and change events are allowlisted so it never enters the MAIN-world cache.
Configuration messages are accepted only from `llm-settings.html`; answer requests
only from the top-frame EduNext content script. Requests have a 45-second timeout,
24,000-character question limit and 4,000-character answer limit. Redirects,
truncated responses and empty/refused answers are rejected; no automatic retry.
The embedded form reports only its content height to the parent for sizing.
The parent checks the sending frame, extension origin and numeric bounds.
Theme messages include both primary and secondary colors; neither sizing nor
theme messages carry API keys or form values.

Feature transforms use `scripts/lib/patch.mjs`: single replacements and insertions
require exactly one matching anchor; replace-all/regex operations require at least
one. Region replacements require their boundary anchors to exist. A failed guard
reports the transform name and anchor. Replacement text is inserted literally
(no `$&` expansion).
`extension/vendor/assets.json` lists the bundled
OCR asset sources and SHA-256 checksums; licenses are under `extension/vendor`.

To rebuild Rust kernels, install the `wasm32-unknown-unknown` target, run
`rust-kernels/build.ps1`, then rebuild the extension. UI-only edits do not need
a Rust rebuild. The bundled WASM has JavaScript fallbacks.

Browser tests require separately provisioned Playwright and Chrome for Testing;
`npm ci` installs CSS build dependencies only. Verify local paths before running.

`tests/smoke.cjs` exercises the extension with local test fixtures on the two
original domain names. It uses a separate profile, strict page CSP, real packaged
OCR workers and mocked React properties. Run `node tests/smoke.cjs`.
It also invokes `tests/v6-features.cjs` for worker pool/cache/idle and theme/video
roundtrip checks; that module is not a standalone test command.
These fixture tests do not replace testing against a signed-in live EduNext session.
The smoke theme step still selects `Tối` and expects the former dark preset's
exact colors. The current UI uses `Tối` for appearance mode and labels that
preset `Tím`; review this stale selector/assertion pair before treating smoke
results as validation of the current theme UI.

`tests/video-csp.cjs` uses a local HTTPS fixture server and a generated test
certificate (no system certificate is installed). It compares video playback
with the CSP rule disabled/enabled, tests uploaded and URL wallpapers in both
normal and glass modes, checks reload persistence and verifies other hosts retain
their CSP. It also requires `node-forge` (`RC_FORGE` can point to its module path).
The test automatically finds an isolated copy at `.transfer/forge/package`, or
uses the installed `node-forge` module. `RC_FORGE` overrides both. On a clean
checkout, install it separately and set its path in PowerShell:

```powershell
npm install --prefix .transfer/video-tools node-forge
$env:RC_FORGE=(Resolve-Path '.transfer/video-tools/node_modules/node-forge').Path
node tests/video-csp.cjs
```

The bundled two-second VP8 fixture was generated with FFmpeg's `testsrc2` filter.

Additional focused tests: `node tests/question-text.cjs` checks selectable question
text/answer options; `node tests/music.cjs` checks mocked player lifecycle,
collapsed YouTube default, expand, minimize/restore and no reload autoplay.
`tests/fidelity.cjs` checks selectable OCR text/formulas, exact source recovery,
copy behavior, inline colored glyphs and preservation of actual diagrams. It rejects
whole-line image replacement; it does not certify emoji or mathematical OCR accuracy.
The question-text fixture requires selectable question/answer text and rejects
whole-line images, while permitting inline glyphs alongside selectable words.
Existing `*-TEST-RESULTS.json` files are historical, not current release certification.

- `node tests/console-ui.cjs`: resize/presets, pointer cancellation, Escape rollback,
  keyboard controls, saved dimensions, viewport bounds, tabs and themes, including
  the sliding underline's final position and reduced-motion behavior.
- `npm run test:byok`: `llm.cjs`, `bridge-secrets.cjs`, `auto-answer.cjs`,
  `ai-panel.cjs`, `ai-preview.cjs`, `llm-settings.cjs`, and `embedded-api.cjs`. Covers mocked API
  responses, secret filtering, draft/stale/duplicate guards, panel positioning,
  preview refresh and safe text rendering without provider calls, status states,
  settings return focus, settings save/delete, iframe isolation/content sizing
  and reduced motion. Submission fixtures
  model input events; they do not load the live React application.
- `node tests/chat-surfaces.cjs`: transparent user-message text backgrounds and
  utility icon colors in light/dark modes.
- `node tests/theme-modes.cjs`: all quick themes in light/dark, saved appearance,
  automatic day/night switching, manual overrides, account-menu contrast and
  sidebar hover styling.
- `node tests/theme-style-order.cjs`: late-mounted headings, table headers and
  wrapper surfaces in both modes, transparent layout-only wrappers, and adopted
  stylesheet precedence over equal-specificity styles added later.
- `node tests/theme-performance.cjs`: 24 mode switches through the real settings
  handler; checks that they produce 24 adopted-sheet updates and no legacy style
  rewrites. Printed frame timings are diagnostic, not a fixed performance target.
- `node tests/source-first.cjs`: Node VM fixtures for content matching and fallback.
- `node tests/source-first-ui.cjs`: source-first defaults and settings in a browser.
- `node tests/rust-parity.cjs`: Node-only kernel parity and local timings, not
  end-to-end speed. Its report currently hard-codes version `5.15.0`; that field
  does not identify the current extension version.

All browser tests share `tests/lib/browser.cjs`: `RC_PLAYWRIGHT` (Playwright module
path) and `RC_CHROME` (Chrome for Testing) default to `.transfer/package` and
`.transfer/chrome-win64/chrome.exe` when present. Otherwise the helper resolves
the installed `playwright` module and its default Chromium executable. Set the
overrides explicitly when using a separately installed browser/tooling pair:

```powershell
$env:RC_PLAYWRIGHT = 'C:\path\to\node_modules\playwright'
$env:RC_CHROME = 'C:\path\to\chrome-win64\chrome.exe'
node tests/console-ui.cjs
```

Each run uses a fresh profile under `.transfer/`. Some tests overwrite reports in
`tests/results/`; inspect those changes before committing. Profiles and screenshots
stay local. Browser fixtures do not use your signed-in Chrome profile.

## Historical verification

The results below describe earlier work, not checks rerun for the documentation
review on 2026-11-17.

The optional-endpoint and scrollbar follow-up passed build/syntax,
`tests/llm.cjs`, `tests/llm-settings.cjs`, and `tests/embedded-api.cjs`.
Coverage includes blank-endpoint resolution, rejection of non-string endpoints,
protection against reusing a custom provider's saved key at the default endpoint,
visible scrollbar styling, frame sizing and mobile bounds. No live provider calls
were made. These results precede this documentation-only update.

The 2026-11-17 API-form redesign passed build/syntax, standalone settings,
embedded API and assistant-preview checks. These cover save/reload, key protection
and deletion, iframe isolation/sizing, mobile bounds, reduced motion, and return
navigation. Desktop and mobile captures were reviewed. The subsequent request
to restore size-button animation passed build/syntax and the original
`tests/console-ui.cjs` suite, including its animated-width assertion. Direct
resizing remains immediate. Earlier notes about a failing width-animation
assertion are superseded; no test was changed to obtain this pass.

Earlier UI work passed build/syntax, the BYOK checks (including question
preview), console controls, standalone/embedded settings and mocked music.
After the final button-style refinement, build/syntax, console-ui and
embedded-api passed again. Desktop and narrow screenshots were inspected.
These checks did not send paid provider requests or submit answers on live EduNext.

The smoke preset failure was fixed on 2026-11-14: its numeric selector selected
the white Default preset after Discord Dark was inserted. That fix selected Dark
by name and verified the page color both immediately and after reload; the later
mode-button/preset rename requires another update, as noted above.

The 2026-11-14 follow-up passed build/syntax, source-first and the complete smoke
suite (including v6 pool/cache/idle and theme/video roundtrip checks). Smoke and
V6 reports were refreshed. Video/CSP also passed all nine checks and its report
was refreshed for version 2.0.0. Fidelity checks passed with their updated text
contract and report. Earlier UI work passed console and mocked music checks.
These checks do not establish live EduNext or streaming behavior.

The tab-animation and theme-update follow-up passed build/syntax, console UI,
theme modes, and the duplicate-stylesheet regression check. For 24 mode switches,
legacy style rewrites dropped from 24 to zero while adopted-sheet updates remained
at 24. These checks used isolated Chrome fixtures, not a signed-in live page.

If you update runtime files, click **Reload** on the extension card and reload
EduNext. Keep the extracted extension folder in place. Documentation-only edits
do not require a build or reload.
