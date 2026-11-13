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
