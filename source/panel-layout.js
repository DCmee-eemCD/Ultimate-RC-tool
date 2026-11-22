        // Shared across the page and isolated extension worlds through DOM events.
        // Future companion panels opt in with data-rc-panel / data-rc-launcher,
        // then dispatch rc-panel-layout after opening or closing.
        host.setAttribute('data-rc-panel-host', '');
        let companionOrder = [];
        let layoutFrame = 0;
        const previousPositions = new WeakMap(), motions = new WeakMap();
        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
        const setStyle = (el, name, value) => {
            if (el.style[name] !== value) el.style[name] = value;
        };
        const performCompanionLayout = () => {
            layoutFrame = 0;
            const roots = [...document.querySelectorAll('[data-rc-panel-host]')].map(el => el.shadowRoot).filter(Boolean);
            const panels = roots.flatMap(r => [...r.querySelectorAll('[data-rc-panel]')]);
            const opened = panels.filter(el => !el.hidden);
            companionOrder = companionOrder.filter(el => opened.includes(el));
            for (const el of opened) if (!companionOrder.includes(el)) companionOrder.push(el);
            const rect = panel.getBoundingClientRect();
            const top = Math.max(12, rect.top);
            let edge = rect.right + 12;
            const placements = [];
            for (const el of companionOrder) {
                const width = Math.min(340, innerWidth - 24);
                // Keep controls reachable on a viewport too narrow for another column.
                const left = Math.max(12, Math.min(edge, innerWidth - width - 12));
                placements.push({el, left, top, height:Math.max(80, innerHeight - top - 12)});
                edge += width + 12;
            }
            const launchers = roots.flatMap(r => [...r.querySelectorAll('[data-rc-launcher]')]);
            launchers.sort((a, b) => Number(a.dataset.rcLauncher) - Number(b.dataset.rcLauncher));
            let slot = 0;
            const visibleLauncherCount = launchers.filter(el => !el.hidden).length;
            for (const el of launchers) {
                if (el.hidden) continue;
                const beside = edge + 44 <= innerWidth - 12;
                // Command is sorted first, so the narrow fallback keeps it
                // above Assistant instead of spreading launchers horizontally.
                placements.push({el, left:beside ? edge : Math.max(12, Math.min(edge, innerWidth - 56)),
                    top:beside ? Math.min(innerHeight - 56, top + slot * 52) : Math.max(12, Math.min(innerHeight - 56, rect.bottom + 8 - (visibleLauncherCount - slot) * 52))});
                slot++;
            }
            // Read moving positions together before writing any layout styles.
            for (const item of placements) {
                const previous = previousPositions.get(item.el);
                if (previous && (previous.left !== item.left || previous.top !== item.top)) {
                    item.from = item.el.getBoundingClientRect();
                }
            }
            const visible = new Set(placements.map(item => item.el));
            for (const el of [...panels, ...launchers]) if (!visible.has(el)) {
                previousPositions.delete(el); motions.get(el)?.cancel(); motions.delete(el);
            }
            for (const {el, left, top, height, from} of placements) {
                const entering = !previousPositions.has(el) && el.hasAttribute('data-rc-panel');
                setStyle(el, 'left', left + 'px'); setStyle(el, 'top', top + 'px');
                if (height !== undefined) setStyle(el, 'maxHeight', height + 'px');
                if (from) {
                    motions.get(el)?.cancel();
                    // Animate only the visual offset, never width/left/top layout.
                    if (!reducedMotion.matches && !panel.classList.contains('is-resizing') && !panel.classList.contains('is-size-preset')) {
                        motions.set(el, el.animate([
                            {translate:`${from.left - left}px ${from.top - top}px`},
                            {translate:'0px 0px'}
                        ], {duration:180, easing:'cubic-bezier(.2,.8,.2,1)'}));
                    }
                }
                if (entering && !reducedMotion.matches) {
                    motions.set(el, el.animate([{opacity:0, translate:'0px 6px'}, {opacity:1, translate:'0px 0px'}],
                        {duration:180, easing:'cubic-bezier(.2,.8,.2,1)'}));
                }
                previousPositions.set(el, {left, top});
            }
        };
        const layoutCompanions = () => {
            if (!layoutFrame) layoutFrame = requestAnimationFrame(performCompanionLayout);
        };
        window.addEventListener('rc-panel-layout', layoutCompanions);
