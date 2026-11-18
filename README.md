<a id="english"></a>

[English](#english) | [Tiếng Việt](#tieng-viet)

# Ultimate RC tools — Chrome extension

Current version: **2.1.0** (version numbering reset at the owner's request).
Update-system documentation reviewed **2026-11-18** against the current source.
This review does not create a packaged release; focused check results are below.

Ultimate RC tools customizes EduNext's appearance, recovers original message text
when available, provides local Vietnamese/English OCR, adds background music,
and automatically answers new questions through your own OpenAI-compatible API.
Follow the supplied AGENTS.md instructions and local `RULES.md` for maintenance.
`RULES.md` and the optional `CONTEXT.md` handoff are excluded from Git, so they
may not exist in a fresh clone; setup and limitations are documented here.

## Check for updates

Open **Tiện ích → Kiểm tra cập nhật** in the Ultimate RC console. The update page
checks the latest public stable release from
[DCmee-eemCD/Ultimate-RC-tool](https://github.com/DCmee-eemCD/Ultimate-RC-tool/releases).
If its version is higher than the installed manifest version, Chrome downloads
the release ZIP automatically and the page shows a four-step update guide.
Equal or older releases are not downloaded. Checks run only when opening this page
or clicking **Kiểm tra lại**, not in the background.

Unzip the download, find the folder containing `manifest.json`, and copy its
contents over the **same folder already loaded in Chrome**. At `chrome://extensions`,
enable Developer mode and click **Reload** on Ultimate RC tools, then refresh EduNext.
Keep the folder path and existing extension installation to retain settings/API keys.
The extension cannot replace its installed files automatically; it is distributed
unpacked until Chrome Web Store publishing is available.

The added `downloads` permission starts the ZIP download and tracks completion or
interruption. No new host access is added. The updater accepts ZIP links only from
this repository's GitHub release assets; it never executes downloaded code.
Release tags should use `v2.2.0` (or a similar numeric version), matching the packaged
manifest. Legacy nonnumeric tags such as `Peak_realese` use the version in
`Ultimate-RC-tools-v2.0.0-unpacked.zip`. Attach one clearly named unpacked ZIP;
missing, ambiguous, prerelease, or conflicting version metadata produces a message
and a manual GitHub link. GitHub source archives are not selected automatically.

Run `node tests/updates.cjs` for version/ZIP validation and isolated-browser coverage
of the console button, download states, API errors, retry, tutorial and narrow layout.
Release responses and downloads are mocked; this does not install a live release.
On 2026-11-18, `node tests/updates.cjs` and `npm run check` passed during this
review. Live GitHub availability and installation were not tested.

Checks time out after 15 seconds. Keep the update tab open to see download status;
reopening it starts a fresh check and may download the newer ZIP again until you
install it. Release selection validates metadata and the asset URL, not the ZIP
contents or a checksum. Release maintainers must verify that the packaged
`manifest.json` matches the release version.

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
| `source/panel-layout.js` | Shared opening-order layout for companion panels and launchers |
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

- Three settings tabs: **Giao diện**, **Tiện ích**, and **Văn bản**.
  **Nhạc** opens from its own music-note button beside the Assistant launcher.
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

The bot and music-note buttons open separate, theme-matched Assistant and Music
panels. Closed-panel launchers are 44px buttons spaced 8px apart. Open panels
line up to the right of Settings in opening order, with aligned tops and 12px
gaps. Closing a panel shifts the others left; reopening places it last. Unopened
launchers move after the open panels. Panels keep their own content height.
On narrow screens, panels are kept onscreen and may overlap; this is not a
horizontally scrolling workspace. Opening the Music panel does not start playback;
paste a link and choose **Mở trình phát** to play it.

Companion panels are 340px wide, shrinking to fit narrow screens. Escape closes
Music first when it is open, otherwise Assistant, before the main console.
Closing the main console hides both companion panels. API settings use an isolated
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
3. Extract the downloaded archive into a permanent folder, such as
   `Documents/Ultimate-RC-tools`. Keep this folder
   after installation: Chrome loads the extension from it.

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

1. Open **Tiện ích → Kiểm tra cập nhật** to download a newer ZIP, or download
   it manually from GitHub Releases, then extract it.
2. Close any open EduNext tabs, then find the extracted folder containing
   `manifest.json` and copy its contents into the same folder you originally loaded. Choose to
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
requests to the configured LLM provider and GitHub release checks. The `downloads`
permission starts update ZIP downloads and tracks their status. The API form and its bundled resources
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
LLM endpoint/settings, background, bridge, runtime, update-release and updates scripts. It does not run browser tests or
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

The updater's `extension/update-release.js` and `extension/updates.html/.js/.css`
are maintained directly. Its console button lives in `source/console-ui.js` and
is built into `extension/app.js`. `RC.openUpdates()` passes through the bridge to
the background worker, which accepts only top-frame EduNext senders and opens
the update page. GitHub requests and download tracking run in that extension page.

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

<a id="tieng-viet"></a>

[English](#english) | [Tiếng Việt](#tieng-viet)

# Ultimate RC tools — tiện ích Chrome

Phiên bản hiện tại: **2.1.0** (việc đánh số phiên bản đã được đặt lại theo yêu cầu
của chủ sở hữu).
Phần cập nhật được rà soát **2026-11-18** dựa trên mã nguồn hiện tại.
Lần rà soát này không tạo bản phát hành mới; kết quả kiểm tra riêng được ghi bên dưới.

Ultimate RC tools tùy biến giao diện EduNext, khôi phục văn bản tin nhắn gốc khi
có thể, cung cấp OCR tiếng Việt/Anh cục bộ, thêm nhạc nền và tự động trả lời câu
hỏi mới thông qua API tương thích OpenAI của bạn.
Hãy làm theo hướng dẫn trong AGENTS.md được cung cấp và `RULES.md` cục bộ để bảo
trì.
`RULES.md` và bản bàn giao `CONTEXT.md` tùy chọn bị loại khỏi Git, nên có thể
không tồn tại trong bản sao mới; phần thiết lập và các giới hạn được ghi lại ở
đây.

## Kiểm tra cập nhật

Trong bảng Ultimate RC, mở **Tiện ích → Kiểm tra cập nhật**. Trang cập nhật kiểm tra
bản phát hành ổn định mới nhất trên GitHub và tự tải ZIP nếu phiên bản cao hơn bản
đang dùng. Bản bằng hoặc cũ hơn sẽ không được tải. Nếu GitHub lỗi hoặc thiếu ZIP,
trang sẽ báo rõ và có liên kết tải thủ công.

Giải nén ZIP, tìm thư mục chứa `manifest.json`, rồi chép toàn bộ nội dung vào
**đúng thư mục tiện ích đã nạp trong Chrome**, thay thế tệp trùng tên. Mở
`chrome://extensions`, bật chế độ nhà phát triển, bấm **Tải lại ↻** trên thẻ Ultimate
RC tools, rồi làm mới EduNext. Giữ đường dẫn và không gỡ tiện ích để giữ cài đặt/khóa API.
Hướng dẫn bốn bước này cũng hiển thị trên trang cập nhật. Tiện ích chưa có trên Chrome
Web Store nên không tự thay tệp đã cài. Quyền `downloads` mới dùng để tải ZIP và theo
dõi trạng thái; không thêm quyền truy cập host.

Chỉ kiểm tra khi mở trang hoặc bấm **Kiểm tra lại**, không kiểm tra nền định kỳ.
Yêu cầu GitHub có giới hạn 15 giây. Giữ trang mở để xem trạng thái tải; mở lại sẽ
kiểm tra mới và có thể tải ZIP lần nữa nếu bạn chưa cài phiên bản mới.
Chỉ chọn ZIP đã tải lên kho phát hành chính thức, ưu tiên đúng một ZIP có tên
`unpacked`, nếu không thì cần đúng một ZIP. Bản nháp, prerelease, nhiều ZIP không
rõ lựa chọn hoặc phiên bản tag/tên ZIP mâu thuẫn đều bị từ chối. Tag không phải
số có thể dùng phiên bản trong tên ZIP. Không tự chọn kho mã nguồn của GitHub.
Hệ thống không kiểm tra nội dung ZIP hay checksum; người phát hành phải bảo đảm
phiên bản trong `manifest.json`, tag và tên ZIP khớp nhau.

Chạy `node tests/updates.cjs` để kiểm tra lựa chọn phiên bản/ZIP, nút mở trang,
trạng thái tải, lỗi, thử lại, hướng dẫn và bố cục hẹp trong trình duyệt riêng.
GitHub và tải xuống được giả lập; kiểm thử không cài bản phát hành thật.
Ngày 2026-11-18, `node tests/updates.cjs` và `npm run check` đều đạt trong lần
rà soát này. Chưa kiểm tra GitHub trực tiếp hoặc cài đặt bản phát hành thật.

<a id="vi-byok"></a>

## Trả lời ngắn bằng BYOK

Tải lại tiện ích đã giải nén tại `chrome://extensions`, sau đó làm mới EduNext.
Mở bảng điều khiển Ultimate RC chính, rồi nhấp **biểu tượng bot** cạnh mép trên
để mở bảng **Trợ lý AI** đi kèm.
Nhấp **Cài đặt API** tại đó để chỉnh sửa cài đặt ngay trong bảng điều khiển.
Nhập URL cơ sở API tương thích OpenAI của bạn (ví dụ
`https://api.openai.com/v1`), ID model của nhà cung cấp và API key của bạn, rồi
lưu.
Có thể dùng cả URL đầy đủ `/chat/completions`.
Khi đổi nhà cung cấp, hãy nhập key cho endpoint mới.
Có thể lưu Endpoint API trống và endpoint này vẫn trống sau khi mở lại. Không có
giá trị mặc định nào được chèn vào.
Hãy nhập endpoint trước khi gửi yêu cầu AI.
Các nhà cung cấp khác vẫn cần URL riêng; key không tự xác định nhà cung cấp.
Tính năng tự sửa endpoint bị tắt: việc lưu và mở lại giữ nguyên địa chỉ của bạn
(ngoài khoảng trắng ở đầu và cuối).
Không tự đoán đường dẫn của nhà cung cấp.
Địa chỉ không có scheme dùng HTTPS nội bộ cho các yêu cầu, hoặc HTTP khi là
localhost.
ID model vẫn bắt buộc.
Khi lưu, endpoint sau khi phân giải được hiển thị rõ ràng.
Đổi sang endpoint mới yêu cầu nhập key của endpoint đó; các key đã lưu không được
âm thầm dùng lại.

Bảng AI xem trước câu hỏi hiện tại.
Dùng **Đọc lại** để làm mới phần xem trước này mà không gọi nhà cung cấp.
Vùng trạng thái hiển thị tiến trình, hoàn tất hoặc vấn đề cần chú ý.
Mở **Cài đặt API** sẽ chuyển sang biểu mẫu kết nối; nút **Quay lại trợ lý** có
viền và mũi tên trái sẽ đưa về câu hỏi.
Câu hỏi nằm ở đầu bảng, tiếp theo là công tắc chế độ tự động, các điều khiển trả
lời và một vùng trạng thái riêng.
Các điều khiển chế độ tự động vẫn nằm trong chế độ trợ lý.

Cài đặt API dùng biểu mẫu một cột, được nhóm thành **Kết nối** và **Khóa truy
cập**.
Cả hai màn hình tuân theo bảng màu sáng/tối đã lưu.
**Hiện khóa** nằm bên trong trường key; trạng thái key đã lưu và **Xóa khóa** nằm
ngay bên dưới trường đó.
**Lưu cấu hình** là nút chính rộng toàn bộ.
Biểu mẫu tương tự cũng có trong tùy chọn của tiện ích.

Khi một cuộc trò chuyện đang mở, AI tự động đọc ô **Câu hỏi** trong tin nhắn trợ
lý mới nhất sau khi văn bản ổn định, yêu cầu một câu trả lời tiếng Việt ngắn, điền
vào trình soạn thảo Text đang trống và nhấp **Nộp câu trả lời**.
Bảng AI có thể vẫn đóng.
**Tự động: Bật/Tắt** tạm dừng hoặc tiếp tục trả lời tự động; tính năng bắt đầu
được bật khi trang tải xong.
**AI trả lời & gửi** vẫn có thể dùng để thử lại thủ công.
Câu hỏi thất bại không được tự động thử lại cho đến khi bạn tiếp tục trả lời tự
động hoặc lưu cài đặt API.
**Dừng** tạm dừng trả lời tự động và ngăn câu trả lời đang chờ được gửi; yêu cầu
đến nhà cung cấp vẫn có thể phát sinh phí.
Bản nháp hiện có được giữ lại, câu hỏi thay đổi sẽ hủy kết quả cũ và câu hỏi đã
được tính năng này gửi trên trang đó sẽ không được gửi lại.

Chỉ phần văn bản câu hỏi đã trích xuất được gửi đến nhà cung cấp API đã cấu hình.
Câu hỏi dạng hình ảnh trước hết cần văn bản có thể đọc được từ khôi phục nguồn/OCR;
tính năng chỉ xử lý văn bản này không hỗ trợ câu hỏi có sơ đồ.
Câu trả lời của model có thể sai.
Tính năng dùng số dư API của bạn và không dùng gói đăng ký ChatGPT.

Key được lưu cục bộ trong bộ nhớ của tiện ích Chrome, không nằm trong bản xuất
theme hay bộ nhớ của trang web.
Bộ nhớ cục bộ không phải kho mật khẩu được mã hóa.
Dùng **Xóa khóa** trên trang cài đặt để xóa key.
Không có thông tin xác thực nào được đóng gói.
Các lệnh gọi API chạy trong nền của tiện ích, không đi qua cầu nối tin nhắn của
trang.

Kiểm thử BYOK: `npm run test:byok` bao phủ các lệnh gọi nhà cung cấp giả lập, cách
ly key và fixture gửi trong trình duyệt.
Các kiểm thử này không chứng nhận nhà cung cấp trả phí trực tiếp hay câu trả lời
được gửi trong một khóa học đã đăng nhập.

## Bố cục dự án

| Thư mục | Nội dung |
| --- | --- |
| `extension/` | Tiện ích Chrome sẵn sàng tải |
| `source/` | Userscript cơ sở và các module tính năng được duy trì |
| `source/console-ui.js` | Các tab cài đặt (được build chèn vào) |
| `source/console-size.js`, `source/console.css` | Tương tác đổi kích thước và kiểu dáng bảng |
| `source/tokens.css`, `source/base.css` | Token UI dùng chung, nền tảng focus và reduced-motion, được console.css import |
| `source/text-source.js` | Đối sánh nội dung gốc |
| `source/auto-answer.js` | Bảng AI cô lập được duy trì và vòng đời trả lời |
| `source/assistant.css` | Kiểu bố cục và điều khiển trợ lý, được đóng gói vào runtime AI cô lập |
| `extension/auto-answer.js` | Runtime AI được tạo, gồm CSS đã đóng gói |
| `extension/llm.js` | Yêu cầu đến nhà cung cấp và cấu hình API cục bộ riêng tư |
| `extension/llm-settings.html`, `.js`, `.css` | Biểu mẫu API, nhúng trong bảng AI hoặc mở như tùy chọn tiện ích |
| `source/ocr-fidelity.js` | Sửa văn bản OCR đang hoạt động và giữ glyph màu nội tuyến; không dự phòng bằng ảnh cả dòng |
| `scripts/transforms/` | Một transform build cho mỗi tính năng, được `build.mjs` áp dụng |
| `scripts/lib/` | Trợ giúp vá văn bản có kiểm tra và đường dẫn dự án |
| `package.json`, `package-lock.json` | Phụ thuộc build CSS và script build npm |
| `rust-kernels/` | Mã nguồn Rust/WASM và script build |
| `images/` | Asset logo gốc |
| `tests/` | Script và fixture kiểm thử (`tests/lib/browser.cjs`: thiết lập trình duyệt dùng chung) |
| `tests/results/` | Báo cáo kiểm thử đã lưu (lịch sử trừ khi có ghi khác) |
| `releases/archive/` | ZIP cũ cục bộ, bị loại khỏi Git |
| `.transfer/` | Công cụ trình duyệt cục bộ, profile cô lập và khu vực staging; không bao giờ đưa vào gói |

Manifest là nguồn phiên bản; hãy build lại sau khi thay đổi phiên bản.

## Tính năng hiện tại và thay đổi gần đây

- Có ba tab cài đặt: **Giao diện**, **Tiện ích** và **Văn bản**.
  **Nhạc** mở bằng nút nốt nhạc riêng cạnh nút Trợ lý.
  Mỗi tab mở ra với mô tả ngắn; các hàng cài đặt phẳng và tiêu đề nhóm theo kiểu
  sentence-case giúp dễ quét.
  Các lựa chọn bảng màu ngang và hàng màu phẳng dùng chung màu theme đã lưu.
  Bảng rộng sắp xếp các nhóm cài đặt liên quan thành các cột; bảng hẹp giữ một
  cột cuộn duy nhất.
- Hành động chính dùng màu chính của theme.
  Các cặp tiện ích dùng sắc độ yên hơn của màu chính và phụ với viền trung tính,
  gồm tải/xóa nền, nhập/xuất theme và phát/dừng nhạc.
  Cài đặt API có một hành động Save rộng toàn bộ và một điều khiển xóa key kín
  đáo cạnh trạng thái key đã lưu.
- Chế độ source-first được bật mặc định.
  Nó khôi phục toàn bộ văn bản gốc từ một tin nhắn khớp chính xác, rồi chuyển sang
  OCR cục bộ khi nội dung không có hoặc không rõ ràng.
  OCR tự động rõ ràng và source-first loại trừ lẫn nhau.
  LaTeX được khôi phục vẫn là văn bản nguồn; tính năng này không typeset lại nó.
- Phần giao diện có màu nền dashboard, ô màu được tạo kiểu và switch/slider theo
  theme.
  Các bề mặt dashboard lấy sắc độ sáng/tối dễ đọc từ màu đã chọn thay vì hiển thị
  nguyên màu thô.
- Mọi theme nhanh và bảng màu ảnh đều hỗ trợ **Tối**, **Sáng** và **Tự động theo
  thời gian**, dùng bộ chọn giao diện phía trên các theme nhanh.
  Tự động dùng sáng từ 07:00 đến 19:00 và tối vào thời gian còn lại theo giờ địa
  phương của máy; các tab đang mở kiểm tra mỗi 30 giây và khi được tiếp tục.
  Chọn theme nhanh sẽ tắt việc tự động khớp màu ảnh để theme đã chọn luôn hoạt động.
  Cả bảng màu Rust và JavaScript đều dùng mode đã chọn và cũng cập nhật màu
  dashboard.
  Thay đổi mode làm vô hiệu việc dùng lại bảng màu; kết quả bất đồng bộ cũ bị từ
  chối nếu ảnh hoặc mode thay đổi.
- Preset Discord có bảng màu sáng riêng.
  Trạng thái hover của sidebar, menu tài khoản, tiêu đề tải muộn và tiêu đề bảng
  tuân theo theme đang hoạt động.
  Nút mode giao diện hiển thị nhãn khi hover hoặc focus bằng bàn phím.
- Theme portable gồm `dashboardBg`, `imageThemeMode`, màu nhấn của console
  (`consolePrimary`, `consoleSecondary`) và kích thước (`consoleWidth`,
  `consoleHeight`).
  Theme version 1 cũ không có các trường này vẫn giữ giá trị hiện tại.
  Cài đặt OCR và hành vi không được chuyển khi truyền theme.
  Theme gồm nền ảnh/video đã tải lên (video tối đa 14 MB); kích thước file theme
  tối đa là 25 MB.
  Nền liên kết vẫn là URL.
- Thanh điều hướng trái của EduNext dùng icon SVG cho tài khoản, trang chủ, bài
  tập, các lịch sắp tới, hướng dẫn, hỗ trợ và FAQ.
  Các node ảnh gốc vẫn được giữ cho React; thay thế được áp dụng lại sau khi
  render lại và đổi kích thước.
  Nhãn nút bỏ emoji trang trí.
- Nhạc chấp nhận liên kết YouTube/Spotify đã được kiểm tra và cung cấp tiêu đề,
  vị trí API thực, tua, điều khiển phát SVG, công tắc hiển thị video và dừng.
  Cả hai nhà cung cấp bắt đầu với video/embed thu gọn và điều khiển phát hiển thị.
  Nút thu nhỏ riêng đưa player về icon góc 48px.
  Ẩn hoặc thu nhỏ không yêu cầu tạm dừng; khi khôi phục vẫn giữ khả năng hiển thị
  video.
  Thanh tua màu xám chưa phát không phải chỉ báo download/buffer được đo lường.
- Mở nhạc sẽ yêu cầu phát; tải lại trang chỉ khôi phục liên kết đã lưu.
  Phát trực tiếp vẫn chịu giới hạn của việc nhúng, dịch vụ và autoplay.
- Từ phiên bản 6.1.2 trước khi đặt lại, văn bản câu hỏi và công thức OCR vẫn là
  văn bản có thể chọn; các đáp án đánh số ngắn được giữ lại.
  Đã tắt việc thay ảnh cả dòng; glyph màu cô lập có thể vẫn là ảnh nội tuyến bên
  cạnh các từ có thể chọn.
  Sơ đồ thực tế vẫn có thể là các đoạn ảnh.

OCR chạy cục bộ, dùng worker Tesseract tiếng Việt/Anh được đóng gói trong một
tài liệu offscreen.
Rust/WASM tăng tốc thao tác pixel; đây không phải model nhận dạng mới.
Emoji, công thức và văn bản thông thường vẫn có thể được nhận dạng sai.
Khôi phục nguồn React là nỗ lực tốt nhất.
Thứ tự quan sát ảnh có thể khác thứ tự thời gian của cuộc trò chuyện: ảnh được
quan sát gần nhất không nhất thiết là ảnh của tin nhắn mới nhất.
Khôi phục nguồn cần một tin nhắn trợ lý khớp rõ ràng và nội dung không rỗng; nó
không dựng lại văn bản gốc bị thiếu.
Các kiểm thử fixture chưa xác minh EduNext đã đăng nhập và việc phát nhạc trực
tiếp.

## Điều khiển bảng

Bảng cài đặt vẫn neo ở góc dưới bên trái.
Preset kích thước là **Gọn** (320 x 520), **Mặc định** (380 x 620) và **Rộng**
(560 x 820).
Điều khiển kích thước nằm dưới phần cài đặt có thể cuộn và phía trên chân trang.
Số đo hiển thị kích thước thực tế đang được hiển thị, bị giới hạn để vừa viewport.
Thay đổi preset có hiệu ứng trong 240 ms trừ khi bật reduced motion; kéo cập nhật
trực tiếp kích thước.

Kéo mũi tên đổi kích thước mờ ở góc trên bên phải; nó nổi bật hơn khi hover,
focus bằng bàn phím và trong lúc kéo.
Khi grip được focus, các phím mũi tên điều chỉnh 10px; Shift điều chỉnh 40px.
Home hoặc nhấp đúp chỉ đặt lại kích thước.
Escape hủy thao tác kéo đang hoạt động mà không đóng bảng.
Kích thước được lưu khi nhả chuột; chỉ thay đổi viewport sẽ giữ nguyên kích thước
ưu tiên.
Chiều rộng lưu được giới hạn từ 320 đến 560px và chiều cao từ 420 đến 820px.

Bảng dùng bề mặt đơn giản, header gọn và dải tab kín đáo.
Tab bằng bàn phím và vị trí cuộn riêng của từng tab vẫn được hỗ trợ cùng bố cục
sáng/tối và hẹp.
Giao diện dùng Segoe UI và các font hệ thống dự phòng.
Gạch chân tab dùng chung trượt tới tab được chọn trong 220 ms, theo việc đổi kích
thước và di chuyển ngay khi tùy chọn reduced-motion của hệ thống được bật.

Nút bot và nốt nhạc mở các bảng Trợ lý và Nhạc riêng, khớp theme.
Các nút mở bảng có kích thước 44px và cách nhau 8px. Bảng đã mở xếp bên phải
console theo thứ tự mở, thẳng mép trên và cách nhau 12px. Đóng một bảng sẽ dồn
các bảng còn lại sang trái; mở lại sẽ đặt bảng đó cuối hàng. Các nút chưa mở
di chuyển ra sau các bảng đang mở. Mỗi bảng giữ chiều cao theo nội dung.
Trên màn hình hẹp, các bảng được giữ trong màn hình và có thể chồng lên nhau;
không có vùng làm việc cuộn ngang. Mở bảng Nhạc chưa phát nhạc: dán liên kết
và chọn **Mở trình phát** để phát.
Các bảng rộng 340px, thu nhỏ để vừa màn hình hẹp.
Escape đóng Nhạc trước nếu đang mở, sau đó đến Trợ lý, rồi console chính.
Đóng console chính sẽ ẩn cả hai bảng phụ.
Cài đặt API dùng frame nguồn tiện ích cô lập bên trong bảng AI.
Mở bảng dùng hiệu ứng mờ/trượt 180 ms (mờ 60 ms khi reduced motion).
Trợ lý dùng thanh cuộn bo tròn 6px.
Cài đặt API dùng thanh cuộn mảnh khớp theme và hỗ trợ con lăn chuột, cảm ứng hoặc
bàn phím.
Biểu mẫu tự động vừa frame, nên chỉ có một vùng cuộn khi nó cao hơn phần màn hình
còn trống.

## Cài đặt trong Chrome

### 1. Tải xuống và giải nén

1. Mở [trang GitHub Releases](https://github.com/DCmee-eemCD/Ultimate-RC-tool/releases).
2. Trong **Assets** của bản phát hành, tải **Ultimate-RC-tools-v2.0.0-unpacked.zip**
   (hoặc ZIP unpacked tương đương của phiên bản mới hơn).
3. Giải nén archive đã tải vào một thư mục cố định, chẳng hạn
   `Documents/Ultimate-RC-tools`.
   Giữ thư mục này sau khi cài đặt: Chrome tải tiện ích từ đó.

ZIP phát hành chứa thư mục **extension**, **INSTALL.txt**, **README.md** và
**LICENSE**.
Dùng ZIP unpacked đính kèm bản phát hành cho các bước này; bản tải **Source code**
tự động của GitHub chứa toàn bộ dự án phát triển.

### 2. Tải tiện ích

1. Nếu trước đây bạn đã cài Ultimate RC tools trong Tampermonkey, hãy tắt
   userscript đó để tránh nút và hành động bị trùng.
2. Dán `chrome://extensions` vào thanh địa chỉ Chrome và nhấn **Enter**.
3. Bật **Developer mode** ở góc trên bên phải.
4. Nhấp **Load unpacked**.
5. Mở thư mục đã giải nén và chọn thư mục **extension**.
   Đây là thư mục chứa `manifest.json`; không chọn ZIP hoặc thư mục bao ngoài.
6. Xác nhận **Ultimate RC tools** xuất hiện trong danh sách tiện ích và đang bật.

Không cần cài build, Node.js, Rust, server hay Tampermonkey.
Đây là tiện ích unpacked, không phải tiện ích cài từ Chrome Web Store.
Manifest yêu cầu Chrome 116 trở lên.

### 3. Mở EduNext

1. Mở [EduNext](https://fsc-edunext.fpt.edu.vn/) và đăng nhập như thường lệ.
   Nếu trang đã mở, hãy làm mới trang.
2. Tìm launcher cài đặt **logo Fe** và nút văn bản ở góc dưới bên trái.
3. Nhấp logo Fe hoặc nhấn **Alt+C** để mở cài đặt.
   Nhấn **Esc** để đóng, trừ khi bạn đang hủy thao tác kéo đổi kích thước.

Nút văn bản hiển thị **Chữ gốc** ở chế độ source-first hoặc **OCR** ở chế độ OCR.
Nhấp phải vào nút này để quét ảnh được quan sát gần nhất.
OCR chạy cục bộ và không cần API key.
Trợ lý AI tùy chọn cần cài đặt nhà cung cấp của bạn; xem
[Trả lời ngắn bằng BYOK](#vi-byok).

### Cập nhật bản cài đặt hiện có

1. Mở **Tiện ích → Kiểm tra cập nhật** để tải ZIP mới hơn, hoặc tải thủ công
   từ GitHub Releases, rồi giải nén.
2. Đóng mọi tab EduNext đang mở, tìm thư mục đã giải nén chứa `manifest.json`,
   rồi chép nội dung vào đúng thư mục tiện ích đã nạp trước đó.
   Chọn thay thế các file hiện có.
3. Mở `chrome://extensions`, tìm **Ultimate RC tools** và nhấp nút **Reload**
   (mũi tên vòng tròn).
4. Mở lại EduNext.

Giữ nguyên thư mục cài đặt và tải lại tiện ích hiện có để giữ cài đặt đã lưu.
Bạn không cần xóa rồi cài lại.

### Nếu tiện ích không tải

- **Thiếu hoặc không đọc được manifest:** trước hết hãy giải nén ZIP, sau đó chọn
  thư mục **extension** chứa `manifest.json`.
- **Không có nút Load unpacked:** bật **Developer mode** tại
  `chrome://extensions`.
- **Không có nút trên EduNext:** bảo đảm tiện ích đang bật, kiểm tra bạn ở
  `https://fsc-edunext.fpt.edu.vn/` và làm mới trang.
- **Nút bị trùng:** tắt userscript Ultimate RC tools cũ trong Tampermonkey hoặc
  bản cài trùng, rồi làm mới EduNext.
- **Tiện ích ngừng hoạt động sau khi di chuyển file:** đưa thư mục đã giải nén về
  vị trí ban đầu, rồi tải lại tiện ích.

## Những gì đã thay đổi bên trong

- Manifest V3 thay thế lớp bọc Tampermonkey.
- Mã tính năng trang gốc vẫn chạy trong page world, giữ quyền truy cập vào React
  fiber, thuộc tính MathLive và hook vẽ canvas.
- Một bridge cô lập cung cấp bộ nhớ tiện ích, clipboard và tải media.
- OCR chạy trong tài liệu offscreen do tiện ích sở hữu.
  Chế độ tự động chọn tối đa bốn worker; chế độ thủ công hỗ trợ 1-8.
  Job được xếp hàng, worker được dùng lại và ảnh giống nhau được cache trong bộ
  nhớ (16 mục / 16 MiB).
  Các điều khiển keep-warm/idle vẫn còn; keep-warm bị tắt sẽ giải phóng worker
  sau khi dùng.
  Nhiều worker hơn không phải lúc nào cũng nhanh hơn.
- Tesseract.js 5.1.1, lõi WASM và dữ liệu ngôn ngữ tiếng Việt/Anh được đưa vào
  ZIP.
  OCR chạy cục bộ; không dùng OCR API hay API key.
- Kiểu theme dùng adopted stylesheet để CSP nghiêm ngặt của trang không chặn chúng.
  Sau lần cập nhật thành công đầu tiên, phần tử style cũ bị tắt và không được ghi
  lại nữa.
  Mỗi lần đổi theme chỉ cập nhật adopted stylesheet, tránh xuất bản CSS trùng.
  Điều này giảm công việc không cần thiết; không phải bảo đảm đã đo lường rằng
  việc chuyển theme trên trang trực tiếp sẽ không giật.
  Yêu cầu OCR dùng runtime message thay vì thăm dò hộp thư lưu trữ.

## Cài đặt và quyền

Tiện ích có bộ nhớ riêng, tách khỏi Tampermonkey.
Tùy chọn userscript hiện có không được tự động chuyển; lần chạy đầu tiên dùng mặc
định hiện tại.
Cài đặt Tampermonkey gốc của bạn không bị thay đổi.

Tiện ích chỉ chèn GUI trên domain EduNext gốc.
Quyền truy cập host HTTP(S) cho phép URL nền ảnh/video tùy ý, tải ảnh FPT và gửi
yêu cầu đến nhà cung cấp LLM đã cấu hình và kiểm tra bản phát hành GitHub.
Quyền `downloads` bắt đầu tải ZIP cập nhật và theo dõi trạng thái tải.
Biểu mẫu API và các tài nguyên đi kèm chỉ có thể được EduNext truy cập trên web để
có thể nhúng mà không làm lộ document hoặc key cho script của trang.
`clipboardWrite` giữ chức năng tự sao chép; `storage` và `unlimitedStorage` giữ
cài đặt cùng nền/video đã tải lên cục bộ.
`declarativeNetRequestWithHostAccess` bật rule header CSP có phạm vi hẹp.
`offscreen` cho phép xử lý DOM/canvas ẩn và worker OCR cục bộ.
Tiện ích không yêu cầu lịch sử trình duyệt, mật khẩu, cookie hay quyền debugger.

Rule `edunext_csp` đang bật chỉ xóa header phản hồi CSP và CSP-Report-Only khỏi
document HTTPS trên `fsc-edunext.fpt.edu.vn`.
Điều này xóa mọi bảo vệ CSP được phân phối qua header ở đó, không chỉ hạn chế
media; CSP meta HTML là phần riêng.
Các host khác và CSP của chính tiện ích không thay đổi.

## Phát triển

Từ thư mục gốc của dự án, khi đã cài Node.js và npm:

```powershell
npm ci
npm run build   # regenerate extension/ files
npm run check   # syntax-check generated scripts
npm test        # Node-only source-first fixtures
npm run test:byok # provider, secret isolation, AI panel and settings fixtures
```

`npm run check` kiểm tra cú pháp trong các script app, lõi/engine OCR, auto-answer,
endpoint/backend LLM, cài đặt LLM, background, bridge, runtime, update-release và updates.
Nó không chạy kiểm thử trình duyệt và không bao phủ mọi module được duy trì.
`npm test` chỉ chạy `tests/source-first.cjs`.

`npm run build` chạy `node build.mjs`.
Tailwind 4 và daisyUI 5 biên dịch `source/console.css` thành
`extension/console.css`, file này cũng được nhúng vào app.js.
Stylesheet nguồn import `source/tokens.css` và `source/base.css`.
Build sao chép license của cả hai thư viện CSS.
Không chỉnh sửa trực tiếp CSS được tạo.

`source/Ultimate-RC-tools-5.14.txt` là đầu vào build cơ sở, với các chỉnh sửa được
duy trì cho kiểu tin nhắn và sidebar; tên file phản ánh nguồn gốc, không phải phiên
bản tiện ích hiện tại.
`node build.mjs` tạo lại `extension/app.js`, `extension/auto-answer.js`,
`extension/ocr-core.js` và `extension/ocr-engine.js` cũ bằng các đường dẫn tương
đối với thư mục gốc dự án.
Từ thư mục làm việc khác, hãy gọi `node` với đường dẫn đầy đủ đến `build.mjs`;
các lệnh npm ở trên chạy từ thư mục gốc dự án.
Các file tiện ích khác được duy trì trực tiếp.

Bố cục build:

- `scripts/transforms/ocr-engine.mjs` build engine OCR (hook runtime, kernel Rust
  với fallback JS); `ocr-core.mjs` lấy pipeline OCR đang hoạt động từ đó.
- `scripts/transforms/page-base.mjs` điều chỉnh các tính năng trang cho runtime
  tiện ích.
- `scripts/transforms/index.mjs` liệt kê các transform tính năng theo thứ tự (icon
  điều hướng, theme dashboard, OCR offscreen, truyền theme, nguồn văn bản,
  launcher, nhạc, nhãn nút, thanh công cụ OCR, source-first, UI console).
  Thứ tự quan trọng: transform sau neo vào văn bản do transform trước tạo ra.
- Mã runtime được chèn vào app.js nằm trong `source/*.js`; hãy sửa các nguồn đó,
  không sửa file đã tạo.

Các file tiện ích được duy trì trực tiếp gồm `runtime.js` (API tương thích trang),
`bridge.js` (nhắn tin isolated-world), `background.js` (service worker và yêu cầu
media), `offscreen.js` (hàng đợi/worker OCR) và `wasm-kernels.js` (tải kernel và
fallback).
Đường đi yêu cầu thông thường là mã trang → bridge → service worker → OCR offscreen
→ kết quả trả về trang.

AI dùng một route riêng: `auto-answer.js` cô lập → `llm.js` nền → nhà cung cấp đã
cấu hình.
Cấu hình API nằm dưới `rcLlmConfig`; snapshot và event thay đổi của bridge được
allowlist nên không bao giờ đi vào cache MAIN-world.
Message cấu hình chỉ được chấp nhận từ `llm-settings.html`; yêu cầu trả lời chỉ từ
content script EduNext ở top frame.
Yêu cầu có timeout 45 giây, giới hạn câu hỏi 24.000 ký tự và giới hạn câu trả lời
4.000 ký tự.
Redirect, phản hồi bị cắt ngắn và câu trả lời rỗng/từ chối đều bị loại; không có
tự động thử lại.
Biểu mẫu nhúng chỉ báo chiều cao nội dung cho parent để tính kích thước.
Parent kiểm tra frame gửi, origin của tiện ích và các giới hạn số.
Message theme gồm cả màu chính và màu phụ; message kích thước và theme đều không
mang API key hay giá trị biểu mẫu.

Các transform tính năng dùng `scripts/lib/patch.mjs`: thay thế và chèn đơn yêu cầu
đúng một anchor khớp; thao tác replace-all/regex yêu cầu ít nhất một anchor.
Thay thế vùng yêu cầu các anchor biên tồn tại.
Guard thất bại báo tên transform và anchor.
Văn bản thay thế được chèn nguyên văn (không mở rộng `$&`).
`extension/vendor/assets.json` liệt kê nguồn asset OCR được đóng gói và checksum
SHA-256; license nằm dưới `extension/vendor`.

Để build lại kernel Rust, cài target `wasm32-unknown-unknown`, chạy
`rust-kernels/build.ps1`, sau đó build lại tiện ích.
Chỉnh sửa chỉ ở UI không cần build lại Rust.
WASM được đóng gói có fallback JavaScript.

Kiểm thử trình duyệt cần Playwright và Chrome for Testing được cấp riêng;
`npm ci` chỉ cài phụ thuộc build CSS.
Hãy kiểm tra các đường dẫn cục bộ trước khi chạy.

`tests/smoke.cjs` chạy tiện ích với fixture kiểm thử cục bộ trên hai domain gốc.
Nó dùng profile riêng, CSP trang nghiêm ngặt, worker OCR thật đã đóng gói và thuộc
tính React giả lập.
Chạy `node tests/smoke.cjs`.
Nó cũng gọi `tests/v6-features.cjs` để kiểm tra vòng đời pool/cache/idle của worker
và roundtrip theme/video; module đó không phải lệnh kiểm thử độc lập.
Các fixture này không thay thế việc kiểm thử trên phiên EduNext trực tiếp đã đăng
nhập.
Bước theme của smoke vẫn chọn `Tối` và mong đợi màu chính xác của preset tối cũ.
UI hiện tại dùng `Tối` cho mode giao diện và đặt tên preset đó là `Tím`; hãy xem
lại cặp selector/assertion cũ này trước khi coi kết quả smoke là xác thực UI theme
hiện tại.

`tests/video-csp.cjs` dùng server fixture HTTPS cục bộ và chứng chỉ kiểm thử được
tạo ra (không cài chứng chỉ hệ thống).
Nó so sánh phát video khi rule CSP tắt/bật, kiểm tra wallpaper đã tải lên và URL ở
cả mode thường lẫn glass, kiểm tra lưu khi tải lại và xác minh host khác vẫn giữ
CSP.
Nó cũng cần `node-forge` (`RC_FORGE` có thể trỏ đến đường dẫn module).
Kiểm thử tự tìm bản sao cô lập tại `.transfer/forge/package`, hoặc dùng module
`node-forge` đã cài.
`RC_FORGE` ghi đè cả hai lựa chọn.
Trong checkout sạch, hãy cài riêng và đặt đường dẫn trong PowerShell:

```powershell
npm install --prefix .transfer/video-tools node-forge
$env:RC_FORGE=(Resolve-Path '.transfer/video-tools/node_modules/node-forge').Path
node tests/video-csp.cjs
```

Fixture VP8 dài hai giây được đóng gói bằng filter `testsrc2` của FFmpeg.

Các kiểm thử tập trung bổ sung: `node tests/question-text.cjs` kiểm tra văn bản câu
hỏi/lựa chọn trả lời có thể chọn; `node tests/music.cjs` kiểm tra vòng đời player
giả lập, YouTube mặc định thu gọn, mở rộng, thu nhỏ/khôi phục và không autoplay
khi tải lại.
`tests/fidelity.cjs` kiểm tra văn bản/công thức OCR có thể chọn, khôi phục nguồn
chính xác, thao tác sao chép, glyph màu nội tuyến và giữ lại sơ đồ thật.
Nó loại bỏ việc thay ảnh cả dòng; không chứng nhận độ chính xác OCR của emoji hay
toán học.
Fixture question-text yêu cầu văn bản câu hỏi/đáp án có thể chọn và loại ảnh cả
dòng, đồng thời cho phép glyph nội tuyến cạnh các từ có thể chọn.
Các file `*-TEST-RESULTS.json` hiện có là lịch sử, không phải chứng nhận bản phát
hành hiện tại.

- `node tests/console-ui.cjs`: đổi kích thước/preset, hủy bằng con trỏ, rollback
  Escape, điều khiển bàn phím, kích thước đã lưu, giới hạn viewport, tab và theme,
  gồm vị trí cuối của gạch chân trượt và hành vi reduced-motion.
- `npm run test:byok`: `llm.cjs`, `bridge-secrets.cjs`, `auto-answer.cjs`,
  `ai-panel.cjs`, `ai-preview.cjs`, `llm-settings.cjs` và `embedded-api.cjs`.
  Bao phủ phản hồi API giả lập, lọc bí mật, guard bản nháp/cũ/trùng, vị trí bảng,
  làm mới xem trước và render văn bản an toàn không gọi nhà cung cấp, các trạng
  thái, focus quay lại cài đặt, lưu/xóa cài đặt, cô lập iframe/kích thước nội dung
  và reduced motion.
  Fixture gửi mô phỏng event nhập liệu; chúng không tải ứng dụng React trực tiếp.
- `node tests/chat-surfaces.cjs`: nền văn bản tin nhắn người dùng trong suốt và
  màu icon tiện ích ở mode sáng/tối.
- `node tests/theme-modes.cjs`: mọi theme nhanh ở sáng/tối, giao diện đã lưu,
  chuyển ngày/đêm tự động, ghi đè thủ công, độ tương phản menu tài khoản và kiểu
  hover sidebar.
- `node tests/theme-style-order.cjs`: tiêu đề tải muộn, tiêu đề bảng và bề mặt
  wrapper ở cả hai mode, wrapper chỉ dùng cho bố cục trong suốt và độ ưu tiên
  stylesheet được áp dụng so với style thêm sau có cùng specificity.
- `node tests/theme-performance.cjs`: 24 lần đổi mode qua handler cài đặt thật;
  kiểm tra chúng tạo 24 lần cập nhật adopted-sheet và không ghi lại style cũ.
  Thời gian frame in ra chỉ để chẩn đoán, không phải mục tiêu hiệu năng cố định.
- `node tests/source-first.cjs`: fixture Node VM cho đối sánh nội dung và fallback.
- `node tests/source-first-ui.cjs`: mặc định source-first và cài đặt trong trình
  duyệt.
- `node tests/rust-parity.cjs`: parity kernel và thời gian cục bộ chỉ chạy trên
  Node, không phải tốc độ end-to-end.
  Báo cáo hiện hard-code phiên bản `5.15.0`; trường này không nhận diện phiên bản
  tiện ích hiện tại.

Mọi kiểm thử trình duyệt dùng chung `tests/lib/browser.cjs`: `RC_PLAYWRIGHT` (đường
dẫn module Playwright) và `RC_CHROME` (Chrome for Testing) mặc định lần lượt là
`.transfer/package` và `.transfer/chrome-win64/chrome.exe` nếu có.
Nếu không, helper phân giải module `playwright` đã cài và executable Chromium mặc
định của nó.
Hãy đặt rõ các override khi dùng cặp trình duyệt/công cụ được cài riêng:

```powershell
$env:RC_PLAYWRIGHT = 'C:\path\to\node_modules\playwright'
$env:RC_CHROME = 'C:\path\to\chrome-win64\chrome.exe'
node tests/console-ui.cjs
```

Mỗi lần chạy dùng profile mới dưới `.transfer/`.
Một số kiểm thử ghi đè báo cáo trong `tests/results/`; hãy kiểm tra các thay đổi đó
trước khi commit.
Profile và screenshot vẫn ở cục bộ.
Fixture trình duyệt không dùng profile Chrome đã đăng nhập của bạn.

## Xác minh trong lịch sử

Các kết quả bên dưới mô tả công việc trước đây, không phải các kiểm tra được chạy
lại cho lần rà soát tài liệu ngày 2026-11-17.

Lần theo dõi endpoint tùy chọn và thanh cuộn đã vượt qua build/cú pháp,
`tests/llm.cjs`, `tests/llm-settings.cjs` và `tests/embedded-api.cjs`.
Phạm vi gồm phân giải endpoint trống, từ chối endpoint không phải chuỗi, bảo vệ
không dùng lại key đã lưu của nhà cung cấp tùy chỉnh tại endpoint mặc định, kiểu
thanh cuộn hiển thị, kích thước frame và giới hạn mobile.
Không có lệnh gọi nhà cung cấp trực tiếp nào được thực hiện.
Các kết quả này có trước lần cập nhật chỉ có tài liệu.

Thiết kế lại biểu mẫu API ngày 2026-11-17 đã vượt qua build/cú pháp, cài đặt độc
lập, API nhúng và kiểm tra xem trước trợ lý.
Các kiểm tra này bao phủ lưu/tải lại, bảo vệ và xóa key, cô lập/kích thước iframe,
giới hạn mobile, reduced motion và điều hướng quay lại.
Ảnh chụp desktop và mobile đã được xem xét.
Yêu cầu tiếp theo khôi phục animation của nút kích thước đã vượt qua build/cú pháp
và bộ `tests/console-ui.cjs` gốc, gồm assertion chiều rộng có animation.
Đổi kích thước trực tiếp vẫn ngay lập tức.
Các ghi chú cũ về assertion animation chiều rộng thất bại đã bị thay thế; không
có kiểm thử nào được sửa chỉ để đạt lần vượt qua này.

Công việc UI trước đó đã vượt qua build/cú pháp, kiểm thử BYOK (gồm xem trước câu
hỏi), điều khiển console, cài đặt độc lập/nhúng và nhạc giả lập.
Sau lần tinh chỉnh kiểu nút cuối, build/cú pháp, console-ui và embedded-api lại
vượt qua.
Ảnh chụp desktop và màn hình hẹp đã được kiểm tra.
Các kiểm tra này không gửi yêu cầu đến nhà cung cấp trả phí và không gửi câu trả
lời trên EduNext trực tiếp.

Lỗi preset smoke được sửa ngày 2026-11-14: selector số đã chọn preset Default màu
trắng sau khi thêm Discord Dark.
Bản sửa chọn Dark theo tên và xác minh màu trang ngay lập tức cũng như sau khi tải
lại; việc đổi tên mode-button/preset sau đó cần một cập nhật khác như ghi chú ở
trên.

Lần theo dõi ngày 2026-11-14 đã vượt qua build/cú pháp, source-first và toàn bộ
smoke suite (gồm kiểm tra pool/cache/idle v6 và roundtrip theme/video).
Báo cáo Smoke và V6 đã được làm mới.
Video/CSP cũng vượt qua cả chín kiểm tra và báo cáo được làm mới cho phiên bản
2.0.0.
Kiểm tra fidelity đã vượt qua với contract văn bản và báo cáo được cập nhật.
Công việc UI trước đó đã vượt qua kiểm tra console và nhạc giả lập.
Các kiểm tra này không xác lập hành vi EduNext trực tiếp hoặc streaming.

Lần theo dõi animation tab và cập nhật theme đã vượt qua build/cú pháp, UI console,
theme mode và kiểm tra hồi quy stylesheet trùng.
Trong 24 lần đổi mode, số lần ghi lại style cũ giảm từ 24 xuống 0 trong khi cập
nhật adopted-sheet vẫn là 24.
Các kiểm tra này dùng fixture Chrome cô lập, không dùng trang trực tiếp đã đăng
nhập.

Nếu cập nhật file runtime, hãy nhấp **Reload** trên thẻ tiện ích và tải lại EduNext.
Giữ thư mục tiện ích đã giải nén tại chỗ.
Các chỉnh sửa chỉ có tài liệu không cần build hay tải lại.
