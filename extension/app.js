(async function () {
    'use strict';
    const HUB_VER = '2.0.0';
    const log = (...a) => console.log('%c[RC]', 'color:#f59e0b', ...a);
    const whenBody = fn => (document.body ? fn() : document.addEventListener('DOMContentLoaded', fn, { once: true }));
    // =====================================================================
    // 1. CHỐNG ANTI-COPY / ANTI-PASTE
    //    Phải chạy ở document-start để listener của mình đứng TRƯỚC listener của trang.
    // =====================================================================
    // Mỗi nhóm có công tắc riêng trong bảng cài đặt (antiPaste / antiCopy); đọc cfg lúc sự kiện xảy ra nên bật/tắt có hiệu lực ngay.
    ['copy', 'cut', 'paste', 'contextmenu', 'selectstart', 'dragstart'].forEach(ev => {
        const key = ev === 'paste' ? 'antiPaste' : 'antiCopy';
        const stop = e => { if (cfg[key] !== false && !e.composedPath().some(n => n && n.id === 'rc-kit')) e.stopImmediatePropagation(); };
        window.addEventListener(ev, stop, true);
        document.addEventListener(ev, stop, true);
    });

    // =====================================================================
    // 2. CẤU HÌNH + THEME
    // =====================================================================
    const DEFAULTS = {
        dashboardBg: '#1e293b', imageThemeMode: 'dark',
        primary: '#2563eb', userBubble: '#dbeafe', botBubble: '#ffffff',
        chatBg: '#f8fafc',   // viền/khung ngoài của popup chat
        msgBg: '#ffffff',    // vùng tin nhắn bên trong
        panelBg: '#ffffff',  // sidebar bài học, header, ô nhập, thẻ khoá học
        pageBg: '#ffffff',   // nền sau lưng (lớp phủ chat + nền trang web)
        siteWide: true,      // đổi màu cả trang web ngoài khung chat
        replaceBubble: true, // thay ảnh câu trả lời của bot bằng chữ ngay trong bong bóng
        autoCopy: true,      // quét xong tự copy chữ vào clipboard
        fontSize: 15, fontFamily: '', bgImage: '', bgBlur: 0,
        enterSend: true, exerciseIntent: 'active', wip: false, uiTab: 'theme', autoTheme: true, autoFor: '', latexSource: true, glass: false, glassBlur: 14, glassAlpha: 55,
        antiPaste: true, antiCopy: true, qBox: true, ocrVie: true, ocrEng: true, ocrThreads: 0, ocrHub: true, hubIdle: 10,
    };
    let cfg = Object.assign({}, DEFAULTS);
    await RC.ready;
    Object.assign(cfg, GM_getValue('chatKit', {}));
    const save = () => GM_setValue('chatKit', cfg);

    function textColorFor(bg) {
        const m = /^#([0-9a-f]{6})$/i.exec(bg || '');
        if (!m) return '';
        const n = parseInt(m[1], 16);
        const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
        return lum < 140 ? '#ffffff' : '#1f2937';
    }
    const hexToRgb = h => {
        const m = /^#([0-9a-f]{6})$/i.exec(h || '');
        if (!m) return null;
        const n = parseInt(m[1], 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    // trộn 2 màu hex (t = 0 → a, t = 1 → b); tự tính bằng JS để không phụ thuộc color-mix()
    const mix = (a, b, t) => {
        const A = hexToRgb(a), B = hexToRgb(b);
        if (!A || !B) return a;
        return '#' + A.map((v, i) => Math.round(v * (1 - t) + B[i] * t).toString(16).padStart(2, '0')).join('');
    };

    // ---------- Tự phối màu theme theo ảnh nền ----------
    // Thu ảnh về 48x48, gom màu theo ô 4 bit/kênh → màu chủ đạo (nhiều nhất) + màu nhấn (nhiều × đậm nhất);
    // ảnh sáng → theme sáng, ảnh tối → theme tối. Chữ trong bong bóng tự chọn trắng/đen theo textColorFor.
    function rgb2hsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
        let h = 0, s = 0;
        if (d) {
            s = d / (1 - Math.abs(2 * l - 1));
            h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
            h *= 60;
        }
        return [h, s, l];
    }
    function hsl2hex(h, s, l) {
        h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
        const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
        const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
        return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
    }
    function paletteFromPixels(px) {
        const bins = new Map(); let lumSum = 0, n = 0;
        for (let i = 0; i < px.length; i += 4) {
            if (px[i + 3] < 128) continue;
            const r = px[i], g = px[i + 1], b = px[i + 2];
            lumSum += 0.299 * r + 0.587 * g + 0.114 * b; n++;
            const key = (r >> 4) << 8 | (g >> 4) << 4 | (b >> 4);
            const e = bins.get(key) || { c: 0, r: 0, g: 0, b: 0 };
            e.c++; e.r += r; e.g += g; e.b += b; bins.set(key, e);
        }
        if (!n) return null;
        let dom = null, acc = null, domC = -1, accScore = -1;
        bins.forEach(e => {
            const [h, s, l] = rgb2hsl(e.r / e.c, e.g / e.c, e.b / e.c);
            e.h = h; e.s = s; e.l = l;
            if (e.c > domC) { domC = e.c; dom = e; }
            const sc = e.c * s * (1 - Math.abs(2 * l - 1) * 0.8);   // nhiều + đậm màu + không quá sáng/tối
            if (s > 0.15 && sc > accScore) { accScore = sc; acc = e; }
        });
        const light = lumSum / n / 255 > 0.5;
        const base = dom, ac = acc || dom;
        const H = base.h, S = Math.min(0.75, Math.max(0.25, base.s));
        const pH = ac.h, pS = Math.min(0.85, Math.max(0.5, ac.s));
        if (light) return {
            primary: hsl2hex(pH, pS, 0.45), userBubble: hsl2hex(pH, pS * 0.8, 0.88), botBubble: hsl2hex(H, S * 0.35, 0.98),
            msgBg: hsl2hex(H, S * 0.5, 0.94), chatBg: hsl2hex(H, S * 0.7, 0.32), panelBg: hsl2hex(H, S * 0.55, 0.86), pageBg: hsl2hex(H, S * 0.6, 0.78),
        };
        return {
            primary: hsl2hex(pH, pS, 0.62), userBubble: hsl2hex(pH, pS * 0.6, 0.28), botBubble: hsl2hex(H, S * 0.5, 0.19),
            msgBg: hsl2hex(H, S * 0.5, 0.13), chatBg: hsl2hex(H, S * 0.55, 0.38), panelBg: hsl2hex(H, S * 0.5, 0.16), pageBg: hsl2hex(H, S * 0.55, 0.09),
        };
    }
    let syncInputs = null;
    function autoThemeFrom(src, force) {
        const requestedMode = cfg.imageThemeMode;
        const key = requestedMode + ':' + String(src.length) + ':' + src.slice(-40);
        if (!force && cfg.autoFor === key) return;
        const im = new Image();
        const requestedBg = cfg.bgImage;
        im.onload = async () => {
            try {
                const c = document.createElement('canvas'); c.width = c.height = 48;
                const x = c.getContext('2d', { willReadFrequently: true });
                x.drawImage(im, 0, 0, 48, 48);
                const pixels=x.getImageData(0, 0, 48, 48).data;
                let pal;
                try { pal=await RC.palette(pixels); }
                catch(e) { RC.paletteBackend='javascript'; pal=paletteFromPixels(pixels); }
                if (cfg.bgImage !== requestedBg || cfg.imageThemeMode !== requestedMode) return;
                if (!pal) return;
                pal = imagePaletteMode(pal, requestedMode); Object.assign(cfg, pal, {dashboardBg: pal.panelBg}); cfg.autoFor = key; save(); applyTheme();
                if (syncInputs) syncInputs();
                toast('🪄 Đã phối màu theme theo ảnh nền');
            } catch (e) { log('⚠ phối màu lỗi:', e); }
        };
        im.onerror = () => toast('❌ Không đọc được ảnh nền để lấy màu');
        im.src = src;
    }

    // CSP của EduNext chặn ảnh/video từ web ngoài, nhưng cho data:/blob: → tải bằng GM_xmlhttpRequest rồi đổi thành data URL (ảnh) / blob URL (video).
    // Hỗ trợ: ảnh tĩnh, GIF, WebP (động cũng chạy), và video MP4 / WebM. Video: lấy 1 khung hình làm "poster" (dùng cho phối màu, kiểu kính mờ
    // và làm nền dự phòng); thẻ <video> thật (tắt tiếng, lặp) được gắn thêm ở ensureBgVideo().
    const bgCache = {}, bgVid = {};
    const VID_KEY = 'chatKitBgVid', VID_LOCAL = 'rc-vid:local', VID_MAX = 14 * 1024 * 1024;
    const isVideoRef = u => u === VID_LOCAL || /^data:video\//i.test(u) || /\.(mp4|m4v|webm|ogv|mov)(\?|#|$)/i.test(u);
    const dataUrlToBlob = d => {
        const m = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(d); if (!m) throw new Error('data URL không hợp lệ');
        const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]), a = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
        return new Blob([a], { type: m[1] || 'application/octet-stream' });
    };
    function posterOf(blob, done) {
        const url = URL.createObjectURL(blob), v = document.createElement('video');
        v.muted = true; v.preload = 'auto'; v.playsInline = true;
        let fin = false;
        const out = r => { if (fin) return; fin = true; done(r, url); };
        v.onloadeddata = () => { try { v.currentTime = Math.min(0.1, (v.duration || 1) / 2); } catch (e) { grab(); } };
        v.onseeked = grab;
        function grab() {
            try {
                const w = Math.min(960, v.videoWidth || 960), h = Math.round(w * (v.videoHeight || 540) / (v.videoWidth || 960));
                const c = document.createElement('canvas'); c.width = w; c.height = h;
                c.getContext('2d').drawImage(v, 0, 0, w, h);
                out(c.toDataURL('image/jpeg', 0.85));
            } catch (e) { out(''); }
        }
        v.onerror = () => out('');
        setTimeout(() => out(''), 20000);
        v.src = url;
    }
    function bgSrc(u) {
        if (!u) return '';
        if (u === VID_LOCAL) {
            if (bgCache[u] === undefined) {
                bgCache[u] = null;
                try {
                    const d = GM_getValue(VID_KEY, '');
                    if (!d) { bgCache[u] = ''; return ''; }
                    posterOf(dataUrlToBlob(d), (po, url) => { bgCache[u] = po; bgVid[u] = url; applyTheme(); });
                } catch (e) { bgCache[u] = ''; log('⚠ video nền:', e); }
            }
            return bgCache[u] || '';
        }
        if (/^data:video\//i.test(u)) return '';
        if (/^(data|blob):/i.test(u)) return u;
        if (bgCache[u]) return bgCache[u];
        if (bgCache[u] === undefined) {
            bgCache[u] = null;
            try {
                GM_xmlhttpRequest({
                    method: 'GET', url: u, responseType: 'blob',
                    onload: r => {
                        const t = (r.response && r.response.type) || '';
                        const good = r.status >= 200 && r.status < 300 && r.response;
                        const vid = good && (/^video\//i.test(t) || (!/^image\//i.test(t) && isVideoRef(u)));
                        const img = good && (/^image\//i.test(t) || (!vid && /\.(gif|webp|png|jpe?g|avif|bmp)(\?|#|$)/i.test(u) && !/^text\//i.test(t)));
                        if (!vid && !img) { bgCache[u] = ''; toast('❌ Link không phải ảnh/video hợp lệ'); return; }
                        if (vid) {
                            if (r.response.size > 60 * 1024 * 1024) { bgCache[u] = ''; toast('❌ Video quá nặng (>60MB)'); return; }
                            posterOf(r.response, (po, url) => {
                                if (!po) { bgCache[u] = ''; toast('❌ Không đọc được video (định dạng/codec không hỗ trợ?)'); return; }
                                bgCache[u] = po; bgVid[u] = url; applyTheme();
                            });
                            return;
                        }
                        const fr = new FileReader();
                        fr.onload = () => { bgCache[u] = fr.result; applyTheme(); };
                        fr.readAsDataURL(r.response);
                    },
                    onerror: () => { bgCache[u] = ''; toast('❌ Không tải được ảnh/video nền'); },
                });
            } catch (e) { bgCache[u] = ''; }
        }
        return '';
    }
    // thẻ <video> nền: gắn vào lớp chat (kiểu kính mờ) hoặc popup chat; dưới nội dung, trên ảnh poster
    let vidEl = null, vidWarned = false;
    function ensureBgVideo() {
        const url = cfg.bgImage ? (bgVid[cfg.bgImage] || '') : '';
        const host = url ? document.querySelector(cfg.glass ? '.chat-overlay' : '.chat-popup') : null;
        if (!url || !host) { if (vidEl) { try { vidEl.pause(); } catch (e) {} vidEl.remove(); vidEl = null; } return; }
        if (!vidEl) {
            vidEl = document.createElement('video');
            vidEl.className = 'rc-bgvid';
            vidEl.muted = true; vidEl.setAttribute('muted', ''); vidEl.loop = true; vidEl.autoplay = true; vidEl.playsInline = true;
            vidEl.disablePictureInPicture = true; vidEl.setAttribute('aria-hidden', 'true'); vidEl.tabIndex = -1;
            vidEl.onerror = () => {
                if (!vidWarned) { vidWarned = true; toast('⚠ Trang chặn phát video nền → dùng khung hình đầu làm ảnh nền'); }
                try { vidEl.remove(); } catch (e) {} vidEl = null;
            };
        }
        if (vidEl.dataset.src !== url) { vidEl.dataset.src = url; vidEl.src = url; }
        if (vidEl.parentElement !== host) host.insertBefore(vidEl, host.firstChild);
        if (vidEl.paused && !vidEl.error) { const pr = vidEl.play(); if (pr && pr.catch) pr.catch(() => {}); }
    }
    setInterval(() => { try { ensureBgVideo(); } catch (e) {} }, 1500);
    let styleEl = null;
    function applyDashboardTheme() {
        const wrapper = document.getElementById('rc-kit')?.shadowRoot?.querySelector('.w');
        if (!wrapper) return;
        const seed = /^#[\da-f]{6}$/i.test(cfg.dashboardBg || '') ? cfg.dashboardBg : DEFAULTS.dashboardBg;
        const [h, s, l] = rgb2hsl(...hexToRgb(seed));
        const light = cfg.imageThemeMode === 'light';
        const bg = hsl2hex(h, Math.min(s, 0.45), light ? Math.max(0.90, Math.min(l, 0.97)) : Math.max(0.07, Math.min(l, 0.18)));
        const accent = hsl2hex(h, Math.min(s, 0.75), light ? 0.36 : 0.72);
        const fg = light ? '#172033' : '#f1f5f9';
        const values = {
            '--bg': bg,
            '--fg': fg,
            '--mut': mix(bg, fg, 0.72),
            '--line': mix(bg, fg, 0.22),
            '--chip': mix(bg, fg, 0.10),
            '--acc': accent,
            '--switch-off': mix(bg, accent, 0.22),
            '--switch-knob': fg,
            '--switch-on-knob': bg,
            '--shadow': '0 12px 40px rgba(0,0,0,.55)'
        };
        for (const [key, value] of Object.entries(values)) wrapper.style.setProperty(key, value);
        wrapper.style.colorScheme = light ? 'light' : 'dark';
    }

    function imagePaletteMode(palette, mode) {
        const light = mode === 'light';
        const levels = light
            ? {primary:0.38,userBubble:0.88,botBubble:0.98,msgBg:0.94,chatBg:0.90,panelBg:0.86,pageBg:0.78}
            : {primary:0.62,userBubble:0.28,botBubble:0.19,msgBg:0.13,chatBg:0.18,panelBg:0.16,pageBg:0.09};
        return Object.fromEntries(Object.entries(levels).map(([key, level]) => {
            const [h, s] = rgb2hsl(...hexToRgb(palette[key]));
            return [key, hsl2hex(h, s, level)];
        }));
    }

    function applyTheme() {
        applyDashboardTheme();
        const host = document.head || document.documentElement;
        if (!host) { document.addEventListener('DOMContentLoaded', applyTheme, { once: true }); return; }
        if (!styleEl || !styleEl.isConnected) {
            styleEl = document.getElementById('rc-kit-style') || document.createElement('style');
            styleEl.id = 'rc-kit-style';
            host.appendChild(styleEl);
        }
        const p = cfg.primary, u = cfg.userBubble, b = cfg.botBubble, bg = cfg.chatBg, mb = cfg.msgBg;
        const uc = textColorFor(u), bc = textColorFor(b);
        const font = cfg.fontFamily ? cfg.fontFamily.replace(/["';<>{}]/g, '') : '';
        const imgRaw = bgSrc(cfg.bgImage || '');
        const img = imgRaw.replace(/['"\\]/g, '');
        if (imgRaw && cfg.autoTheme) setTimeout(() => autoThemeFrom(imgRaw), 0);
        const metaColor = textColorFor(mb) === '#ffffff' ? '#cbd5e1' : '#6b7280';

        // luôn cho phép bôi đen chữ trong chat (canvas/nút thì thôi)
        let css = `
            .chat-messages, .message-container, .message-container *:not(canvas):not(button),
            .w-md-editor-text-input { -webkit-user-select:text !important; user-select:text !important; }
            /* chữ OCR thay cho ảnh câu trả lời */
            [data-rc-hidden="1"] { display:none !important; }
            .rc-ocr-text { width:100%; box-sizing:border-box; }
            .rc-ocr-body { white-space:pre-wrap; word-break:break-word; line-height:1.65; padding:12px 16px; }
            .rc-seg-text { white-space:pre-wrap; word-break:break-word; }
            /* khung "Câu hỏi" giống bản gốc của bot: hộp trắng bo góc, nhãn xám nhỏ + nội dung đậm vừa */
            .rc-qbox { background:#fff !important; color:#1f2937 !important; border:1px solid #d5d8dd; border-radius:16px; padding:16px 20px 17px; margin:14px 0 12px; box-shadow:0 1px 3px rgba(15,23,42,.07); }
            .rc-qlab { font-size:.8em; color:#6b7280 !important; margin-bottom:12px; line-height:1.2; }
            .rc-qbody { white-space:pre-wrap; word-break:break-word; font-weight:500; line-height:1.55; }
            .rc-ocr-fig { display:block; max-width:100%; height:auto; margin:8px 0; border-radius:8px; background:#fff; }
            .rc-ocr-bar { display:flex; align-items:center; justify-content:flex-start; flex-wrap:wrap; gap:6px; margin:8px 12px 0; padding:6px 0 8px; border-top:1px solid color-mix(in srgb,currentColor 12%,transparent); }
 .rc-ocr-bar button { display:inline-flex !important; align-items:center; gap:8px; border:0 !important; background:transparent !important; color:inherit !important; box-shadow:none !important; border-radius:10px; padding:10px 16px; font:500 14px/1.4 system-ui !important; cursor:pointer; opacity:.75; transition:background .15s,opacity .15s; }
 .rc-ocr-bar button svg { flex:none; stroke:currentColor !important; fill:none !important; }
 .rc-ocr-bar button:hover { opacity:1; background:color-mix(in srgb,currentColor 14%,transparent) !important; }
 .rc-ocr-bar button:focus-visible { outline:2px solid currentColor; outline-offset:2px; }
 .rc-fidelity-note { flex-basis:100%; font-size:11px; opacity:.7; }`;

        if (p) css += `
            .w-header-new-btn, .ant-btn-primary, .ant-btn-color-primary.ant-btn-variant-solid,
            .w-send-btn:not([disabled]) { background-color:${p} !important; border-color:${p} !important; }
            .chat-window a, .chat-popup a { color:${textColorFor(mb) === '#ffffff' ? mix(p, '#ffffff', 0.5) : p} !important; }`;

        // chỉ nhắm đúng .message-container (không dính các thẻ *-stack bọc ngoài)
        if (u) css += `
            .message-container.message-user { background:${u} !important; ${uc ? `color:${uc} !important;` : ''} }`;
        if (b) css += `
            .message-container.message-assistant { background:${b} !important; ${bc ? `color:${bc} !important;` : ''} }`;

        if (bg) css += `.chat-window, .chat-popup { background-color:${bg} !important; }`;

        if (img) {
            // .chat-body/.chat-content mặc định nền trắng → phải trong suốt thì mới thấy ảnh nền
            css += `.chat-body, .chat-content, .chat-window { background:transparent !important; }`;
            if (cfg.bgBlur > 0) {
                css += `
                    .chat-popup::before { content:''; position:absolute; inset:-30px; z-index:0; pointer-events:none;
                        background:url('${img}') center/cover no-repeat; filter:blur(${cfg.bgBlur}px);
                        clip-path:inset(30px); }
                    .chat-popup > .chat-window { position:relative; z-index:1; }`;
            } else {
                css += `.chat-popup { background-image:url('${img}') !important; background-size:cover !important; background-position:center !important; }`;
            }
        } else if (mb) {
            css += `.chat-body, .chat-content { background-color:${mb} !important; }`;
        }
        if (img && cfg.bgImage && bgVid[cfg.bgImage]) {
            const vb = Math.max(0, +cfg.bgBlur || 0);
            css += `
            .rc-bgvid { position:absolute; inset:${cfg.glass ? -vb * 2 : 0}px; width:calc(100% + ${cfg.glass ? vb * 4 : 0}px); height:calc(100% + ${cfg.glass ? vb * 4 : 0}px);
                object-fit:cover; pointer-events:none; border-radius:inherit; ${vb ? `filter:blur(${vb}px);` : ''} z-index:${cfg.glass ? -1 : 0}; }
            .chat-popup > .chat-window { position:relative; z-index:1; }`;
        }
        css += `.message-timestamp, .message-meta-row { color:${metaColor} !important; opacity:1 !important; }`;

        // cỡ chữ: KHÔNG đụng vào .katex (trang đã đặt 1.32em cho công thức)
        css += `
            .message-container p, .message-container li, .message-container td, .message-container th,
            .rc-ocr-body, .w-chat-input textarea {
                font-size:${cfg.fontSize}px !important;
                ${font ? `font-family:${font}, sans-serif !important;` : ''}
            }`;

        // ---------- Phần NGOÀI khung tin nhắn: sidebar bài học, header, ô nhập, lớp phủ ----------
        // Các phần này có CSS riêng (nền trắng cứng) nên trước giờ không ăn theme.
        const panel = cfg.panelBg, pgBg = cfg.pageBg;
        const pc = textColorFor(panel) || '#1f2937';      // chữ trên panel
        const pgc = textColorFor(pgBg) || '#1f2937';      // chữ trên nền trang
        const pt = textColorFor(p) || '#ffffff';          // chữ trên màu chủ đạo
        const panel2 = mix(panel, pc, 0.05);              // thẻ/nút trên panel (hơi lệch tông để có chiều sâu)
        const line = mix(panel, pc, 0.18);                // viền
        const faint = mix(panel, pc, 0.55);               // chữ phụ / placeholder
        const pgFaint = mix(pgBg, pgc, 0.55);
        const pgPanel = mix(pgBg, pgc, 0.04);             // khung nội dung chính (lệch nhẹ so với nền trang)
        const actBg = mix(panel, p, 0.14);                // nền mục đang chọn
        const disBtn = mix(panel, p, 0.45);               // nút gửi khi đang disabled
        // chữ màu chủ đạo phải ĐỌC ĐƯỢC trên nền panel: nền tối → sáng hoá, nền sáng → tối hoá
        const accTxt = pc === '#ffffff' ? mix(p, '#ffffff', 0.55) : mix(p, '#000000', 0.25);
        const TEXT = ':where(*:not(svg):not(svg *))';     // mọi phần tử chữ, trừ icon svg (svg thừa hưởng màu cha)
        css += `
            .chat-overlay { background-color:${pgBg} !important; }
            #lesson-sidebar, .w-chat-header, .chat-footer, .w-chat-input { background-color:${panel} !important; border-color:${line} !important; }
            .w-chat-input__card { background-color:${panel2} !important; border-color:${line} !important; }
            .w-lesson-item, .w-sidebar-btn, .w-filter-badge, .w-chat-input__tabs, .w-chat-header__tools,
            .message-font-size-button { background-color:${panel2} !important; border-color:${line} !important; }
            .w-lesson-item__index { background-color:${line} !important; }
            :where(.w-chat-header, .chat-footer, .w-chat-input) ${TEXT} { color:${pc} !important; }
            /* sidebar: trang dùng class tiện ích (text-gray-800, bg-gray-50...) có !important → phải thắng bằng #id */
            #lesson-sidebar *:not(svg):not(svg *) { color:${pc} !important; }
            #lesson-sidebar > div:first-child { background-color:${panel} !important; border-color:${line} !important; }
            #lesson-sidebar [class*="bg-gray"], #lesson-sidebar [class*="bg-white"] { background-color:${panel2} !important; border-color:${line} !important; }
            .chat-disclaimer, .chat-footer-meta, .chat-context-path { color:${faint} !important; }
            .w-chat-input textarea::placeholder { color:${faint} !important; opacity:1 !important; }
            /* màu chủ đạo: nút mới, nút gửi, tab đang chọn, mục bài học đang chọn */
            .w-header-new-btn, .w-send-btn:not([disabled]), .w-segment--active,
            #lesson-sidebar .w-lesson-item--active .w-lesson-item__index,
            .ant-btn-primary, .ant-btn-color-primary.ant-btn-variant-solid
                { background-color:${p} !important; border-color:${p} !important; color:${pt} !important; }
            .w-send-btn[disabled] { background-color:${disBtn} !important; border-color:${disBtn} !important; color:${pt} !important; }
            #lesson-sidebar .w-lesson-item--active { background-color:${actBg} !important; border-color:${p} !important; }
            .w-chat-input__card:focus-within { border-color:${p} !important; }`;

        // ---------- Phần NGOÀI widget chat: chính trang web EduNext ----------
        if (cfg.siteWide) {
            const rgb = (hexToRgb(p) || [37, 99, 235]).join(',');
            css += `
            :root { --bs-primary:${p}; --bs-primary-rgb:${rgb}; }
            html, body { background-color:${pgBg} !important; color:${pgc} !important; }
            .left-navigation { background-color:${pgBg} !important; border-color:${line} !important; }
            .cl-card, .cl-semester-nav, .cl-toolbar__search-input, .cl-header__right button,
            .MuiPaper-root, .dropdown-menu, .modal-content, .ant-modal-content, .ant-card, .ant-dropdown-menu
                { background:${panel} !important; background-color:${panel} !important; border-color:${line} !important; }
            .cl-card__footer, .MuiTabs-root.edu-tabs-header, .cl-card__arrow, .cl-card__badge, .cl-card__chat-btn
                { background-color:${panel2} !important; border-color:${line} !important; }
            .MuiTabs-indicator { background-color:${panel} !important; }
            .homepage-left-container { background-color:${pgPanel} !important; }
            .cl-semester-nav__header { background-color:${panel} !important; border-color:${line} !important; }
            .cl-semester-nav__count { background:${panel2} !important; color:${faint} !important; }
            .cl-header__right button, .cl-header__right button * { color:${pc} !important; }
            /* trang chủ ép tab/indicator trắng bằng selector rất dài + !important → phải dùng lại đúng selector đó (kèm html body để thắng) */
            html body .homepage-left-container .edu-tabs .edu-tabs-header.MuiTabs-root .MuiTabs-indicator
                { background:${panel} !important; background-color:${panel} !important; }
            html body .homepage-left-container .edu-tabs .edu-tabs-header.MuiTabs-root .MuiTab-root { color:${faint} !important; }
            html body .homepage-left-container .edu-tabs .edu-tabs-header.MuiTabs-root .MuiTab-root.Mui-selected { color:${pc} !important; }
            .cl-notice { background-color:${actBg} !important; border-color:${line} !important; color:${accTxt} !important; }
            .cl-card__icon { background-color:${actBg} !important; color:${accTxt} !important; }
            .cl-semester-nav__item--active { background:${p} !important; }
            .cl-semester-nav__item--active, .cl-semester-nav__item--active * { color:${pt} !important; }
            :where(.cl-card, .cl-semester-nav, .cl-header__right button, .MuiTabs-root) ${TEXT} { color:${pc} !important; }
            :where(.cl-header, .cl-toolbar) ${TEXT} { color:${pgc} !important; }
            .cl-header__greeting { color:${pgFaint} !important; }
            .cl-semester-nav__group-title, .cl-card__meta, .MuiTab-root:not(.Mui-selected) { color:${faint} !important; }
            .cl-notice, .cl-notice * { color:${accTxt} !important; }
            .cl-card__icon, .cl-card__icon * { color:${accTxt} !important; }
            .cl-toolbar__search-input::placeholder { color:${faint} !important; }`;
        }

        // ---------- Kiểu KÍNH MỜ ----------
        // Trang chat chỉ là 1 lớp (.chat-overlay) đè lên trang menu chứ không phải trang mới → ảnh nền gắn vào CHÍNH lớp chat đó
        // (che kín trang menu phía sau, không bị lẫn GUI); trang menu giữ theme thường. Khung chat + sidebar là kính mờ,
        // phần đặc biệt (menu, hộp thoại, nút chính, mục đang chọn) giữ khối đặc.
        if (cfg.glass && img) {
            const A = Math.min(0.95, Math.max(0.1, (+cfg.glassAlpha || 55) / 100));
            const BL = Math.max(0, +cfg.glassBlur || 0);
            const rgba = (hex, a) => 'rgba(' + (hexToRgb(hex) || [255, 255, 255]).join(',') + ',' + a.toFixed(2) + ')';
            const outer = rgba(panel, A), inner = rgba(panel2, Math.min(0.95, A + 0.12)), bub = hex => rgba(hex, Math.min(0.95, A + 0.2));
            const blurCss = `backdrop-filter:blur(${BL}px) saturate(1.3) !important; -webkit-backdrop-filter:blur(${BL}px) saturate(1.3) !important;`;
            const bb = Math.max(0, +cfg.bgBlur || 0);
            css += `
            /* ảnh nền nằm trong lớp chat; isolation giữ ::before (z-index:-1) ở trong lớp này, không chui ra sau trang menu */
            html body .chat-overlay { background:#000 !important; isolation:isolate; overflow:hidden; }
            html body .chat-overlay::before { content:''; position:absolute; inset:${-bb * 2}px; z-index:-1; pointer-events:none;
                background:url('${img}') center/cover no-repeat; ${bb ? `filter:blur(${bb}px);` : ''} }
            /* kính: có blur phía sau */
            html body .chat-popup, html body #lesson-sidebar
                { background:${outer} !important; background-image:none !important; ${blurCss} }
            html body .chat-popup::before { content:none !important; display:none !important; }
            /* bên trong kính: chỉ pha màu nhẹ (blur lồng nhau không có tác dụng) */
            html body .chat-window, html body .chat-body, html body .chat-content, html body .chat-messages { background:transparent !important; }
            html body #lesson-sidebar > div:first-child, html body .w-chat-header, html body .chat-footer, html body .w-chat-input
                { background:${rgba(panel, Math.max(0.1, A - 0.2))} !important; }
            html body .w-chat-input__card, html body .w-lesson-item, html body .w-sidebar-btn, html body .w-filter-badge, html body .w-chat-input__tabs,
            html body .w-chat-header__tools
                { background:${inner} !important; }
            html body .message-container.message-user { background:${bub(u)} !important; }
            html body .message-container.message-assistant { background:${bub(b)} !important; }
            /* khối ĐẶC (đặc biệt): menu, hộp thoại, nút chính, mục đang chọn */
            html body .dropdown-menu, html body .modal-content, html body .ant-modal-content, html body .ant-dropdown-menu, html body .MuiPaper-root, html body .ant-card
                { background:${panel} !important; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; }
            html body .w-header-new-btn, html body .w-send-btn:not([disabled]), html body .w-segment--active
                { background-color:${p} !important; }
            html body #lesson-sidebar .w-lesson-item--active { background-color:${actBg} !important; }`;
        }
        styleEl.textContent = css;
        if (!RC.themeSheet) {
            RC.themeSheet = new CSSStyleSheet();
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, RC.themeSheet];
        }
        RC.themeSheet.replaceSync(css);
    }
    applyTheme(); ensureBgVideo();

    // =====================================================================
    // 3. ENTER = GỬI, SHIFT+ENTER = XUỐNG DÒNG
    // =====================================================================
    // Đăng ký ở WINDOW (capture) chứ không phải document: window-capture chạy trước document-capture,
    // nên nếu trang cũng nghe Enter ở window-capture thì script (chạy ở document-start) vẫn đứng trước.
    // Chế độ Text dùng <textarea>, chế độ Math dùng <math-field> (MathLive) → phải bắt cả hai.
    const ENTER_SEL = 'textarea.w-md-editor-text-input, .w-chat-input textarea, .w-chat-input math-field';
    const valueOf = t => String((t && t.value) || '');
    let enterHandledAt = 0;
    // Chat thường có nút .w-send-btn. Chế độ bài tập KHÔNG có nút đó mà có cột ý định (.exercise-intent-column__item):
    // mặc định bấm nút đang được chọn của trang (vd. "Yêu cầu khác"); đặt exerciseIntent='submit' để luôn "Nộp câu trả lời".
    function findSendTarget(t) {
        const scope = (t.closest && t.closest('.w-chat-input')) || document;
        const send = scope.querySelector('button.w-send-btn') || document.querySelector('button.w-send-btn');
        if (send) return send;
        const items = [...document.querySelectorAll('.exercise-intent-column__item')];
        if (!items.length) return null;
        const submit = items.find(b => /^Nộp câu trả lời/i.test(b.getAttribute('aria-label') || b.textContent || ''));
        const active = items.find(b => b.classList.contains('is-active') || b.getAttribute('aria-pressed') === 'true');
        return cfg.exerciseIntent === 'submit' ? (submit || active) : (active || submit);
    }
    function onEnterKey(e) {
        if (!cfg.enterSend || e.key !== 'Enter') return;
        if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;   // Shift+Enter: để mặc định (xuống dòng)
        if (e.isComposing) return;                                      // đang gõ dở trong IME: Enter chỉ chốt chữ
        const t = e.target;
        if (!t || !t.matches || !t.matches(ENTER_SEL)) return;
        if (!findSendTarget(t)) return;   // không có nút nào để bấm → KHÔNG nuốt phím, để trang tự xử lý
        e.preventDefault();
        e.stopImmediatePropagation();
        enterHandledAt = Date.now();
        // React có thể chưa kịp bật nút → tìm lại mỗi lần thử
        const trySend = n => {
            const btn = findSendTarget(t);
            log('Enter → gửi', { mode: t.tagName.toLowerCase(), btn: btn ? (btn.getAttribute('aria-label') || btn.className).slice(0, 40) : null, disabled: !!(btn && btn.disabled), len: valueOf(t).length });
            if (btn && !btn.disabled) btn.click();
            else if (n > 0 && valueOf(t).trim()) setTimeout(() => trySend(n - 1), 80);
        };
        trySend(4);
    }
    window.addEventListener('keydown', onEnterKey, true);
    // chặn nốt keypress/beforeinput xuống dòng ngay sau khi đã gửi (phòng trang chèn \n bằng đường khác)
    const swallowEnter = e => {
        if (cfg.enterSend && Date.now() - enterHandledAt < 200) { e.preventDefault(); e.stopImmediatePropagation(); }
    };
    window.addEventListener('keypress', e => { if (e.key === 'Enter') swallowEnter(e); }, true);
    window.addEventListener('beforeinput', e => {
        if (e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph') swallowEnter(e);
    }, true);

    // =====================================================================
    // 4. QUÉT ẢNH → CHỮ (OCR)
    //    Câu trả lời của bot là ảnh .webp ở cdn-lab.fpt.edu.vn/chats-artifacts/chat-canvas/...
    //    được vẽ lên <canvas> (canvas bị tainted nên không toDataURL được) → ta bắt URL ảnh rồi tự tải về OCR.
    // =====================================================================
    const RES_RE = /chat-canvas|chats-artifacts/i;
    const PART_RE = /chat-assistant(?:%3A|:)([^%/:]+)(?:%3A|:)part-(\d+)/i;
    const groupId = u => { const m = PART_RE.exec(u); return m ? m[1] : u; };
    const partNo = u => { const m = PART_RE.exec(u); return m ? +m[2] : 0; };

    const urlState = new Map();   // url -> queued | done | fail
    const textByUrl = new Map();  // url -> text đã OCR
    const segByUrl = new Map();   // url -> [{type:'text'|'img'}] (chữ + hình cắt từ ảnh gốc)
    let lastUrls = [], lastPreview = '(chưa có)';

    const withTimeout = (p, ms) =>
        Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('Timeout ' + ms + 'ms')), ms))]);

    let toastEl = null, toastT = 0;
    function toast(msg) {
        whenBody(() => {
            if (!toastEl) {
                toastEl = document.createElement('div');
                toastEl.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;max-width:360px;padding:8px 14px;border-radius:10px;background:#0f172a;color:#fff;font:12px/1.4 sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3);pointer-events:none;transition:opacity .2s;';
                document.body.appendChild(toastEl);
            }
            toastEl.textContent = msg;
            toastEl.style.opacity = '1';
            clearTimeout(toastT);
            toastT = setTimeout(() => { toastEl.style.opacity = '0'; }, 3500);
        });
    }

    // Mở ảnh ở tab nền (cdn-lab, không CSP) → tab đó OCR rồi ghi kết quả vào GM storage → ta nhận ở đây.
    const langsString = () => [cfg.ocrVie !== false && 'vie', cfg.ocrEng !== false && 'eng'].filter(Boolean).join('+') || 'vie';
    const hubAlive = () => !!GM_getValue('rc_ocr_status', {}).workers;
    const closeHub = () => RC.ocrStop().catch(e => toast(e.message));
    const ocrUrl = url => RC.ocr({url, langs:langsString(), threads:+cfg.ocrThreads || 0, idle:+cfg.hubIdle, keepWarm:!!cfg.ocrHub});
    function partsFor(id) {
        const m = new Map();
        [...textByUrl.keys()].filter(u => groupId(u) === id).forEach(u => m.set(partNo(u), u));
        return [...m.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]);
    }
    function combinedFor(id) {
        return partsFor(id).map(u => textByUrl.get(u)).filter(Boolean).join('\n\n').trim();
    }
    function segmentsFor(id) {
        const out = [];
        partsFor(id).forEach(u => (segByUrl.get(u) || []).forEach(g => out.push(g)));
        return out;
    }

    // ---------- Thay ảnh câu trả lời bằng CHỮ ngay trong bong bóng của bot ----------
    // Không xoá node của React (sẽ làm React lỗi khi render lại): chỉ ẩn khung ảnh bằng thuộc tính data-rc-hidden
    // rồi chèn 1 khối chữ ngay sau nó. Chữ nằm trong chính .message-assistant nên ăn theme bong bóng, bôi đen/copy được.
    const CONT_SEL = '.chat-messages [data-testid="chat-canvas-container"]';
    const shown = new Map();   // groupId -> { text, idx, total } để vẽ lại nếu React render lại bong bóng
    const containers = () => [...document.querySelectorAll(CONT_SEL)];
    // URL ảnh của 1 khung = prop canvas.url trong React fiber (chính xác nhất để biết khung nào ứng với tin nào)
    function urlOfContainer(cont) {
        try {
            const k = Object.keys(cont).find(x => x.startsWith('__reactFiber$'));
            let f = k && cont[k];
            for (let i = 0; f && i < 40; i++, f = f.return) {
                const c = f.memoizedProps && f.memoizedProps.canvas;
                if (!c) continue;
                const first = Array.isArray(c) ? c[0] : c;
                if (first && first.url) return first.url;
            }
        } catch (e) {}
        return null;
    }
    // ---------- Nguồn LaTeX ----------
    // Ảnh của bot do server vẽ nên Tesseract đọc công thức rất kém. Nhưng component React của tin nhắn có thể còn giữ
    // văn bản gốc (markdown/LaTeX) trong props → quét fiber của bong bóng, lấy chuỗi nào trông giống LaTeX nhất.
    const TEX_RE = /\\(?:frac|dfrac|sqrt|cdot|times|pi|alpha|beta|theta|sum|int|left|right|begin|end|text|mathrm|ge|le|geq|leq|neq|approx|circ|angle|degree)\b|\$[^$\n]+\$|\\\(|\\\[/;
    const SOURCE_KEY = /^(content|text|markdown|message|answer|response|body|source|rawText)$/i;
    const SKIP_KEY = /^(url|src|href|id|className|key|ref|style|children|messages|history|conversation|testid|data-testid)$/i;
    function texCandidates(cont) {
        const out = [], seen = new Set();
        let budget=300;
        const scan = (v,path,depth,lvl,key) => {
            if (v == null || depth > 4 || --budget < 0) return;
            if (typeof v === 'string') {
                if (v.length >= 2 && v.length <= 200000 && !seen.has(v) &&
                    (TEX_RE.test(v) || SOURCE_KEY.test(key)) && !/^\s*(?:https?:|data:)/i.test(v)) {
                    seen.add(v); out.push({path,lvl,text:v});
                }
                return;
            }
            // Never search lists of other messages or React children.
            if (typeof v !== 'object' || Array.isArray(v) || v instanceof Node || seen.has(v)) return;
            seen.add(v);
            for (const k of Object.keys(v).slice(0,40)) if (!SKIP_KEY.test(k)) {
                try { scan(v[k],path+'.'+k,depth+1,lvl,k); } catch (_) {}
            }
        };
        try {
            const key=Object.keys(cont).find(k=>k.startsWith('__reactFiber$'));
            let f=key && cont[key];
            for(let lvl=0;f && lvl<12;lvl++,f=f.return) {
                if (lvl && f.stateNode instanceof Element &&
                    (f.stateNode.matches('.chat-messages') || f.stateNode.querySelectorAll('[data-testid="chat-canvas-container"]').length>1)) break;
                scan(f.memoizedProps,'L'+lvl,0,lvl,'');
                if(out.length) break;
            }
        } catch (_) {}
        return out.sort((a,b)=>a.lvl-b.lvl || b.text.length-a.text.length);
    }
    function latexSourceOf(cont) {
        return texCandidates(cont)[0]?.text.trim() || null;
    }

    function probeLatex() {
        const conts = [...document.querySelectorAll(CONT_SEL)];
        if (!conts.length) { toast('Chưa có tin nhắn ảnh nào để dò'); return; }
        let hit = 0;
        conts.forEach((c, i) => {
            const cands = texCandidates(c);
            if (cands.length) hit++;
            log('Dò LaTeX bong bóng #' + i, cands.length ? cands.slice(0, 5).map(x => x.path + ' → ' + x.text.slice(0, 160)) : '(không thấy chuỗi LaTeX trong props)');
        });
        toast(hit ? '🔬 Thấy nguồn LaTeX ở ' + hit + '/' + conts.length + ' bong bóng (xem Console [RC])' : '🔬 Trang không giữ nguồn LaTeX trong props — vẫn dùng OCR chữ');
    }

    // Tách text thành: chữ thường / hộp "Câu hỏi". Hộp bắt đầu ở dòng "Câu hỏi:" và kết thúc trước câu hướng dẫn định dạng ("Bạn hãy trả lời theo…", "Trả lời: […]").
    function splitQuestionBoxes(text) {
        const lines = String(text).split('\n');
        const out = []; let cur = []; let i = 0;
        const flushText = () => { const t = cur.join('\n').replace(/^\n+|\n+$/g, ''); if (t.trim()) out.push({ q: false, t }); cur = []; };
        const isEnd = l => /^\s*(Bạn|Em|Các bạn|Hãy)\b.*(trả lời|viết|điền|nhập).*(định dạng|mẫu|như sau|sau đây|sau nhé|sau:)/i.test(l) || /^\s*Trả lời\s*:/i.test(l);
        while (i < lines.length) {
            const m = /^\s*Câu hỏi\s*:?\s*(.*)$/i.exec(lines[i]);
            if (!m) { cur.push(lines[i++]); continue; }
            flushText();
            const body = m[1] ? [m[1]] : []; i++;
            while (i < lines.length && !isEnd(lines[i])) body.push(lines[i++]);
            const bt = body.join('\n').replace(/^\s*\n+|\n+\s*$/g, '').replace(/\n{3,}/g, '\n\n').replace(/([^.?!:;\n])\n(?=[a-zà-ỹ])/g, '$1 ');   // nối dòng bị OCR ngắt giữa câu (dòng sau bắt đầu bằng chữ thường)
            if (bt.trim()) out.push({ q: true, t: bt }); else cur.push('Câu hỏi:');
        }
        flushText();
        return out;
    }
    function renderTextSeg(body, t) {
        const parts = cfg.qBox !== false ? splitQuestionBoxes(t) : [{ q: false, t }];
        (parts.length ? parts : [{ q: false, t }]).forEach(pt => {
            const d = document.createElement('div');
            if (pt.q) {
                d.className = 'rc-qbox';
                const l = document.createElement('div'); l.className = 'rc-qlab'; l.textContent = 'Câu hỏi';
                const b = document.createElement('div'); b.className = 'rc-qbody'; b.textContent = pt.t;
                d.append(l, b);
            } else { d.className = 'rc-seg-text'; d.textContent = pt.t; }
            body.appendChild(d);
        });
    }
    function applyToContainer(cont, text, segs) {
        const host = cont.parentElement;
        if (!host) return;
        const tex = cfg.latexSource ? latexSourceOf(cont) : null;
        if (tex) { segs = [{ type: 'text', text: tex }].concat((segs || []).filter(g => g.type === 'img' && !g.preserved)); text = tex; }
        let box = host.querySelector(':scope > .rc-ocr-text');
        if (!box) {
            box = document.createElement('div');
            box.className = 'rc-ocr-text';
            box.innerHTML = '<div class="rc-ocr-body"></div><div class="rc-ocr-bar">' +
                '<button type="button" data-a="copy" title="Sao chép nội dung"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg><span>Sao chép</span></button>' +
                '<button type="button" data-a="img" aria-pressed="false"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/></svg><span>Ảnh gốc</span></button></div>';
            box.addEventListener('click', e => {
                const b = e.target.closest && e.target.closest('button[data-a]');
                if (!b) return;
                e.stopPropagation();
                const body = box.querySelector('.rc-ocr-body');
                if (b.dataset.a === 'copy') { GM_setClipboard(box.dataset.text || body.textContent, 'text'); clearTimeout(b._rcTimer); b.innerHTML="<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"m5 12 4 4L19 6\"/></svg><span>Đã chép</span>"; b._rcTimer=setTimeout(()=>{b.innerHTML="<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"8\" y=\"8\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M16 8V4H4v12h4\"/></svg><span>Sao chép</span>";},1500); return; }
                const c = host.querySelector(':scope > [data-testid="chat-canvas-container"]');
                const wantImg = box.dataset.showImg !== '1';
                box.dataset.showImg = wantImg ? '1' : '0';
                if (c) c.setAttribute('data-rc-hidden', wantImg ? '0' : '1');
                body.style.display = wantImg ? 'none' : '';
                b.innerHTML = wantImg ? "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M5 5h14M12 5v14M8 19h8\"/></svg><span>Bản chữ</span>" : "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"3\"/><circle cx=\"8\" cy=\"8\" r=\"1.5\"/><path d=\"m3 17 6-6 4 4 3-3 5 5\"/></svg><span>Ảnh gốc</span>"; b.setAttribute('aria-pressed',String(wantImg));
            });
            cont.after(box);
        }
        const body = box.querySelector('.rc-ocr-body');
        body.textContent = '';
        if (segs && segs.length) {
            segs.forEach(g => {
                if(g.type === 'rich') {
                    const line=document.createElement('div'); line.className='rc-seg-text';
                    for(const part of g.parts) {
                        if(part.type==='text') line.appendChild(document.createTextNode(part.text+' '));
                        else { const icon=document.createElement('img'); icon.src=part.src; icon.width=part.w; icon.height=part.h; icon.alt='[emoji/ký hiệu trong ảnh]'; icon.title='Giữ ảnh gốc; chưa nhận dạng thành Unicode'; icon.style.cssText='display:inline-block;vertical-align:middle;max-width:100%'; line.append(icon,document.createTextNode(' ')); }
                    }
                    body.appendChild(line);
                } else if (g.type === 'img') { const im = document.createElement('img'); im.className = 'rc-ocr-fig'; im.src = g.src; im.width = g.w; if(g.preserved) { im.title=g.copyText; im.style.cssText='display:block;max-width:100%;height:auto;border-radius:4px'; } im.alt = 'Hình trong câu trả lời'; body.appendChild(im); }
                else renderTextSeg(body, g.text);
            });
        } else renderTextSeg(body, text);
        box.dataset.text = text;
        box.dataset.src = tex ? 'latex' : 'ocr';
        const bar=box.querySelector('.rc-ocr-bar');
        bar.querySelector('.rc-fidelity-note')?.remove();
        if(!tex && segs?.some(g=>g.preserved)) { const note=document.createElement('small'); note.className='rc-fidelity-note'; note.textContent='Ký hiệu chưa đọc chắc: giữ ảnh; Copy có đánh dấu.'; bar.appendChild(note); }
        if (box.dataset.showImg !== '1') cont.setAttribute('data-rc-hidden', '1');
    }
    function showInBubble(id, text) {
        const segs = segmentsFor(id);
        if (!cfg.replaceBubble || !text) return;
        const conts = containers();
        if (!conts.length) return;
        let idx = conts.findIndex(c => { const u = urlOfContainer(c); return u && groupId(u) === id; });
        if (idx < 0) idx = conts.length - 1;   // không đọc được fiber → coi là bong bóng mới nhất
        shown.set(id, { text, segs, idx, total: conts.length });
        if (shown.size > 6) shown.delete(shown.keys().next().value);
        applyToContainer(conts[idx], text, segs);
    }
    function reapplyAll() {
        if (!cfg.replaceBubble) return;
        const conts = containers();
        shown.forEach(r => {
            // chỉ vẽ lại khi số bong bóng không đổi (tránh gắn nhầm chữ cũ vào tin mới)
            if (conts.length !== r.total || !conts[r.idx]) return;
            const host = conts[r.idx].parentElement;
            if (host && !host.querySelector(':scope > .rc-ocr-text')) applyToContainer(conts[r.idx], r.text, r.segs);
        });
    }
    function restoreBubbles() {
        document.querySelectorAll('.rc-ocr-text').forEach(b => b.remove());
        document.querySelectorAll('[data-rc-hidden]').forEach(c => c.removeAttribute('data-rc-hidden'));
    }
    let moT = 0;
    whenBody(() => {
        new MutationObserver(() => { clearTimeout(moT); moT = setTimeout(reapplyAll, 250); })
            .observe(document.body, { childList: true, subtree: true });
    });

    // `queue` = các ảnh đang quét (chạy SONG SONG; hub dùng nhiều worker). busy giữ lại cho phần UI cũ.
    const queue = []; let busy = false;
    const grpPending = new Map(), grpFailed = new Set();
    function enqueue(url) {
        const s = urlState.get(url);
        if (s === 'queued' || s === 'done') return;
        if ([...textByUrl.keys()].some(k => groupId(k) === groupId(url) && partNo(k) === partNo(url))) { urlState.set(url, 'done'); return; }
        urlState.set(url, 'queued');
        queue.push(url);
        const g = groupId(url);
        if (!grpPending.has(g)) grpPending.set(g, new Set());
        grpPending.get(g).add(url);
        runJob(url);
    }
    function finalizeGroup(g) {
        const full = combinedFor(g);
        if (full) {
            if (cfg.autoCopy) GM_setClipboard(full, 'text');
            lastPreview = full.slice(0, 120);
            toast(cfg.autoCopy ? '✅ Đã quét + copy ' + full.length + ' ký tự' : '✅ Đã quét ' + full.length + ' ký tự');
            log('✅ OCR xong (' + full.length + ' ký tự):\n' + full);   // in đủ, không cắt
        } else if (!grpFailed.has(g)) {
            toast('Không đọc được chữ trong ảnh');
        }
        grpFailed.delete(g);
    }
    async function runJob(u) {
        const g = groupId(u), t0 = Date.now();
        try {
            toast('🔎 Đang quét ' + queue.length + ' ảnh...');
            const res = await ocrUrl(u);
            const t = (res && res.text) || '';
            textByUrl.set(u, t);
            segByUrl.set(u, (res && res.segments) || (t ? [{ type: 'text', text: t }] : []));
            urlState.set(u, 'done');
            const ms = (res && res.ms) || {};
            log('⏱ part-' + partNo(u) + ': ' + (Date.now() - t0) + 'ms tổng' + (ms.total ? ' (hub: tải ' + ms.load + ' · khởi tạo ' + ms.pool + ' · OCR ' + ms.ocr + ' · xử lý ' + ms.post + ' · ' + ms.workers + ' luồng · ' + (ms.strips || 1) + ' dải' + (ms.stripMs && ms.stripMs.length ? ' [' + ms.stripMs.join('/') + 'ms]' : '') + (ms.t ? ' · xử lý: đọc px ' + ms.t.lay + ', bảng ' + ms.t.bang + ', vùng ' + ms.t.vung + ', hình ' + ms.t.hinh + ' (' + ms.t.hinhs + ' hình)' : '') + ')' : ' (tab đơn: OCR ' + (ms.ocr || '?') + 'ms)'));
            const full = combinedFor(g);
            if (full) showInBubble(g, full);   // hiện dần từng phần ngay khi xong
        } catch (e) {
            urlState.set(u, 'fail');
            grpFailed.add(g);
            toast('❌ ' + (e.message || e));
            log('❌ Lỗi OCR:', e);
        } finally {
            const i = queue.indexOf(u); if (i >= 0) queue.splice(i, 1);
            const set = grpPending.get(g);
            if (set) { set.delete(u); if (!set.size) { grpPending.delete(g); finalizeGroup(g); } }
        }
    }

    // Tự động: gom các ảnh mới về trong 1.5s, chỉ OCR nhóm (tin nhắn) mới nhất
    // → khi mở lại lịch sử chat sẽ không OCR cả chục tin cũ.
    let pending = [], pendT = 0;
    function noteUrl(url) {
        if (!url || !RES_RE.test(url)) return;
        if (!lastUrls.includes(url)) { lastUrls.push(url); if (lastUrls.length > 30) lastUrls.shift(); }
        if (!cfg.wip) return;
        pending.push(url);
        clearTimeout(pendT);
        pendT = setTimeout(() => {
            const list = pending; pending = [];
            const id = groupId(list[list.length - 1]);
            list.filter(x => groupId(x) === id).forEach(enqueue);
        }, 1500);
    }
    function allChatUrls() {
        const seen = new Set(), out = [];
        let names = [];
        try { names = performance.getEntriesByType('resource').map(e => e.name); } catch (e) {}
        [...names, ...lastUrls].forEach(u => { if (RES_RE.test(u) && !seen.has(u)) { seen.add(u); out.push(u); } });
        return out;
    }
    // Quét ép tin mới nhất (chuột phải vào nút OCR)
    function forceScan() {
        const urls = allChatUrls();
        if (!urls.length) { toast('Chưa thấy ảnh câu trả lời nào'); return; }
        const id = groupId(urls[urls.length - 1]);
        const mine = urls.filter(u => groupId(u) === id);
        const cached = combinedFor(id);
        if (cached && mine.every(u => [...textByUrl.keys()].some(k => groupId(k) === id && partNo(k) === partNo(u)))) {
            GM_setClipboard(cached, 'text');
            showInBubble(id, cached);
            toast('✅ Đã copy lại ' + cached.length + ' ký tự');
            return;
        }
        mine.forEach(u => { if (urlState.get(u) === 'fail') urlState.delete(u); enqueue(u); });
    }

    // Lưới 1: PerformanceObserver — thấy mọi ảnh trang tải, kể cả ảnh vẽ vào canvas
    try {
        try { performance.setResourceTimingBufferSize(1000); } catch (e) {}
        new PerformanceObserver(list => list.getEntries().forEach(e => noteUrl(e.name)))
            .observe({ type: 'resource', buffered: true });
    } catch (e) { log('PerformanceObserver lỗi:', e); }

    // Lưới 2: hook drawImage (dự phòng khi ảnh lấy từ cache nên không có resource entry)
    try {
        const P = unsafeWindow.CanvasRenderingContext2D.prototype;
        const od = RC.originalDrawImage;
        P.drawImage = function (s, ...a) {
            try { if (s && s.tagName === 'IMG') noteUrl(s.currentSrc || s.src); } catch (e) {}
            return od.call(this, s, ...a);
        };
    } catch (e) { log('Hook drawImage lỗi:', e); }

    RC.earlyUrls.splice(0).forEach(noteUrl);

    // =====================================================================
    // 5. GIAO DIỆN (nút 🎨 + nút OCR)
    // =====================================================================
    function initUI() {
        try { initUIInner(); } catch (e) { log('⚠ initUI lỗi:', e && e.stack || e); toast('⚠ Lỗi giao diện: ' + (e && e.message || e)); }
    }
    function initUIInner() {
        if (document.getElementById('rc-kit')) return;
        const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        const COLOR_KEYS = [
            ['dashboardBg', 'Nền bảng điều khiển'],
            ['primary', 'Màu chủ đạo'], ['userBubble', 'Tin của bạn'], ['botBubble', 'Tin của bot'],
            ['msgBg', 'Nền tin nhắn'], ['chatBg', 'Viền khung chat'], ['panelBg', 'Nền panel'], ['pageBg', 'Nền trang'],
        ];
        const PRESETS = [
            { n: 'Mặc định', c: { primary: '#2563eb', userBubble: '#dbeafe', botBubble: '#ffffff', msgBg: '#ffffff', chatBg: '#f8fafc', panelBg: '#ffffff', pageBg: '#ffffff' } },
            { n: 'Tối', c: { primary: '#6366f1', userBubble: '#312e81', botBubble: '#1e293b', msgBg: '#0f172a', chatBg: '#334155', panelBg: '#1e293b', pageBg: '#0b1120' } },
            { n: 'Hồng', c: { primary: '#db2777', userBubble: '#fce7f3', botBubble: '#fdf2f8', msgBg: '#fff1f7', chatBg: '#9d174d', panelBg: '#fbcfe8', pageBg: '#f9a8d4' } },
            { n: 'Rừng', c: { primary: '#16a34a', userBubble: '#dcfce7', botBubble: '#f0fdf4', msgBg: '#f7fee7', chatBg: '#14532d', panelBg: '#d1fae5', pageBg: '#a7f3d0' } },
            { n: 'Hoàng hôn', c: { primary: '#ea580c', userBubble: '#ffedd5', botBubble: '#fff7ed', msgBg: '#fffbeb', chatBg: '#7c2d12', panelBg: '#fed7aa', pageBg: '#fdba74' } },
        ];
        const TOGGLES = [
            ['enterSend', 'Enter để gửi', 'Shift+Enter xuống dòng'],
            ['antiPaste', 'Cho phép dán (Ctrl+V)', 'Gỡ chặn anti-paste của trang'],
            ['antiCopy', 'Cho phép copy / chuột phải / chọn chữ', 'Gỡ chặn anti-copy của trang'],
            ['wip', 'Tự quét ảnh (OCR)', 'Bot trả lời bằng ảnh → đọc thành chữ'],
            ['replaceBubble', 'Thay ảnh bằng chữ', 'Hiện chữ + giữ hình vẽ ngay trong bong bóng', 1],
            ['autoCopy', 'Tự copy chữ', 'Quét xong copy vào clipboard', 1],
            ['qBox', 'Hộp trắng cho câu hỏi', 'Khung "Câu hỏi:" giống bản gốc của bot', 1],
            ['latexSource', 'Ưu tiên văn bản gốc', 'Giữ nguyên Unicode, emoji và LaTeX khi trang có văn bản gốc', 1],
            ['siteWide', 'Đổi màu cả trang web', 'Áp theme ra ngoài khung chat'],
        ];

        const tgHtml = ([k, t, d, sub]) => `<label class="tg${sub ? ' sub' : ''}" data-tg="${k}"><div><b>${t}</b><span>${d}</span></div><input type="checkbox" data-k="${k}" ${cfg[k] !== false && cfg[k] ? 'checked' : ''}><i class="sl"></i></label>`;
        const OCR_KEYS = ['wip', 'replaceBubble', 'autoCopy', 'qBox', 'latexSource'];

        const KIT_CSS = `
:host{all:initial}
*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.w{--bg:#fff;--fg:#0f172a;--mut:#64748b;--line:#e2e8f0;--chip:#f1f5f9;--acc:#2563eb;--shadow:0 12px 40px rgba(15,23,42,.28)}
@media (prefers-color-scheme:dark){.w{--bg:#1e293b;--fg:#f1f5f9;--mut:#94a3b8;--line:#334155;--chip:#334155;--shadow:0 12px 40px rgba(0,0,0,.55)}}
.dock{position:fixed;left:16px;bottom:16px;display:flex;gap:8px;align-items:center}
.btn{border:none;cursor:pointer;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.3);transition:transform .12s,background .2s}
.btn:hover{transform:translateY(-1px)} .btn:active{transform:scale(.96)}
.gear{width:40px;height:40px;padding:0;display:grid;place-items:center;border-radius:0;background:transparent;box-shadow:none;font-size:18px}.gear img{width:40px;height:40px;filter:drop-shadow(0 0 3px rgba(0,0,0,.65))}.gear:focus-visible{outline:2px solid var(--acc,#60a5fa);outline-offset:3px}
.pill{height:40px;padding:0 14px 0 12px;border-radius:20px;font:600 12px system-ui;display:flex;align-items:center;gap:7px;background:#94a3b8}
.pill.on{background:#16a34a} .pill.busy{background:#d97706}
.dot{width:8px;height:8px;border-radius:50%;background:#fff;opacity:.9}
.pill.busy .dot{animation:pulse 1s infinite}
@keyframes pulse{50%{opacity:.25;transform:scale(.7)}}
.panel{position:fixed;left:16px;bottom:68px;width:320px;max-height:min(78vh,640px);display:none;flex-direction:column;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);overflow:hidden;font-size:13px}
.panel.open{display:flex;animation:pop .14s ease-out}
@keyframes pop{from{opacity:0;transform:translateY(8px) scale(.98)}}
.hd{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 6px}
.hd b{font-size:14px} .hd small{color:var(--mut);margin-left:6px}
.x{cursor:pointer;border:none;background:none;color:var(--mut);font-size:16px;padding:2px 6px;border-radius:6px}
.x:hover{background:var(--chip)}
.tabs{display:flex;gap:4px;margin:4px 14px 0;padding:3px;background:var(--chip);border-radius:10px}
.tab{flex:1;border:none;background:none;color:var(--mut);padding:6px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer}
.tab.act{background:var(--bg);color:var(--fg);box-shadow:0 1px 3px rgba(0,0,0,.15)}
.body{padding:12px 14px;overflow:auto;flex:1;scrollbar-gutter:stable;scrollbar-width:auto;overscroll-behavior:contain}
  .body::-webkit-scrollbar{width:6px}.body::-webkit-scrollbar-track{background:transparent}.body::-webkit-scrollbar-thumb{background:var(--mut);border-radius:12px}.body::-webkit-scrollbar-button{display:none;width:0;height:0}
  input[type=range]{appearance:none;height:6px;border-radius:99px;background:linear-gradient(to right,var(--acc) var(--fill,50%),var(--line) var(--fill,50%));outline-offset:5px}
  input[type=range]::-webkit-slider-thumb{appearance:none;width:14px;height:14px;border-radius:50%;background:var(--acc);cursor:pointer}
  input[type=range]:focus-visible{outline:2px solid var(--acc)}
  .w .sl{background:var(--switch-off)}
  .w .sl:after{background:var(--switch-knob)}
  .w .tg input:checked+.sl{background:var(--acc)}
  .w .tg input:checked+.sl:after{background:var(--switch-on-knob)}
  .w input[type=checkbox]{accent-color:var(--acc)}
.sec{display:none} .sec.act{display:block}
h4{margin:0 0 8px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}
.presets{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.pre{border:1px solid var(--line);background:var(--bg);color:var(--fg);border-radius:10px;padding:5px 9px 5px 6px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px}
.pre:hover{border-color:var(--acc)}
.sw{display:inline-flex;width:22px;height:14px;border-radius:5px;overflow:hidden;border:1px solid rgba(0,0,0,.15)}
.sw i{flex:1}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 10px;margin-bottom:14px}
.col{display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer}
.col input{width:30px;height:30px;border:1px solid var(--line);border-radius:8px;padding:0;background:none;cursor:pointer;flex:none}
  .sec[data-sec="theme"] .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .sec[data-sec="theme"] .col{position:relative;min-width:0;min-height:46px;box-sizing:border-box;padding:8px;gap:9px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--fg);font-weight:500;line-height:1.35;transition:border-color .15s,background .15s,box-shadow .15s}
  .sec[data-sec="theme"] .col:hover{border-color:var(--acc);background:color-mix(in srgb,var(--acc) 8%,var(--bg))}
  .sec[data-sec="theme"] .col:focus-within{border-color:var(--acc);outline:2px solid var(--acc);outline-offset:2px}
  .sec[data-sec="theme"] .col input[type=color]{appearance:none;-webkit-appearance:none;box-sizing:border-box;width:30px;height:30px;padding:0;border:1px solid var(--line);border-radius:9px;background:var(--bg);box-shadow:0 1px 3px #0002;outline:none}
  .sec[data-sec="theme"] .col input[type=color]::-webkit-color-swatch-wrapper{padding:0}
  .sec[data-sec="theme"] .col input[type=color]::-webkit-color-swatch{border:0;border-radius:8px}
  .sec[data-sec="theme"] .col input[type=color]::-moz-color-swatch{border:0;border-radius:8px}
  @media(prefers-reduced-motion:reduce){.sec[data-sec="theme"] .col{transition:none}}
.fld{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0;font-size:12px}
.fld input[type=text],.fld select{width:150px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:12px}
.fld input[type=range]{width:130px;accent-color:var(--acc)}
.val{color:var(--mut);min-width:26px;text-align:right}
.sm{border:1px solid var(--line);background:var(--chip);color:var(--fg);border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer}
.sm:hover{border-color:var(--acc)}
.row2{display:flex;gap:6px}
.tg{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);cursor:pointer}
.tg.sub{padding-left:16px}
.tg:last-of-type{border-bottom:none}
.tg b{display:block;font-size:13px;font-weight:600} .tg span{display:block;font-size:11px;color:var(--mut);margin-top:1px}
.tg input{display:none}
.sl{flex:none;width:36px;height:20px;border-radius:10px;background:#cbd5e1;position:relative;transition:background .18s}
.sl:after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .18s;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.tg input:checked+.sl{background:var(--acc)} .tg input:checked+.sl:after{transform:translateX(16px)}
.tg.off{opacity:.45;pointer-events:none}
.ft{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;border-top:1px solid var(--line);font-size:11px;color:var(--mut)}
kbd{background:var(--chip);border:1px solid var(--line);border-radius:5px;padding:1px 5px;font:600 10px system-ui}
.inl{display:flex;align-items:center;gap:6px}
.mt{margin-top:14px}
.fl{flex:1}
.chk{display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer}
.wide{width:100%;margin-top:6px}
[hidden]{display:none!important}
.stat{padding:8px 10px;border-radius:10px;background:var(--chip);font-size:11px;color:var(--mut);margin-top:12px;word-break:break-word}
`;
        const host = document.createElement('div');
        host.id = 'rc-kit';
        host.style.cssText = 'position:fixed;left:0;bottom:0;z-index:2147483647;';
        const root = host.attachShadow({ mode: 'open' });   // shadow DOM: CSS của trang (tailwind !important...) không lọt vào được
        root.innerHTML = `
<div class="w">
  <div class="panel" id="panel">
    <div class="hd"><div><b>🎨 Ultimate RC</b><small>v2.0.0</small></div><button class="x" id="rk-close" title="Đóng (Esc)">✕</button></div>
    <div class="tabs"><button class="tab" data-tab="theme">Giao diện</button><button class="tab" data-tab="feat">Tính năng</button><button class="tab" data-tab="ocr">OCR</button><button class="tab" data-tab="music">Nhạc</button></div>
    <div class="body"><div class="sec" data-sec="music">
    <h4>YouTube / Spotify</h4><input id="rc-music-url" type="url" placeholder="Dán link bài hát / playlist" style="box-sizing:border-box;width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg)">
    <div class="row2 mt"><button class="sm fl" id="rc-music-load">Mở trình phát</button><button class="sm" id="rc-music-stop">Dừng</button></div>
    <div class="stat" id="rc-music-status">Không tự phát khi tải trang. Spotify có thể chỉ phát bản nghe thử; một số video không cho nhúng.</div>
    <a id="rc-music-external" target="_blank" rel="noopener noreferrer" hidden>Mở trên dịch vụ gốc ↗</a></div>
      <div class="sec" data-sec="theme">
        <h4>Bộ màu nhanh</h4>
        <div class="presets">${PRESETS.map((p, i) => `<button class="pre" data-pre="${i}"><span class="sw">${['primary', 'userBubble', 'botBubble', 'pageBg'].map(k => `<i data-c="${p.c[k]}"></i>`).join('')}</span>${p.n}</button>`).join('')}</div>
        <div class="row2" style="margin-bottom:16px"><button class="sm fl" id="theme-export">Xuất theme</button><button class="sm fl" id="theme-import">Nhập theme</button></div>
        <input type="file" id="theme-file" accept="application/json,.json" hidden>
        <h4>Tuỳ chỉnh màu</h4>
        <div class="grid">${COLOR_KEYS.map(([k, l]) => `<label class="col"><input type="color" data-k="${k}" value="${cfg[k]}">${l}</label>`).join('')}</div>
        <h4>Chữ</h4>
        <div class="fld"><span>Cỡ chữ</span><span class="inl"><input type="range" data-k="fontSize" min="12" max="22" value="${cfg.fontSize}"><span class="val" id="fsv">${cfg.fontSize}px</span></span></div>
        <div class="fld"><span>Font</span><input type="text" data-k="fontFamily" value="${esc(cfg.fontFamily)}" placeholder="VD: Segoe UI"></div>
        <h4 class="mt">Ảnh / video nền</h4>
        <div class="fld"><span>Link</span><input type="text" data-k="bgImage" value="${/^(data:|rc-vid:)/.test(cfg.bgImage) ? '' : esc(cfg.bgImage)}" placeholder="${/^(data:|rc-vid:)/.test(cfg.bgImage) ? '(đã tải lên)' : 'https://… ảnh, GIF, WebP, MP4, WebM'}"></div>
        <div class="fld"><span>Làm mờ</span><input type="range" data-k="bgBlur" min="0" max="20" value="${cfg.bgBlur}"></div>
        <div class="row2"><button class="sm fl" id="up">Tải ảnh/video lên</button><button class="sm fl" id="clearbg">Xoá ảnh nền</button></div>
        <label class="tg" data-tg="autoTheme"><div><b>Tự phối màu theo ảnh nền</b><span>Đổi ảnh nền → theme tự đổi màu cho hợp</span></div><input type="checkbox" data-k="autoTheme" ${cfg.autoTheme ? 'checked' : ''}><i class="sl"></i></label>
        <label class="tg" data-tg="glass"><div><b>Kiểu kính mờ (nền trang chat)</b><span>Ảnh làm nền trang chat, khung chat thành kính mờ</span></div><input type="checkbox" data-k="glass" ${cfg.glass ? 'checked' : ''}><i class="sl"></i></label>
        <div class="fld"><span>Độ mờ kính</span><input type="range" data-k="glassBlur" min="0" max="30" value="${cfg.glassBlur}"></div>
        <div class="fld"><span>Độ đặc của kính</span><input type="range" data-k="glassAlpha" min="15" max="90" value="${cfg.glassAlpha}"></div>
        <div class="fld"><label for="rk-palette-mode">Image theme</label><select id="rk-palette-mode" data-k="imageThemeMode"><option value="dark" ${cfg.imageThemeMode !== 'light' ? 'selected' : ''}>Dark theme</option><option value="light" ${cfg.imageThemeMode === 'light' ? 'selected' : ''}>Light theme</option></select></div>
        <button class="sm fl wide" id="rk-pal">Lấy màu từ ảnh nền ngay</button>
        <input type="file" id="file" accept="image/*,video/mp4,video/webm,.gif,.webp,.mp4,.webm" hidden>
      </div>
      <div class="sec" data-sec="feat">
        <h4>Chặn của trang</h4>
        ${TOGGLES.filter(t => ['antiPaste', 'antiCopy'].includes(t[0])).map(tgHtml).join('')}
        <h4 class="mt">Chat</h4>
        ${TOGGLES.filter(t => ['enterSend'].includes(t[0])).map(tgHtml).join('')}
        <div class="fld mt"><span>Chế độ bài tập: Enter =</span>
          <select data-k="exerciseIntent"><option value="active" ${cfg.exerciseIntent !== 'submit' ? 'selected' : ''}>nút đang chọn</option><option value="submit" ${cfg.exerciseIntent === 'submit' ? 'selected' : ''}>Nộp câu trả lời</option></select></div>
        <h4 class="mt">Giao diện</h4>
        ${TOGGLES.filter(t => ['siteWide'].includes(t[0])).map(tgHtml).join('')}
      </div>
      <div class="sec" data-sec="ocr">
        ${TOGGLES.filter(t => OCR_KEYS.includes(t[0])).map(tgHtml).join('')}
        <h4 class="mt">Động cơ OCR</h4>
        <div class="fld"><span>Ngôn ngữ đọc</span><span class="inl"><label class="chk"><input type="checkbox" data-k="ocrVie" ${cfg.ocrVie !== false ? 'checked' : ''}>Tiếng Việt</label><label class="chk"><input type="checkbox" data-k="ocrEng" ${cfg.ocrEng !== false ? 'checked' : ''}>English</label></span></div>
        <div class="fld"><span>Luồng song song</span>
          <select data-k="ocrThreads">${[[0, 'Tự động (theo ảnh / RAM)'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [6, '6'], [8, '8']].map(([v, l]) => `<option value="${v}" ${+cfg.ocrThreads === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <label class="tg" data-tg="ocrHub"><div><b>Giữ OCR sẵn trong nền</b><span>Tái sử dụng worker; không mở tab phụ</span></div><input type="checkbox" data-k="ocrHub" ${cfg.ocrHub ? 'checked' : ''}><i class="sl"></i></label>
        <div class="fld"><span>Giải phóng worker sau</span>
          <select data-k="hubIdle">${[[3, '3 phút'], [10, '10 phút'], [30, '30 phút'], [0, 'Không tự đóng']].map(([v, l]) => `<option value="${v}" ${+cfg.hubIdle === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <button class="sm wide" id="rk-hubclose">Giải phóng OCR</button>
        <button class="sm wide" id="rk-probe">Dò nguồn LaTeX trong các tin nhắn</button>
        <div class="stat" id="stat"></div>
      </div>
    </div>
    <div class="ft"><span>Mở/đóng: <kbd>Alt</kbd>+<kbd>C</kbd> · Đóng: <kbd>Esc</kbd></span><button class="sm" id="rk-reset">Đặt lại</button></div>
  </div>
  <div class="dock"><button class="btn gear" id="gear" title="Cài đặt (Alt+C)"><img alt="Ultimate RC" width="28" height="28" style="display:block;object-fit:contain;pointer-events:none" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAiWSURBVGhD7VlraFXLFT7GV32/jdFkz1qzz4kxFV/xVf/Exx8f0Fuxhqr1ieCLqlCqIDX2h0LVHwoVCra0Wl+orVh/XEqF6q2giFxfFRXUJl6xVW9oNBEljXHKN+zZ7LPO3icn9/YWC36wOGfPmTPzrTVrrVkzO5X6iI/4sMHMC5j5D1rrz7TWvy4rK5so+3yQUEp9S2v9q3Q6bSC+79tPrXUrEX1X9v+fYuTIkX201rWBVa9qrX+nlPoOMxdrrful0+m+RPRXEGbmLIEiRPQCfeS43xgqKioGMXN5aWnpQKUUMfPdTCZjyTjLghwRNYMcM9ehXZKPKqGUmiHn+a+DmX/MzJ8z87+Y+T0zNxDRsyRyWutQ5G9SASKqwRy+75f5vl/DzD/UWo+WHL4yiOi3zsqOUCHk8olSCsTdGJ8T0U+ZudnFidYaRvplKpUqknw6BKXU9Dj/7aiA8IgRI8yAAQOs4PvQoUNNWVlZ6H7SIDCaUupnklOHQES1HVUAli0tLTVDhgwx/fr1s4TxPGHCBLNmzRpz8uRJc+PGDXPu3DlTUVFhlZBjQAKFGhBvklfBIKI/J/l5VIYPH24GDhxo+vbta4lXVlaaBQsWmD179liit2/fNs3NzUZi2bJlZtCgQTnjRZXQWtcrpb4nubULz/NKiKhFLm10cM/zLPFJkyaZ1atXm/3795uLFy+aFy9eSK5ZaGlpMVeuXDFjx461qyPHjopzL9/3qyTHvNBae8zclqQA/Bpy4MAB8/r1a8kxC69evTK3bt0yx44dM4sXLzbTpk2zcQDySeNHBW5MREckx/bQmZlvJLkQLL9ixQrJ1eLRo0fmxIkTZt26daaqqsoGbCqVCgXkobwcM0kCV2pSSq2UJPNCKTU/TgEM2KNHDzN//vyQ9JMnT8yiRYvM6NGjTdeuXbMIQzp16mR69epliRdidSn4D1aiQ0ow8/fjFMBAIAPLuuB88OBBFuEuXbqY/v37m2HDhllXQXaKS5cdkYDLP0pKSnpKrrEgop/EpVG0gRyIgjjQ1NRk3QptxcXFYT9H+usQj0oQ0N+WXGPBzOuSFHBkL126FLrR5MmTbe4PdtOc/2EVoJzbH/As+xQiWuuM5BoLIhqJ2keSgVVBBAocPHgwVGD79u2WWLQvfB59sUfgc/bs2TZzbd261abhjigR1E5/q66u7iK5JkIp9XMZB3iGX0OB5cuXhwocPXrUWhfEEB8gjU1u1qxZZufOnebatWvm/fv3Yf+FCxeawYMH5xBNkiCd/khyzAsEDLb06CrgO0oAKDBlypSQ0IULF2zwwupz5swxe/fuNTdv3swi7YCYmTp1qlVUEo0TzElEX1ZWVvaWHPPC9/1pWuuWmMGsAiDw5s0bSwo78OHDh8PAjsP169fNjh07zMSJE015ebkdD6uGvUG6alQC62+R/NoFEZ2XLuSUgLWhBKycD1evXjW1tbW2dED/6upqu1ovX7409+7dM/v27TOjRo2yiSFOiaCtMZVKFe77AI6HceQhaO/Zs6cldOjQoSzC2BvOnz9vAxUbW3R/2L17d1ZfB+ze8+bNs0kgTglmbtVa/6lDhR0RHY1LoxC0I0hBasuWLSERlMsuwKWg2Iuirq7OvHv3LnyGKyJLoaKNUwJGKziQ0+n0ECJqihvIDeZqHFjO4ciRIznEIRs2bAj7AIiD7t2721i4c+dO2H737l2buZJqpYDPv9PpdKnknAVmnpxE3g3kLI2AdpaET6PuiZIfP358+Htra6tZv359joL3798PlUCNlS+9wnhKqR9IzlnwPFTTuX+OKgArYfKioiJrOaCtrc2MGzcuJAZlEMQOCFxUqdg/Vq5caVatWmU2btyY1ef06dM2oOWcUQWIaJnknANm/mNSDDhxlefx48dDAkuXLg0ViLpXoaivr7ebYZwbBV7xGlWC5JsDpVR/Zq5PciVYAmU1iCLjOOC7U+Ds2bNZ5ArBmTNnbCDHlRkBl/p0Ot1d8s0BtNRaN+ZToE+fPjmWRkmBNqTZ58+f27a3b9+aGTNm2H44CMF98AlZsmSJ9XuUFjgn40YCKyDni86L+yPJNwdE9Pt8LhStSseMGRMqcPnyZduG4s3t0g8fPswK2qh07tw5DHwo3d6hJzjY7Jd8JXCkrGtvIGQLTIwNqLGx0ZLFGRjlQe/evcPzckNDg7UsiOIsAcXxX3ebgdXZtWuXmTt3rk2jci45LxHtlIQlipj57/kUiO4FEFjewe3A2JEdnj59astvZB2kUmSjbdu2mVOnToUnO9RTUDTpvsjNS0SfSMI5IKJj+VwIA5WUlIQKwIq4LsGO67ITLrSQ+wvF48eP7dhJMQCD4vIYG63kmwPf99PM/DxpFaAAqkjp01KmT59uT275FIHlkbFmzpxpz9FyrqjgvsrzPC35xgKBnFTQQTEstdx5XZUqBePU1NSYtWvXms2bN5tNmzbZCzEceBBD6IPPfKvu5iWiKZJrLHA/Cp+Ug7iB8CmvUXBj4bJTRwUBnGSwiLTBOyTXWOBtCzP/M2oVEA8C6Uu0I9tESXTr1s1aEa7gNrpCBCk0hmyWBPPeSaVSnSTXRHieV6m1vsDM7wKrf4EbCyLailOVvHlDCsVEThAnLl1idUDUCTZCuI3z+6R4cwJv0FpvlhwLAq4zMpnM2OLi4l54VkrZaxdMiltmEEKOl0SgBPpBooo5ce2SrFtpfEICV75SVVXVVXL7Skin0767AI4Scs9RIkHgvWzPwlGliegLIrqF4k1r/QxvO1GfSR5fC8y8PmrFYJdsYubPcPAIyD8joo24UQMZt2pScads8HujqzgrKipKvtG3mURUzcy/wZlVa/0LxAzaM5kMfG5c1Gqe501g5k9xVcPMeJN5gplXBy8RofBbrfVflFLjsib50OB53gC8S462lZeXM95LRNs+4v8F/wHyX6fIHWH5agAAAABJRU5ErkJggg=="></button><button class="btn pill" id="pill"><i class="dot"></i><span id="pt">OCR</span></button></div>
</div>`;
        // CSP của EduNext chặn <style> inline → dùng constructable stylesheet (không bị CSP style-src chặn)
        try {
            const sheet = new CSSStyleSheet(); sheet.replaceSync(KIT_CSS);
            root.adoptedStyleSheets = [sheet];
        } catch (e) {
            const st = document.createElement('style'); st.textContent = KIT_CSS; root.prepend(st);
        }
        document.body.appendChild(host);
        applyDashboardTheme();
        root.querySelectorAll('i[data-c]').forEach(i => { i.style.background = i.dataset.c; });
        const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
        const panel = $('#panel'), pill = $('#pill'), stat = $('#stat');
        // Theme files intentionally exclude OCR, clipboard and other behavior settings.
        const themeKeys = ['primary','userBubble','botBubble','chatBg','msgBg','panelBg','pageBg','fontSize','fontFamily','bgImage','bgBlur','autoTheme','glass','glassBlur','glassAlpha','siteWide'];
        const colors = [...themeKeys.slice(0,7), 'dashboardBg'];
        themeKeys.push('dashboardBg', 'imageThemeMode');
        const ranges = {fontSize:[12,22],bgBlur:[0,20],glassBlur:[0,30],glassAlpha:[15,90]};
        const dataMedia = /^data:(?:image\/(?:png|jpeg|gif|webp|avif)|video\/(?:mp4|webm));base64,[A-Za-z0-9+/]*={0,2}$/;
        const validateTheme = doc => {
            if(!doc || doc.format !== 'ultimate-rc-theme' || doc.version !== 1 || !doc.theme || typeof doc.theme !== 'object' || Array.isArray(doc.theme)) throw Error('File theme không đúng định dạng hoặc phiên bản.');
            if(Object.keys(doc).some(k=>!['format','version','theme','video'].includes(k)))throw Error('File có trường không hợp lệ.');
            // Older portable themes do not contain the dashboard color.
            const t={dashboardBg:cfg.dashboardBg || DEFAULTS.dashboardBg, imageThemeMode:cfg.imageThemeMode || 'dark'};
            for(const [k,v] of Object.entries(doc.theme)) {
                if(!themeKeys.includes(k))throw Error('Thuộc tính không hợp lệ: '+k);
                let ok;
                if(colors.includes(k))ok=typeof v==='string' && /^#[\da-f]{6}$/i.test(v);
                else if(ranges[k])ok=Number.isFinite(v) && v>=ranges[k][0] && v<=ranges[k][1];
                else if(['autoTheme','glass','siteWide'].includes(k))ok=typeof v==='boolean';
                else if(k==='imageThemeMode')ok=v==='dark' || v==='light';
                else if(k==='fontFamily')ok=typeof v==='string' && v.length<=160 && /^[\p{L}\p{N}\s,"'-]*$/u.test(v);
                else if(k==='bgImage') {
                    ok=typeof v==='string' && (v==='' || v===VID_LOCAL || dataMedia.test(v));
                    if(!ok && typeof v==='string')try {const u=new URL(v);ok=['https:','http:'].includes(u.protocol)&&!/[\s'"\\<>]/.test(v);}catch{}
                }
                if(!ok)throw Error('Giá trị không hợp lệ: '+k);
                t[k]=v;
            }
            if(themeKeys.some(k=>!Object.hasOwn(t,k)))throw Error('File thiếu thiết lập theme.');
            if(t.bgImage===VID_LOCAL && (typeof doc.video!=='string' || !/^data:video\/(mp4|webm);base64,/.test(doc.video) || !dataMedia.test(doc.video) || doc.video.length>Math.ceil(VID_MAX/3)*4+100))throw Error('Video thiếu, sai định dạng hoặc quá 14 MB.');
            if(t.bgImage!==VID_LOCAL && doc.video!==undefined)throw Error('Video không khớp theme.');
            return t;
        };
        $('#theme-export').addEventListener('click',async()=>{
            try {
                await RC.flush();
                const doc={format:'ultimate-rc-theme',version:1,theme:Object.fromEntries(themeKeys.map(k=>[k,cfg[k]]))};
                if(cfg.bgImage===VID_LOCAL)doc.video=GM_getValue(VID_KEY,'');
                validateTheme(doc);
                const blob=new Blob([JSON.stringify(doc,null,2)],{type:'application/json'});
                if(blob.size>25*1024*1024)throw Error('Theme quá 25 MB. Hãy dùng ảnh/video nhỏ hơn.');
                const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Ultimate-RC-theme.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
                toast('Đã xuất theme, kèm nền đã tải lên.');
            }catch(e){toast(e.message);}
        });
        $('#theme-import').addEventListener('click',()=>$('#theme-file').click());
        $('#theme-file').addEventListener('change',async e=>{
            const file=e.target.files[0];e.target.value='';if(!file)return;
            try {
                if(file.size>25*1024*1024)throw Error('File theme tối đa 25 MB.');
                const doc=JSON.parse(await file.text()),theme=validateTheme(doc);
                // Validate the entire file before changing any stored value.
                await RC.themeImport({...cfg,...theme,autoFor:theme.bgImage},doc.video);
                location.reload();
            }catch(e){toast('Không nhập được: '+e.message);}
        });
        const paintRange = e => {if(e?.type==='range')e.style.setProperty('--fill',100*(+e.value-(+e.min))/(+e.max-(+e.min))+'%');};
        $$('input[type=range]').forEach(paintRange);
        root.addEventListener('input',e=>paintRange(e.target));


        function musicLink(raw) {
            let u; try { u=new URL(raw.trim()); } catch (_) { throw Error('Dán link HTTPS của YouTube hoặc Spotify.'); }
            if(u.protocol!=='https:' || u.username || u.password || u.port) throw Error('Link không hợp lệ.');
            const h=u.hostname.toLowerCase();
            if(h==='open.spotify.com') {
                const m=u.pathname.match(/^\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{22})\/?$/);
                if(!m)throw Error('Dùng link chia sẻ đầy đủ từ open.spotify.com.');
                return {src:'https://open.spotify.com/embed/'+m[1]+'/'+m[2],url:'https://open.spotify.com/'+m[1]+'/'+m[2],name:'Spotify',height:352};
            }
            let id,list;
            if(h==='youtu.be')id=u.pathname.slice(1);
            else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','www.youtube-nocookie.com'].includes(h)) {
                if(u.pathname==='/watch')id=u.searchParams.get('v');
                else id=u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})\/?$/)?.[1];
                list=u.searchParams.get('list');
            } else throw Error('Chỉ hỗ trợ link YouTube và open.spotify.com.');
            if(id && !/^[\w-]{11}$/.test(id))throw Error('ID video không hợp lệ.');
            if(list && !/^[\w-]{10,100}$/.test(list))throw Error('Playlist không hợp lệ.');
            if(!id && !list)throw Error('Không tìm thấy video hoặc playlist trong link.');
            const src=new URL('https://www.youtube.com/embed/'+(id||'videoseries'));
            src.searchParams.set('playsinline','1'); if(list)src.searchParams.set('list',list);
            return {src:src.href,url:id?'https://www.youtube.com/watch?v='+id:'https://www.youtube.com/playlist?list='+list,name:'YouTube',height:220};
        }
        const musicInput=$('#rc-music-url'),musicStatus=$('#rc-music-status');
        musicInput.value=typeof cfg.musicUrl==='string'?cfg.musicUrl:'';
        const musicBox=document.createElement('div');musicBox.hidden=true;
        musicBox.style.cssText='position:fixed;right:16px;bottom:16px;width:min(380px,calc(100vw - 32px));background:var(--bg,#111827);color:var(--fg,#fff);border:1px solid var(--line,#475569);border-radius:12px;box-shadow:0 0 16px #0006;overflow:hidden;z-index:10';
        const musicBar=document.createElement('div');musicBar.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px 6px';
        const musicName=document.createElement('span'),musicClose=document.createElement('button');musicClose.className='sm';musicClose.textContent='Dừng ×';
        musicName.style.cssText='font:600 13px system-ui;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:1';
        const clock=document.createElement('span');clock.textContent='0:00 / —';clock.style.cssText='font:11px system-ui;font-variant-numeric:tabular-nums;white-space:nowrap;color:var(--mut)';
        const expand=document.createElement('button');expand.className='sm';expand.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 15 6-6 6 6"/></svg>';expand.style.cssText='display:grid;place-items:center;width:32px;height:32px;flex:0 0 32px;padding:0;line-height:0';
        const playIcon='<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 5.8c0-.8.9-1.3 1.6-.9l10 6.2a1 1 0 0 1 0 1.8l-10 6.2c-.7.4-1.6-.1-1.6-.9z"/></svg>';
        const pauseIcon='<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>';
        const play=document.createElement('button');play.className='sm';play.innerHTML=playIcon;play.title='Phát / tạm dừng';play.setAttribute('aria-label','Phát');play.style.cssText='display:grid;place-items:center;width:38px;height:38px;flex:0 0 38px;padding:0;border-radius:11px;line-height:0';play.disabled=true;
        const seek=document.createElement('input');seek.type='range';seek.min=0;seek.max=100;seek.value=0;seek.step=0.1;seek.disabled=true;seek.setAttribute('aria-label','Tua nhạc');seek.style.cssText='width:100%;margin:0;accent-color:var(--acc,#60a5fa);--fill:0%;background:linear-gradient(to right,var(--acc,#60a5fa) var(--fill),#60646c var(--fill))';
        const controls=document.createElement('div');controls.style.cssText='display:flex;gap:10px;align-items:center;padding:0 14px 12px';controls.append(play,seek);
        musicClose.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg>';musicClose.style.cssText=expand.style.cssText;musicClose.title='Dừng và đóng';musicClose.setAttribute('aria-label','Dừng và đóng nhạc');
        const minimize=document.createElement('button');minimize.className='sm';minimize.id='rc-music-minimize';minimize.title='Thu nhỏ trình phát';minimize.setAttribute('aria-label',minimize.title);minimize.style.cssText=expand.style.cssText;
        minimize.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 12h12"/></svg>';
        const musicMini=document.createElement('button');musicMini.id='rc-music-mini';musicMini.title='Mở lại trình phát';musicMini.setAttribute('aria-label',musicMini.title);
        musicMini.style.cssText='display:none;position:fixed;right:16px;bottom:16px;width:48px;height:48px;padding:0;place-items:center;background:var(--bg,#111827);color:var(--fg,#fff);border:1px solid var(--line,#475569);border-radius:10px;box-shadow:0 0 16px #0006;cursor:pointer;z-index:10';
        musicMini.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/></svg>';
        minimize.addEventListener('click',()=>{musicBox.hidden=true;musicMini.style.display='grid';musicMini.focus();});
        musicMini.addEventListener('click',()=>{musicMini.style.display='none';musicBox.hidden=false;minimize.focus();});
        musicBar.append(musicName,clock,expand,minimize,musicClose);musicBox.append(musicBar,controls);root.querySelector('.w').append(musicBox,musicMini);
        let controller=null,provider='',paused=true,duration=0,poll=null,generation=0,expanded=false;
        const fmt=s=>Number.isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'—';
        const update=(pos,dur,isPaused)=>{duration=Number(dur)||0;paused=!!isPaused;clock.textContent=fmt(Number(pos)||0)+' / '+(duration?fmt(duration):'—');seek.disabled=duration<=0;seek.max=duration||100;if(!seek.matches(':active')){seek.value=Number(pos)||0;seek.style.setProperty('--fill',100*Number(seek.value)/Number(seek.max)+'%');}const label=paused?'Phát':'Tạm dừng';if(play.getAttribute('aria-label')!==label){play.innerHTML=paused?playIcon:pauseIcon;play.setAttribute('aria-label',label);}};
        function showPlayer(show){expanded=show;if(musicFrame)musicFrame.style.display=show?'block':'none';expand.setAttribute('aria-label',show?'Ẩn video':'Hiện video');expand.firstElementChild.style.transform=show?'rotate(180deg)':'rotate(0deg)';expand.title=show?'Thu gọn trình phát':'Hiện trình phát';expand.setAttribute('aria-expanded',String(show));}
        const apiPromises={};
        function sdk(kind){
            if(kind==='YouTube'&&window.YT?.Player)return Promise.resolve(window.YT);
            if(apiPromises[kind])return apiPromises[kind];
            apiPromises[kind]=new Promise((resolve,reject)=>{
                const callback=kind==='YouTube'?'onYouTubeIframeAPIReady':'onSpotifyIframeApiReady',previous=window[callback];
                const script=document.createElement('script');let timer;
                const fail=()=>{clearTimeout(timer);delete apiPromises[kind];reject(Error('Không tải được trình phát. Thử lại hoặc mở dịch vụ gốc.'));};
                window[callback]=api=>{clearTimeout(timer);try{if(typeof previous==='function')previous(api);}catch(_){}resolve(kind==='YouTube'?window.YT:api);};
                script.src=kind==='YouTube'?'https://www.youtube.com/iframe_api':'https://open.spotify.com/embed/iframe-api/v1';script.onerror=fail;timer=setTimeout(fail,20000);document.head.append(script);
            });return apiPromises[kind];
        }
        let musicFrame=null;
        const stopMusic=()=>{generation++;clearInterval(poll);poll=null;try{controller?.destroy();}catch(_){}controller=null;musicFrame?.remove();musicFrame=null;musicBox.hidden=true;musicMini.style.display='none';play.disabled=true;seek.disabled=true;update(0,0,true);musicStatus.textContent='Đã dừng nhạc.';};
        expand.addEventListener('click',()=>{showPlayer(!expanded);});
        play.addEventListener('click',()=>{if(!controller)return;if(provider==='YouTube'){if(paused){controller.playVideo();}else controller.pauseVideo();}else controller.togglePlay();});
        seek.addEventListener('change',()=>{if(!controller||!duration)return;const seconds=Math.min(duration,Math.max(0,Number(seek.value)));if(provider==='YouTube')controller.seekTo(seconds,true);else controller.seek(seconds);});
        musicClose.addEventListener('click',stopMusic);$('#rc-music-stop').addEventListener('click',stopMusic);
        $('#rc-music-load').addEventListener('click',async()=>{
            try {
                const link=musicLink(musicInput.value);
                stopMusic();const token=generation;cfg.musicUrl=link.url;save();provider=link.name;
                musicName.textContent=link.name;
                musicBox.hidden=false;musicStatus.textContent='Đang tải trình phát…';
                const a=$('#rc-music-external');a.href=link.url;a.hidden=false;
                const api=await sdk(link.name);if(token!==generation)return;
                const mount=document.createElement('div');musicFrame=mount;musicBox.insertBefore(mount,musicBar);
                if(link.name==='YouTube'){
                    const embed=new URL(link.src);controller=new api.Player(mount,{width:'100%',height:220,videoId:embed.pathname.split('/').pop()==='videoseries'?undefined:embed.pathname.split('/').pop(),playerVars:{playsinline:1,origin:location.origin,...(embed.searchParams.get('list')?{listType:'playlist',list:embed.searchParams.get('list')}:{})},events:{
                        onReady:e=>{if(token!==generation){e.target.destroy();return;}controller=e.target;musicFrame=controller.getIframe();musicFrame.title='YouTube player';play.disabled=false;showPlayer(true);controller.playVideo();musicStatus.textContent='Đã yêu cầu phát. Ẩn video vẫn tiếp tục phát nhạc.';poll=setInterval(()=>{if(token!==generation)return;const d=controller.getVideoData();musicName.textContent=d?.title||'YouTube';musicName.title=musicName.textContent;update(controller.getCurrentTime(),controller.getDuration(),controller.getPlayerState()!==1);},500);},
                        onStateChange:e=>{if(token!==generation)return;update(controller.getCurrentTime(),controller.getDuration(),e.data!==1);},
                        onAutoplayBlocked:()=>{if(token===generation)musicStatus.textContent='Trình duyệt chặn tự phát. Bấm nút Play để nghe.';},onError:()=>{if(token===generation)musicStatus.textContent='YouTube không phát được video này. Dùng link dịch vụ gốc bên dưới.';}
                    }});
                }else{
                    api.createController(mount,{uri:link.url,width:'100%',height:152},c=>{if(token!==generation){c.destroy();return;}controller=c;musicFrame=musicBox.querySelector('iframe')||mount;play.disabled=false;showPlayer(false);musicStatus.textContent='Sẵn sàng. Nếu trình duyệt chặn phát, mở rộng player và bấm Play.';
                        c.addListener('ready',()=>{if(token===generation){c.play();musicStatus.textContent='Đã yêu cầu phát. Nếu chưa nghe được, mở player và bấm Play.';}});
                        c.addListener('playback_update',e=>{if(token===generation)update(e.data.position/1000,e.data.duration/1000,e.data.isPaused);});
                    });
                    fetch('https://open.spotify.com/oembed?url='+encodeURIComponent(link.url)).then(r=>r.ok?r.json():null).then(meta=>{if(token===generation&&meta?.title){musicName.textContent=meta.title;musicName.title=meta.title;}}).catch(()=>{});
                }
            } catch(e) { musicStatus.textContent=e.message; }
        });
        musicInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#rc-music-load').click();}});

        const setTab = t => {
            cfg.uiTab = t; save();
            $$('.tab').forEach(b => b.classList.toggle('act', b.dataset.tab === t));
            $$('.sec').forEach(s => s.classList.toggle('act', s.dataset.sec === t));
        };
        setTab(['feat', 'ocr', 'music'].includes(cfg.uiTab) ? cfg.uiTab : 'theme');
        $$('.tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

        root.addEventListener('input', e => {
            const t = e.target, k = t.dataset && t.dataset.k;
            if (!k) return;
            if (t.type === 'checkbox') cfg[k] = t.checked;
            else if (t.type === 'range') cfg[k] = +t.value;
            else if (t.tagName === 'SELECT' && /^\d+$/.test(t.value)) cfg[k] = +t.value;
            else cfg[k] = t.value;
            if ((k === 'ocrVie' || k === 'ocrEng') && !cfg.ocrVie && !cfg.ocrEng) { cfg.ocrVie = true; t.checked = true; if (k === 'ocrVie') { /* giữ lại tick */ } toast('Phải chọn ít nhất 1 ngôn ngữ'); }
            if (k === 'fontSize') $('#fsv').textContent = cfg.fontSize + 'px';
            save(); applyTheme(); try { render(); } catch (_) {}
            if (k === 'wip' && cfg.wip) forceScan();
            if (k === 'glass' && cfg.glass && !cfg.bgImage) toast('⚠ Kiểu kính mờ cần có ảnh nền — hãy dán link hoặc tải ảnh lên');
            if (k === 'qBox' && cfg.replaceBubble) { restoreBubbles(); reapplyAll(); }
            if (k === 'replaceBubble') { if (cfg.replaceBubble) reapplyAll(); else restoreBubbles(); }
        });
        $$('.pre').forEach(b => b.addEventListener('click', () => {
            const p = PRESETS[+b.dataset.pre];
            Object.assign(cfg, p.c); save(); applyTheme();
            COLOR_KEYS.forEach(([k]) => { const i = $('input[data-k="' + k + '"]'); if (i) i.value = cfg[k]; });
            toast('🎨 Bộ màu: ' + p.n);
        }));
        $('#rk-reset')?.addEventListener('click', () => {
            if (!confirm('Đặt lại toàn bộ cài đặt về mặc định?')) return;
            cfg = Object.assign({}, DEFAULTS); save(); RC.flush().then(() => location.reload());
        });
        $('#clearbg')?.addEventListener('click', () => { cfg.bgImage = ''; try { GM_deleteValue(VID_KEY); } catch (e) {} save(); applyTheme(); const i = $('input[data-k="bgImage"]'); if (i) { i.value = ''; i.placeholder = 'https://… ảnh, GIF, WebP, MP4, WebM'; } });
        syncInputs = () => COLOR_KEYS.forEach(([k]) => { const i = $('input[data-k="' + k + '"]'); if (i) i.value = cfg[k]; });
        $('#rk-pal')?.addEventListener('click', () => {
            const src = bgSrc(cfg.bgImage || '');
            if (!cfg.bgImage) toast('Chưa có ảnh nền — hãy dán link hoặc tải ảnh lên trước');
            else if (!src) toast('⏳ Đang tải ảnh nền, bấm lại sau vài giây');
            else autoThemeFrom(src, true);
        });
        $('#rk-probe')?.addEventListener('click', probeLatex);
        $('#rk-hubclose')?.addEventListener('click', () => { closeHub(); toast('Đã yêu cầu giải phóng OCR khi quét xong'); });
        $('#up')?.addEventListener('click', () => $('#file').click());
        $('#file')?.addEventListener('change', e => {
            const f = e.target.files[0];
            if (!f) return;
            const isVid = /^video\//i.test(f.type) || /\.(mp4|webm)$/i.test(f.name);
            if (isVid && f.size > VID_MAX) { toast('❌ Video quá nặng (' + Math.round(f.size / 1048576) + 'MB) — tải lên tối đa ' + Math.round(VID_MAX / 1048576) + 'MB, hoặc dùng link'); e.target.value = ''; return; }
            const rd = new FileReader();
            rd.onload = () => {
                if (isVid) {
                    try { GM_setValue(VID_KEY, rd.result); } catch (err) { toast('❌ Không lưu được video: ' + (err && err.message || err)); return; }
                    delete bgCache[VID_LOCAL]; delete bgVid[VID_LOCAL];
                    cfg.bgImage = VID_LOCAL; save(); applyTheme(); toast('🎬 Đã đặt video nền');
                } else { cfg.bgImage = rd.result; save(); applyTheme(); toast(f.type === 'image/gif' || f.type === 'image/webp' ? '🖼️ Đã đặt ảnh nền (ảnh động chạy được)' : '🖼️ Đã đặt ảnh nền'); }
                e.target.value = '';
            };
            rd.readAsDataURL(f);
        });

        const togglePanel = on => { panel.classList.toggle('open', on === undefined ? !panel.classList.contains('open') : on); };
        $('#gear')?.addEventListener('click', () => togglePanel());
        $('#rk-close')?.addEventListener('click', () => togglePanel(false));
        window.addEventListener('keydown', e => {
            if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyC') { e.preventDefault(); togglePanel(); }
            else if (e.key === 'Escape' && panel.classList.contains('open')) togglePanel(false);
        }, true);

        // trạng thái WIP + tiến độ quét
        const render = () => {
          try {
            const working = busy || queue.length > 0;
            pill.className = 'btn pill' + (working ? ' busy' : cfg.wip ? ' on' : '');
            $('#pt').textContent = working ? 'OCR…' : 'OCR';
            pill.title = cfg.wip ? 'Tự quét ảnh: BẬT · click để tắt · chuột phải: quét ép tin mới nhất' : 'Tự quét ảnh: tắt · click để bật';
            const hubTxt = hubAlive() ? 'OCR nền: ' + GM_getValue('rc_ocr_hub_info', '') : 'OCR nền sẵn sàng · không mở tab phụ';
            stat.textContent = (working ? '🔎 Đang quét ' + queue.length + ' ảnh… · ' : '') + hubTxt + (working ? '' : ' · Gần nhất: ' + lastPreview + (lastPreview.length >= 120 ? '…' : ''));
            $$('.tg.sub').forEach(t => t.classList.toggle('off', !cfg.wip));
          } catch (e) { log('⚠ render UI lỗi:', e); try { stat.textContent = '⚠ ' + (e && e.message || e); } catch (_) {} }
        };
        pill.addEventListener('click', () => {
            cfg.wip = !cfg.wip; save(); render();
            const cb = $('input[data-k="wip"]'); if (cb) cb.checked = cfg.wip;
            toast(cfg.wip ? '🔎 OCR bật: tự quét ảnh mới' : '🔎 OCR tắt');
            if (cfg.wip) forceScan();
        });
        pill.addEventListener('contextmenu', e => { e.preventDefault(); forceScan(); });

        setInterval(render, 800);
        render();
    }
// EduNext owns the original image nodes; retain them for React reconciliation.
(() => {
  const icons = {
    'Account avatar': ['user', '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'],
    'Home': ['house', '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'],
    'Assignments': ['file-text', '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>'],
    'Upcoming slots': ['calendar-clock', '<path d="M16 14v2.2l1.6 1"/><path d="M16 2v3"/><path d="M21 7.338V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2.338"/><path d="M3 9h5.859"/><path d="M8 2v3"/><circle cx="16" cy="16" r="6"/>'],
    'User guide': ['book-open-text', '<path d="M12 5v16"/><path d="M16 13h2"/><path d="M16 9h2"/><path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"/><path d="M6 13h2"/><path d="M6 9h2"/>'],
    'Contact Support': ['headset', '<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/>'],
    'Frequently Asked Questions': ['circle-question-mark', '<circle cx="12" cy="12" r="10"/><path d="M9 9.5a3 2.5 0 016 0c0 2-2 2-3 3.5"/><path d="M12 17h.01"/>'],
  };
  const aliases = {Account: 'Account avatar', Support: 'Contact Support', FAQ: 'Frequently Asked Questions'};
  const owned = new WeakMap();
  const offsets = new WeakMap();
  const observed = new WeakSet();
  function centerIcons() {
    document.querySelectorAll('.left-navigation').forEach(nav => {
      const bounds = nav.getBoundingClientRect();
      if (!bounds.width) return;
      const center = bounds.left + bounds.width / 2;
      nav.querySelectorAll('.rc-nav-svg').forEach(svg => {
        const rect = svg.getBoundingClientRect();
        if (!rect.width) return;
        const offset = (offsets.get(svg) || 0) + center - rect.left - rect.width / 2;
        offsets.set(svg, offset);
        const verticalOffset = svg.classList.contains('lucide-user') ? 8 : 0;
        svg.style.setProperty('translate', `${offset}px ${verticalOffset}px`, 'important');
      });
    });
  }
  const layoutObserver = new ResizeObserver(centerIcons);
  // Account lives in a menu label, unlike the other items' centered icon slots.
  // Preserve its original 32px avatar footprint and center that label even after
  // the site's menu stylesheet finishes loading.
  const accountSheet = new CSSStyleSheet();
  accountSheet.replaceSync(`
    .left-navigation .ps-menu-button:has(.ps-menu-icon .rc-nav-svg) > .ps-menu-label {
      display:none !important;
    }
    .left-navigation .ps-menu-button:has(.rc-nav-svg) {
      padding-inline:0 !important; justify-content:center !important;
      align-items:center !important;
    }
    .left-navigation .ps-menu-icon:has(.rc-nav-svg) {
      margin-inline:0 !important; display:flex !important;
      justify-content:center !important; align-items:center !important;
      flex-shrink:0 !important;
    }
    .left-navigation .ps-menu-label:has(img:is([alt="Account avatar"], [alt="Account"])) {
      flex:1 1 auto !important; width:100% !important; text-align:center !important;
    }
    .left-navigation [role="button"]:has(> img:is([alt="Account avatar"], [alt="Account"])) {
      width:100% !important; text-align:center !important;
      display:flex !important; flex-direction:column !important; align-items:center !important;
    }
    .left-navigation .rc-nav-svg.lucide-user {
      display:block !important; box-sizing:content-box !important;
      width:24px !important; height:24px !important; padding:4px !important;
      margin:0 !important; vertical-align:middle !important;
    }
  `);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, accountSheet];
  function scan() {
    document.querySelectorAll('.left-navigation, .left-navigation .ps-menu-button').forEach(el => {
      if (!observed.has(el)) { observed.add(el); layoutObserver.observe(el); }
    });
    document.querySelectorAll('.left-navigation img[alt]').forEach(img => {
      const label = img.getAttribute('alt');
      const key = aliases[label] || label;
      const icon = Object.hasOwn(icons, key) && icons[key];
      const previous = owned.get(img);
      if (!icon) {
        if (previous) { previous.svg.remove(); img.style.display = previous.display; owned.delete(img); }
        return;
      }
      if (previous?.key === key && img.nextElementSibling === previous.svg) return;
      previous?.svg.remove();
      const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${icon[0]} preview-icon rc-nav-svg">${icon[1]}</svg>`;
      const svg = document.importNode(new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement, true);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', label);
      svg.setAttribute('focusable', 'false');
      svg.style.cssText = 'width:24px;height:24px;flex-shrink:0;vertical-align:middle;pointer-events:none';
      owned.set(img, {key, svg, display: previous?.display ?? img.style.display});
      img.after(svg);
      img.style.display = 'none';
    });
    centerIcons();
  }
  function start() {
    scan();
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; scan(); });
    }).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['alt', 'class']});
    window.addEventListener('resize', centerIcons);
    document.fonts?.ready.then(centerIcons);
  }
  document.body ? start() : document.addEventListener('DOMContentLoaded', start, {once:true});
})();

    whenBody(initUI);

    log('Ultimate RC tools v2.0.0 sẵn sàng');
})();