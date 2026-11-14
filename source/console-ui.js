        const tabInfo = {
            theme: ['Giao diện', 'Không gian của bạn', 'Chọn màu sắc và kiểu hiển thị theo cách bạn thích.', '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 10h18M10 10v11"/>'],
            feat: ['Tiện ích', 'Thao tác thuận tiện hơn', 'Tuỳ chỉnh nhập liệu, sao chép và cách gửi câu trả lời.', '<path d="m13 3-9 11h7l-1 7 10-12h-7z"/>'],
            ocr: ['Văn bản', 'Đọc rõ, sao chép dễ', 'Ưu tiên chữ gốc. OCR hỗ trợ khi tin nhắn chỉ có ảnh.', '<path d="M5 4h14M12 4v16M8 20h8"/>'],
            music: ['Nhạc', 'Một chút tập trung', 'Mở nhạc bạn thích và tiếp tục học theo nhịp của mình.', '<path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/>']
        };
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
            const title = document.createElement('h3'), desc = document.createElement('p');
            title.textContent = tabInfo[s.dataset.sec][1]; desc.textContent = tabInfo[s.dataset.sec][2];
            intro.append(title, desc); s.prepend(intro);
        }
        /* CONSOLE_SIZE_CONTROLS */
        $$('.sm').forEach(b => b.classList.add('ui-btn', 'ui-btn-sm'));
        $('.x').classList.add('ui-btn', 'ui-btn-ghost');
        $('.hd b').textContent = 'Ultimate RC';
        // The preferred route leads the text settings; preserve all input bindings.
        const sourceToggle = $('[data-tg="sourceFirst"]');
        if (sourceToggle) $('.sec[data-sec="ocr"] .console-intro').after(sourceToggle);
        const revealSelectedTab = () => {
            const selected = tabButtons.find(b => b.dataset.tab === currentTab);
            if (!selected || !panel.classList.contains('open')) return;
            const item = selected.getBoundingClientRect(), strip = tablist.getBoundingClientRect();
            // Scroll only our tab strip, including on Chrome before scrollIntoView's container option.
            if (item.left < strip.left + 5) tablist.scrollLeft -= strip.left + 5 - item.left;
            else if (item.right > strip.right - 5) tablist.scrollLeft += item.right - strip.right + 5;
        };
        new ResizeObserver(revealSelectedTab).observe(tablist);
        const setTab = t => {
            if (!tabInfo[t]) t = 'theme';
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
