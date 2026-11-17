# Assistant and API redesign

Full app-screen redesign, 2026-11-18. Retained saved palettes, Segoe UI, Vietnamese copy, field IDs, handlers and the isolated extension-origin API form.

The assistant leads with the question preview, then a recognizable automatic-mode switch and answer controls. Status has a separate quiet surface. API settings group connection and credentials; automatic mode remains in the assistant and the arrow return control remains above the form. Existing copy was preserved; group legends and a page meta description were added. No assets or material are required.

See [before and after](compare.html). The captures are real extension views with sample question content. The sample draft prevents provider calls. Dark/light, mobile, empty and error captures are in `after/`.

## Verification

- Build and JavaScript syntax checks passed.
- Existing AI-panel, preview, API-settings and embedded-API fixtures passed. These cover navigation/focus, saved themes, mobile bounds, save/delete, credential isolation and reduced motion.
- Hallmark on `source/assistant.css` and `extension/llm-settings.css`: 0 FAIL, 0 REFLEX, 0 WARN.
- Hallmark preservation scan: 1/1 link, 3/3 fields and 2/2 script hooks retained.
- Hallmark native rendering could not run because puppeteer-core is unavailable. Existing Playwright/Chrome isolated profiles provided actual browser captures instead.
- Whole-page scan follows the generated shared console CSS: it reports 30 FAIL and 26 REFLEX, including inherited daisyUI rules, the user's main-console size animation, and shadow-root tokens the parser does not recognize after compilation. This is not a whole-project clean-lint claim. No third-party generated code was edited to suppress findings.
- Primary-action contrast: 6.81:1 dark, 6.54:1 light, 10.08:1 standalone API. Actual computed colors and ratios are in `after/contrast.json`.
- A separate reviewer returned **ship**, with no actionable finish defects. Tradeoff: the clearer grouping uses more vertical space, so short screens scroll. The API form retains one outer scroller.

Existing unrelated edits were preserved. The global diff check also reports existing generated `extension/app.js` whitespace; this redesign does not alter its originating code.
