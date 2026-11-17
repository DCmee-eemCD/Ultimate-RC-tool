    let appliedThemeMode = null;
    // Sampled from the supplied Discord light reference, rather than generated tints.
    const DISCORD_LIGHT = {primary:'#50565f',userBubble:'#e3e5e8',botBubble:'#f8f9f9',msgBg:'#f8f9f9',chatBg:'#c8ccd0',panelBg:'#e3e5e8',pageBg:'#f8f9f9'};
    function isDiscordPalette(palette) {
        const original = {primary:'#40444b',userBubble:'#40444b',botBubble:'#2f3136',msgBg:'#2f3136',chatBg:'#292b2f',panelBg:'#292b2f',pageBg:'#202225'};
        return palette && Object.entries(original).every(([key, value]) => palette[key]?.toLowerCase() === value);
    }
    function effectiveThemeMode() {
        if (cfg.imageThemeMode === 'auto') {
            const hour = new Date().getHours();
            return hour >= 7 && hour < 19 ? 'light' : 'dark';
        }
        return cfg.imageThemeMode === 'light' ? 'light' : 'dark';
    }

    function syncThemeMode(force = false) {
        const mode = effectiveThemeMode();
        if (force || (appliedThemeMode === null && mode === 'light' && isDiscordPalette(cfg.themeBasePalette)) || (appliedThemeMode !== mode && (appliedThemeMode !== null || cfg.imageThemeMode === 'auto'))) {
            if (!cfg.themeBasePalette) cfg.themeBasePalette = Object.fromEntries(
                ['primary','userBubble','botBubble','msgBg','chatBg','panelBg','pageBg'].map(k => [k, cfg[k]]));
            const palette = mode === 'light' && isDiscordPalette(cfg.themeBasePalette)
                ? {...DISCORD_LIGHT} : imagePaletteMode(cfg.themeBasePalette, mode);
            Object.assign(cfg, palette, {dashboardBg: palette.panelBg});
            cfg.autoFor = '';
            save();
        }
        appliedThemeMode = mode;
    }

    function checkThemeClock() {
        if (cfg.imageThemeMode === 'auto' && appliedThemeMode !== effectiveThemeMode()) applyTheme();
    }

    function applyDashboardTheme() {
        const wrapper = document.getElementById('rc-kit')?.shadowRoot?.querySelector('.w');
        if (!wrapper) return;
        const seed = /^#[\da-f]{6}$/i.test(cfg.dashboardBg || '') ? cfg.dashboardBg : DEFAULTS.dashboardBg;
        const [h, s, l] = rgb2hsl(...hexToRgb(seed));
        const light = effectiveThemeMode() === 'light';
        const bg = hsl2hex(h, Math.min(s, 0.45), light ? Math.max(0.90, Math.min(l, 0.97)) : Math.max(0.07, Math.min(l, 0.18)));
        const accentColor = value => {
            const [hue, sat] = rgb2hsl(...hexToRgb(value));
            return hsl2hex(hue, Math.max(.5, Math.min(sat, .85)), light ? .38 : .76);
        };
        const accent = accentColor(cfg.consolePrimary || '#78a6ff');
        const fg = light ? '#172033' : '#f1f5f9';
        const values = {
            '--bg': bg,
            '--fg': fg,
            '--mut': mix(bg, fg, 0.72),
            '--line': mix(bg, fg, 0.22),
            '--chip': mix(bg, fg, 0.10),
            '--acc': accent,
            '--secondary': accentColor(cfg.consoleSecondary || '#b6a0ff'),
            '--surface': mix(bg, fg, 0.035),
            '--switch-off': mix(bg, accent, 0.22),
            '--switch-knob': fg,
            '--switch-on-knob': bg,
            '--shadow': '0 12px 40px rgba(0,0,0,.55)'
        };
        for (const [key, value] of Object.entries(values)) wrapper.style.setProperty(key, value);
        wrapper.style.colorScheme = light ? 'light' : 'dark';
        wrapper.querySelectorAll('[data-theme-mode]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.themeMode === cfg.imageThemeMode));
        });
        wrapper.querySelectorAll('input[type="color"][data-k]').forEach(input => {
            if (cfg[input.dataset.k]) input.value = cfg[input.dataset.k];
        });
        wrapper.querySelectorAll('[data-theme-key]').forEach(swatch => {
            const key = swatch.dataset.themeKey;
            const palette = imagePaletteMode(Object.fromEntries(
                ['primary','userBubble','botBubble','msgBg','chatBg','panelBg','pageBg'].map(k => [k, swatch.dataset.c])), effectiveThemeMode());
            swatch.style.background = light && swatch.closest('[data-pre]')?.dataset.pre === '0'
                ? DISCORD_LIGHT[key] : palette[key];
        });
        for (const [key, min, max, fallback, variable] of [
            ['consoleWidth', 320, 560, 380, '--console-width'],
            ['consoleHeight', 420, 820, 620, '--console-height']
        ]) {
            const value = Number.isFinite(cfg[key]) ? Math.max(min, Math.min(max, cfg[key])) : fallback;
            wrapper.style.setProperty(variable, value + 'px');
            const input = wrapper.querySelector('[data-k="' + key + '"]');
            if (input) { input.value = value; input.style.setProperty('--fill', 100 * (value-min)/(max-min) + '%'); }
            const output = wrapper.querySelector('[data-size-output="' + key + '"]');
            if (output) output.textContent = value + ' px';
        }
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
