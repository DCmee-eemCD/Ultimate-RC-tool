        const tabInfo = {
            theme: ['Giao diện', 'Giao diện', 'Cài đặt màu sắc và kiểu hiển thị.', '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 10h18M10 10v11"/>'],
            feat: ['Tiện ích', 'Tiện ích', 'Cài đặt nhập liệu, sao chép và gửi câu trả lời.', '<path d="m13 3-9 11h7l-1 7 10-12h-7z"/>'],
            ocr: ['Văn bản', 'Văn bản', 'Cài đặt sao chép văn bản và nhận dạng chữ trong ảnh.', '<path d="M5 4h14M12 4v16M8 20h8"/>'],
            music: ['Nhạc', 'Nhạc', 'Chọn và phát nhạc.', '<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>']
        };
        // Music is a companion panel, alongside the Assistant launcher.
        $('[data-tab="music"]').remove();
        const musicSettings = $('[data-sec="music"]');
        musicSettings.className = 'music-settings';
        musicSettings.removeAttribute('data-sec');
        musicSettings.id = 'rc-music-settings';
        musicSettings.setAttribute('data-rc-panel', 'music');
        musicSettings.setAttribute('popover', 'manual');
        musicSettings.setAttribute('aria-label', 'Nhạc');
        const musicIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eighth-notes preview-icon" aria-hidden="true"><path d="M21 16V3a1 1 0 0 0-1.28-.96l-10 2.917a1 1 0 0 0-.72.96V19"/><circle cx="18" cy="16" r="3"/><circle cx="6" cy="19" r="3"/></svg>';
        const musicToggle = document.createElement('button');
        musicToggle.id = 'rc-music-toggle'; musicToggle.type = 'button'; musicToggle.className = 'ui-btn';
        musicToggle.setAttribute('data-rc-launcher', '2');
        musicToggle.innerHTML = musicIcon; musicToggle.title = 'Nhạc';
        musicToggle.setAttribute('aria-label', 'Mở bảng nhạc');
        musicToggle.setAttribute('aria-controls', musicSettings.id);
        musicToggle.setAttribute('aria-expanded', 'false');
        const musicHeader = document.createElement('header'); musicHeader.className = 'music-heading';
        musicHeader.innerHTML = musicIcon + '<h2>Nhạc</h2>';
        const musicDismiss = document.createElement('button');
        musicDismiss.type = 'button'; musicDismiss.className = 'ui-btn ui-btn-ghost';
        musicDismiss.textContent = '×'; musicDismiss.setAttribute('aria-label', 'Đóng bảng nhạc');
        musicHeader.append(musicDismiss); musicSettings.prepend(musicHeader);
        $('#rc-music-url').setAttribute('aria-label', 'Link YouTube / Spotify');
        $('.w').append(musicToggle, musicSettings);
        const closeMusicSettings = (focus = true) => {
            if (musicSettings.matches(':popover-open')) musicSettings.hidePopover();
            musicSettings.hidden = true; musicToggle.setAttribute('aria-expanded', 'false');
            musicToggle.hidden = !panel.classList.contains('open');
            layoutCompanions();
            if (focus) musicToggle.focus({preventScroll:true});
        };
        const positionMusic = () => {
            const shown = panel.classList.contains('open'); musicToggle.hidden = !shown || !musicSettings.hidden;
            if (!shown) closeMusicSettings(false);
            layoutCompanions();
        };
        musicToggle.addEventListener('click', () => {
            if (musicSettings.matches(':popover-open')) return closeMusicSettings();
            musicSettings.hidden = false; positionMusic(); musicSettings.showPopover();
            musicToggle.setAttribute('aria-expanded', 'true'); musicDismiss.focus({preventScroll:true});
        });
        musicDismiss.addEventListener('click', () => closeMusicSettings());
        window.addEventListener('keydown', event => {
            if (event.key === 'Escape' && musicSettings.matches(':popover-open')) {
                event.preventDefault(); event.stopImmediatePropagation(); closeMusicSettings();
            }
        }, true);
        new ResizeObserver(positionMusic).observe(panel);
        panel.addEventListener('animationend', positionMusic);
        panel.addEventListener('transitionend', positionMusic);
        new MutationObserver(positionMusic).observe(panel, {attributes:true, attributeFilter:['class','style']});
        window.addEventListener('resize', positionMusic); positionMusic();
        const tablist = $('.tabs'), tabButtons = $$('.tab'), tabScroll = new Map();
        let currentTab = null;
        tablist.setAttribute('role', 'tablist');
        tablist.setAttribute('aria-label', 'Cài đặt Ultimate RC');
        tablist.setAttribute('focusgroup', 'tablist nomemory');
        for (const b of tabButtons) {
            const [label,,,path] = tabInfo[b.dataset.tab];
            b.type = 'button'; b.id = 'rc-tab-' + b.dataset.tab;
            b.setAttribute('role', 'tab');
            b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg><span></span>';
            b.querySelector('span').textContent = label;
        }
        for (const s of $$('.sec')) {
            s.setAttribute('role', 'tabpanel'); s.setAttribute('aria-labelledby', 'rc-tab-' + s.dataset.sec);
            const intro = document.createElement('div'); intro.className = 'console-intro';
            const desc = document.createElement('p');
            desc.textContent = tabInfo[s.dataset.sec][2];
            // The selected tab already names the section; keep one useful description.
            intro.append(desc); s.prepend(intro);
        }
        // Group the existing controls without changing their bindings or order.
        // Wide panels can put related groups beside one another.
        for (const section of $$('.sec')) {
            let group;
            for (const child of [...section.children]) {
                if (child.classList.contains('console-intro')) continue;
                if (child.tagName === 'H4' || !group) {
                    group = document.createElement('div');
                    group.className = 'console-group';
                    section.insertBefore(group, child);
                }
                group.append(child);
            }
        }
        const updateGroup = document.createElement('div');
        updateGroup.className = 'console-updates';
        const updateButton = document.createElement('button');
        updateButton.type = 'button'; updateButton.id = 'rc-open-updates';
        updateButton.className = 'sm ui-btn ui-btn-sm';
        updateButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 17.9 17"/></svg><span>Cập nhật</span>';
        updateButton.setAttribute('aria-label', 'Kiểm tra cập nhật');
        updateButton.title = 'Kiểm tra cập nhật';
        const updateStatus = document.createElement('p');
        updateStatus.setAttribute('role', 'status');
        updateButton.addEventListener('click', async () => {
            updateButton.disabled = true; updateStatus.textContent = '';
            updateButton.setAttribute('aria-busy', 'true');
            try { await RC.openUpdates(); }
            catch { updateStatus.textContent = 'Không mở được cập nhật. Hãy tải lại tiện ích và làm mới EduNext.'; }
            finally { updateButton.disabled = false; updateButton.removeAttribute('aria-busy'); }
        });
        $('.hd .x').before(updateButton);
        updateGroup.append(updateStatus);
        tablist.before(updateGroup);
        /* CONSOLE_SIZE_CONTROLS */
        const resetOcrButton = document.createElement('button');
        resetOcrButton.type = 'button'; resetOcrButton.id = 'rc-ocr-reset';
        resetOcrButton.className = 'sm wide ui-btn ui-btn-sm';
        resetOcrButton.textContent = 'Đặt lại OCR';
        const resetOcrHint = document.createElement('p');
        resetOcrHint.textContent = 'Dừng OCR trên các tab và tải lại trang này để thử lại. Giữ nguyên cài đặt.';
        resetOcrHint.id = 'rc-ocr-reset-hint';
        resetOcrHint.setAttribute('role', 'status');
        resetOcrButton.setAttribute('aria-describedby', resetOcrHint.id);
        $('#rk-hubclose').after(resetOcrButton, resetOcrHint);
        resetOcrButton.addEventListener('click', async () => {
            resetOcrButton.disabled = true;
            resetOcrButton.textContent = 'Đang đặt lại OCR…';
            try {
                await RC.flush();
                await RC.ocrReset();
                location.reload();
            } catch (error) {
                resetOcrHint.textContent = 'Không đặt lại được OCR: ' + error.message;
                resetOcrButton.disabled = false;
                resetOcrButton.textContent = 'Đặt lại OCR';
            }
        });
        $$('.sm').forEach(b => b.classList.add('ui-btn', 'ui-btn-sm'));
        $('.x').classList.add('ui-btn', 'ui-btn-ghost');
        $('.hd b').textContent = 'Ultimate RC';
        $('.x').setAttribute('aria-label', 'Đóng cài đặt');
        // Give each standalone field a real accessible name without changing bindings.
        $$('.fld').forEach((row, index) => {
            const label = row.querySelector(':scope > span:first-child');
            if (!label || label.classList.contains('inl')) return;
            label.id ||= 'rc-field-label-' + index;
            row.querySelectorAll('input:not([type=checkbox]), select').forEach(input => {
                if (!input.hasAttribute('aria-label') && !input.hasAttribute('aria-labelledby'))
                    input.setAttribute('aria-labelledby', label.id);
            });
        });
        // The preferred route leads the text settings; preserve all input bindings.
        const sourceToggle = $('[data-tg="sourceFirst"]');
        if (sourceToggle) $('.sec[data-sec="ocr"] .console-intro').after(sourceToggle);
        const revealSelectedTab = () => {
            const selected = tabButtons.find(b => b.dataset.tab === currentTab);
            if (!selected || !panel.classList.contains('open')) return;
            const item = selected.getBoundingClientRect(), strip = tablist.getBoundingClientRect();
            // One shared underline moves between tabs without animating layout.
            const indicatorX = selected.offsetLeft + selected.offsetWidth / 2 - 14;
            const indicatorY = selected.offsetTop + selected.offsetHeight - 5;
            tablist.style.setProperty('--tab-indicator-x', indicatorX + 'px');
            tablist.style.setProperty('--tab-indicator-y', indicatorY + 'px');
            tablist.classList.add('indicator-ready');
            // Scroll only our tab strip, including on Chrome before scrollIntoView's container option.
            if (item.left < strip.left + 5) tablist.scrollLeft -= strip.left + 5 - item.left;
            else if (item.right > strip.right - 5) tablist.scrollLeft += item.right - strip.right + 5;
        };
        new ResizeObserver(revealSelectedTab).observe(tablist);
        const setTab = t => {
            if (!tabButtons.some(b => b.dataset.tab === t)) t = 'theme';
            const body = $('.body');
            if (currentTab) tabScroll.set(currentTab, body.scrollTop);
            currentTab = t; cfg.uiTab = t; save();
            for (const b of tabButtons) {
                const active = b.dataset.tab === t;
                b.classList.toggle('act', active); b.setAttribute('aria-selected', String(active));
                b.tabIndex = active ? 0 : -1; b.toggleAttribute('focusgroupstart', active);
            }
            for (const s of $$('.sec')) { const active = s.dataset.sec === t; s.classList.toggle('act', active); s.hidden = !active; }
            body.scrollTop = tabScroll.get(t) || 0;
            revealSelectedTab();
        };
        setTab(cfg.uiTab);
        tabButtons.forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
        // Manual activation avoids saving settings just by moving keyboard focus.
        tablist.addEventListener('keydown', e => {
            const index = tabButtons.indexOf(e.target); if (index < 0) return;
            const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabButtons.length - 1 : e.key === 'ArrowRight' ? (index + 1) % tabButtons.length : e.key === 'ArrowLeft' ? (index + tabButtons.length - 1) % tabButtons.length : -1;
            if (next < 0) return;
            e.preventDefault(); tabButtons[next].focus();
        });
        /* RC_COMMAND_WINDOW */
