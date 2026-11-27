(async function () {
    await RC.ready;
    const kernels = await RCWasm.ready;
    RC.pixelBackend = kernels ? "rust" : "javascript";
    'use strict';

    const HUB_VER = '4.0.0';   // tab hub chạy sẵn KHÔNG tự nạp lại script → khác phiên bản thì phải đóng rồi mở hub mới
    const log = (...a) => console.log('%c[RC]', 'color:#f59e0b', ...a);
// Repair only recognizable English pronoun contexts, never arbitrary bars.
    function repairOcrText(text) {
        return String(text || '').replace(/(^|[\s(“"'])\|(?=\s+(?:am|was|have|had|will|would|can|could|should|must|want|need|think|know|like|love|hope|believe|feel|see|said|did|do|don't|didn't)\b|['’](?:m|ve|ll|d)\b)/gi, '$1I');
    }

    // Keep colored glyphs from becoming invented OCR characters (for example
    // a flame emoji read as "@"). Ordinary words remain selectable text;
    // only the unsupported colored component is copied from the source image.
    let emojiSamples;
    function emojiSignature(canvas) {
        const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        const points = [];
        let left = canvas.width, top = canvas.height, right = 0, bottom = 0;
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const rgb = Array.from(data.slice(i, i + 3));
            if (data[i + 3] < 128 || Math.max(...rgb) - Math.min(...rgb) <= 65) continue;
            points.push([x, y, ...rgb]);
            left = Math.min(left, x); right = Math.max(right, x);
            top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
        if (points.length < 6) return null;
        const bins = new Float64Array(256);
        for (const [x, y, r, g, b] of points) {
            const i = (Math.floor((y - top) * 8 / (bottom - top + 1)) * 8
                + Math.floor((x - left) * 8 / (right - left + 1))) * 4;
            bins[i] += r / 255; bins[i + 1] += g / 255; bins[i + 2] += b / 255; bins[i + 3]++;
        }
        for (let i = 0; i < bins.length; i += 4) if (bins[i + 3]) {
            bins[i] /= bins[i + 3]; bins[i + 1] /= bins[i + 3]; bins[i + 2] /= bins[i + 3]; bins[i + 3] = 1;
        }
        return bins;
    }
    function recognizeEmoji(canvas) {
        const input = emojiSignature(canvas);
        if (!input) return null;
        if (!emojiSamples) {
            emojiSamples = [];
            for (const text of [
                '💡', '🔥', '💪', '👍', '👎', '👏', '🙏', '👉', '👇', '✅', '❌', '❗', '❓', '⚠️', '⭐', '✨', '🎉', '🎯', '📌', '📚', '📝', '😊', '😀', '😂', '🤔', '❤️', '💯', '🚀',
                // Hand gestures and encouragement.
                '👋', '🤚', '🖐️', '✋', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
                '👈', '👆', '☝️', '✊', '👊', '🤛', '🤜', '🙌', '👐', '🤝',
                // Study supplies, paper, documents, and mail.
                '✏️', '🖊️', '🖋️', '✒️', '🖍️', '📖', '📕', '📗', '📘', '📙',
                '📓', '📔', '📒', '📃', '📄', '📑', '📋', '📁', '📂', '🗂️',
                '✉️', '📧', '📩', '📨', '💌', '📎', '🖇️', '📏', '📐', '✂️',
                // Learning, achievements, and popular reactions.
                '🎓', '🧠', '🔍', '🏆', '🥇', '🌟', '⚡', '😍', '😎', '🥳',
            ]) {
                const sample = document.createElement('canvas');
                sample.width = sample.height = 64;
                const ctx = sample.getContext('2d');
                ctx.font = '40px "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
                ctx.textBaseline = 'top';
                ctx.fillText(text, 8, 8);
                const signature = emojiSignature(sample);
                if (signature) emojiSamples.push({ text, signature });
            }
        }
        const ranked = emojiSamples.map(({ text, signature }) => ({ text,
            error: input.reduce((sum, value, i) => sum + Math.abs(value - signature[i]), 0) / input.length,
        })).sort((a, b) => a.error - b.error);
        return ranked[0]?.error < 0.18 && (!ranked[1] || ranked[1].error - ranked[0].error > 0.025)
            ? ranked[0].text : null;
    }
    function protectGlyphs(data, orig, scale) {
        const ctx = orig.getContext('2d', { willReadFrequently: true });
        const W = orig.width, H = orig.height;
        const glyphNoise = value => {
            const t = String(value || '').trim();
            if (!t) return true;
            const letters = (t.match(/[\p{L}\p{N}]/gu) || []).length;
            return letters === 0 || letters / Array.from(t).length < 0.5;
        };
        const iconPart = (range, y0, y1) => {
            const x0 = Math.max(0, range.x0 - 3 * scale);
            const x1 = Math.min(W, range.x1 + 3 * scale);
            const icon = document.createElement('canvas');
            icon.width = x1 - x0; icon.height = y1 - y0;
            icon.getContext('2d').drawImage(orig, x0, y0, icon.width, icon.height, 0, 0, icon.width, icon.height);
            const emoji = recognizeEmoji(icon);
            if (emoji) return { x: x0, type: 'text', text: emoji };
            return { x: x0, type: 'icon', src: icon.toDataURL('image/png'), w: icon.width / scale, h: icon.height / scale };
        };
        for (const b of data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) {
            l.text = repairOcrText(l.text);
            for (let i = 0; i < (l.words || []).length; i++) {
                const word = l.words[i];
                const original = word.text || '';
                word.text = repairOcrText(original + ' ' + (l.words[i + 1]?.text || '')).slice(0, original.length);
            }
            const bb = l.bbox;
            if (!bb) continue;
            const y0 = Math.max(0, Math.floor(bb.y0 - 4 * scale));
            const y1 = Math.min(H, Math.ceil(bb.y1 + 4 * scale));
            if (y1 <= y0) continue;
            const pixels = ctx.getImageData(0, y0, W, y1 - y0).data;
            const columns = new Uint16Array(W);
            let colored = 0;
            for (let i = 0; i < pixels.length; i += 4) {
                const hi = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
                const lo = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
                if (hi - lo > 65 && lo < 200) { colored++; columns[(i / 4) % W]++; }
            }
            const text = l.text || '';
            const color = colored >= 12 * scale * scale;
            if (!color) continue;
            let ranges = [];
            for (let x = 0; x < W; x++) if (columns[x] >= scale) {
                const last = ranges[ranges.length - 1];
                if (last && x - last.x1 <= 10 * scale) last.x1 = x;
                else ranges.push({ x0: x, x1: x });
            }
            // A colored heading is not a glyph, but must not disable recovery
            // of a separate emoji elsewhere on the same line.
            ranges = ranges.filter(r => r.x1 - r.x0 <= 48 * scale);
            if (!ranges.length || !l.words?.length) {
                continue;
            }
            const words = l.words.filter(w => w.bbox).slice().sort((a, b) => a.bbox.x0 - b.bbox.x0);
            const parts = [];
            const used = new Set();
            const addText = value => {
                const t = String(value || '').trim();
                if (!t) return;
                const last = parts[parts.length - 1];
                if (last?.type === 'text') last.text += ' ' + t;
                else parts.push({ type: 'text', text: t });
            };
            const addIcon = index => {
                if (used.has(index)) return;
                used.add(index);
                parts.push(iconPart(ranges[index], y0, y1));
            };
            let nextRange = 0;
            for (const word of words) {
                const overlaps = [];
                for (let i = nextRange; i < ranges.length; i++) {
                    const r = ranges[i];
                    if (r.x1 < word.bbox.x0 - 2 * scale) { addIcon(i); nextRange = i + 1; continue; }
                    if (r.x0 > word.bbox.x1 + 2 * scale) break;
                    overlaps.push(i);
                }
                const overlap = overlaps.reduce((n, i) => n + Math.max(0,
                    Math.min(ranges[i].x1, word.bbox.x1) - Math.max(ranges[i].x0, word.bbox.x0)), 0);
                const wordWidth = Math.max(1, word.bbox.x1 - word.bbox.x0);
                const glyphToken = Array.from(String(word.text || '').trim()).length <= 2 && overlap >= wordWidth * 0.35;
                if (/\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F/u.test(word.text || '')) {
                    overlaps.forEach(i => used.add(i));
                    addText(word.text);
                } else if (overlaps.length && glyphNoise(word.text)) overlaps.forEach(addIcon);
                else if (glyphToken && overlaps.length && overlaps.every(i => !used.has(i))) {
                    const candidates = overlaps.map(i => iconPart(ranges[i], y0, y1));
                    overlaps.forEach(i => used.add(i));
                    // Short colored words ("Go", "a", "2") are still words.
                    // Replace letter-like OCR only when the pixels match an emoji.
                    if (candidates.every(part => part.type === 'text')) parts.push(...candidates);
                    else addText(word.text);
                } else {
                    // These pixels belong to selectable text already emitted.
                    // Do not append them again as an unclaimed inline image.
                    overlaps.forEach(i => used.add(i));
                    addText(word.text);
                }
            }
            for (let i = nextRange; i < ranges.length; i++) addIcon(i);
            if (!used.size || !parts.some(part => part.type === 'text')) {
                continue;
            }
            l.rcVisual = {
                type: 'rich', parts, preserved: true, reason: 'color',
                copyText: parts.map(part => part.type === 'icon' ? '[emoji/ký hiệu trong ảnh]' : part.text).join(' '),
            };
        }
        return data;
    }

// Bounded OCR reconstruction for simple ruled tables.
//
// This module deliberately handles only fully ruled rectangular tables.  It
// does not try to infer columns from text alignment: if the grid is not clear,
// callers keep the existing line/image OCR path.  Coordinates are in the
// supplied canvas coordinate system (the active pipeline passes its scaled
// canvases), so the result can be masked before general OCR is assembled.
(function () {
    'use strict';

    const TABLE_MAX_CELLS = 120;
    const TABLE_MAX_AREA = 16 * 1024 * 1024;
    const BORDER_LUMA = 220;
    const MIN_LINE_RUN = 24;

    function imageDataOf(canvas) {
        if (!canvas || !Number.isFinite(canvas.width) || !Number.isFinite(canvas.height)
            || canvas.width < 1 || canvas.height < 1
            || canvas.width * canvas.height > TABLE_MAX_AREA) return null;
        try {
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context || typeof context.getImageData !== 'function') return null;
            return { width: canvas.width, height: canvas.height,
                data: context.getImageData(0, 0, canvas.width, canvas.height).data };
        } catch (_) {
            return null;
        }
    }

    function isInk(pixels, width, x, y) {
        if (x < 0 || y < 0 || x >= width) return false;
        const i = (y * width + x) * 4;
        if ((pixels[i + 3] ?? 255) < 32) return false;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        return 0.299 * r + 0.587 * g + 0.114 * b <= BORDER_LUMA;
    }

    function lineRuns(values, threshold, gap = 1) {
        const out = [];
        let start = -1, last = -1;
        for (let i = 0; i <= values.length; i++) {
            const active = i < values.length && values[i] >= threshold;
            if (active) {
                if (start < 0) start = i;
                last = i;
            } else if (start >= 0 && (i === values.length || i - last > gap)) {
                out.push({ start, end: last });
                start = -1;
            }
        }
        return out;
    }

    function centerRun(run, values) {
        let best = run.start, bestValue = -1;
        for (let i = run.start; i <= run.end; i++) {
            if (values[i] > bestValue) { best = i; bestValue = values[i]; }
        }
        return best;
    }

    function nearInk(pixels, width, x, y) {
        return isInk(pixels, width, x - 1, y) || isInk(pixels, width, x, y)
            || isInk(pixels, width, x + 1, y);
    }

    function sampleHeader(pixels, width, height, xLines, yLines) {
        if (yLines.length < 2) return false;
        const x0 = xLines[0] + 3, x1 = xLines[xLines.length - 1] - 3;
        const y0 = yLines[0] + 3, y1 = yLines[1] - 3;
        if (x1 <= x0 || y1 <= y0) return false;
        let tinted = 0, total = 0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            const i = (y * width + x) * 4;
            const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;
            // Header fills in the supplied capture are pale neutral gray.  Do
            // not count dark text, and do not treat a white body as a header.
            if (luma >= 205 && luma < 249 && Math.max(r, g, b) - Math.min(r, g, b) <= 22) tinted++;
            total++;
        }
        return total > 0 && tinted / total >= 0.2;
    }

    /**
     * Find simple fully ruled table grids in a canvas.
     *
     * The public result includes xLines/yLines for the extractor and tests;
     * callers that persist results should use only the documented bounds and
     * rows/header fields returned by extractOcrTables.
     */
    function detectOcrTableGrids(canvas, suppliedImage) {
        const image = suppliedImage || imageDataOf(canvas);
        if (!image) return [];
        const { width, height, data } = image;
        const colInk = new Uint32Array(width);
        const rowInk = new Uint32Array(height);
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            if (!isInk(data, width, x, y)) continue;
            colInk[x]++;
            rowInk[y]++;
        }

        // Text strokes can be tall in a screenshot, but a ruled table border
        // normally spans a sizeable part of the image.  Keep the threshold
        // permissive and use common-run validation below to reject text.
        const minVerticalInk = Math.max(MIN_LINE_RUN, Math.round(height * 0.14));
        const verticalRuns = lineRuns(colInk, minVerticalInk, 2);
        if (verticalRuns.length < 3) return [];
        const verticals = verticalRuns.map(run => centerRun(run, colInk));

        // A table has at least three vertical rules active over the same long
        // y interval.  This also excludes the rounded two-sided question box.
        const common = new Uint8Array(height);
        for (let y = 0; y < height; y++) {
            let active = 0;
            for (const x of verticals) if (nearInk(data, width, x, y)) active++;
            common[y] = active >= 3 ? 1 : 0;
        }
        const commonRuns = lineRuns(common, 1, 2).filter(run => run.end - run.start + 1 >= MIN_LINE_RUN);
        const grids = [];
        for (const commonRun of commonRuns) {
            const runLength = commonRun.end - commonRun.start + 1;
            const xLines = verticals.filter(x => {
                let count = 0;
                for (let y = commonRun.start; y <= commonRun.end; y++) if (nearInk(data, width, x, y)) count++;
                // A merged cell or a decorative stroke must not be accepted as
                // a column rule.  Every table rule should be present through
                // essentially the whole candidate table height.
                return count >= runLength * 0.9;
            }).sort((a, b) => a - b);
            if (xLines.length < 3) continue;
            const x0 = xLines[0], x1 = xLines[xLines.length - 1];
            if (x1 - x0 < 80) continue;

            // Horizontal rules must span the candidate table, not merely be
            // text in one cell.  The dark threshold intentionally ignores the
            // pale header fill while still accepting anti-aliased gray rules.
            const horizontalScore = new Float64Array(height);
            const span = x1 - x0 + 1;
            // Anti-aliased outer rules can be one or two pixels outside the
            // shared vertical run.  Probe a small margin so the first/last
            // table row is not lost when the line itself is pale.
            const extents = xLines.map(x => {
                let start = commonRun.start, end = commonRun.end;
                while (start > 0 && nearInk(data, width, x, start - 1)) start--;
                while (end + 1 < height && nearInk(data, width, x, end + 1)) end++;
                return { start, end };
            });
            const scanStart = Math.max(0, Math.min(...extents.map(v => v.start)) - 3);
            const scanEnd = Math.min(height - 1, Math.max(...extents.map(v => v.end)) + 3);
            for (let y = scanStart; y <= scanEnd; y++) {
                let count = 0;
                for (let x = x0; x <= x1; x++) if (isInk(data, width, x, y)) count++;
                horizontalScore[y] = count / span;
            }
            const horizontalRuns = lineRuns(horizontalScore, 0.45, 2)
                .filter(run => run.start >= scanStart && run.end <= scanEnd);
            if (horizontalRuns.some(run => {
                let best = 0;
                for (let y = run.start; y <= run.end; y++) best = Math.max(best, horizontalScore[y]);
                return best <= 0.9;
            })) continue;
            const yLines = horizontalRuns.map(run => centerRun(run, horizontalScore));
            if (yLines.length < 3) continue;

            let complete = true;
            for (const x of xLines) for (let i = 0; i < yLines.length - 1 && complete; i++) {
                const start = yLines[i], end = yLines[i + 1];
                let count = 0;
                for (let y = start; y <= end; y++) if (nearInk(data, width, x, y)) count++;
                if (count <= (end - start + 1) * 0.9) complete = false;
            }
            if (!complete) continue;

            // Require usable cell dimensions.  This rejects accidental rules
            // from a card border or a line of decoration.
            const colWidths = xLines.slice(1).map((x, i) => x - xLines[i]);
            const rowHeights = yLines.slice(1).map((y, i) => y - yLines[i]);
            if (colWidths.some(v => v < 20) || rowHeights.some(v => v < 10)) continue;
            const cells = (xLines.length - 1) * (yLines.length - 1);
            if (cells > TABLE_MAX_CELLS) continue;
            const grid = {
                x0, y0: yLines[0], x1, y1: yLines[yLines.length - 1],
                xLines, yLines,
                header: sampleHeader(data, width, height, xLines, yLines),
            };
            // Dedupe only if a line profile happened to create overlapping
            // common runs (normal tables yield one run).
            if (!grids.some(old => Math.abs(old.x0 - grid.x0) <= 2
                && Math.abs(old.y0 - grid.y0) <= 2 && Math.abs(old.x1 - grid.x1) <= 2
                && Math.abs(old.y1 - grid.y1) <= 2)) grids.push(grid);
        }
        return grids;
    }

    function makeCanvas(width, height) {
        if (typeof document !== 'undefined' && document.createElement) {
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            return canvas;
        }
        if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
        return null;
    }

    function cellHasInk(image, x0, y0, x1, y1) {
        const { width, data } = image;
        let count = 0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            if (isInk(data, width, x, y)) {
                count++;
                if (count >= 2) return true;
            }
        }
        return false;
    }

    function cropCell(processed, x0, y0, x1, y1, scale) {
        const width = Math.max(1, x1 - x0), height = Math.max(1, y1 - y0);
        const pad = Math.max(6, Math.round(8 * Math.max(1, Number(scale) || 1)));
        const canvas = makeCanvas(width + pad * 2, height + pad * 2);
        if (!canvas) return null;
        const context = canvas.getContext('2d');
        if (!context) return null;
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(processed, x0, y0, width, height, pad, pad, width, height);
        return canvas;
    }

    function textFromRecognition(value) {
        if (typeof value === 'string') return value;
        if (value && typeof value.text === 'string') return value.text;
        if (value?.data && typeof value.data.text === 'string') return value.data.text;
        return '';
    }

    function cleanCellText(value) {
        return textFromRecognition(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    }

    async function extractGrid(grid, origImage, originalCanvas, recognize, scale, par) {
        const { xLines, yLines } = grid;
        const rows = Array.from({ length: yLines.length - 1 }, () => Array(xLines.length - 1).fill(''));
        const jobs = [];
        for (let row = 0; row < yLines.length - 1; row++) for (let col = 0; col < xLines.length - 1; col++) {
            // Inset removes the rule itself.  Keep coordinates integer and
            // bounded even for very thin cells or malformed detections.
            const inset = Math.max(2, Math.round(2 * Math.max(1, Number(scale) || 1)));
            const x0 = xLines[col] + inset, x1 = xLines[col + 1] - inset;
            const y0 = yLines[row] + inset, y1 = yLines[row + 1] - inset;
            if (x1 <= x0 || y1 <= y0) return null;
            const visible = cellHasInk(origImage, x0, y0, x1, y1);
            if (!visible) continue;
            // Keep the original light-gray header/background.  The shared
            // gamma-8 working canvas is excellent for full-page OCR but can
            // make low-contrast header text unreadable in a small crop.
            const crop = cropCell(originalCanvas, x0, y0, x1, y1, scale);
            if (!crop) return null;
            jobs.push({ row, col, crop });
        }
        if (jobs.length < 2) return null;

        const requested = Number.isFinite(+par) && +par > 0 ? Math.floor(+par) : 1;
        const concurrency = Math.max(1, Math.min(4, requested, jobs.length));
        let next = 0, failed = false;
        const worker = async () => {
            while (true) {
                const index = next++;
                if (index >= jobs.length) return;
                const job = jobs[index];
                try {
                    const value = await recognize(job.crop);
                    const text = cleanCellText(value);
                    if (!text) failed = true;
                    else rows[job.row][job.col] = text;
                } catch (_) {
                    failed = true;
                }
            }
        };
        await Promise.all(Array.from({ length: concurrency }, worker));
        if (failed) return null;
        const useful = rows.reduce((n, row) => n + row.filter(Boolean).length, 0);
        if (useful < 2) return null;
        return { x0: grid.x0, y0: grid.y0, x1: grid.x1, y1: grid.y1,
            rows, header: !!grid.header };
    }

    /**
     * OCR each visible cell of each detected grid.  Any unreadable visible
     * cell rejects the whole table so the caller can safely retain fallback
     * OCR instead of showing a partial reconstruction.
     */
    async function extractOcrTables(orig, processed, recognize, scale, par) {
        if (typeof recognize !== 'function' || !orig || !processed) return [];
        const originalImage = imageDataOf(orig);
        if (!originalImage) return [];
        const grids = detectOcrTableGrids(orig, originalImage);
        const tables = [];
        let remainingCells = TABLE_MAX_CELLS;
        for (const grid of grids) {
            const cellCount = (grid.xLines.length - 1) * (grid.yLines.length - 1);
            if (cellCount > remainingCells) break;
            remainingCells -= cellCount;
            try {
                const table = await extractGrid(grid, originalImage, orig, recognize, scale, par);
                if (table) tables.push(table);
            } catch (_) {
                // Table support is optional; ordinary OCR must continue if a
                // canvas implementation or decoder rejects a crop.
            }
        }
        return tables;
    }

    globalThis.detectOcrTableGrids = detectOcrTableGrids;
    globalThis.extractOcrTables = extractOcrTables;
})();


    const whenBody = fn => (document.body ? fn() : document.addEventListener('DOMContentLoaded', fn, { once: true }));

    // =====================================================================
    // 0. CHẾ ĐỘ "TAB ẢNH" (chạy trên cdn-lab.fpt.edu.vn)
    //    Trang EduNext có CSP chặn WebAssembly + worker → Tesseract không chạy được ở đó.
    //    Tab ảnh của cdn-lab không có CSP → OCR ở đây rồi gửi chữ về qua GM_setValue.
    //    Chỉ hoạt động khi URL có #rc-ocr=<id> (do script ở trang chính mở), xem ảnh bình thường thì không đụng gì.
    // =====================================================================
    // Tách kết quả thành các đoạn: chữ (đã lọc nhiễu) xen kẽ với HÌNH (cắt từ ảnh gốc: hình vẽ, đồ thị, ảnh chụp...).
    // Vùng "hình" = các hàng có mực nhưng không nằm trong dòng chữ nào Tesseract đọc chắc chắn.
    function buildResult(data, orig, scale) {
        const W = orig.width, H = orig.height, T = [performance.now()];
        const lines = [];
        (data.blocks || []).forEach(b => (b.paragraphs || []).forEach((p, pi) => (p.lines || []).forEach(l => {
            let t = (l.text || '').replace(/\s+$/g, '');
            // emoji cuối dòng bị đọc thành ký tự rác ("X€#") → cắt token cuối nếu ngắn và ít chữ-số
            t = t.replace(/\s+(\S{1,4})$/u, (m, k) => ((k.match(/[\p{L}\p{N}]/gu) || []).length / k.length < 0.5 && !/^[.,;:!?)\]"']+$/.test(k) ? '' : m));
            const n = t.replace(/\s/g, '').length;
            const al = (t.match(/[\p{L}\p{N}]/gu) || []).length;
            // Chữ trên hình vẽ (nhãn A, B, O…), icon/emoji bị đọc thành "X€#" → tỉ lệ chữ-số thấp hoặc quá ngắn → không tin
            const clean = n > 0 && al / n >= 0.6 && al >= 3;
            // Dòng CÔNG THỨC (vd. "S_q = (n)/(360)·πR²"): Tesseract hay đọc độ tin cậy thấp vì chỉ số trên/dưới → trước đây bị coi là "hình".
            // Ngắn (1 dòng), có toán tử và ≥3 chữ/số, tin cậy ≥40 → nhận là chữ.
            const hh = l.bbox.y1 - l.bbox.y0;
            const mathy = n >= 4 && al >= 3 && l.confidence >= 40 && hh <= 100 && /[=+·×÷\/^²³√π∑∫]/.test(t);
            const ok = (clean && ((n >= 3 && l.confidence >= 75) || (n >= 6 && l.confidence >= 60))) || mathy;
            lines.push({ t, ok, weak: n < 5, ck: l.ck, pid: (b.bbox ? b.bbox.y0 : 0) + ':' + (p.bbox ? p.bbox.y0 : pi), y0: l.bbox.y0, y1: l.bbox.y1 });
        })));
        // dòng ngắn (<5 ký tự) không dùng để "cắt" hình: chỉ giữ nếu cuối cùng không nằm sát/trong hình nào
        let good = lines.filter(l => l.ok);
        const covered = new Uint8Array(H);
        good.filter(l => !l.weak).forEach(l => { for (let y = Math.max(0, l.y0 - 3); y < Math.min(H, l.y1 + 3); y++) covered[y] = 1; });
        const px = orig.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
        // Tính "có mực" 1 lần duy nhất rồi tra bảng (trước đây mỗi lần duyệt lại tính min/max từng điểm ảnh → chậm, nhất là ở tab nền bị Chrome hạ ưu tiên)
        T.push(performance.now());   // sau getImageData
        let figs;
        if (kernels && px.byteLength <= 64 * 1024 * 1024) {
            const rects = kernels.figures(px, W, H, covered);
            T.push(performance.now()); T.push(performance.now());
            figs = [];
            for (let i = 0; i < rects.length; i += 6) {
                const [cx, cy, cw, ch, y0, y1] = rects.slice(i, i + 6);
                const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
                cv.getContext('2d').drawImage(orig, cx, cy, cw, ch, 0, 0, cw, ch);
                figs.push({type:'img', y0, y1, src:cv.toDataURL('image/webp', 0.9), w:Math.round(cw / scale), h:Math.round(ch / scale)});
            }
        } else {
        const inkMap = new Uint8Array(W * H);
        for (let i = 0, j = 0, n = W * H; j < n; i += 4, j++) {
            const r = px[i], g = px[i + 1], b = px[i + 2];
            const mn = r < g ? (r < b ? r : b) : (g < b ? g : b), mx = r > g ? (r > b ? r : b) : (g > b ? g : b);
            inkMap[j] = (mn < 238 || mx - mn > 20) ? 1 : 0;
        }
        const ink = i => inkMap[i >> 2];
        T.push(performance.now());   // sau bảng mực
        // bỏ các cột là đường viền dọc (khung chiếm gần hết chiều cao)
        const colInk = new Uint32Array(W);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ink((y * W + x) * 4)) colInk[x]++;
        const skipCol = x => colInk[x] > H * 0.6;
        const rowInk = new Uint32Array(H);
        for (let y = 0; y < H; y++) { if (covered[y]) continue; let n = 0; for (let x = 0; x < W; x++) if (!skipCol(x) && ink((y * W + x) * 4)) n++; rowInk[y] = n; }
        const regions = []; let cur = null;
        for (let y = 0; y < H; y++) {
            if (rowInk[y] > 0) {
                if (cur && y - cur.y1 <= 10) cur.y1 = y; else { cur = { y0: y, y1: y, n: 0 }; regions.push(cur); }
                cur.n += rowInk[y];
            }
        }
        T.push(performance.now());   // sau tìm vùng
        figs = [];
        regions.forEach(rg => {
            if (rg.y1 - rg.y0 + 1 < 36 || rg.n < 250) return;
            let x0 = W, x1 = -1;
            for (let y = rg.y0; y <= rg.y1; y++) for (let x = 0; x < W; x++) if (!skipCol(x) && ink((y * W + x) * 4)) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
            if (x1 - x0 < 24) return;
            // Loại "hình giả": viền khung / đường kẻ (vd. cạnh dưới + góc bo tròn của khung "Câu hỏi") chỉ gồm đường dài + chút góc.
            // Bỏ các hàng/cột là đường thẳng dài rồi đếm mực còn lại; hình thật (đồ thị, hình vẽ, ảnh chụp) còn rất nhiều mực.
            {
                const bw = x1 - x0 + 1, bh = rg.y1 - rg.y0 + 1;
                const rc = new Uint32Array(bh), cc = new Uint32Array(bw);
                for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (ink(((rg.y0 + y) * W + x0 + x) * 4)) { rc[y]++; cc[x]++; }
                let rem = 0;
                for (let y = 0; y < bh; y++) { if (rc[y] > bw * 0.5) continue; for (let x = 0; x < bw; x++) if (cc[x] <= bh * 0.6 && ink(((rg.y0 + y) * W + x0 + x) * 4)) rem++; }
                if (rem < 500) return;
            }
            const pad = 6, cx = Math.max(0, x0 - pad), cy = Math.max(0, rg.y0 - pad);
            const cw = Math.min(W, x1 + pad + 1) - cx, ch = Math.min(H, rg.y1 + pad + 1) - cy;
            const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
            cv.getContext('2d').drawImage(orig, cx, cy, cw, ch, 0, 0, cw, ch);
            figs.push({ type: 'img', y0: rg.y0, y1: rg.y1, src: cv.toDataURL('image/webp', 0.9), w: Math.round(cw / scale), h: Math.round(ch / scale) });
        });
        }
        good = good.filter(l => !l.weak || !figs.some(f => l.y1 >= f.y0 - 10 && l.y0 <= f.y1 + 10));
        const items = good.map(l => ({ type: 'line', y0: l.y0, y1: l.y1, t: l.t, pid: l.pid, ck: l.ck })).concat(figs, data.rcTables || []).sort((a, b) => a.y0 - b.y0);
        const segs = []; let buf = '', lastPid = null, prev = null;
        const flush = () => { if (buf.trim()) segs.push({ type: 'text', text: buf.trim() }); buf = ''; lastPid = null; prev = null; };
        items.forEach(it => {
            if (it.rows) {
                flush();
                segs.push({type:'table', rows:it.rows, header:it.header,
                    text:it.rows.map(row => row.map(cell => cell.replace(/\s+/g, ' ').trim()).join('\t')).join('\n')});
                return;
            }
            if (it.type === 'img') { flush(); segs.push({ type: 'img', src: it.src, w: it.w, h: it.h }); return; }
            // đoạn mới: cùng cụm quét → theo đoạn của Tesseract; khác cụm (ranh giới vùng chữ) → theo khoảng cách dọc giữa 2 dòng
            let newPara = it.pid !== lastPid;
            if (prev && it.ck !== undefined && prev.ck !== undefined && it.ck !== prev.ck) newPara = (it.y0 - prev.y1) > 0.8 * Math.max(8, prev.y1 - prev.y0);
            buf += (buf ? (newPara ? '\n\n' : '\n') : '') + it.t; lastPid = it.pid; prev = it;
        });
        flush();
        const text = segs.filter(g => g.type === 'text').map(g => g.text).join('\n\n');
        const tableText = segs.filter(g => g.type === 'text' || g.type === 'table' || g.preserved).map(g => g.preserved ? g.copyText : g.text).join('\n\n');
        T.push(performance.now());
        return { text: segs.some(g => g.type === 'table') ? tableText : text, segments: segs, t: { lay: Math.round(T[1] - T[0]), bang: Math.round(T[2] - T[1]), vung: Math.round(T[3] - T[2]), hinh: Math.round(T[4] - T[3]), hinhs: figs.length } };
    }
    // Quét theo VÙNG CHỮ: tìm các dải chữ (cụm hàng có mực, cách nhau bởi hàng trống), gom thành ~2×k cụm cân nhau,
    // cắt riêng từng cụm (cả chiều ngang theo phần có mực) rồi để scheduler giao cho worker rảnh. Toạ độ y cộng bù lại khi ghép.
    async function recognizeStrips(c, x, recognize, k) {
        const W = c.width, H = c.height;
        if (k < 2 || H < 200) return recognize(c);
        const px = x.getImageData(0, 0, W, H).data;
        const THR = 200; let chunks;
        if (kernels && px.byteLength <= 64 * 1024 * 1024) {
            const boxes=kernels.strips(px,W,H,k); chunks=[];
            for(let i=0;i<boxes.length;i+=4) chunks.push({x0:boxes[i],y0:boxes[i+1],x1:boxes[i+2],y1:boxes[i+3]});
            if(chunks.length<2) return recognize(c);
        } else {
        const THR = 200;
        // dải chữ: hàng có mực (đếm cách 2 điểm; >3 để bỏ qua viền dọc của khung)
        const rows = new Uint8Array(H);
        for (let y = 0; y < H; y++) { let n = 0; for (let xx = 0, o = y * W * 4; xx < W; xx += 2, o += 8) if (px[o] < THR) n++; rows[y] = n > 3 ? 1 : 0; }
        const GAP = 7;   // hàng trống tối thiểu để coi là 2 dải khác nhau
        const bands = [];
        for (let y = 0, st = -1, last = -1; y <= H; y++) {
            if (y < H && rows[y]) { if (st < 0) st = y; last = y; }
            else if (st >= 0 && (y === H || y - last > GAP)) { bands.push({ y0: st, y1: last }); st = -1; }
        }
        const real = bands.filter(b => b.y1 - b.y0 >= 6);
        if (real.length < 2) return recognize(c);
        // gom các dải liên tiếp thành cụm có tổng chiều cao gần bằng nhau (số cụm ≈ 2×luồng để worker nhanh nhận việc tiếp)
        const total = real.reduce((a, b) => a + (b.y1 - b.y0 + 1), 0);
        const nChunks = Math.max(2, Math.min(real.length, k * 2));
        const target = total / nChunks;
        chunks = []; let cur = null, acc = 0;
        real.forEach(b => {
            if (!cur) { cur = { y0: b.y0, y1: b.y1 }; acc = 0; } else cur.y1 = b.y1;
            acc += b.y1 - b.y0 + 1;
            if (acc >= target && chunks.length < nChunks - 1) { chunks.push(cur); cur = null; }
        });
        if (cur) chunks.push(cur);
        if (chunks.length < 2) return recognize(c);
        }
        const M = 14;   // lề trắng quanh mỗi vùng — Tesseract đọc tốt hơn khi chữ không sát mép
        const parts = await Promise.all(chunks.map((ch, ci) => {
            let x0 = ch.x0 ?? W, x1 = ch.x1 ?? -1;
            if (ch.x0 === undefined) {
            for (let y = ch.y0; y <= ch.y1; y++) for (let xx = 0, o = y * W * 4; xx < W; xx++, o += 4) if (px[o] < THR) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; }
            if (x1 < 0) { x0 = 0; x1 = W - 1; }
            x0 = Math.max(0, x0 - 4); x1 = Math.min(W - 1, x1 + 4);
            }
            const cw = x1 - x0 + 1, chh = ch.y1 - ch.y0 + 1;
            const sc = document.createElement('canvas'); sc.width = cw + 2 * M; sc.height = chh + 2 * M;
            const sx = sc.getContext('2d'); sx.fillStyle = '#fff'; sx.fillRect(0, 0, sc.width, sc.height);
            sx.drawImage(c, x0, ch.y0, cw, chh, M, M, cw, chh);
            const ts = performance.now();
            return recognize(sc).then(d => ({ d, off: ch.y0 - M, ci, ms: Math.round(performance.now() - ts) }));
        }));
        const blocks = [];
        parts.forEach(({ d, off, ci }) => (d.blocks || []).forEach(b => {
            const sh = bb => (bb ? Object.assign({}, bb, { y0: bb.y0 + off, y1: bb.y1 + off }) : bb);
            blocks.push(Object.assign({}, b, { bbox: sh(b.bbox), paragraphs: (b.paragraphs || []).map(p => Object.assign({}, p, { bbox: sh(p.bbox), lines: (p.lines || []).map(l => Object.assign({}, l, { bbox: sh(l.bbox), ck: ci })) })) }));
        }));
        return { blocks, text: parts.map(p => p.d.text || '').join('\n'), strips: parts.length, stripMs: parts.map(p => p.ms) };
    }
    // Tiền xử lý ảnh + nhận dạng + tách chữ/hình. `recognize(canvas)` trả về data của Tesseract (blocks + text).
    // Dùng chung cho tab đơn (mỗi ảnh 1 tab) và tab "hub" (1 tab chạy sẵn, nhiều luồng).
    async function ocrPipeline(im, recognize, par) {
        const nw = im.naturalWidth || im.width, nh = im.naturalHeight || im.height;
        const scale = nw < 1400 ? 2 : 1;
        const orig = document.createElement('canvas');
        orig.width = nw * scale; orig.height = nh * scale;
        const ox = orig.getContext('2d', { willReadFrequently: true });
        ox.fillStyle = '#fff'; ox.fillRect(0, 0, orig.width, orig.height);   // webp trong suốt → nền trắng
        ox.imageSmoothingQuality = 'high';
        ox.drawImage(im, 0, 0, orig.width, orig.height);
        const c = document.createElement('canvas');
        c.width = orig.width; c.height = orig.height;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(orig, 0, 0);
        // Chữ xám rất nhạt (vd. nhãn "Câu hỏi:" trong khung viền, ~#e5e7eb) bị Tesseract coi là nền → mất chữ.
        // Gamma 8 kéo xám nhạt về tối nhưng vẫn giữ nét mảnh/dấu tiếng Việt
        // (ngưỡng cứng 240 thì dấu bị mất: "tính"→"tinh", "trả"→"tra").
        // Đã thử 9 cấu hình trên ảnh thật: gamma 8 + PSM tự động cho lỗi thấp nhất (0.4%, thiếu mỗi emoji).
        const id = x.getImageData(0, 0, c.width, c.height), px = id.data;
        if (kernels && px.byteLength <= 64 * 1024 * 1024) kernels.preprocess(px);
        else {
        const lut = new Uint8ClampedArray(256);
        for (let v = 0; v < 256; v++) lut[v] = Math.round(255 * Math.pow(v / 255, 8));
        for (let i = 0; i < px.length; i += 4) {
            px[i] = px[i + 1] = px[i + 2] = lut[Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2])];
        }
        }
        x.putImageData(id, 0, 0);
        const t1 = performance.now();
        const tables = await extractOcrTables(orig, c, recognize, scale, par || 1);
        // Accepted cells are read separately. Remove their pixels from both
        // working canvases so general OCR cannot duplicate or rasterize them.
        for (const table of tables) {
            for (const context of [x, ox]) {
                context.fillStyle = '#fff';
                context.fillRect(table.x0 - 2 * scale, table.y0 - 2 * scale,
                    table.x1 - table.x0 + 4 * scale, table.y1 - table.y0 + 4 * scale);
            }
        }
        const data = await recognizeStrips(c, x, recognize, par || 1);
        data.rcTables = tables;
        const t2 = performance.now();
        protectGlyphs(data, orig, scale);
        const res = buildResult(data, orig, scale);
        res.ms = { ocr: Math.round(t2 - t1), post: Math.round(performance.now() - t2), strips: data.strips || 1, stripMs: data.stripMs || [] };
        res.ms.t = res.t;
        return res;
    }

    // --- Tab đơn (dự phòng): #rc-ocr=<id>&l=vie+eng — mở 1 tab cho mỗi ảnh ---
    function runImageTab() {
        const m = /[#&]rc-ocr=([\w-]+)/.exec(location.hash);
        if (!m) return;
        const lm = /[#&]l=([a-z+]+)/.exec(location.hash);
        const langs = lm ? lm[1] : 'vie+eng';
        const key = 'rc_ocr_' + m[1];
        let reported = false;
        const report = o => {
            if (reported) return;
            reported = true;
            GM_setValue(key, JSON.stringify(o));
            setTimeout(() => { try { RC.closeSelf(); } catch (e) {} }, 400);
        };
        const waitImg = () => new Promise((res, rej) => {
            const t0 = Date.now();
            (function poll() {
                const im = document.images && document.images[0];
                if (im && im.complete && im.naturalWidth) return res(im);
                if (Date.now() - t0 > 30000) return rej(new Error('Ảnh không tải được trong tab OCR'));
                setTimeout(poll, 150);
            })();
        });
        (async () => {
            try {
                const im = new Image();
                im.src = new URLSearchParams(location.hash.slice(1)).get('src');
                await im.decode();
                const w = await Tesseract.createWorker(langs, 1, RC.workerOptions);
                const res = await ocrPipeline(im, async c => (await w.recognize(c, {}, { blocks: true, text: true })).data);
                try { await w.terminate(); } catch (e) {}
                report(res);
            } catch (e) {
                report({ error: String((e && e.message) || e) });
            }
        })();
    }

    // --- Tab HUB: 1 tab nền chạy sẵn, nhận việc qua GM storage, OCR nhiều ảnh song song bằng nhiều worker ---
    // Tránh việc mỗi ảnh phải mở tab mới + nạp lại WASM/ngôn ngữ. Tự đóng sau một thời gian không có việc.
    function runHubTab() {
        const myId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        GM_setValue('rc_ocr_hub_ver', HUB_VER);
        GM_setValue('rc_ocr_hub_owner', myId);   // hub mới thay hub cũ: hub cũ thấy owner khác sẽ tự đóng
        const setTitle = () => { try { document.title = '🔎 RC OCR — tab nền, cứ để yên'; } catch (e) {} };
        setTitle(); document.addEventListener('DOMContentLoaded', setTitle, { once: true });
        const processed = new Set();
        const startTs = Date.now() - 500;
        let sched = null, curLangs = '', workers = 0, recogActive = 0, lastJob = Date.now(), idleMs = 10 * 60000, maxW = 0;
        const hc = Math.max(1, (navigator.hardwareConcurrency || 4));
        const autoW = Math.max(1, Math.min(8, hc - 1));
        const closeSelf = () => { try { RC.closeSelf(); } catch (e) {} };
        const info = () => GM_setValue('rc_ocr_hub_info', workers + ' luồng · ' + (curLangs || '—'));
        const beat = () => {
            if (GM_getValue('rc_ocr_hub_owner') !== myId) { closeSelf(); return; }
            GM_setValue('rc_ocr_hub', Date.now()); info();
            if (recogActive === 0 && idleMs > 0 && Date.now() - lastJob > idleMs) closeSelf();
        };
        beat(); setInterval(beat, 5000);

        let poolLock = Promise.resolve();
        const ensurePool = (langs, want) => {
            const run = async () => {
                if (sched && curLangs !== langs) {          // đổi ngôn ngữ → dựng lại hồ worker (chờ việc đang chạy xong)
                    while (recogActive > 0) await new Promise(r => setTimeout(r, 100));
                    const old = sched; sched = null; workers = 0;
                    try { await old.terminate(); } catch (e) {}
                }
                if (!sched) { sched = Tesseract.createScheduler(); curLangs = langs; workers = 0; }
                const need = Math.max(1, maxW || autoW);   // luôn dựng đủ hồ worker: 1 ảnh cũng được chia dải để quét song song
                const adds = [];
                while (workers < need) {
                    workers++;
                    const sc = sched;
                    adds.push(Tesseract.createWorker(langs, 1, RC.workerOptions).then(w => sc.addWorker(w)).catch(e => { workers = Math.max(0, workers - 1); log('⚠ tạo worker lỗi:', e); }));
                }
                info();
                if (adds.length) await Promise.all(adds);
                if (!workers) throw new Error('Không khởi tạo được OCR worker');   // chờ đủ worker rồi mới chia dải
            };
            poolLock = poolLock.then(run, run);
            return poolLock;
        };
        const loadBitmap = async url => {
            try {
                const r = await fetch(url, { credentials: 'omit' });
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return await createImageBitmap(await r.blob());
            } catch (e1) {
                const blob = await new Promise((res, rej) => GM_xmlhttpRequest({
                    method: 'GET', url, responseType: 'blob',
                    onload: r => (r.status >= 200 && r.status < 300 ? res(r.response) : rej(new Error('HTTP ' + r.status))),
                    onerror: () => rej(new Error('Không tải được ảnh trong tab OCR')),
                }));
                return await createImageBitmap(blob);
            }
        };
        const handle = async job => {
            const key = 'rc_ocr_' + job.id, t0 = performance.now();
            GM_setValue(key, JSON.stringify({ ack: true }));
            lastJob = Date.now(); GM_setValue('rc_ocr_hub', lastJob);
            if (job.idle !== undefined) idleMs = job.idle * 60000;
            if (job.threads) maxW = job.threads;
            try {
                const bmp = await loadBitmap(job.url);
                const tLoad = performance.now() - t0;
                const langs = job.langs || 'vie+eng';
                await ensurePool(langs, job.n);
                const tPool = performance.now() - t0 - tLoad;
                recogActive++;
                let res;
                try {
                    res = await Promise.race([
                        ocrPipeline(bmp, async c => (await sched.addJob('recognize', c, {}, { blocks: true, text: true })).data, workers),
                        new Promise((_, rej) => setTimeout(() => rej(new Error('OCR quá lâu (>120s)')), 120000)),
                    ]);
                } finally { recogActive--; lastJob = Date.now(); try { bmp.close(); } catch (e) {} }
                res.ms = Object.assign({ load: Math.round(tLoad), pool: Math.round(tPool), total: Math.round(performance.now() - t0), workers }, res.ms);
                GM_setValue(key, JSON.stringify(res));
            } catch (e) {
                GM_setValue(key, JSON.stringify({ error: String((e && e.message) || e) }));
            }
        };
        const consume = raw => {
            let list = [];
            try { list = typeof raw === 'string' ? JSON.parse(raw) : (raw || []); } catch (e) {}
            (Array.isArray(list) ? list : []).forEach(j => {
                if (!j || !j.id || processed.has(j.id) || Date.now() - j.ts > 5 * 60000) return;
                processed.add(j.id);
                if (j.cmd === 'quit') { if (j.ts >= startTs) closeSelf(); return; }   // lệnh đóng cũ (gửi cho hub trước) không được làm hub mới tự đóng
                handle(j);
            });
        };
        GM_addValueChangeListener('rc_ocr_inbox', (n, o, v) => consume(v));
        consume(GM_getValue('rc_ocr_inbox', '[]'));   // việc được gửi trước khi hub kịp lắng nghe
    }
    if (location.protocol === 'chrome-extension:') {
        if (/[#&]rc-hub\b/.test(location.hash)) runHubTab(); else runImageTab();
        return;
    }


})();
