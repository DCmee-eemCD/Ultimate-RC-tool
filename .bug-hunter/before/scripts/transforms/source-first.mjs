// Source-first mode (default): use recovered original text, fall back to OCR.
// Mutually exclusive with explicit automatic OCR (`wip`).
export function sourceFirst(p) {
  p.once('wip: false,', 'wip: false, sourceFirst: true,');
  p.after("Object.assign(cfg, GM_getValue('chatKit', {}));", '\n    if (cfg.sourceFirst) cfg.wip = false;');
  p.once("['latexSource', 'Ưu tiên văn bản gốc', 'Giữ nguyên Unicode, emoji và LaTeX khi trang có văn bản gốc', 1]",
    "['sourceFirst', 'Ưu tiên văn bản gốc', 'Dùng chữ gốc khi có; tự dùng OCR dự phòng nếu thiếu']");
  p.once("'qBox', 'latexSource']", "'qBox', 'sourceFirst']");
  p.once('const tex = cfg.latexSource ? latexSourceOf(cont) : null;', 'const tex = cfg.sourceFirst ? latexSourceOf(cont) : null;');

  // Image events are still processed in source-first mode.
  p.once('if (!cfg.wip) return;', 'if (!cfg.wip && !cfg.sourceFirst) return;');
  p.after('const list = pending; pending = [];', '\n            if (!cfg.wip && !cfg.sourceFirst) return;');
  p.once('const res = await ocrUrl(u);', "const res = originalResult(u) || await ocrUrl(u);\n            if (res.original) log('Văn bản gốc: bỏ qua OCR');");
  p.once("toast('🔎 Đang quét ' + queue.length + ' ảnh...');", "toast(cfg.sourceFirst ? 'Đang lấy văn bản · OCR dự phòng khi cần' : 'Đang quét ' + queue.length + ' ảnh...');");
  p.once("log('✅ OCR xong ('", "log('✅ Văn bản sẵn sàng ('");

  // Never place a result in an arbitrary bubble when the exact group is missing.
  p.after('function reapplyAll() {', '\n        recoverOriginals();');
  p.once('if (idx < 0) idx = conts.length - 1;', 'if (idx < 0) return;');
  p.once('shown.forEach(r => {', 'shown.forEach((r, id) => {');
  p.before('const host = conts[r.idx].parentElement;', 'if (groupId(urlOfContainer(conts[r.idx]) || "") !== id) return;\n            ');

  // Settings, pill button and toggle keep the two modes exclusive.
  p.after('else cfg[k] = t.value;', `
            if (k === 'sourceFirst' && cfg.sourceFirst) cfg.wip = false;
            if (k === 'wip' && cfg.wip) cfg.sourceFirst = false;`);
  p.once("if (k === 'wip' && cfg.wip) forceScan();", "if ((k === 'wip' && cfg.wip) || (k === 'sourceFirst' && cfg.sourceFirst)) { reapplyAll(); forceScan(); }");
  p.once("cfg.wip ? ' on' : ''", "(cfg.wip || cfg.sourceFirst) ? ' on' : ''");
  p.once("$('#pt').textContent = working ? 'OCR…' : 'OCR';", "$('#pt').textContent = working ? 'Đang đọc…' : cfg.sourceFirst ? 'Chữ gốc' : 'OCR';");
  p.once('pill.title = cfg.wip ?', "pill.title = cfg.sourceFirst ? 'Ưu tiên văn bản gốc · OCR dự phòng · click để tắt' : cfg.wip ?");
  p.once('!cfg.wip));', "!(cfg.wip || cfg.sourceFirst)));\n            for (const k of ['sourceFirst', 'wip']) { const cb = $('input[data-k=\"' + k + '\"]'); if (cb) cb.checked = !!cfg[k]; }");
  p.once('cfg.wip = !cfg.wip; save(); render();', 'if (cfg.sourceFirst) { cfg.sourceFirst = false; cfg.wip = false; } else cfg.wip = !cfg.wip; save(); render();');
  p.after('    whenBody(initUI);', '\n    whenBody(() => setTimeout(reapplyAll, 0));');
}
