# Ultimate RC Tool — developer handoff

Last source/documentation review: 2026-11-13. Read RULES.md before editing.
This review does not certify a new release or authenticated live behavior.

## Purpose and environment

Chrome Manifest V3 extension converted from the user's Tampermonkey script.
Target page: https://fsc-edunext.fpt.edu.vn/; OCR images: https://cdn-lab.fpt.edu.vn/.
Preserve the original features and GUI while improving OCR, themes and music.
Owner: Kriley. Communication: concise, friendly Vietnamese, ông/tôi. English is
fine for developer documentation. Do the requested work without repeated approvals.

Working directory: `D:\Ultimate RC Tool` on Windows/PowerShell. Node is installed.
`git init` was run on 2026-11-13 and origin points to
`https://github.com/DCmee-eemCD/Ultimate-RC-tool.git`. No commit or push has been
made: this environment could not resolve github.com, so remote branches/history
and reconciliation remain unverified. Do not create an independent root commit;
fetch and inspect the existing history before committing. The internal file
reference identified during publication review was removed with owner approval.
.gitignore now excludes local profiles/staging, release ZIPs, metadata, caches
and common credential files. A pattern scan of 71 publishable candidates found
no recognized API-key/token/private-key patterns; this is not a complete security
audit. Existing remote history and binary assets still need appropriate review.
A previous environment switched to Linux and lost scratch files; do not assume
all historical paths still exist.

## Current state

- Local manifest/build version: **6.1.7**.
- Historical handoff recorded the shared ZIP as **6.1.6**.
  This review did not re-query its remote state. Re-query before replacing;
  do not assume the version remains current.
- 6.1.7 changes Play/Pause from font glyphs to SVG icons, with a centered 38px
  button and accessible labels. Build and mocked music tests passed. A local
  `Ultimate-RC-Chrome-6.1.7.zip` exists; its Library upload/final delivery was not
  completed before this documentation request. Do not call it a delivered release.
- These handoff files were added after that ZIP; repack if they should ship inside it.

Local follow-up UI changes (not packaged as a release): show/hide uses a 3px SVG
chevron; close uses a matching SVG. A separate minus button minimizes the player
to a 48px music icon at bottom-right. Restoring preserves video visibility and
playback; stopping removes the mini icon. Build/syntax and mocked music lifecycle
checks passed, including minimize/restore, keyboard activation, and stop while
minimized. Live service playback has not been verified.

Further local changes now present in source and generated app (still 6.1.7):
dashboard color and theme-aware controls, dark/light image palettes, updated
color swatches, removal of decorative button emoji, gray unplayed music track,
and SVG left-navigation replacements. No new ZIP was built during this review.
The gray music track is an unplayed seek track, not measured buffered progress.

## File map and build ownership

| Path | Role |
| --- | --- |
| source/Ultimate-RC-tools-5.14.txt | Historical userscript, immutable build input |
| build.mjs | Extracts/transforms original page and OCR code |
| build-v6.mjs | Offscreen, theme transfer, OCR fixes, music, toolbar and version transforms |
| source/theme-transfer.js | Theme import/export UI logic |
| source/dashboard-theme.js | Dashboard CSS variables and dark/light image-palette normalization |
| source/nav-icons.js | React-safe left-navigation SVG replacements and alignment |
| source/text-source.js | Bounded React prop search for original text/Unicode/LaTeX |
| source/music.js | Floating music UI and official YouTube/Spotify SDK adapters |
| source/ocr-toolbar.mjs | Generated OCR result toolbar transformations |
| source/ocr-fidelity.js | Historical image-preservation experiment; NOT called by current OCR core |
| extension/app.js | GENERATED page UI and behavior |
| extension/ocr-core.js | GENERATED active shared OCR pipeline |
| extension/ocr-engine.js | GENERATED legacy image-tab engine, not the normal active path |
| extension/bridge.js | Isolated-world extension bridge |
| extension/runtime.js | Main-world GM compatibility API, messaging, early canvas capture |
| extension/background.js | Service worker, validation, media fetch, offscreen lifecycle, Rust palette |
| extension/offscreen.js | Active OCR queue, worker pool, cache, idle release |
| extension/offscreen-runtime.js | OCR environment options |
| extension/wasm-kernels.js | Rust WASM interface and JS fallback plumbing |
| rust-kernels/ | Rust source and build script |
| extension/vendor/ | Bundled Tesseract JS/WASM, language data, licenses and asset manifest |
| images/FE.png; extension/icons/ | User logo and resized Chrome icons |
| tests/ | Fixture-based browser and Rust parity checks |
| .transfer/ | Disposable test profiles, tooling, experiments and release staging; never ship wholesale |

Run `node build.mjs` from the project root. It regenerates app.js, ocr-core.js and
ocr-engine.js. Other extension files are maintained directly. The build includes
string/regex transforms; some have guards, others do not. Inspect generated output.
There is no root package.json/npm test command. `build.mjs` imports and invokes
`upgrade()` from build-v6.mjs; do not run build-v6.mjs as a standalone build.

## Runtime architecture

Page MAIN world app/runtime -> ISOLATED bridge -> service worker -> one offscreen
document -> Tesseract scheduler/workers -> result returned to the page.
Settings use chrome.storage.local through compatibility APIs. Uploaded media and
portable themes are supported. Old Tampermonkey settings do not migrate automatically.

Rust/WASM handles OCR pixel preprocessing, strip grouping, figure geometry and
palette extraction. Tesseract is the recognition engine, not Rust. JavaScript
fallbacks remain. Normal OCR does not open visible tabs; legacy tab code still exists.

OCR automatic workers are chosen by image size/CPU/reported RAM, up to four;
manual 1–8 workers is supported. More workers are not necessarily faster.
offscreen.js serializes jobs while a scheduler parallelizes strips within a job.
It reuses workers, deduplicates in-flight requests, caches image-content results
in memory (16 entries / 16 MiB), and releases workers on idle/stop. This is not a
persistent disk OCR cache. Language/pool changes must not race active work.

## OCR behavior and known limitations

Two image-discovery mechanisms feed ONE normal OCR pipeline:

1. PerformanceObserver with buffered resource events sees initial and new loads.
2. Canvas drawImage interception sees rendered/cached images. runtime.js captures
   early URLs, then app.js drains those and installs the normal hook.

noteUrl batches for 1.5 seconds and chooses the last observed URL's group. This is
not guaranteed to be the last chronological chat message. Late old images can
therefore be selected. forceScan also uses observed resource ordering. No fix yet.

enqueue -> runJob -> RC.ocr -> ocrPipeline -> result text/segments -> showInBubble.
applyToContainer may replace OCR text with original React source text. It uses
textContent for content, and preserves non-experimental figure segments.
reapplyAll restores missing output nodes after React rendering; it does not
continuously upgrade existing output when original source arrives later.

User reports old messages after reload have very accurate LaTeX/emoji, while
realtime messages do not. Delayed source availability is a hypothesis, not a
verified live diagnosis. User explicitly deferred that investigation to fix realtime.

6.0.1 introduced protectGlyphs: colored emoji became inline image crops and lines
containing '=' became whole-line images. This was a regression for the user's goal.
6.1.2 disabled its call: text must remain selectable text, including formulas.
It also admits short enumerated answers such as a) (O; 3 cm), previously filtered
as unreliable. Retains the earlier x/y offset correction for parallel-strip boxes.
Question text is rendered in a white HTML .rc-qbox, not an image of the question.

Emoji/math recognition is STILL imperfect. Do not claim full Unicode emoji or
LaTeX-from-image support. No reliable new recognition model has been installed.
Actual figures still use the original text-row exclusion/ink-region detector;
unusual drawings or missed text can still be misclassified. Source retrieval is
best effort and must not take content from a different message.

Two Tesseract warnings were reported: missing language_model_ngram_on and
classify_misfit_junk_penalty. App code did not directly set them in the inspected
version. Language-data/core mismatch was not confirmed. Do not hide warnings and
claim the root cause is fixed.

## Themes, UI and music

- Theme import/export includes uploaded background images/video; preserve unrelated settings.
- `dashboardBg` defaults to #1e293b; `imageThemeMode` defaults to `dark` and accepts
  `dark`/`light`. Dashboard colors are derived from that seed and mode, including
  foreground, borders, accent, switches and slider fills; the raw seed is not the
  final dashboard surface color. Color controls use a two-column swatch grid.
- Image palettes normalize the seven original colors to dark/light luminance
  levels and also assign `dashboardBg` from `panelBg`, for both Rust and JS paths.
  Palette reuse keys include the mode; async results check both requested image
  and mode before applying. The mode also controls dashboard light/dark rendering.
- Theme format remains version 1. Export/import includes both new settings;
  import validates their types/values and retains current values for older themes
  that omit them. Keep unrelated behavior settings untouched.
- `nav-icons.js` maps known image alt labels (with Account/Support/FAQ aliases)
  inside `.left-navigation` to local SVGs. Keep original image nodes hidden rather
  than replacing React-owned nodes. MutationObserver batches rescans; ResizeObserver,
  resize events and font readiness recenter icons. Account retains a 32px footprint
  and currently has an 8px downward offset. Visible duplicate menu labels are hidden;
  SVG accessible names use existing alt text, not invented account names.
- Plain static button labels have decorative emoji stripped by the build; SVG
  controls and original message/OCR content are not part of that label cleanup.
- Narrow CSP response-header removal rule targets EduNext. It removes full CSP
  headers there, not only media restrictions; meta CSP is a separate limitation.
  Manifest HTTP(S) host access supports arbitrary wallpaper/media URLs; do not broaden it.
- Fe launcher: transparent PNG-only button, 40px; centered 0/0/3px contour shadow.
- OCR toolbar: LEFT aligned, 18px SVG icons, 14px text, 10px/16px padding,
  larger darker hover area; copy shows a check for 1.5s. This supersedes earlier
  right-aligned styling. Unknown gray message ID below it has NOT been hidden.
- Music: fourth GUI tab; validated YouTube/Spotify links; floating bottom-right bar,
  title, elapsed/duration, seek, play/pause, show/hide video, close/stop.
- Uses official remote SDKs in the page world. No audio ripping/download engine.
- Open player requests playback once SDK is ready. No autoplay on page reload.
- Since 6.1.6, hiding video changes visibility ONLY: never issue pause or force
  expansion on resume. User explicitly requested ongoing audio while collapsed.
- Actual service playback depends on browser/service restrictions. Spotify can
  offer previews. SDK/network failure and autoplay blocking have UI messages.

## Verification and commands

```powershell
node build.mjs
node --check extension/app.js
node --check extension/ocr-core.js
$env:RC_PLAYWRIGHT='D:\Ultimate RC Tool\.transfer\package\index.js'
$env:RC_CHROME='D:\Ultimate RC Tool\.transfer\chrome-win64\chrome.exe'
node tests/smoke.cjs
node tests/question-text.cjs
node tests/music.cjs
```

Verify these tool paths exist first. Some tests hard-code .transfer paths. Tests
use separate browser profiles; never automate the user's real profile by default.

- smoke.cjs: real bundled OCR, Rust usage, bridge/clipboard, UI, theme/video roundtrip;
  invokes v6-features.cjs for pool/cache/idle behavior. Some log labels still say
  three tabs, but the assertion was updated to four.
- question-text.cjs: real OCR synthetic layout matching the reported question;
  1/2 workers, three answer options as text, no cropped segments, one HTML qbox.
- music.cjs: mocked providers/SDKs; verifies URLs, visibility, play/pause, seek,
  saved link and no startup playback. It does NOT prove live streaming works.
- fidelity.cjs / FIDELITY-TEST-RESULTS.json: historical 6.0.1 expectations for crops;
  stale since 6.1.2. Do not restore rejected behavior to make this test pass.
- rust-parity.cjs and video-csp.cjs: specialized checks; read their prerequisites.
- Existing JSON reports are historical artifacts, not proof for every new version.

No authenticated live EduNext session was verified in this handoff.

## Release and next work

Update both manifest version and build-v6.mjs visible version. Build, check relevant
behavior, stage extension + source + build scripts + Rust source + needed assets/docs.
Exclude .transfer, browser profiles, extension/_metadata, credentials and private
screenshots. ZIP root must contain extension/manifest.json at that relative path.
Install via chrome://extensions -> Developer mode -> Load unpacked -> extension.
For updates: Reload extension, then reload EduNext to drop stale page code/results.

Next: finish 6.1.7 handoff if requested; validate SVG appearance in actual player.
Also validate navigation alignment on live EduNext and dark/light image palettes,
dashboard controls and old/new theme roundtrips in-browser. Current checked-in
tests do not provide dedicated coverage for the latest palette/navigation UI.
This documentation review inspected sources and generated markers only; it did
not rerun browser/OCR tests, rebuild runtime files or update historical JSON reports.
Future backlog ideas (NOT authorized work): draggable controls, playlists,
OCR editing/comparison, theme schedules. Keep unrelated work out of small fixes.
