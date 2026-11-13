globalThis.RCOcrReady = (async function () {
    await RC.ready;
    const kernels = await RCWasm.ready;
    RC.pixelBackend = kernels ? "rust" : "javascript";
    'use strict';

    const HUB_VER = '5.15-rust';   // tab hub chạy sẵn KHÔNG tự nạp lại script → khác phiên bản thì phải đóng rồi mở hub mới
    const log = (...a) => console.log('%c[RC]', 'color:#f59e0b', ...a);
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

            const n = t.replace(/\s/g, '').length;
            const al = (t.match(/[\p{L}\p{N}]/gu) || []).length;
            // Chữ trên hình vẽ (nhãn A, B, O…), icon/emoji bị đọc thành "X€#" → tỉ lệ chữ-số thấp hoặc quá ngắn → không tin
            const clean = n > 0 && al / n >= 0.6 && al >= 3;
            // Dòng CÔNG THỨC (vd. "S_q = (n)/(360)·πR²"): Tesseract hay đọc độ tin cậy thấp vì chỉ số trên/dưới → trước đây bị coi là "hình".
            // Ngắn (1 dòng), có toán tử và ≥3 chữ/số, tin cậy ≥40 → nhận là chữ.
            const hh = l.bbox.y1 - l.bbox.y0;
            const mathy = n >= 4 && al >= 3 && l.confidence >= 40 && hh <= 100 && /[=+·×÷\/^²³√π∑∫]/.test(t);
            const ok = (al >= 3 && hh <= 100 && l.confidence >= 35 && /^\s*[a-zA-Z0-9][).]/.test(t)) || (clean && n >= 8 && l.confidence >= 45 && hh <= 100) || (clean && ((n >= 3 && l.confidence >= 75) || (n >= 6 && l.confidence >= 60))) || mathy;
            lines.push({ visual:l.rcVisual, t, ok:ok || !!l.rcVisual, weak: n < 5, ck: l.ck, pid: (b.bbox ? b.bbox.y0 : 0) + ':' + (p.bbox ? p.bbox.y0 : pi), y0: l.bbox.y0, y1: l.bbox.y1 });
        })));
        // dòng ngắn (<5 ký tự) không dùng để "cắt" hình: chỉ giữ nếu cuối cùng không nằm sát/trong hình nào
        let good = lines.filter(l => l.ok);
        const covered = new Uint8Array(H);
        good.filter(l => !l.weak || l.visual).forEach(l => { for (let y = Math.max(0, l.y0 - 3); y < Math.min(H, l.y1 + 3); y++) covered[y] = 1; });
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
        good = good.filter(l => l.visual || !l.weak || !figs.some(f => l.y1 >= f.y0 - 10 && l.y0 <= f.y1 + 10));
        const items = good.map(l => ({ visual:l.visual, type: 'line', y0: l.y0, y1: l.y1, t: l.t, pid: l.pid, ck: l.ck })).concat(figs).sort((a, b) => a.y0 - b.y0);
        const segs = []; let buf = '', lastPid = null, prev = null;
        const flush = () => { if (buf.trim()) segs.push({ type: 'text', text: buf.trim() }); buf = ''; lastPid = null; prev = null; };
        items.forEach(it => {
            if(it.visual) { flush(); segs.push(it.visual); return; }
            if (it.type === 'img') { flush(); segs.push({ type: 'img', src: it.src, w: it.w, h: it.h }); return; }
            // đoạn mới: cùng cụm quét → theo đoạn của Tesseract; khác cụm (ranh giới vùng chữ) → theo khoảng cách dọc giữa 2 dòng
            let newPara = it.pid !== lastPid;
            if (prev && it.ck !== undefined && prev.ck !== undefined && it.ck !== prev.ck) newPara = (it.y0 - prev.y1) > 0.8 * Math.max(8, prev.y1 - prev.y0);
            buf += (buf ? (newPara ? '\n\n' : '\n') : '') + it.t; lastPid = it.pid; prev = it;
        });
        flush();
        const text = segs.filter(g => g.type === 'text' || g.preserved).map(g => g.preserved ? g.copyText : g.text).join('\n\n');
        T.push(performance.now());
        return { text, segments: segs, t: { lay: Math.round(T[1] - T[0]), bang: Math.round(T[2] - T[1]), vung: Math.round(T[3] - T[2]), hinh: Math.round(T[4] - T[3]), hinhs: figs.length } };
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
            return recognize(sc).then(d => ({ d, off: ch.y0 - M, offX:x0 - M, ci, ms: Math.round(performance.now() - ts) }));
        }));
        const blocks = [];
        parts.forEach(({ d, off, offX, ci }) => (d.blocks || []).forEach(b => {
            const sh = bb => (bb ? Object.assign({}, bb, { x0:bb.x0 + offX, x1:bb.x1 + offX, y0: bb.y0 + off, y1: bb.y1 + off }) : bb);
            blocks.push(Object.assign({}, b, { bbox: sh(b.bbox), paragraphs: (b.paragraphs || []).map(p => Object.assign({}, p, { bbox: sh(p.bbox), lines: (p.lines || []).map(l => Object.assign({}, l, { bbox: sh(l.bbox), words:(l.words || []).map(w=>({...w,bbox:sh(w.bbox),symbols:(w.symbols || []).map(s=>({...s,bbox:sh(s.bbox)}))})), ck: ci })) })) }));
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
        const data = await recognizeStrips(c, x, recognize, par || 1);
        const t2 = performance.now();
        const res = buildResult(data, orig, scale);
        res.ms = { ocr: Math.round(t2 - t1), post: Math.round(performance.now() - t2), strips: data.strips || 1, stripMs: data.stripMs || [] };
        res.ms.t = res.t;
        return res;
    }

    // --- Tab đơn (dự phòng): #rc-ocr=<id>&l=vie+eng — mở 1 tab cho mỗi ảnh ---

return {ocrPipeline, backend: RC.pixelBackend};
})();
