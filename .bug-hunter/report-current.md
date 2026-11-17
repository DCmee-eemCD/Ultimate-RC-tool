# Bug Hunter — current run

Fixed three Medium behavioral bugs: delayed Enter submitting an edited draft;
last English OCR checkbox saving Vietnamese-only; colored OCR text becoming a
whole-line image placeholder. Maintained source changed and extension rebuilt.

PASS: build, syntax, source-first, targeted VM reproductions, earlier original-copy
regression, browser Enter and OCR fidelity. Mocked BYOK suite passed before edits.
PASS (2026-11-18): corrected question-text fixture verifies selectable question
and answer segments, rejects whole-line images and checks inline glyphs retain
words. Both 1-worker and 2-worker cases pass. Entire test collection not run.

Workers reviewed AI, OCR/kernels and build/UI; root reviewed page runtime and source
matching. No live provider/course submissions. Existing dirty work preserved.
Null-palette finding dismissed: base guard survives transformation. Earlier OCR-copy
fix was already present. Legacy image-tab/cache findings were not confirmed as
active-path defects. Endpoint suffix behavior remains unchanged pending resolution
of the conflicting test and written contract. No exhaustive security claim.
