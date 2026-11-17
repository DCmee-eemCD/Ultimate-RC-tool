// OCR result toolbar: left-aligned SVG copy / original-image buttons.
const icon = path => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const COPY = icon('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>');
const PICTURE = icon('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>');
const TEXT = icon('<path d="M5 5h14M12 5v14M8 19h8"/>');
const CHECK = icon('<path d="m5 12 4 4L19 6"/>');
const label = (svg, text) => JSON.stringify(svg + `<span>${text}</span>`);

const CSS = `.rc-ocr-bar { display:flex; align-items:center; justify-content:flex-start; flex-wrap:wrap; gap:6px; margin:8px 12px 0; padding:6px 0 8px; border-top:1px solid color-mix(in srgb,currentColor 12%,transparent); }
 .rc-ocr-bar button { display:inline-flex !important; align-items:center; gap:8px; border:0 !important; background:transparent !important; color:inherit !important; box-shadow:none !important; border-radius:10px; padding:10px 16px; font:500 14px/1.4 system-ui !important; cursor:pointer; opacity:.75; transition:background .15s,opacity .15s; }
 .rc-ocr-bar button svg { flex:none; stroke:currentColor !important; fill:none !important; }
 .rc-ocr-bar button:hover { opacity:1; background:color-mix(in srgb,currentColor 14%,transparent) !important; }
 .rc-ocr-bar button:focus-visible { outline:2px solid currentColor; outline-offset:2px; }
 .rc-fidelity-note { flex-basis:100%; font-size:11px; opacity:.7; }`;

export function ocrToolbar(p) {
  p.regex(/(<button type="button" data-a="copy">)[^<]*(<\/button>)/,
    `<button type="button" data-a="copy" title="Sao chép nội dung">${COPY}<span>Sao chép</span></button>`);
  p.regex(/(<button type="button" data-a="img">)[^<]*(<\/button>)/,
    `<button type="button" data-a="img" aria-pressed="false">${PICTURE}<span>Ảnh gốc</span></button>`);
  // Copy shows a check mark for 1.5 s.
  p.regex(/if \(b.dataset.a === 'copy'\) \{[^\n]*return; \}/,
    `if (b.dataset.a === 'copy') { GM_setClipboard(box.dataset.text || body.textContent, 'text'); clearTimeout(b._rcTimer); b.innerHTML=${label(CHECK, 'Đã chép')}; b._rcTimer=setTimeout(()=>{b.innerHTML=${label(COPY, 'Sao chép')};},1500); return; }`);
  p.regex(/b.textContent = wantImg \? [^;]+;/,
    `b.innerHTML = wantImg ? ${label(TEXT, 'Bản chữ')} : ${label(PICTURE, 'Ảnh gốc')}; b.setAttribute('aria-pressed',String(wantImg));`);
  p.regex(/\.rc-ocr-bar \{[\s\S]*?\.rc-ocr-bar button:hover \{[^}]*\}/, CSS);
}
