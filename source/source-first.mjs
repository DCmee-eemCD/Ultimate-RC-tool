export function sourceFirst(app) {
    const replace = (from, to) => {
        if (!app.includes(from)) throw Error('Source-first boundary missing: ' + from.slice(0,90));
        app = app.replace(from, () => to);
    };
    replace('wip: false,', 'wip: false, sourceFirst: true,');
    replace("Object.assign(cfg, GM_getValue('chatKit', {}));", "Object.assign(cfg, GM_getValue('chatKit', {}));\n    if (cfg.sourceFirst) cfg.wip = false;");
    replace("['latexSource', 'Ưu tiên văn bản gốc', 'Giữ nguyên Unicode, emoji và LaTeX khi trang có văn bản gốc', 1]", "['sourceFirst', 'Ưu tiên văn bản gốc', 'Dùng chữ gốc khi có; tự dùng OCR dự phòng nếu thiếu']");
    replace("'qBox', 'latexSource']", "'qBox', 'sourceFirst']");
    replace('const tex = cfg.latexSource ? latexSourceOf(cont) : null;', 'const tex = cfg.sourceFirst ? latexSourceOf(cont) : null;');
    replace('if (!cfg.wip) return;', 'if (!cfg.wip && !cfg.sourceFirst) return;');
    replace('const list = pending; pending = [];', 'const list = pending; pending = [];\n            if (!cfg.wip && !cfg.sourceFirst) return;');
    replace('const res = await ocrUrl(u);', "const res = originalResult(u) || await ocrUrl(u);\n            if (res.original) log('Văn bản gốc: bỏ qua OCR');");
    replace("toast('🔎 Đang quét ' + queue.length + ' ảnh...');", "toast(cfg.sourceFirst ? 'Đang lấy văn bản · OCR dự phòng khi cần' : 'Đang quét ' + queue.length + ' ảnh...');");
    replace("log('✅ OCR xong ('", "log('✅ Văn bản sẵn sàng ('");
    replace('function reapplyAll() {', 'function reapplyAll() {\n        recoverOriginals();');
    replace('if (idx < 0) idx = conts.length - 1;', 'if (idx < 0) return;');
    replace('shown.forEach(r => {', 'shown.forEach((r, id) => {');
    replace('const host = conts[r.idx].parentElement;', 'if (groupId(urlOfContainer(conts[r.idx]) || "") !== id) return;\n            const host = conts[r.idx].parentElement;');
    replace('else cfg[k] = t.value;', `else cfg[k] = t.value;
            if (k === 'sourceFirst' && cfg.sourceFirst) cfg.wip = false;
            if (k === 'wip' && cfg.wip) cfg.sourceFirst = false;`);
    replace("if (k === 'wip' && cfg.wip) forceScan();", "if ((k === 'wip' && cfg.wip) || (k === 'sourceFirst' && cfg.sourceFirst)) { reapplyAll(); forceScan(); }");
    replace("cfg.wip ? ' on' : ''", "(cfg.wip || cfg.sourceFirst) ? ' on' : ''");
    replace("$('#pt').textContent = working ? 'OCR…' : 'OCR';", "$('#pt').textContent = working ? 'Đang đọc…' : cfg.sourceFirst ? 'Chữ gốc' : 'OCR';");
    replace("pill.title = cfg.wip ?", "pill.title = cfg.sourceFirst ? 'Ưu tiên văn bản gốc · OCR dự phòng · click để tắt' : cfg.wip ?");
    replace("!cfg.wip));", "!(cfg.wip || cfg.sourceFirst)));\n            for (const k of ['sourceFirst', 'wip']) { const cb = $('input[data-k=\"' + k + '\"]'); if (cb) cb.checked = !!cfg[k]; }");
    replace('cfg.wip = !cfg.wip; save(); render();', 'if (cfg.sourceFirst) { cfg.sourceFirst = false; cfg.wip = false; } else cfg.wip = !cfg.wip; save(); render();');
    replace('    whenBody(initUI);', '    whenBody(initUI);\n    whenBody(() => setTimeout(reapplyAll, 0));');
    return app;
}
