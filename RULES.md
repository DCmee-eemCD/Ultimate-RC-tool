# Ultimate RC Tool — working rules

Read CONTEXT.md first. These project conventions do not override explicit user
instructions or the runtime's higher-priority policies.

## Scope and continuity

1. Preserve existing features and user settings unless the requested change requires otherwise.
2. Treat current source as authoritative. Verify versions; distinguish local edits,
   local ZIPs, uploaded releases, mock tests and real browser observations.
3. Do not silently roll back the user's latest UI choices. In particular: left-aligned
   larger OCR buttons, transparent Fe logo with centered shadow, SVG music icons,
   and audio continuing while video is hidden.
4. Do not launch unrelated refactors or implement backlog suggestions without a request.
5. Check for AGENTS.md or other applicable instructions before editing. Do not assume Git exists.

## Source and build

6. Keep source/Ultimate-RC-tools-5.14.txt unchanged as the historical build input.
7. Never make a durable fix only in generated extension/app.js, ocr-core.js or
   ocr-engine.js. The same applies to extension/console.css. Modify maintained
   source/build modules, then regenerate; keep the original userscript unchanged.
8. Prefer small modules over more fragile replacement chains. Guard important
   replacements and check the generated code. Use a replacement callback when
   injecting text containing JavaScript replacement tokens such as $& or $'.
9. Preserve UTF-8 Vietnamese. PowerShell output may display mojibake even when
   bytes are correct: inspect encoding before rewriting. Avoid lossy shell writes.
10. Keep manifest and visible UI versions synchronized. Retain bundled licenses.

## OCR correctness

11. Never convert a full text line into an image merely because it contains '=',
    math symbols, color or an uncertain emoji. Do not re-enable protectGlyphs.
12. The question box must contain selectable/copyable text; retain answer options.
    Genuine diagrams may remain images. Do not remove all figure handling as a shortcut.
13. Do not guess formula or emoji replacements from semantics. Clearly state model
    limits; source recovery and OCR are distinct paths.
14. Bind output to the correct message/group. Never treat resource arrival order as
    reliable chat chronology when implementing future routing fixes.
15. Do not reuse text from a different React message. Bound source traversal and
    avoid histories/children arrays. Render recovered text with textContent.
16. Preserve coordinate offsets for blocks, lines, words and symbols across strips.
17. Preserve queue isolation, worker reuse, duplicate suppression, cache bounds,
    idle release and stop-during-active-job handling. More workers is not automatically faster.

## UI and music

18. Use consistent SVG icons, accessible names, keyboard focus and theme-aware colors.
19. Show real playback position/state from APIs. Disable unavailable controls rather
    than showing fake timers or simulated playback. Keep hide/show separate from play/pause.
20. Request autoplay only after the user's Open action. Handle blocked playback and
    unavailable media honestly. Never describe mocked tests as successful live streaming.
21. Validate media URLs using exact host allowlists and expected IDs. Never inject
    arbitrary user HTML or scripts. Preserve original-image and service-link fallbacks.

## Verification and releases

22. Run node build.mjs and syntax checks after generated-code edits. Inspect the output.
23. Run targeted meaningful tests: question-text for OCR filtering; music for music
    lifecycle; smoke for broad runtime/bridge changes; Rust parity for kernel changes.
    Use console-ui for panel interactions and source-first/source-first-ui for
    original-content matching and mode changes. Browser tooling is separate from
    npm build dependencies; inspect each script's paths before running it.
    Small CSS edits need focused visual/computed-style checks, not invented unit tests.
24. Do not change tests merely to conceal failures. Update obsolete assertions only
    when the intended requirement changed, and explain why. fidelity.cjs crop
    expectations are obsolete; its failure is not justification to restore crops.
25. Use isolated test profiles. Do not use personal browser sessions, modify global
    browser settings, install system certificates or access account credentials without need.
26. Keep CSP changes confined to the intended domain. Do not broaden permissions or
    remove validation casually. Do not suppress errors to claim a fix.
27. Package only deliverable files. Never include .transfer browser profiles,
    extension/_metadata, private screenshots, auth data or temporary downloads.
28. Preserve the existing shared release identity when replacing its ZIP. Resolve
    the latest version before upload. Follow the available storage workflow; don't
    claim a save succeeded if it failed. Include these handoff docs in future packages.
29. Final reply: say what changed, how it was checked, material limitations, and
    Reload extension -> reload EduNext when needed. Keep it short.
30. Update CONTEXT.md after architecture changes, new known bugs or a completed release.
    Leave a clear pending-work note if an operation is interrupted.

## Current theme and navigation invariants

31. Maintain dashboard and image-theme logic in source/dashboard-theme.js and the
    build transforms. Apply dark/light palette normalization to both Rust and JS
    results. Keep mode-sensitive cache keys and stale image/mode result guards.
32. Keep dashboardBg and imageThemeMode in theme export/import validation. Older
    version-1 themes missing them must retain current values. Preserve unrelated
    OCR, clipboard and music settings when importing themes. Keep consolePrimary,
    consoleSecondary, consoleWidth and consoleHeight compatible with older imports.
33. Keep switches, sliders, borders and text consistent with the dashboard mode.
    Preserve styled color swatches and emoji-free panel button labels; never strip
    emoji from message/OCR content as part of button cleanup.
34. Maintain navigation changes in source/nav-icons.js. Preserve React-owned image
    nodes, limit replacement to known navigation labels, preserve accessible names
    and avoid duplicate SVGs during rerenders. Do not invent user names or labels.
    Check account alignment after resize/font loading before changing its offset.
35. Keep minimize/restore independent of video visibility and playback. Stop must
    remove the mini launcher and destroy the player. The gray unplayed seek track
    must not be described as actual buffered/downloaded progress without API data.
36. Documentation-only edits do not require rebuilding generated files or rerunning
    runtime suites. Check claims against source and clearly separate historical
    test reports from tests run for the current task. Do not bump release versions
    or repackage ZIPs solely for a documentation refresh unless requested.

## Console and source-first behavior

37. Maintain console behavior in source/console-ui.js and source/console-size.js;
    source/console-ui.mjs integrates them. Style source/console.css, compiled with
    Tailwind 4 and prefixed daisyUI 5 buttons without page-wide preflight. Run
    npm ci before the first build in a clean checkout. Preserve bundled licenses.
38. Preserve the current bottom-left panel anchor, persistent size presets and
    top-right resize grip. Show actual displayed dimensions; viewport clamping
    alone must not overwrite the preferred size. Reset size must leave other
    settings unchanged. Keep pointer capture, frame-batched geometry updates,
    drag cancellation and keyboard sizing; do not re-theme the page on every move.
39. Keep the resize arrow small (12px), hidden until corner hover, keyboard focus
    or dragging, with its larger hit area retained. Do not restore the removed
    header subtitle. Keep the gradient on the panel so it fades past the header.
40. Music starts with video/embed collapsed and playback controls visible. Keep
    this separate from the mini-icon state; expand or restore must not restart
    playback. Preserve user control over video visibility after opening.
41. Source-first is the default; explicit automatic OCR and source-first modes
    are mutually exclusive. Recover only exact full-message matches; missing or
    ambiguous source falls back to OCR. Keep source-first routing separate from
    recognition quality claims, and retain the original-image fallback.
