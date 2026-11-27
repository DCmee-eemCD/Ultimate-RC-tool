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
