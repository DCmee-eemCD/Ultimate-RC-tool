        // Size controls stay outside the scrolling tab content.
        const sizeBar = document.createElement('div'); sizeBar.className = 'console-sizebar';
        sizeBar.setAttribute('role', 'group'); sizeBar.setAttribute('aria-label', 'Kích thước bảng');
        const sizePresets = [['Gọn', 320, 520], ['Mặc định', 380, 620], ['Rộng', 560, 820]];
        const sizeButtons = sizePresets.map(([label, width, height], index) => {
            const button = document.createElement('button'); button.type = 'button';
            button.className = 'sm ui-btn ui-btn-sm'; button.textContent = label;
            button.dataset.sizePreset = index;
            if (index === 1) button.id = 'rc-size-reset';
            button.addEventListener('click', () => { setConsoleSize(width, height); save(); });
            sizeBar.append(button); return button;
        });
        const sizeReadout = document.createElement('span'); sizeReadout.className = 'console-size-readout';
        sizeBar.append(sizeReadout); $('.hd').after(sizeBar);
        const grip = document.createElement('button'); grip.type = 'button'; grip.id = 'rc-size-grip';
        grip.className = 'ui-btn ui-btn-ghost console-size-grip';
        grip.setAttribute('aria-label', 'Đổi kích thước bảng');
        grip.setAttribute('aria-describedby', 'rc-size-help');
        grip.title = 'Kéo để đổi kích thước · Nhấp đúp để đặt lại';
        grip.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M8 4h12v12M20 4 5 19"/></svg>';
        const sizeHelp = document.createElement('span'); sizeHelp.id = 'rc-size-help'; sizeHelp.className = 'console-size-help';
        sizeHelp.textContent = 'Kéo góc trên bên phải. Dùng phím mũi tên; Shift để đổi nhanh. Escape để hủy.';
        panel.append(grip, sizeHelp);
        let sizeDrag = null, sizeFrame = 0;
        const sizeLimits = () => ({width: Math.min(560, innerWidth - 32), height: Math.min(820, innerHeight - 96)});
        const setConsoleSize = (width, height) => {
            cfg.consoleWidth = Math.max(320, Math.min(560, Math.round(width)));
            cfg.consoleHeight = Math.max(420, Math.min(820, Math.round(height)));
            // Only update panel geometry while dragging; do not re-theme the page.
            $('.w').style.setProperty('--console-width', cfg.consoleWidth + 'px');
            $('.w').style.setProperty('--console-height', cfg.consoleHeight + 'px');
            sizeButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(
                cfg.consoleWidth === sizePresets[i][1] && cfg.consoleHeight === sizePresets[i][2])));
        };
        const syncSizeReadout = () => {
            if (!panel.classList.contains('open')) return;
            sizeReadout.textContent = panel.offsetWidth + ' × ' + panel.offsetHeight;
            sizeButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(
                cfg.consoleWidth === sizePresets[i][1] && cfg.consoleHeight === sizePresets[i][2])));
        };
        new ResizeObserver(syncSizeReadout).observe(panel);
        const paintSizeDrag = () => {
            sizeFrame = 0; if (!sizeDrag || !sizeDrag.moved) return;
            const limits = sizeLimits();
            setConsoleSize(Math.min(limits.width, sizeDrag.width + sizeDrag.x - sizeDrag.startX),
                Math.min(limits.height, sizeDrag.height + sizeDrag.startY - sizeDrag.y));
        };
        const finishSizeDrag = cancel => {
            if (!sizeDrag) return;
            cancelAnimationFrame(sizeFrame); sizeFrame = 0;
            if (cancel) setConsoleSize(sizeDrag.savedWidth, sizeDrag.savedHeight);
            else if (sizeDrag.moved) { paintSizeDrag(); save(); }
            const pointerId = sizeDrag.pointerId; sizeDrag = null;
            panel.classList.remove('is-resizing');
            if (grip.hasPointerCapture(pointerId)) grip.releasePointerCapture(pointerId);
        };
        grip.addEventListener('pointerdown', e => {
            if (e.button !== 0 || !e.isPrimary || sizeDrag) return;
            e.preventDefault(); grip.focus({preventScroll: true});
            const rect = {width:panel.offsetWidth, height:panel.offsetHeight};
            sizeDrag = {pointerId:e.pointerId, startX:e.clientX, startY:e.clientY, x:e.clientX, y:e.clientY,
                width:rect.width, height:rect.height, savedWidth:cfg.consoleWidth, savedHeight:cfg.consoleHeight};
            grip.setPointerCapture(e.pointerId); panel.classList.add('is-resizing');
        });
        grip.addEventListener('pointermove', e => {
            if (!sizeDrag || e.pointerId !== sizeDrag.pointerId) return;
            sizeDrag.x = e.clientX; sizeDrag.y = e.clientY;
            sizeDrag.moved ||= Math.hypot(e.clientX - sizeDrag.startX, e.clientY - sizeDrag.startY) >= 3;
            if (!sizeFrame) sizeFrame = requestAnimationFrame(paintSizeDrag);
        });
        grip.addEventListener('pointerup', e => {
            if (!sizeDrag || e.pointerId !== sizeDrag.pointerId) return;
            sizeDrag.x = e.clientX; sizeDrag.y = e.clientY; finishSizeDrag(false);
        });
        grip.addEventListener('pointercancel', () => finishSizeDrag(true));
        grip.addEventListener('lostpointercapture', () => finishSizeDrag(true));
        window.addEventListener('blur', () => finishSizeDrag(true));
        window.addEventListener('resize', () => finishSizeDrag(true));
        // Register before the panel's Escape-to-close listener.
        window.addEventListener('keydown', e => {
            if (e.key === 'Escape' && sizeDrag) { e.preventDefault(); e.stopImmediatePropagation(); finishSizeDrag(true); }
        }, true);
        grip.addEventListener('dblclick', () => { setConsoleSize(380, 620); save(); });
        grip.addEventListener('keydown', e => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(e.key)) return;
            e.preventDefault();
            if (e.key === 'Home') { setConsoleSize(380, 620); save(); return; }
            const limits = sizeLimits(), step = e.shiftKey ? 40 : 10;
            const horizontal = e.key === 'ArrowLeft' || e.key === 'ArrowRight';
            setConsoleSize(horizontal ? Math.min(limits.width, panel.offsetWidth + (e.key === 'ArrowRight' ? step : -step)) : cfg.consoleWidth,
                horizontal ? cfg.consoleHeight : Math.min(limits.height, panel.offsetHeight + (e.key === 'ArrowUp' ? step : -step)));
            save();
        });
        applyDashboardTheme();
