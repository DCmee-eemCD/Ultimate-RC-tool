// Explicit command palette for the settings companion row. User input only
// selects handlers from this registry; it is never evaluated as JavaScript.
(() => {
        const commandToggle = document.createElement('button');
        commandToggle.type = 'button'; commandToggle.id = 'rc-command-toggle';
        commandToggle.className = 'ui-btn'; commandToggle.setAttribute('data-rc-launcher', '0');
        commandToggle.setAttribute('aria-label', 'Mở bảng lệnh');
        commandToggle.setAttribute('aria-controls', 'rc-command-panel'); commandToggle.setAttribute('aria-expanded', 'false');
        commandToggle.title = 'Lệnh (Alt+K)';
        commandToggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 9 3 3-3 3"/><path d="M13 15h3"/><rect x="3" y="4" width="18" height="16" rx="3"/></svg>';

        const commandPanel = document.createElement('dialog');
        commandPanel.id = 'rc-command-panel'; commandPanel.className = 'rc-command-panel'; commandPanel.hidden = true;
        commandPanel.setAttribute('data-rc-panel', 'command'); commandPanel.setAttribute('popover', 'manual');
        commandPanel.setAttribute('aria-labelledby', 'rc-command-title');
        const heading = document.createElement('header'); heading.className = 'rc-command-heading';
        const title = document.createElement('h2'); title.id = 'rc-command-title'; title.textContent = 'L\u1ec7nh';
        const kicker = document.createElement('span'); kicker.className = 'rc-command-kicker'; kicker.textContent = 'Alt+K';
        const close = document.createElement('button'); close.type = 'button'; close.className = 'ui-btn ui-btn-ghost'; close.textContent = '×'; close.setAttribute('aria-label', 'Đóng bảng lệnh');
        const icon = document.createElement('span'); icon.className = 'rc-terminal-icon'; icon.innerHTML = commandToggle.innerHTML; icon.setAttribute('aria-hidden', 'true');
heading.append(icon, title, kicker, close);

        const body = document.createElement('div'); body.className = 'rc-command-body';
        const search = document.createElement('search'); search.className = 'rc-command-search';
        const form = document.createElement('form'); form.noValidate = true;
        const label = document.createElement('label'); label.className = 'rc-command-label'; label.htmlFor = 'rc-command-input'; label.textContent = 'Nhập lệnh';
        const input = document.createElement('input'); input.id = 'rc-command-input'; input.type = 'text'; input.className = 'ui-input';
        input.autocomplete = 'off'; input.spellcheck = false; input.placeholder = 'Nh\u1eadp l\u1ec7nh...';
        input.setAttribute('aria-describedby', 'rc-command-help rc-command-status'); const prompt = document.createElement('span'); prompt.className = 'rc-terminal-prompt'; prompt.innerHTML = '<span>&#10140;</span><span>~</span>'; prompt.setAttribute('aria-hidden', 'true');
const submit = document.createElement('button'); submit.type = 'submit'; submit.className = 'ui-btn rc-terminal-submit'; submit.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-corner-down-left preview-icon" aria-hidden="true" focusable="false"><path d="M20 4v7a4 4 0 0 1-4 4H4"/><path d="m9 10-5 5 5 5"/></svg>'; submit.setAttribute('aria-label', 'Run command');
form.append(label, prompt, input, submit); search.append(form);
        const help = document.createElement('p'); help.id = 'rc-command-help'; help.className = 'rc-command-help'; help.textContent = 'Enter ch\u1ea1y l\u1ec7nh. Ph\u00edm l\u00ean / xu\u1ed1ng xem l\u1ecbch s\u1eed.';
        const suggestions = document.createElement('ul'); suggestions.id = 'rc-command-suggestions'; suggestions.className = 'rc-command-suggestions'; suggestions.setAttribute('aria-label', 'Lệnh gợi ý');
        const transcript = document.createElement('ol'); transcript.id = 'rc-command-history'; transcript.className = 'rc-command-history'; transcript.setAttribute('role', 'log'); transcript.setAttribute('aria-live', 'polite'); transcript.setAttribute('aria-relevant', 'additions');
        const status = document.createElement('p'); status.id = 'rc-command-status'; status.className = 'rc-command-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.textContent = 'Sẵn sàng.';
        const welcome = document.createElement('li'); welcome.className = 'rc-command-line output'; welcome.textContent = 'G\u00f5 help \u0111\u1ec3 xem c\u00e1c l\u1ec7nh c\u00f3 s\u1eb5n.'; transcript.append(welcome); transcript.tabIndex = 0; transcript.setAttribute('aria-label', 'K\u1ebft qu\u1ea3 l\u1ec7nh');
body.append(transcript, search, help, suggestions, status); commandPanel.append(heading, body); $('.w').append(commandToggle, commandPanel);

        let commandHistory = [], historyIndex = -1;
        const normalize = value => String(value || '').trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
        const appendLine = (kind, value) => {
            const line = document.createElement('li'); line.className = 'rc-command-line ' + kind;
            if (value instanceof Node) line.append(value); else line.textContent = value;
            transcript.append(line);
            while (transcript.children.length > 32) transcript.firstElementChild.remove(); transcript.scrollTop = transcript.scrollHeight;
        };
        const closeCommand = (focus = true) => {
            if (commandPanel.matches(':popover-open')) commandPanel.hidePopover(); commandPanel.hidden = true;
            commandToggle.hidden = !panel.classList.contains('open');
            commandToggle.setAttribute('aria-expanded', 'false'); layoutCompanions();
            if (focus && !commandToggle.hidden) commandToggle.focus({preventScroll:true});
        };
        const positionCommand = () => {
            if (!panel.classList.contains('open')) return closeCommand(false);
            commandToggle.hidden = !panel.classList.contains('open') || !commandPanel.hidden; layoutCompanions();
        };
        const clickExisting = (selector, message) => { const control = root.querySelector(selector); if (!control) throw new Error(message || 'Không tìm thấy điều khiển này.'); control.click(); };
        const setToggle = (key, enabled) => { const control = root.querySelector('input[data-k="' + key + '"]'); if (!control) throw new Error('Không tìm thấy tuỳ chọn ' + key + '.'); if (control.checked !== enabled) control.click(); };
        const tabNames = Object.freeze({theme:'theme',appearance:'theme','giao-dien':'theme',giaodien:'theme',feat:'feat',utilities:'feat',utility:'feat','tien-ich':'feat',tienich:'feat',ocr:'ocr',text:'ocr','van-ban':'ocr',vanban:'ocr'});
        const presetNames = Object.freeze({'0':0,discord:0,'discord-dark':0,discorddark:0,'1':1,default:1,'mac-dinh':1,macdinh:1,'2':2,dark:2,indigo:2,toi:2,'3':3,pink:3,hong:3,'4':4,green:4,rung:4,'5':5,sunset:5,'hoang-hon':5,hoanghon:5});
        const renderThemeHelp = () => {
            const section = document.createElement('section'); section.className = 'rc-command-theme-help'; section.lang = 'vi';
            const heading = document.createElement('h3'); heading.textContent = 'Bảng màu';
            const hint = document.createElement('p'); hint.textContent = 'Chọn để áp dụng, hoặc gõ lệnh bên dưới.';
            const choices = document.createElement('ul'); choices.className = 'rc-command-theme-grid';
            ['discord', 'default', 'dark', 'pink', 'green', 'sunset'].forEach(key => {
                const preset = PRESETS[presetNames[key]];
                const item = document.createElement('li');
                const button = document.createElement('button'); button.type = 'button'; button.className = 'rc-command-theme-choice';
                button.setAttribute('aria-label', 'Áp dụng ' + preset.n + ' (theme ' + key + ')');
                const swatches = document.createElement('span'); swatches.className = 'rc-command-theme-swatches'; swatches.setAttribute('aria-hidden', 'true');
                ['primary', 'userBubble', 'botBubble', 'pageBg'].forEach(color => {
                    const swatch = document.createElement('span'); swatch.style.backgroundColor = preset.c[color]; swatches.append(swatch);
                });
                const name = document.createElement('span'); name.className = 'rc-command-theme-name'; name.textContent = preset.n;
                const usage = document.createElement('code'); usage.textContent = 'theme ' + key;
                button.append(swatches, name, usage);
                button.addEventListener('click', () => { execute('theme ' + key); input.focus({preventScroll:true}); });
                item.append(button); choices.append(item);
            });
            section.append(heading, hint, choices);
            return {content:section, message:'Chọn một trong 6 bảng màu để áp dụng.'};
        };
        const commandRegistry = Object.freeze([
            {name:'help', aliases:['?','tro-giup','trogip'], usage:'help [lệnh]', description:'Xem danh sách lệnh hoặc hướng dẫn một lệnh.', run: args => { const target = commandByName.get(normalize(args[0] || '')); if (args.length && target?.name === 'theme') return renderThemeHelp(); if (args.length && target) return target.name + ': ' + target.usage + '\n' + target.description; if (args.length) throw new Error('Không có lệnh “' + args[0] + '”. Gõ help để xem danh sách.'); return commandRegistry.map(command => command.name + ' — ' + command.description).join('\n'); }},
            {name:'history', aliases:['lich-su','lichsu'], usage:'history', description:'Hiện các lệnh gần đây trong phiên này.', run: args => { if (args.length) throw new Error('Dùng: history.'); return commandHistory.length > 1 ? commandHistory.slice(1).map((value, index) => (index + 1) + '. ' + value).join('\n') : 'Chưa có lệnh trước đó.'; }},
            {name:'settings', aliases:['console','cai-dat','caidat'], usage:'settings', description:'Mở bảng cài đặt Ultimate RC.', run: args => { if (args.length) throw new Error('Dùng: settings.'); togglePanel(true); return 'Đã mở bảng cài đặt.'; }},
            {name:'tab', aliases:['section'], usage:'tab appearance|utilities|text', description:'Chuyển sang một nhóm cài đặt.', run: args => { const tab = tabNames[normalize(args.join('-')).replace(/\s+/g, '-')]; if (!tab) throw new Error('Tab không hợp lệ. Dùng appearance, utilities hoặc text.'); setTab(tab); return 'Đã chuyển sang tab ' + tab + '.'; }},
            {name:'theme', aliases:['preset','palette'], usage:'theme discord|default|dark|pink|green|sunset', description:'Áp dụng một bảng màu nhanh.', run: args => { const key = normalize(args.join('-')).replace(/\s+/g, '-'); const index = presetNames[key]; if (index === undefined) throw new Error('Bảng màu không hợp lệ. Dùng help theme để xem lựa chọn.'); clickExisting('[data-pre="' + index + '"]', 'Không tìm thấy bảng màu.'); return 'Đã áp dụng bảng màu ' + key + '.'; }},
            {name:'assistant', aliases:['ai'], usage:'assistant', description:'Mở bảng trợ lý AI.', run: args => { if (args.length) throw new Error('Dùng: assistant.'); togglePanel(true); const control = document.querySelector('.rc-answer-host')?.shadowRoot?.querySelector('#ai-toggle'); if (!control) throw new Error('Trợ lý AI chưa sẵn sàng.'); if (control.getAttribute('aria-expanded') !== 'true') control.click(); return {message:'Đã mở bảng trợ lý AI.'}; }},
            {name:'music', aliases:['nhac'], usage:'music', description:'Mở bảng nhạc.', run: args => { if (args.length) throw new Error('Dùng: music.'); togglePanel(true); if (musicToggle.getAttribute('aria-expanded') !== 'true') musicToggle.click(); return {message:'Đã mở bảng nhạc.'}; }},
            {name:'ocr', aliases:[], usage:'ocr on|off|scan|reset', description:'Bật, tắt, quét lại hoặc đặt lại OCR.', run: args => { if (args.length !== 1) throw new Error('Dùng: ocr on, ocr off, ocr scan hoặc ocr reset.'); const action = normalize(args[0] || ''); if (action === 'on' || action === 'bat') { setToggle('wip', true); return 'Đã bật OCR tự động.'; } if (action === 'off' || action === 'tat') { setToggle('wip', false); return 'Đã tắt OCR tự động.'; } if (action === 'scan' || action === 'quet') { const pill = root.querySelector('#pill'); if (!pill) throw new Error('Không tìm thấy nút OCR.'); pill.dispatchEvent(new MouseEvent('contextmenu', {bubbles:true, cancelable:true})); return 'Đã quét ảnh mới nhất.'; } if (action === 'reset' || action === 'dat-lai' || action === 'datlai') { clickExisting('#rc-ocr-reset'); return 'Đã gửi yêu cầu đặt lại OCR.'; } throw new Error('Dùng: ocr on, ocr off, ocr scan hoặc ocr reset.'); }},
            {name:'source', aliases:['source-first','nguon'], usage:'source on|off', description:'Bật hoặc tắt ưu tiên văn bản gốc.', run: args => { if (args.length !== 1) throw new Error('Dùng: source on hoặc source off.'); const action = normalize(args[0] || ''); if (action === 'on' || action === 'bat') { setToggle('sourceFirst', true); return 'Đã bật văn bản gốc.'; } if (action === 'off' || action === 'tat') { setToggle('sourceFirst', false); return 'Đã tắt văn bản gốc.'; } throw new Error('Dùng: source on hoặc source off.'); }},
            {name:'updates', aliases:['update','cap-nhat','capnhat'], usage:'updates', description:'Mở kiểm tra cập nhật.', run: args => { if (args.length) throw new Error('Dùng: updates.'); clickExisting('#rc-open-updates'); return 'Đang mở kiểm tra cập nhật.'; }},
            {name:'clear', aliases:['cls','xoa'], usage:'clear', description:'Xoá lịch sử hiển thị của bảng lệnh.', run: args => { if (args.length) throw new Error('Dùng: clear.'); transcript.replaceChildren(); return 'Đã xoá lịch sử hiển thị.'; }},
            {name:'close', aliases:['esc','dong'], usage:'close', description:'Đóng bảng lệnh.', run: args => { if (args.length) throw new Error('Dùng: close.'); return {message:'Đã đóng bảng lệnh.', close:true}; }},
        ]);
        const commandByName = new Map(); commandRegistry.forEach(command => [command.name, ...command.aliases].forEach(alias => commandByName.set(normalize(alias), command)));
        const renderSuggestions = value => {
            suggestions.replaceChildren(); const term = normalize(value).split(/\s+/)[0] || '';
            commandRegistry.filter(command => !term || command.name.startsWith(term)).slice(0, 5).forEach(command => {
                const item = document.createElement('li'); const button = document.createElement('button'); button.type = 'button'; button.className = 'ui-btn ui-btn-ghost'; button.textContent = command.name; button.setAttribute('aria-label', command.usage);
                button.addEventListener('click', () => { input.value = command.name + ' '; input.focus(); renderSuggestions(input.value); }); item.append(button); suggestions.append(item);
            });
        };
        const execute = value => {
            const raw = String(value || '').trim(); if (!raw) return; commandHistory = [raw, ...commandHistory.filter(entry => entry !== raw)].slice(0, 24); historyIndex = -1; appendLine('input', 'rc ~ $ ' + raw);
            const [name, ...args] = normalize(raw).split(/\s+/); const command = commandByName.get(name);
            if (!command) { const message = 'Không nhận ra lệnh “' + raw + '”. Gõ help để xem lệnh khả dụng.'; appendLine('error', message); status.textContent = message; input.value = ''; renderSuggestions(''); return; }
            try { const result = command.run(args); const message = typeof result === 'string' ? result : result?.message; if (result?.content) appendLine('output', result.content); else if (message) appendLine('output', message); status.textContent = message || 'Đã thực hiện ' + command.name + '.'; input.value = ''; renderSuggestions(''); if (result?.close) closeCommand(); }
            catch (error) { const message = error instanceof Error ? error.message : 'Không thực hiện được lệnh.'; appendLine('error', message); status.textContent = message; input.value = ''; renderSuggestions(''); }
        };
        form.addEventListener('submit', event => { event.preventDefault(); execute(input.value); }); input.addEventListener('input', () => renderSuggestions(input.value));
        input.addEventListener('keydown', event => { if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown' || !commandHistory.length) return; event.preventDefault(); historyIndex = event.key === 'ArrowUp' ? Math.min(commandHistory.length - 1, historyIndex + 1) : Math.max(-1, historyIndex - 1); input.value = historyIndex < 0 ? '' : commandHistory[historyIndex]; renderSuggestions(input.value); });
        commandToggle.addEventListener('click', () => { if (!commandPanel.hidden) return closeCommand(); commandPanel.hidden = false; commandToggle.setAttribute('aria-expanded', 'true'); positionCommand(); if (typeof commandPanel.showPopover === 'function') commandPanel.showPopover(); input.focus({preventScroll:true}); renderSuggestions(''); });
        close.addEventListener('click', () => closeCommand());
        window.addEventListener('keydown', event => { if (event.altKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyK') { event.preventDefault(); if (!panel.classList.contains('open')) { togglePanel(true); commandToggle.hidden = false; } commandToggle.click(); } else if (event.key === 'Escape' && !commandPanel.hidden) { event.preventDefault(); event.stopImmediatePropagation(); closeCommand(); } }, true);
        new ResizeObserver(positionCommand).observe(panel); panel.addEventListener('animationend', positionCommand); panel.addEventListener('transitionend', positionCommand); new MutationObserver(positionCommand).observe(panel, {attributes:true, attributeFilter:['class','style']}); window.addEventListener('resize', positionCommand); positionCommand(); renderSuggestions('');
})();
