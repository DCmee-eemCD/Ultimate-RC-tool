# Graph Report - Ultimate RC Tool  (2026-11-25)

## Corpus Check
- 110 files · ~110,265 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 21 file(s) not represented in the graph (top: .css 8, (none) 5, .wasm 5)

## Summary
- 2012 nodes · 3616 edges · 113 communities (67 shown, 46 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 399 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `774b6694`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- i
- index.mjs
- i
- tesseract-core-lstm.wasm.js
- tesseract-core-simd-lstm.wasm.js
- V
- V
- app.js
- J
- J
- browser.cjs
- tesseract-core-simd.wasm.js
- tesseract-core.wasm.js
- L
- L
- L
- L
- X
- X
- O
- O
- Ultimate RC tools — Chrome extension
- fidelity.cjs
- llm-settings.js
- O
- O
- ocr-engine.js
- Nb
- Nb
- rust-parity.cjs
- manifest.json
- ocr-core.js
- ji
- ji
- Ob
- Ob
- ji
- ji
- music.js
- ocr-tables-detect.cjs
- J
- z
- J
- z
- llm.js
- music.cjs
- console-ui.js
- package.json
- ocr-recovery.cjs
- lib.rs
- ocr-tables.js
- Lh
- Lh
- Ab
- Lh
- Ab
- Lh
- llm.cjs
- source-first.cjs
- console-size.js
- ai-preview.cjs
- bridge-secrets.cjs
- background.js
- offscreen.js
- $a
- $a
- theme-modes.cjs
- K
- Q
- K
- Q
- video-csp.cjs
- dashboard-theme.js
- panel-layout.js
- ai-panel.cjs
- extension/auto-answer.js
- source/auto-answer.js
- theme-transfer.js
- auto-answer.cjs
- .Gg
- .Gg
- di
- di
- ocr-fidelity.js
- text-source.js
- updates.cjs
- update-release.js
- updates.js
- nav-icons.js
- ii
- ii
- ii
- AGENTS.md
- ci
- Wh
- ci
- Wh
- THIRD-PARTY-NOTICES.md
- BUILD.md
- rc_kernels

## God Nodes (most connected - your core abstractions)
1. `X()` - 66 edges
2. `X()` - 66 edges
3. `V()` - 66 edges
4. `V()` - 66 edges
5. `L()` - 47 edges
6. `L()` - 47 edges
7. `L()` - 47 edges
8. `L()` - 47 edges
9. `i()` - 42 edges
10. `n()` - 38 edges

## Surprising Connections (you probably didn't know these)
- `Architecture decided` --references--> `clearKey()`  [INFERRED]
  CONTINUE-BYOK.md → extension/llm-settings.js
- `Live DOM verified through Browser MCP` --references--> `findSendTarget()`  [INFERRED]
  CONTINUE-BYOK.md → extension/app.js
- `t()` --indirect_call--> `F()`  [INFERRED]
  extension/vendor/core/tesseract-core-lstm.wasm.js → extension/vendor/worker.min.js
- `t()` --indirect_call--> `F()`  [INFERRED]
  extension/vendor/core/tesseract-core-simd-lstm.wasm.js → extension/vendor/worker.min.js
- `t()` --indirect_call--> `F()`  [INFERRED]
  extension/vendor/core/tesseract-core-simd.wasm.js → extension/vendor/worker.min.js

## Import Cycles
- None detected.

## Communities (113 total, 46 thin omitted)

### Community 0 - "i"
Cohesion: 0.06
Nodes (80): a(), s(), u(), b(), c(), A(), d(), E() (+72 more)

### Community 1 - "index.mjs"
Cohesion: 0.05
Nodes (46): buildConsoleCss(), ctx, engine, {engineSource, features}, {version}, asReplacer(), occurrences(), Patch (+38 more)

### Community 2 - "i"
Cohesion: 0.08
Nodes (57): A(), c(), u(), b(), c(), e(), E(), h() (+49 more)

### Community 3 - "tesseract-core-lstm.wasm.js"
Cohesion: 0.06
Nodes (40): ac(), $b(), bc(), cc(), ci(), Da(), Eb(), fi() (+32 more)

### Community 4 - "tesseract-core-simd-lstm.wasm.js"
Cohesion: 0.07
Nodes (40): ac(), $b(), bc(), cc(), ci(), Da(), Eb(), fi() (+32 more)

### Community 5 - "V"
Cohesion: 0.05
Nodes (5): A(), ii(), S(), V(), Wa()

### Community 6 - "V"
Cohesion: 0.05
Nodes (4): A(), S(), V(), Wa()

### Community 7 - "app.js"
Cohesion: 0.10
Nodes (46): Live DOM verified through Browser MCP, allChatUrls(), applyDashboardTheme(), applyTheme(), applyToContainer(), autoThemeFrom(), bgSrc(), centerIcons() (+38 more)

### Community 8 - "J"
Cohesion: 0.08
Nodes (5): di(), I(), J(), K(), Q()

### Community 9 - "J"
Cohesion: 0.08
Nodes (5): di(), I(), J(), K(), Q()

### Community 10 - "browser.cjs"
Cohesion: 0.09
Nodes (23): assert, assert, main(), assert, chromePath(), EXTENSION, fs, launchExtension() (+15 more)

### Community 11 - "tesseract-core-simd.wasm.js"
Cohesion: 0.07
Nodes (22): Ea(), fi(), gi(), hb(), ib(), Kh(), a(), n() (+14 more)

### Community 12 - "tesseract-core.wasm.js"
Cohesion: 0.07
Nodes (22): Ea(), fi(), gi(), hb(), ib(), Kh(), a(), n() (+14 more)

### Community 19 - "O"
Cohesion: 0.07
Nodes (3): M(), N(), O()

### Community 20 - "O"
Cohesion: 0.07
Nodes (3): M(), N(), O()

### Community 21 - "Ultimate RC tools — Chrome extension"
Cohesion: 0.07
Nodes (28): 1. Download and extract, 1. Tải xuống và giải nén, 2. Load the extension, 2. Tải tiện ích, 3. Mở EduNext, 3. Open EduNext, BYOK short answers, Check for updates (+20 more)

### Community 22 - "fidelity.cjs"
Cohesion: 0.08
Nodes (22): assert, path, assert, path, assert, canvas, exact, fs (+14 more)

### Community 23 - "llm-settings.js"
Cohesion: 0.16
Nodes (24): Architecture decided, BYOK short-answer assistant — completed, Critical security issue to fix BEFORE storing a key, Current completion status, Current status (supersedes the checkpoint below), Historical checkpoint — retained for context only, Prior completed UI work (preserve), Remaining implementation and checks (+16 more)

### Community 26 - "ocr-engine.js"
Cohesion: 0.17
Nodes (23): buildResult(), cellHasInk(), centerRun(), cleanCellText(), cropCell(), detectOcrTableGrids(), emojiSignature(), extractGrid() (+15 more)

### Community 27 - "Nb"
Cohesion: 0.14
Nodes (17): Ab(), d(), Db(), e(), h(), Ha(), Ia(), Nb() (+9 more)

### Community 28 - "Nb"
Cohesion: 0.14
Nodes (17): Ab(), d(), Db(), e(), h(), Ha(), Ia(), Nb() (+9 more)

### Community 29 - "rust-parity.cjs"
Cohesion: 0.09
Nodes (14): assert, fs, scope, source, vm, assert, context, fs (+6 more)

### Community 30 - "manifest.json"
Cohesion: 0.09
Nodes (21): background, service_worker, content_scripts, content_security_policy, extension_pages, declarative_net_request, rule_resources, description (+13 more)

### Community 31 - "ocr-core.js"
Cohesion: 0.19
Nodes (21): buildResult(), cellHasInk(), centerRun(), cleanCellText(), cropCell(), detectOcrTableGrids(), emojiSignature(), extractGrid() (+13 more)

### Community 32 - "ji"
Cohesion: 0.10
Nodes (6): ai(), ei(), hi(), ji(), Sh(), Ya()

### Community 33 - "ji"
Cohesion: 0.10
Nodes (6): ai(), ei(), hi(), ji(), Sh(), Ya()

### Community 34 - "Ob"
Cohesion: 0.15
Nodes (20): Bb(), d(), e(), Eb(), Fb(), Ia(), Ja(), lb() (+12 more)

### Community 35 - "Ob"
Cohesion: 0.15
Nodes (20): Bb(), d(), e(), Eb(), Fb(), Ia(), Ja(), lb() (+12 more)

### Community 36 - "ji"
Cohesion: 0.11
Nodes (5): ai(), ei(), hi(), ji(), Sh()

### Community 37 - "ji"
Cohesion: 0.11
Nodes (5): ai(), ei(), hi(), ji(), Sh()

### Community 38 - "music.js"
Cohesion: 0.10
Nodes (17): apiPromises, clock, controls, expand, fmt(), minimize, musicBar, musicBox (+9 more)

### Community 39 - "ocr-tables-detect.cjs"
Cohesion: 0.15
Nodes (11): assert, FakeCanvas, FakeContext, fs, horizontal(), ink(), makeFixture(), parseColor() (+3 more)

### Community 44 - "llm.js"
Cohesion: 0.27
Nodes (18): answerContent(), answerQuestion(), assertSender(), cleanString(), createTimeoutSignal(), endpointForRequest(), error(), handle() (+10 more)

### Community 45 - "music.cjs"
Cohesion: 0.11
Nodes (4): assert, assert, fs, path

### Community 46 - "console-ui.js"
Cohesion: 0.12
Nodes (18): closeMusicSettings(), musicDismiss, musicHeader, musicSettings, musicToggle, positionMusic(), resetOcrButton, resetOcrHint (+10 more)

### Community 47 - "package.json"
Cohesion: 0.16
Nodes (14): devDependencies, daisyui@^5.8.0, tailwindcss@^4.3.5, @tailwindcss/cli@^4.3.5, private, scripts, build, check (+6 more)

### Community 48 - "ocr-recovery.cjs"
Cohesion: 0.13
Nodes (6): app, assert, fs, source, {test}, vm

### Community 49 - "lib.rs"
Cohesion: 0.17
Nodes (8): Buffers, color(), dimensions(), figures(), hsl(), MAX_BYTES, palette(), strips()

### Community 50 - "ocr-tables.js"
Cohesion: 0.29
Nodes (14): cellHasInk(), centerRun(), cleanCellText(), cropCell(), detectOcrTableGrids(), extractGrid(), extractOcrTables(), imageDataOf() (+6 more)

### Community 51 - "Lh"
Cohesion: 0.14
Nodes (4): bi(), Lh(), Y(), Zh()

### Community 52 - "Lh"
Cohesion: 0.14
Nodes (4): bi(), Lh(), Y(), Zh()

### Community 53 - "Ab"
Cohesion: 0.37
Nodes (14): Ab(), ac(), $b(), bc(), C(), cc(), dc(), Qb() (+6 more)

### Community 54 - "Lh"
Cohesion: 0.14
Nodes (4): bi(), Lh(), Y(), Zh()

### Community 55 - "Ab"
Cohesion: 0.37
Nodes (14): Ab(), ac(), $b(), bc(), C(), cc(), dc(), Qb() (+6 more)

### Community 56 - "Lh"
Cohesion: 0.14
Nodes (4): bi(), Lh(), Y(), Zh()

### Community 57 - "llm.cjs"
Cohesion: 0.16
Nodes (13): assert, childSender, context, fs, jsonResponse(), main(), pageSender, plain() (+5 more)

### Community 58 - "source-first.cjs"
Cohesion: 0.15
Nodes (12): app, assert, canvas, cont, ctx, fs, message, other (+4 more)

### Community 59 - "console-size.js"
Cohesion: 0.24
Nodes (10): finishSizeDrag(), grip, paintSizeDrag(), setConsoleSize(), sizeBar, sizeButtons, sizeHelp, sizeLimits() (+2 more)

### Community 60 - "ai-preview.cjs"
Cohesion: 0.18
Nodes (9): assert, path, pause(), waitFor(), assert, path, TRANSFER, assert (+1 more)

### Community 61 - "bridge-secrets.cjs"
Cohesion: 0.17
Nodes (10): assert, context, fs, listeners, path, posted, source, stored (+2 more)

### Community 62 - "background.js"
Cohesion: 0.36
Nodes (9): appendJob(), ensureOffscreen(), extensionRoot, handle(), inboxTail, offscreen(), resetOcr(), trusted() (+1 more)

### Community 63 - "offscreen.js"
Cohesion: 0.38
Nodes (9): cache, dispose(), enqueue(), inFlight, pool(), remember(), run(), status() (+1 more)

### Community 66 - "theme-modes.cjs"
Cohesion: 0.25
Nodes (4): assert, flushAndReload(), fs, openPanel()

### Community 71 - "video-csp.cjs"
Cohesion: 0.25
Nodes (6): assert, forge, fs, https, localForge, path

### Community 72 - "dashboard-theme.js"
Cohesion: 0.46
Nodes (7): applyDashboardTheme(), checkThemeClock(), DISCORD_LIGHT, effectiveThemeMode(), imagePaletteMode(), isDiscordPalette(), syncThemeMode()

### Community 73 - "panel-layout.js"
Cohesion: 0.32
Nodes (7): companionOrder, layoutCompanions(), motions, performCompanionLayout(), previousPositions, reducedMotion, setStyle()

### Community 74 - "ai-panel.cjs"
Cohesion: 0.29
Nodes (6): assert, assertInViewport(), assertVisibleBounds(), BOT_PATHS, path, THEME_TOKENS

### Community 75 - "extension/auto-answer.js"
Cohesion: 0.73
Nodes (5): answer(), messageHints(), mount(), questionText(), snapshot()

### Community 76 - "source/auto-answer.js"
Cohesion: 0.73
Nodes (5): answer(), messageHints(), mount(), questionText(), snapshot()

### Community 77 - "theme-transfer.js"
Cohesion: 0.33
Nodes (3): colors, ranges, themeKeys

### Community 78 - "auto-answer.cjs"
Cohesion: 0.53
Nodes (5): assert, main(), path, pause(), waitFor()

### Community 83 - "ocr-fidelity.js"
Cohesion: 0.70
Nodes (4): emojiSignature(), protectGlyphs(), recognizeEmoji(), repairOcrText()

### Community 84 - "text-source.js"
Cohesion: 0.70
Nodes (4): latexSourceOf(), originalResult(), recoverOriginals(), texCandidates()

### Community 85 - "updates.cjs"
Cohesion: 0.40
Nodes (3): ambiguous, assert, hostile

### Community 86 - "update-release.js"
Cohesion: 1.00
Nodes (3): compare(), select(), version()

### Community 87 - "updates.js"
Cohesion: 0.83
Nodes (3): checkRelease(), downloadState(), startDownload()

### Community 88 - "nav-icons.js"
Cohesion: 1.00
Nodes (3): centerIcons(), scan(), start()

## Knowledge Gaps
- **1 isolated node(s):** `rc_kernels`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 853 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **46 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `F()` connect `i` to `Ob`, `Ob`, `Nb`, `Nb`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **What connects `rc_kernels` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `i` be split into smaller, more focused modules?**
  _Cohesion score 0.06225520511234797 - nodes in this community are weakly interconnected._
- **Why does `X()` connect `X` to `$a`, `ji`, `J`, `z`, `tesseract-core.wasm.js`, `L`, `Lh`, `O`, `ii`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `index.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05160628844839371 - nodes in this community are weakly interconnected._
- **Why does `L()` connect `L` to `tesseract-core-lstm.wasm.js`, `V`, `J`, `O`, `Lh`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `i` be split into smaller, more focused modules?**
  _Cohesion score 0.07603603603603604 - nodes in this community are weakly interconnected._