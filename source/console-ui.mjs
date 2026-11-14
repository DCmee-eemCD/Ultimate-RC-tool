import fs from 'node:fs/promises';
export async function consoleUI(app) {
    const replace = (from, to) => {
        if (!app.includes(from)) throw Error('Console boundary missing: ' + from.slice(0,70));
        app = app.replace(from, () => to);
    };
    replace("dashboardBg: '#1e293b',", "dashboardBg: '#1e293b', consolePrimary: '#78a6ff', consoleSecondary: '#b6a0ff', consoleWidth: 380, consoleHeight: 620,");
    replace("['dashboardBg', 'Nền bảng điều khiển'],", "['dashboardBg', 'Nền bảng điều khiển'],\n            ['consolePrimary', 'Màu chính · bảng điều khiển'],\n            ['consoleSecondary', 'Màu phụ · bảng điều khiển'],");
    const css = await fs.readFile('extension/console.css', 'utf8');
    replace('        const host = document.createElement(\'div\');\n        host.id = \'rc-kit\';', '        const CONSOLE_CSS = ' + JSON.stringify(css) + ';\n        const host = document.createElement(\'div\');\n        host.id = \'rc-kit\';');
    replace('sheet.replaceSync(KIT_CSS);', 'sheet.replaceSync(KIT_CSS + CONSOLE_CSS);');
    replace('st.textContent = KIT_CSS;', 'st.textContent = KIT_CSS + CONSOLE_CSS;');
    const start = app.indexOf('        const setTab = t => {');
    const end = app.indexOf("        root.addEventListener('input'", start);
    if (start < 0 || end < 0) throw Error('Console tabs boundary missing');
    const sizeSource = await fs.readFile('source/console-size.js', 'utf8');
    const consoleSource = (await fs.readFile('source/console-ui.js', 'utf8')).replace('        /* CONSOLE_SIZE_CONTROLS */',
        () => sizeSource);
    app = app.slice(0,start) + consoleSource + '\n\n' + app.slice(end);
    // Initial markup stays hidden until the stored selection is applied.
    app = app.replaceAll('class="sec" data-sec=', 'class="sec" hidden data-sec=');
    replace("const togglePanel = on => { panel.classList.toggle('open', on === undefined ? !panel.classList.contains('open') : on); };", `const togglePanel = on => {
            const open = on === undefined ? !panel.classList.contains('open') : on;
            panel.classList.toggle('open', open); $('#gear').setAttribute('aria-expanded', String(open));
            if (open) tabButtons.find(b => b.dataset.tab === currentTab)?.focus({preventScroll:true});
            else $('#gear').focus({preventScroll:true});
        };`);
    replace("$('#gear')?.addEventListener('click', () => togglePanel());", "$('#gear').setAttribute('aria-expanded', 'false');\n        $('#gear')?.addEventListener('click', () => togglePanel());");
    return app;
}
