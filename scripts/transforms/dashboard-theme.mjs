// Dashboard surface color, dark/light image palettes and theme-aware controls.
// Runtime logic lives in source/dashboard-theme.js.
const THEME_ICONS = [
  ['light', 'Sáng', 'sun', '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'],
  ['dark', 'Tối', 'moon', '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>'],
  ['auto', 'Tự động theo giờ', 'sun-moon', '<path d="M12 2v2"/><path d="M14.837 16.385a6 6 0 1 1-7.223-7.222c.624-.147.97.66.715 1.248a4 4 0 0 0 5.26 5.259c.589-.255 1.396.09 1.248.715"/><path d="M16 12a4 4 0 0 0-4-4"/><path d="m19 5-1.256 1.256"/><path d="M20 12h2"/>']
];
const PALETTE_MODE_BUTTONS = `<div class="fld"><span id="rk-palette-mode-label">Chế độ màu</span><div class="console-theme-modes" role="group" aria-labelledby="rk-palette-mode-label" aria-describedby="rk-theme-hours">${THEME_ICONS.map(([mode, label, icon, paths]) => `<button type="button" class="ui-btn ui-tooltip console-theme-mode" data-theme-mode="${mode}" aria-label="${label}" data-tip="${label}" aria-pressed="\${cfg.imageThemeMode === '${mode}'}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${icon} preview-icon" aria-hidden="true" focusable="false">${paths}</svg></button>`).join('')}</div></div>
        <p id="rk-theme-hours" class="console-theme-help">Áp dụng cho mọi bộ màu và ảnh nền. Tự động: sáng 07:00–19:00, tối 19:00–07:00 (giờ máy).</p>`;

const PANEL_CSS = `.body{padding:12px 14px;overflow:auto;flex:1;scrollbar-gutter:stable;scrollbar-width:auto;overscroll-behavior:contain}
  .body::-webkit-scrollbar{width:6px}.body::-webkit-scrollbar-track{background:transparent}.body::-webkit-scrollbar-thumb{background:var(--mut);border-radius:12px}.body::-webkit-scrollbar-button{display:none;width:0;height:0}
  input[type=range]{appearance:none;height:6px;border-radius:99px;background:linear-gradient(to right,var(--acc) var(--fill,50%),var(--line) var(--fill,50%));outline-offset:5px}
  input[type=range]::-webkit-slider-thumb{appearance:none;width:14px;height:14px;border-radius:50%;background:var(--acc);cursor:pointer}
  input[type=range]:focus-visible{outline:2px solid var(--acc)}
  .w .sl{background:var(--switch-off)}
  .w .sl:after{background:var(--switch-knob)}
  .w .tg input:checked+.sl{background:var(--acc)}
  .w .tg input:checked+.sl:after{background:var(--switch-on-knob)}
  .w input[type=checkbox]{accent-color:var(--acc)}`;

const SWATCH_CSS = `
  .sec[data-sec="theme"] .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .sec[data-sec="theme"] .col{position:relative;min-width:0;min-height:46px;box-sizing:border-box;padding:8px;gap:9px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--fg);font-weight:500;line-height:1.35;transition:border-color .15s,background .15s,box-shadow .15s}
  .sec[data-sec="theme"] .col:hover{border-color:var(--acc);background:color-mix(in srgb,var(--acc) 8%,var(--bg))}
  .sec[data-sec="theme"] .col:focus-within{border-color:var(--acc);outline:2px solid var(--acc);outline-offset:2px}
  .sec[data-sec="theme"] .col input[type=color]{appearance:none;-webkit-appearance:none;box-sizing:border-box;width:30px;height:30px;padding:0;border:1px solid var(--line);border-radius:9px;background:var(--bg);box-shadow:0 1px 3px #0002;outline:none}
  .sec[data-sec="theme"] .col input[type=color]::-webkit-color-swatch-wrapper{padding:0}
  .sec[data-sec="theme"] .col input[type=color]::-webkit-color-swatch{border:0;border-radius:8px}
  .sec[data-sec="theme"] .col input[type=color]::-moz-color-swatch{border:0;border-radius:8px}
  @media(prefers-reduced-motion:reduce){.sec[data-sec="theme"] .col{transition:none}}`;

export async function dashboardTheme(p, {readText}) {
  const runtime = await readText('source/dashboard-theme.js');
  // The site's pale sidebar shadow becomes a bright vertical stripe in dark themes.
  p.after('.left-navigation {', ' box-shadow:none !important;');
  // Portal-mounted account menus do not inherit the sidebar foreground.
  // Scope overrides to menus so other MUI surfaces keep their semantic colors.
  p.after(':root { --bs-primary:${p}; --bs-primary-rgb:${rgb}; }', `
            /* Lazy SPA modules use stable MUI classes; never target Emotion hashes.
               The adopted theme sheet follows document styles, including late ones. */
            html body .prj-header__title,
            html body .MuiTypography-root { color:\${pgc} !important; }
            html body .prj-header__subtitle { color:\${pgFaint} !important; }
            html body .MuiBox-root:has(.MuiPaper-root) { background-color:\${pgBg} !important; color:\${pgc} !important; }
            html body .MuiPaper-root .MuiTypography-root,
            html body .MuiPaper-root .MuiTableCell-root { color:\${pc} !important; }
            html body .MuiTableCell-head,
            html body .table-header { background-color:\${panel2} !important; color:\${pc} !important; border-color:\${line} !important; }
            html body :is(.MuiTableCell-head, .table-header) .MuiTypography-root { color:\${pc} !important; }
            html body .MuiMenu-paper,
            html body .MuiMenu-paper :is(.MuiMenuItem-root, .MuiTypography-root, .MuiListItemText-root, .MuiListItemIcon-root),
            html body .MuiMenu-paper .MuiMenuItem-root :is(span, b, strong, a, svg) { color:\${pc} !important; }
            html body .MuiMenu-paper .MuiMenuItem-root:not(.Mui-disabled):is(:hover, :focus-visible, .Mui-focusVisible, .Mui-selected) { background:\${actBg} !important; }
            html body .MuiMenu-paper :is(hr, .MuiDivider-root) { border-color:\${line} !important; }
  `);
  // Sidebar states use the sidebar surface, independently of the panel color.
  p.once('background-color:${actBg} !important; }\n            .cl-card,',
    'background:${mix(pgBg, p, 0.18)} !important; }\n            .cl-card,');
  p.all('color:${accTxt} !important; }\n            html body .left-navigation',
    'color:${pgc} !important; }\n            html body .left-navigation');
  p.after('    const DEFAULTS = {', "\n        dashboardBg: '#1e293b', imageThemeMode: 'dark',");
  p.after('        const COLOR_KEYS = [', "\n            ['dashboardBg', 'Nền bảng điều khiển'],");
  p.once('    function applyTheme() {', runtime + '\n    function applyTheme() {\n        syncThemeMode();\n        applyDashboardTheme();');
  // The extension uses the adopted sheet for CSP-safe updates. Keep the
  // userscript fallback only for the first pass, then disable it so every
  // theme switch publishes one stylesheet instead of parsing the same CSS
  // through both the DOM style element and the adopted sheet.
  p.once('        styleEl.textContent = css;', '        if (!RC.themeSheet) styleEl.textContent = css;');
  p.after('        RC.themeSheet.replaceSync(css);', "\n        styleEl.media = 'not all';");
  p.after('        document.body.appendChild(host);', '\n        applyDashboardTheme();');
  p.after('    applyTheme(); ensureBgVideo();', `
    setInterval(checkThemeClock, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkThemeClock(); });
    window.addEventListener('focus', checkThemeClock);`);
  p.after('        let css = `', '\n            :root { color-scheme:${effectiveThemeMode()}; }');
  p.before('        <div class="presets">', '        ' + PALETTE_MODE_BUTTONS + '\n');
  p.before("        $$('.pre').forEach(b => b.addEventListener('click', () => {", `        $$('[data-theme-mode]').forEach(button => button.addEventListener('click', () => {
            if (cfg.imageThemeMode === button.dataset.themeMode) return;
            cfg.imageThemeMode = button.dataset.themeMode;
            syncThemeMode(true); save(); applyTheme();
        }));
        const modeHint = document.createElement('div');
        modeHint.className = 'console-mode-hint';
        modeHint.setAttribute('popover', 'manual');
        root.querySelector('.w').appendChild(modeHint);
        let hintTimer;
        const hideModeHint = () => { clearTimeout(hintTimer); modeHint.hidePopover(); };
        const scheduleHide = () => { clearTimeout(hintTimer); hintTimer = setTimeout(hideModeHint, 120); };
        $$('[data-theme-mode]').forEach(button => {
            button.classList.remove('ui-tooltip');
            const show = () => {
                clearTimeout(hintTimer);
                modeHint.textContent = button.getAttribute('aria-label');
                modeHint.showPopover();
                const rect = button.getBoundingClientRect();
                const width = modeHint.getBoundingClientRect().width;
                const center = Math.max(width / 2 + 4, Math.min(innerWidth - width / 2 - 4, rect.left + rect.width / 2));
                modeHint.style.left = center + 'px';
                modeHint.style.top = (rect.top - 8) + 'px';
            };
            button.addEventListener('pointerenter', show);
            button.addEventListener('focus', show);
            button.addEventListener('pointerleave', () => { if (!button.matches(':focus-visible')) scheduleHide(); });
            button.addEventListener('blur', scheduleHide);
            button.addEventListener('click', hideModeHint);
        });
        modeHint.addEventListener('pointerenter', () => clearTimeout(hintTimer));
        modeHint.addEventListener('pointerleave', scheduleHide);
        root.addEventListener('keydown', event => { if (event.key === 'Escape') hideModeHint(); });
        root.addEventListener('scroll', hideModeHint, true);
        window.addEventListener('resize', hideModeHint);
`);
  p.once("n: 'Discord Dark'", "n: 'Discord'");
  p.once("n: 'Tối', c:", "n: 'Tím', c:");
  p.once('<i data-c="${p.c[k]}">', '<i data-theme-key="${k}" data-c="${p.c[k]}">');
  p.after("root.querySelectorAll('i[data-c]').forEach(i => { i.style.background = i.dataset.c; });", '\n        applyDashboardTheme();');
  p.once('Object.assign(cfg, p.c); save(); applyTheme();', `cfg.themeBasePalette = {...p.c}; cfg.autoTheme = false;
            const autoInput = $('input[data-k="autoTheme"]'); if (autoInput) autoInput.checked = false;
            syncThemeMode(true); save(); applyTheme();`);
  p.after('else cfg[k] = t.value;', `
            if (t.type === 'color') cfg.themeBasePalette = null;
            if (k === 'imageThemeMode') syncThemeMode(true);`);

  // The same image-derived surface color applies to Rust and JS palettes;
  // the palette cache key and stale-result check both include the mode.
  p.once('Object.assign(cfg, pal); cfg.autoFor = key;',
    'cfg.themeBasePalette = {...pal}; pal = imagePaletteMode(pal, requestedMode); Object.assign(cfg, pal, {dashboardBg: pal.panelBg}); cfg.autoFor = key;');
  p.once("const key = String(src.length) + ':' + src.slice(-40);",
    "const requestedMode = effectiveThemeMode();\n        const key = requestedMode + ':' + String(src.length) + ':' + src.slice(-40);");
  p.once('if (cfg.bgImage !== requestedBg) return;',
    'if ((!force && !cfg.autoTheme) || cfg.bgImage !== requestedBg || effectiveThemeMode() !== requestedMode) return;');

  p.once('.body{padding:12px 14px;overflow:auto;flex:1}', PANEL_CSS);
  p.after('.col input{width:30px;height:30px;border:1px solid var(--line);border-radius:8px;padding:0;background:none;cursor:pointer;flex:none}', SWATCH_CSS);
}
