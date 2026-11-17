# API settings redesign

Console theme, adapted to existing saved palette and system font. App scope; existing credentials, validation, provider logic and iframe-origin isolation preserved.

Changed: compact single-column form, inset fields, key visibility inside the key field, key status and deletion beside one another, one full-width Save action. Removed repeated field dividers and the iframe's redundant top rule. All existing help and disclosure wording remains. Back label changed from “← Quay lại trợ lý” to “Quay lại trợ lý” for Hallmark gate 63.

- [Before, embedded](before-embedded.png)
- [After, embedded](after-embedded.png)
- [After, mobile](after-mobile.png)
- [After, standalone](after-standalone.png)

Verification: build and syntax checks passed; standalone settings, embedded API and assistant preview tests passed. API stylesheet Hallmark sweep: 0 FAIL, 0 REFLEX, 0 WARN. Native Hallmark render unavailable; actual extension captured using existing Playwright/Chrome fixture tooling and visually inspected. No live provider calls.

Modern Web Guidance: `forms` informed matching visual and keyboard order, preserving label/help associations and native buttons (“DON'T use CSS to visually reorder form controls away from their DOM/keyboard Tab order”). Key deletion was moved in the markup, not just positioned with CSS.
