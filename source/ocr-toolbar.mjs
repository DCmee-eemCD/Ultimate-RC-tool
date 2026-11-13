export function toolbar(app) {
 const icon=path=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
 const copy=icon('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>');
 const picture=icon('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>');
 const text=icon('<path d="M5 5h14M12 5v14M8 19h8"/>');
 const check=icon('<path d="m5 12 4 4L19 6"/>');
 app=app.replace(/(<button type="button" data-a="copy">)[^<]*(<\/button>)/,()=>`<button type="button" data-a="copy" title="Sao chép nội dung">${copy}<span>Sao chép</span></button>`);
 app=app.replace(/(<button type="button" data-a="img">)[^<]*(<\/button>)/,()=>`<button type="button" data-a="img" aria-pressed="false">${picture}<span>Ảnh gốc</span></button>`);
 app=app.replace(/if \(b.dataset.a === 'copy'\) \{[^\n]*return; \}/,()=>`if (b.dataset.a === 'copy') { GM_setClipboard(box.dataset.text || body.textContent, 'text'); clearTimeout(b._rcTimer); b.innerHTML=${JSON.stringify(check+'<span>Đã chép</span>')}; b._rcTimer=setTimeout(()=>{b.innerHTML=${JSON.stringify(copy+'<span>Sao chép</span>')};},1500); return; }`);
 app=app.replace(/b.textContent = wantImg \? [^;]+;/,()=>`b.innerHTML = wantImg ? ${JSON.stringify(text+'<span>Bản chữ</span>')} : ${JSON.stringify(picture+'<span>Ảnh gốc</span>')}; b.setAttribute('aria-pressed',String(wantImg));`);
 const css=`.rc-ocr-bar { display:flex; align-items:center; justify-content:flex-start; flex-wrap:wrap; gap:6px; margin:8px 12px 0; padding:6px 0 8px; border-top:1px solid color-mix(in srgb,currentColor 12%,transparent); }
 .rc-ocr-bar button { display:inline-flex !important; align-items:center; gap:8px; border:0 !important; background:transparent !important; color:inherit !important; box-shadow:none !important; border-radius:10px; padding:10px 16px; font:500 14px/1.4 system-ui !important; cursor:pointer; opacity:.75; transition:background .15s,opacity .15s; }
 .rc-ocr-bar button svg { flex:none; stroke:currentColor !important; fill:none !important; }
 .rc-ocr-bar button:hover { opacity:1; background:color-mix(in srgb,currentColor 14%,transparent) !important; }
 .rc-ocr-bar button:focus-visible { outline:2px solid currentColor; outline-offset:2px; }
 .rc-fidelity-note { flex-basis:100%; font-size:11px; opacity:.7; }`;
 app=app.replace(/\.rc-ocr-bar \{[\s\S]*?\.rc-ocr-bar button:hover \{[^}]*\}/,()=>css);
 return app;
}
