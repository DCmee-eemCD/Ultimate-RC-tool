# Fix Strategy

- Confidence threshold: 75
- Confirmed findings: 1
- Safe autofix: 1
- Manual review: 0
- Larger refactor: 0
- Architectural remediation: 0
- Canary candidates: 1
- Rollout candidates: 0

## Clusters
- PAGE-1 | safe-autofix | canary | max severity Medium
  Bugs: PAGE-1
  Files: extension/app.js
  Summary: Copy latest returns stale OCR after original text becomes available.
  Action: Refresh current originals for the target group's URLs before the cached copy fast path, preserving non-placeholder image segments.
  Reasons: Reproduced or independently traced with confidence >=75%.
