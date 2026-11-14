import fs from 'node:fs/promises';
import {toolbar} from '../source/ocr-toolbar.mjs';
import {sourceFirst} from '../source/source-first.mjs';
import {consoleUI} from '../source/console-ui.mjs';
export async function upgrade(app, engine, version) {
  const navBoundary = '    whenBody(initUI);';
  if (!app.includes(navBoundary)) throw Error('Navigation icons boundary missing');
  const navIcons = await fs.readFile('source/nav-icons.js', 'utf8');
  app = app.replace(navBoundary, () => navIcons + '\n' + navBoundary);
  const dashboard = await fs.readFile('source/dashboard-theme.js','utf8');
  for (const boundary of ['    const DEFAULTS = {','        const COLOR_KEYS = [','    function applyTheme() {','        document.body.appendChild(host);']) {
    if(!app.includes(boundary))throw Error('Dashboard theme boundary missing: '+boundary);
  }
  app=app.replace('    const DEFAULTS = {', "    const DEFAULTS = {\n        dashboardBg: '#1e293b',");
  app=app.replace('        const COLOR_KEYS = [', "        const COLOR_KEYS = [\n            ['dashboardBg', 'Nền bảng điều khiển'],");
  app=app.replace('    function applyTheme() {', () => dashboard+'\n    function applyTheme() {\n        applyDashboardTheme();');
  app=app.replace('        document.body.appendChild(host);','        document.body.appendChild(host);\n        applyDashboardTheme();');
  // Apply the same image-derived surface color for Rust and JS palettes.
  const paletteApply = 'Object.assign(cfg, pal); cfg.autoFor = key;';
  if(!app.includes(paletteApply))throw Error('Dashboard palette boundary missing');
  app=app.replace(paletteApply,'pal = imagePaletteMode(pal, requestedMode); Object.assign(cfg, pal, {dashboardBg: pal.panelBg}); cfg.autoFor = key;');
  app=app.replace("dashboardBg: '#1e293b',", "dashboardBg: '#1e293b', imageThemeMode: 'dark',");
  for (const boundary of ["const key = String(src.length) + ':' + src.slice(-40);", 'const requestedBg = cfg.bgImage;', 'if (cfg.bgImage !== requestedBg) return;']) {
    if (!app.includes(boundary)) throw Error('Image theme mode boundary missing: ' + boundary);
  }
  app=app.replace("const key = String(src.length) + ':' + src.slice(-40);", "const requestedMode = cfg.imageThemeMode;\n        const key = requestedMode + ':' + String(src.length) + ':' + src.slice(-40);");
  app=app.replace('if (cfg.bgImage !== requestedBg) return;', 'if (cfg.bgImage !== requestedBg || cfg.imageThemeMode !== requestedMode) return;');
  app=app.replace(/(<button[^>]*id="rk-pal"[^>]*>)/, () => `<div class="fld"><label for="rk-palette-mode">Image theme</label><select id="rk-palette-mode" data-k="imageThemeMode"><option value="dark" \${cfg.imageThemeMode !== 'light' ? 'selected' : ''}>Dark theme</option><option value="light" \${cfg.imageThemeMode === 'light' ? 'selected' : ''}>Light theme</option></select></div>\n        <button class="sm fl wide" id="rk-pal">`);
  if (!app.includes('id="rk-palette-mode"')) throw Error('Image theme selector boundary missing');
  const fidelity=await fs.readFile('source/ocr-fidelity.js','utf8');
  // Text remains text: never rasterize a line merely for containing '=' or color.
  engine=engine.replace('const ok = (clean &&', 'const ok = (al >= 3 && hh <= 100 && l.confidence >= 35 && /^\\s*[a-zA-Z0-9][).]/.test(t)) || (clean && n >= 8 && l.confidence >= 45 && hh <= 100) || (clean &&');
  engine=engine.replace(/^            t = t\.replace\(.*$/m,'');
  engine=engine.replace('lines.push({ t, ok, weak:', 'lines.push({ visual:l.rcVisual, t, ok:ok || !!l.rcVisual, weak:');
  engine=engine.replace('good.filter(l => !l.weak)', 'good.filter(l => !l.weak || l.visual)');
  engine=engine.replace('good = good.filter(l => !l.weak ||', 'good = good.filter(l => l.visual || !l.weak ||');
  engine=engine.replace("({ type: 'line', y0:","({ visual:l.visual, type: 'line', y0:");
  engine=engine.replace('        items.forEach(it => {', '        items.forEach(it => {\n            if(it.visual) { flush(); segs.push(it.visual); return; }');
  engine=engine.replace("segs.filter(g => g.type === 'text').map(g => g.text)","segs.filter(g => g.type === 'text' || g.preserved).map(g => g.preserved ? g.copyText : g.text)");
  // Keep all nested OCR coordinates in the original image coordinate system.
  engine=engine.replace('off: ch.y0 - M, ci,', 'off: ch.y0 - M, offX:x0 - M, ci,');
  engine=engine.replace('({ d, off, ci })','({ d, off, offX, ci })');
  engine=engine.replace('{ y0: bb.y0 + off, y1: bb.y1 + off }','{ x0:bb.x0 + offX, x1:bb.x1 + offX, y0: bb.y0 + off, y1: bb.y1 + off }');
  engine=engine.replace('bbox: sh(l.bbox), ck: ci','bbox: sh(l.bbox), words:(l.words || []).map(w=>({...w,bbox:sh(w.bbox),symbols:(w.symbols || []).map(s=>({...s,bbox:sh(s.bbox)}))})), ck: ci');
  const core=engine.slice(0,engine.indexOf('    function runImageTab()')).replace('(async function () {','globalThis.RCOcrReady = (async function () {');
  await fs.writeFile('extension/ocr-core.js',core+'\nreturn {ocrPipeline, backend: RC.pixelBackend};\n})();\n');
  const a=app.indexOf('    function ocrLegacy(url)'),b=app.indexOf('    function partsFor(id)',a);
  if(a<0||b<0)throw Error('OCR boundary missing');
  app=app.slice(0,a)+`    const langsString = () => [cfg.ocrVie !== false && 'vie', cfg.ocrEng !== false && 'eng'].filter(Boolean).join('+') || 'vie';
    const hubAlive = () => !!GM_getValue('rc_ocr_status', {}).workers;
    const closeHub = () => RC.ocrStop().catch(e => toast(e.message));
    const ocrUrl = url => RC.ocr({url, langs:langsString(), threads:+cfg.ocrThreads || 0, idle:+cfg.hubIdle, keepWarm:!!cfg.ocrHub});
`+app.slice(b);
  app=app.replaceAll('v5.15.0','v6.0.0');
  app=app.replaceAll('Giữ tab OCR chạy sẵn','Giữ OCR sẵn trong nền').replaceAll('Quét nhanh hơn, không mở tab mới mỗi ảnh','Tái sử dụng worker; không mở tab phụ').replaceAll('Tự đóng tab OCR sau','Giải phóng worker sau').replaceAll('Đóng tab OCR ngay','Giải phóng OCR').replaceAll('Đã gửi lệnh đóng tab OCR','Đã yêu cầu giải phóng OCR khi quét xong').replaceAll('Tự động (CPU − 1)','Tự động (theo ảnh / RAM)');
  app=app.replace(/const hubTxt = .*?;/,`const hubTxt = hubAlive() ? 'OCR nền: ' + GM_getValue('rc_ocr_hub_info', '') : 'OCR nền sẵn sàng · không mở tab phụ';`);
  app=app.replace('.body{padding:12px 14px;overflow:auto;flex:1}',`.body{padding:12px 14px;overflow:auto;flex:1;scrollbar-gutter:stable;scrollbar-width:auto;overscroll-behavior:contain}
  .body::-webkit-scrollbar{width:6px}.body::-webkit-scrollbar-track{background:transparent}.body::-webkit-scrollbar-thumb{background:var(--mut);border-radius:12px}.body::-webkit-scrollbar-button{display:none;width:0;height:0}
  input[type=range]{appearance:none;height:6px;border-radius:99px;background:linear-gradient(to right,var(--acc) var(--fill,50%),var(--line) var(--fill,50%));outline-offset:5px}
  input[type=range]::-webkit-slider-thumb{appearance:none;width:14px;height:14px;border-radius:50%;background:var(--acc);cursor:pointer}
  input[type=range]:focus-visible{outline:2px solid var(--acc)}
  .w .sl{background:var(--switch-off)}
  .w .sl:after{background:var(--switch-knob)}
  .w .tg input:checked+.sl{background:var(--acc)}
  .w .tg input:checked+.sl:after{background:var(--switch-on-knob)}
  .w input[type=checkbox]{accent-color:var(--acc)}`);
  app=app.replace('        <h4>Tuỳ chỉnh màu</h4>',`        <div class="row2" style="margin-bottom:16px"><button class="sm fl" id="theme-export">Xuất theme</button><button class="sm fl" id="theme-import">Nhập theme</button></div>
        <input type="file" id="theme-file" accept="application/json,.json" hidden>
        <h4>Tuỳ chỉnh màu</h4>`);
  if(!app.includes('id="theme-export"'))throw Error('Theme UI boundary missing');
  const colorControlCss = '.col input{width:30px;height:30px;border:1px solid var(--line);border-radius:8px;padding:0;background:none;cursor:pointer;flex:none}';
  if(!app.includes(colorControlCss))throw Error('Custom color style boundary missing');
  app=app.replace(colorControlCss, `${colorControlCss}
  .sec[data-sec="theme"] .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .sec[data-sec="theme"] .col{position:relative;min-width:0;min-height:46px;box-sizing:border-box;padding:8px;gap:9px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--fg);font-weight:500;line-height:1.35;transition:border-color .15s,background .15s,box-shadow .15s}
  .sec[data-sec="theme"] .col:hover{border-color:var(--acc);background:color-mix(in srgb,var(--acc) 8%,var(--bg))}
  .sec[data-sec="theme"] .col:focus-within{border-color:var(--acc);outline:2px solid var(--acc);outline-offset:2px}
  .sec[data-sec="theme"] .col input[type=color]{appearance:none;-webkit-appearance:none;box-sizing:border-box;width:30px;height:30px;padding:0;border:1px solid var(--line);border-radius:9px;background:var(--bg);box-shadow:0 1px 3px #0002;outline:none}
  .sec[data-sec="theme"] .col input[type=color]::-webkit-color-swatch-wrapper{padding:0}
  .sec[data-sec="theme"] .col input[type=color]::-webkit-color-swatch{border:0;border-radius:8px}
  .sec[data-sec="theme"] .col input[type=color]::-moz-color-swatch{border:0;border-radius:8px}
  @media(prefers-reduced-motion:reduce){.sec[data-sec="theme"] .col{transition:none}}`);
  const transfer=await fs.readFile('source/theme-transfer.js','utf8');
  app=app.replace("        const panel = $('#panel'), pill = $('#pill'), stat = $('#stat');", () => "        const panel = $('#panel'), pill = $('#pill'), stat = $('#stat');\n"+transfer);
  const source=await fs.readFile('source/text-source.js','utf8');
  const start=app.indexOf('    const TEX_RE ='),end=app.indexOf('    function probeLatex()',start);
  if(start<0 || end<0)throw Error('Source recovery boundary missing');
  app=app.slice(0,start)+source+'\n'+app.slice(end);
  app=app.replace("filter(g => g.type === 'img')","filter(g => g.type === 'img' && !g.preserved)");
  app=app.replace("im.width = g.w;", "im.width = g.w; if(g.preserved) { im.title=g.copyText; im.style.cssText='display:block;max-width:100%;height:auto;border-radius:4px'; }");
  app=app.replace("                if (g.type === 'img')",`                if(g.type === 'rich') {
                    const line=document.createElement('div'); line.className='rc-seg-text';
                    for(const part of g.parts) {
                        if(part.type==='text') line.appendChild(document.createTextNode(part.text+' '));
                        else { const icon=document.createElement('img'); icon.src=part.src; icon.width=part.w; icon.height=part.h; icon.alt='[emoji/ký hiệu trong ảnh]'; icon.title='Giữ ảnh gốc; chưa nhận dạng thành Unicode'; icon.style.cssText='display:inline-block;vertical-align:middle;max-width:100%'; line.append(icon,document.createTextNode(' ')); }
                    }
                    body.appendChild(line);
                } else if (g.type === 'img')`);
  app=app.replace("box.dataset.src = tex ? 'latex' : 'ocr';", "box.dataset.src = tex ? 'latex' : 'ocr';\n        const bar=box.querySelector('.rc-ocr-bar');\n        bar.querySelector('.rc-fidelity-note')?.remove();\n        if(!tex && segs?.some(g=>g.preserved)) { const note=document.createElement('small'); note.className='rc-fidelity-note'; note.textContent='Ký hiệu chưa đọc chắc: giữ ảnh; Copy có đánh dấu.'; bar.appendChild(note); }");
  app=app.replaceAll('Ưu tiên nguồn LaTeX','Ưu tiên văn bản gốc').replaceAll('Nếu trang giữ công thức gốc thì dùng thay cho chữ OCR','Giữ nguyên Unicode, emoji và LaTeX khi trang có văn bản gốc');
  const icon=(await fs.readFile('extension/icons/icon-48.png')).toString('base64');
  app=app.replace(/(<button[^>]*id="gear"[^>]*>)[^<]*(<\/button>)/,(_,open,close)=>open+'<img alt="Ultimate RC" width="28" height="28" style="display:block;object-fit:contain;pointer-events:none" src="data:image/png;base64,'+icon+'">'+close);
  app=app.replace('.gear{width:40px;height:40px;border-radius:50%;background:#0f172a;font-size:18px}', '.gear{width:40px;height:40px;padding:0;display:grid;place-items:center;border-radius:0;background:transparent;box-shadow:none;font-size:18px}.gear img{width:40px;height:40px;filter:drop-shadow(0 0 3px rgba(0,0,0,.65))}.gear:focus-visible{outline:2px solid var(--acc,#60a5fa);outline-offset:3px}');
  app=app.replace('<button class="tab" data-tab="ocr">OCR</button>','<button class="tab" data-tab="ocr">OCR</button><button class="tab" data-tab="music">Nhạc</button>');
  app=app.replace('<div class="body">',`<div class="body"><div class="sec" data-sec="music">
    <h4>YouTube / Spotify</h4><input id="rc-music-url" type="url" placeholder="Dán link bài hát / playlist" style="box-sizing:border-box;width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg)">
    <div class="row2 mt"><button class="sm fl" id="rc-music-load">Mở trình phát</button><button class="sm" id="rc-music-stop">Dừng</button></div>
    <div class="stat" id="rc-music-status">Không tự phát khi tải trang. Spotify có thể chỉ phát bản nghe thử; một số video không cho nhúng.</div>
    <a id="rc-music-external" target="_blank" rel="noopener noreferrer" hidden>Mở trên dịch vụ gốc ↗</a></div>`);
  app=app.replace("        const setTab = t => {",(await fs.readFile('source/music.js','utf8'))+'\n        const setTab = t => {');
  app=app.replace("['feat', 'ocr'].includes(cfg.uiTab)","['feat', 'ocr', 'music'].includes(cfg.uiTab)");
  // Strip decorative emoji from plain button labels; retain SVG controls.
  app=app.replace(/(<button\b[^>]*>)([^<>]*)(<\/button>)/gu, (_, open, label, close) =>
    open + label.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').trim() + close);
  return (await consoleUI(sourceFirst(toolbar(app)))).replaceAll('v6.0.0', 'v' + version)
    .replace("const HUB_VER = '5.15-rust'", `const HUB_VER = '${version}'`);
}
