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
            for (const text of ['💡', '🔥', '💪', '👍', '👎', '👏', '🙏', '👉', '👇', '✅', '❌', '❗', '❓', '⚠️', '⭐', '✨', '🎉', '🎯', '📌', '📚', '📝', '😊', '😀', '😂', '🤔', '❤️', '💯', '🚀']) {
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
