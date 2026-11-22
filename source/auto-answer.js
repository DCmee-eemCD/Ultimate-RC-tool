// Built into extension/auto-answer.js; isolated world, never exposes the API key.
(() => {
  if (window !== window.top) return;
  const componentCss = /* RC_ANSWER_CSS */;
  const sent = new Set();
  let task = null;
  const visible = el => !!el?.isConnected && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const call = async message => {
    const response = await chrome.runtime.sendMessage(message);
    if (response?.error) {
      const errors = {
        'LLM is not configured': 'Mở Cài đặt API để lưu endpoint, model và khóa API trước.',
        'Invalid LLM endpoint': 'Endpoint không hợp lệ. Kiểm tra URL trong Cài đặt API.',
        'LLM provider request failed': 'Không kết nối được API hoặc yêu cầu hết thời gian. Kiểm tra endpoint và thử lại.',
        'LLM returned an empty answer': 'Mô hình không trả lời bằng chữ. Hãy kiểm tra model hoặc thử lại.',
        'LLM answer was too long': 'Câu trả lời quá dài nên chưa gửi. Hãy thử model khác.',
        'LLM answer was cut off; try another model': 'Câu trả lời bị cắt dở nên chưa gửi. Hãy thử model khác.',
        'LLM declined to answer': 'Mô hình từ chối trả lời câu hỏi này.',
        'LLM provider request failed (HTTP 401)': 'Khóa API không hợp lệ. Kiểm tra lại trong Cài đặt API.',
        'LLM provider request failed (HTTP 429)': 'API đang giới hạn yêu cầu hoặc hết hạn mức. Kiểm tra tài khoản nhà cung cấp.',
      };
      throw new Error(errors[response.error] || response.error);
    }
    if (!response) throw new Error('Tiện ích đã ngắt kết nối. Hãy tải lại trang.');
    return response.result;
  };

  function questionText(box) {
    const clone = box.cloneNode(true);
    clone.querySelectorAll('style, script, .rc-qlab, [aria-hidden="true"]:not(.katex-html)').forEach(el => el.remove());
    clone.querySelectorAll('.katex').forEach(el => {
      const latex = el.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
      if (latex) el.replaceWith(document.createTextNode(` $${latex}$ `));
    });
    clone.querySelectorAll('.katex-html').forEach(el => el.remove());
    clone.querySelectorAll('br').forEach(el => el.replaceWith('\n'));
    clone.querySelectorAll('p, div, li, tr').forEach(el => el.append('\n'));
    return clone.textContent.replace(/^\s*Câu hỏi\s*:?\s*/i, '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n/g, '\n\n').trim();
  }

  function messageHints(message) {
    // Read only the current bot message: feedback can be above or below the
    // repeated question, with multiple hints or without an explicit hint label.
    const clone = message.cloneNode(true);
    const originals = [...message.querySelectorAll('*')];
    const copies = [...clone.querySelectorAll('*')];
    originals.forEach((el, index) => {
      // Keep KaTeX's hidden source annotation for questionText's conversion.
      if (el.closest('.katex')) return;
      const style = getComputedStyle(el);
      if (el.hidden || style.display === 'none' || style.visibility === 'hidden') copies[index].remove();
    });
    clone.querySelectorAll('.exercise-question-block, .rc-qbox, button, [role="button"], textarea, input, select, time, img, canvas').forEach(el => el.remove());
    return questionText(clone);
  }

  function snapshot(composer) {
    if (!visible(composer)) throw new Error('Hãy mở khung chat trước.');
    const chat = composer.closest('.chat-window, .chat-popup, #chat-widget-container');
    if (!chat) throw new Error('Không xác định được cuộc trò chuyện.');
    const editor = [...composer.querySelectorAll('textarea')].find(visible);
    if (!editor || editor.disabled || editor.readOnly) throw new Error('Chuyển ô nhập sang Text và chờ chat sẵn sàng.');
    const messages = [...chat.querySelectorAll('.message-container.message-assistant')].filter(visible);
    const message = messages.at(-1);
    const box = message && [...message.querySelectorAll('.exercise-question-block, .rc-qbox')].filter(visible).at(-1);
    if (!box) throw new Error('Chưa tìm thấy hộp Câu hỏi trong tin nhắn mới nhất. Bật chữ gốc/OCR nếu cần.');
    if ([...box.querySelectorAll('img, canvas')].some(visible)) throw new Error('Câu hỏi có hình. Hiện chỉ hỗ trợ câu hỏi bằng chữ.');
    const text = questionText(box);
    const hints = messageHints(message);
    const question = text + (hints ? '\n\nGợi ý / phản hồi từ chatbot:\n' + hints : '');
    if (!text || question.length > 24000) throw new Error('Câu hỏi trống hoặc quá dài.');
    const submit = composer.querySelector('button[data-intent="SUBMIT_ANSWER"]') || composer.querySelector('button.w-send-btn');
    if (!submit || !visible(submit)) throw new Error('Không tìm thấy nút Nộp câu trả lời.');
    return {chat, editor, box, question, submit, url: location.href, key: location.href + '\n' + question};
  }

  async function answer(composer, status, answerButton, stopButton) {
    if (task) { status.textContent = 'Đang xử lý một câu hỏi. Hãy chờ hoặc dừng yêu cầu đó.'; return; }
    let initial;
    try {
      initial = snapshot(composer);
      if (initial.editor.value.trim()) throw new Error('Ô nhập đang có nội dung. Hãy gửi hoặc xóa bản nháp trước.');
      if (sent.has(initial.key)) throw new Error('Câu hỏi này đã được bấm nộp. Chờ câu hỏi mới để tránh gửi trùng.');
    } catch (error) { status.dataset.state = 'error'; status.textContent = error.message; return; }
    const active = {cancelled: false, edited: false};
    task = active;
    status.dataset.state = 'working';
    answerButton.setAttribute('aria-busy', 'true');
    answerButton.disabled = true;
    stopButton.hidden = false;
    const onEdit = event => { if (event.isTrusted) active.edited = true; };
    initial.editor.addEventListener('input', onEdit);
    const check = () => {
      if (active.cancelled) throw new Error('Đã dừng. Không gửi câu trả lời.');
      if (active.edited) throw new Error('Bạn đã sửa ô nhập. Không thay bản nháp hoặc gửi tự động.');
      const now = snapshot(composer);
      if (now.url !== initial.url || now.chat !== initial.chat || now.box !== initial.box || now.question !== initial.question || now.editor !== initial.editor)
        throw new Error('Cuộc trò chuyện hoặc câu hỏi đã đổi. Không gửi kết quả cũ.');
      return now;
    };
    try {
      status.textContent = 'Đang đọc Câu hỏi và tạo câu trả lời ngắn…';
      const result = await call({op: 'llm-answer', question: initial.question});
      const text = result?.answer?.trim();
      if (!text || text.length > 4000) throw new Error('Mô hình không trả về câu trả lời hợp lệ.');
      check();
      if (initial.editor.value.trim()) throw new Error('Ô nhập đã có nội dung. Không thay bản nháp.');
      // Use the native setter to notify React rather than changing its value tracker.
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(initial.editor, text);
      initial.editor.dispatchEvent(new Event('input', {bubbles: true}));
      initial.editor.dispatchEvent(new Event('change', {bubbles: true}));
      status.textContent = 'Đã điền câu trả lời. Đang chờ nút nộp…';
      let target;
      for (let i = 0; i < 25; i++) {
        await pause(80);
        const now = check();
        if (now.editor.value !== text) throw new Error('Nội dung ô nhập đã đổi. Không tự gửi.');
        if (!now.submit.disabled && now.submit.getAttribute('aria-disabled') !== 'true') { target = now.submit; break; }
      }
      if (!target) throw new Error('Nút nộp chưa sẵn sàng. Câu trả lời đã điền; bạn có thể nộp thủ công.');
      check();
      sent.add(initial.key); // Claim before clicking: never retry an ambiguous submission.
      target.click();
      status.textContent = 'Đã bấm nộp câu trả lời. Đang chờ trang xác nhận…';
      let confirmed = false;
      for (let i = 0; i < 30; i++) {
        await pause(100);
        if (!initial.editor.isConnected || !initial.editor.value.trim()) { confirmed = true; break; }
      }
      status.dataset.state = confirmed ? 'done' : 'notice';
      status.textContent = confirmed ? 'Đã gửi câu trả lời.' : 'Đã bấm nộp nhưng chưa xác nhận. Kiểm tra chat trước khi gửi lại.';
    } catch (error) {
      status.dataset.state = active.cancelled ? 'notice' : 'error';
      status.textContent = active.cancelled ? 'Đã dừng. Không gửi câu trả lời.' : error.message;
    } finally {
      initial.editor.removeEventListener('input', onEdit);
      if (task === active) task = null;
      answerButton.disabled = false;
      answerButton.removeAttribute('aria-busy');
      stopButton.hidden = true;
    }
  }

  function mount(main, mainWrapper) {
    const host = document.createElement('div');
    host.className = 'rc-answer-host';
    host.setAttribute('data-rc-panel-host', '');
    const root = host.attachShadow({mode: 'open'});
    const style = document.createElement('style');
    style.textContent = componentCss;
    root.append(style);
    const wrapper = document.createElement('div'); wrapper.className = 'w'; wrapper.lang = 'vi';
    const bot = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bot preview-icon" aria-hidden="true"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>';
    const toggle = document.createElement('button'); toggle.id = 'ai-toggle'; toggle.type = 'button'; toggle.className = 'ui-btn'; toggle.innerHTML = bot;
    toggle.setAttribute('aria-label', 'Mở bảng AI'); toggle.title = 'Bảng AI';
    toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'ai-panel');
    const panel = document.createElement('section'); panel.id = 'ai-panel'; panel.hidden = true;
    panel.setAttribute('data-rc-panel', 'assistant');
    toggle.setAttribute('data-rc-launcher', '1');
    panel.setAttribute('popover', 'manual'); panel.setAttribute('aria-labelledby', 'ai-title');
    const heading = document.createElement('header'); heading.className = 'ai-heading';
    heading.innerHTML = bot + '<h2 id="ai-title">Trợ lý AI</h2>';
    const close = document.createElement('button'); close.type = 'button'; close.id = 'ai-close'; close.className = 'ui-btn ui-btn-ghost'; close.textContent = '×'; close.setAttribute('aria-label', 'Đóng bảng AI'); heading.append(close);
    const content = document.createElement('div'); content.className = 'ai-content';
    const help = document.createElement('p'); help.className = 'ai-help'; help.textContent = 'Trả lời câu hỏi trong cuộc trò chuyện đang mở.';
    const questionContext = document.createElement('section'); questionContext.id = 'question-context';
    questionContext.setAttribute('aria-labelledby', 'question-title');
    const questionHeading = document.createElement('div'); questionHeading.className = 'question-heading';
    const questionTitle = document.createElement('h3'); questionTitle.id = 'question-title'; questionTitle.textContent = 'Câu hỏi hiện tại';
    const refreshQuestion = document.createElement('button'); refreshQuestion.type = 'button'; refreshQuestion.id = 'refresh-question';
    refreshQuestion.className = 'ui-btn ui-btn-ghost ui-btn-sm'; refreshQuestion.textContent = 'Đọc lại';
    const preview = document.createElement('p'); preview.id = 'question-preview'; preview.tabIndex = 0;
    questionHeading.append(questionTitle, refreshQuestion); questionContext.append(questionHeading, preview);
    const updatePreview = () => {
      const composers = [...document.querySelectorAll('.w-chat-input')].filter(visible);
      try {
        if (composers.length !== 1) throw new Error('Mở một khung chat có Câu hỏi, rồi chọn Đọc lại.');
        preview.textContent = snapshot(composers[0]).question;
        questionContext.removeAttribute('data-empty');
      } catch (error) {
        questionContext.setAttribute('data-empty', ''); preview.textContent = error.message;
      }
    };
    refreshQuestion.addEventListener('click', updatePreview);
    const row = document.createElement('div'); row.className = 'row';
    const button = (label, id) => {
      const el = document.createElement('button'); el.type = 'button'; el.textContent = label; el.id = id; el.className = 'ui-btn ui-btn-sm'; row.append(el); return el;
    };
    const start = button('AI trả lời & gửi', 'answer');
    const stop = button('Dừng', 'stop'); stop.hidden = true;
    const settings = button('Cài đặt API', 'settings');
    const automatic = button('Tự động: Bật', 'auto');
    automatic.setAttribute('aria-pressed', 'true');
    let autoEnabled = true;
    let candidate = null;
    const attempted = new Set();
    const setAutomatic = enabled => {
      autoEnabled = enabled;
      candidate = null;
      automatic.textContent = enabled ? 'Tự động: Bật' : 'Tự động: Tắt';
      automatic.setAttribute('aria-pressed', String(enabled));
      if (!enabled && task) task.cancelled = true;
      if (enabled) attempted.clear();
    };
    automatic.addEventListener('click', event => {
      if (event.isTrusted) setAutomatic(!autoEnabled);
    });
    const actionNote = document.createElement('p'); actionNote.className = 'ai-action-note'; actionNote.id = 'ai-action-note';
    actionNote.textContent = 'Tự động trả lời và nộp câu hỏi mới khi ô nhập trống. Có thể tắt tự động hoặc bấm trả lời để thử lại.';
    start.setAttribute('aria-describedby', actionNote.id);
    const frame = document.createElement('iframe'); frame.id = 'api-frame'; frame.title = 'Cài đặt API'; frame.hidden = true;
    settings.setAttribute('aria-controls', 'api-frame'); settings.setAttribute('aria-expanded', 'false');
    const syncFrame = () => {
      if (!frame.src) return;
      const style = getComputedStyle(wrapper);
      const colors = Object.fromEntries(['--bg','--fg','--surface','--line','--acc','--secondary','--mut'].map(name => [name, style.getPropertyValue(name).trim()]));
      frame.contentWindow?.postMessage({rcAISettings:'theme', colors}, chrome.runtime.getURL('').replace(/\/$/, ''));
    };
    frame.addEventListener('load', syncFrame);
    const status = document.createElement('p'); status.className = 'status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    status.textContent = 'Tự động đang bật. Đang chờ câu hỏi mới…';
    const activity = document.createElement('section'); activity.className = 'ai-activity';
    const activityTitle = document.createElement('h3'); activityTitle.textContent = 'Trạng thái';
    activity.append(activityTitle, status);
    const updateActivity = () => {
      const labels = {working:'Đang xử lý', done:'Đã hoàn tất', error:'Cần kiểm tra', notice:'Lưu ý'};
      activityTitle.textContent = labels[status.dataset.state] || 'Trạng thái';
    };
    new MutationObserver(updateActivity).observe(status, {attributes:true, attributeFilter:['data-state']});
    const controls = document.createElement('div'); controls.className = 'ai-controls';
    controls.append(automatic, row, actionNote);
    content.append(help, questionContext, controls, activity, settings, frame); panel.append(heading, content);
    wrapper.append(toggle, panel); root.append(wrapper); document.body.append(host);
    let open = false;
    const closePanel = (focus = true) => {
      if (panel.matches(':popover-open')) panel.hidePopover();
      open = false; panel.hidden = true; toggle.setAttribute('aria-expanded', 'false');
      position();
      if (focus && !toggle.hidden) toggle.focus({preventScroll:true});
    };
    const position = () => {
      const shown = visible(main);
      toggle.hidden = !shown || open;
      if (!shown) {
        if (panel.matches(':popover-open')) panel.hidePopover();
        open = false; panel.hidden = true; toggle.setAttribute('aria-expanded', 'false');
        window.dispatchEvent(new Event('rc-panel-layout')); return;
      }
      const colors = getComputedStyle(mainWrapper);
      for (const name of ['--bg', '--fg', '--surface', '--line', '--acc', '--secondary', '--mut']) {
        const value = colors.getPropertyValue(name).trim(); if (value) wrapper.style.setProperty(name, value);
      }
      syncFrame();
      window.dispatchEvent(new Event('rc-panel-layout'));
    };
    toggle.addEventListener('click', () => {
      updatePreview();
      open = true; panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); position(); panel.showPopover(); close.focus({preventScroll:true});
    });
    close.addEventListener('click', () => closePanel());
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape' && open) { event.preventDefault(); event.stopImmediatePropagation(); closePanel(); }
    }, true);
    new ResizeObserver(position).observe(main);
    main.addEventListener('animationend', position);
    const changes = new MutationObserver(position);
    changes.observe(main, {attributes:true, attributeFilter:['class', 'style']});
    changes.observe(mainWrapper, {attributes:true, attributeFilter:['class', 'style']});
    window.addEventListener('resize', position);
    position();
    start.addEventListener('click', event => {
      if (!event.isTrusted) return;
      const composers = [...document.querySelectorAll('.w-chat-input')].filter(visible);
      updatePreview();
      if (composers.length !== 1) { status.dataset.state = 'error'; status.textContent = 'Hãy mở một khung chat để AI đọc đúng Câu hỏi.'; return; }
      try { attempted.add(snapshot(composers[0]).key); } catch { /* answer displays the error */ }
      void answer(composers[0], status, start, stop);
    });
    stop.addEventListener('click', event => {
      if (!event.isTrusted || !task) return;
      setAutomatic(false);
      task.cancelled = true; status.dataset.state = 'notice'; status.textContent = 'Đã dừng gửi. Đang chờ yêu cầu API kết thúc (có thể vẫn tính phí).';
    });
    // Poll only the current composer. A stable candidate avoids requesting each
    // partial text update; attempts are claimed before calling the provider.
    setInterval(() => {
      if (!autoEnabled || task) { candidate = null; return; }
      const composers = [...document.querySelectorAll('.w-chat-input')].filter(visible);
      if (composers.length !== 1) { candidate = null; return; }
      let current;
      try { current = snapshot(composers[0]); } catch { candidate = null; return; }
      if (current.editor.value.trim() || sent.has(current.key) || attempted.has(current.key)) { candidate = null; return; }
      if (!candidate || candidate.key !== current.key || candidate.box !== current.box || candidate.editor !== current.editor) {
        candidate = {...current, since: Date.now()};
        return;
      }
      if (Date.now() - candidate.since < 1200) return;
      attempted.add(current.key);
      candidate = null;
      updatePreview();
      void answer(composers[0], status, start, stop);
    }, 500);
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.rcLlmConfig) { attempted.clear(); candidate = null; }
    });
    settings.addEventListener('click', event => {
      if (!event.isTrusted) return;
      const show = frame.hidden;
      frame.hidden = !show; help.hidden = show; row.hidden = show; activity.hidden = show;
      controls.hidden = show;
      questionContext.hidden = show; actionNote.hidden = show;
      heading.querySelector('h2').textContent = show ? 'Kết nối API' : 'Trợ lý AI';
      if (show) {
        settings.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left preview-icon" aria-hidden="true" focusable="false"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg><span>Quay lại trợ lý</span>';
      } else settings.textContent = 'Cài đặt API';
      settings.setAttribute('aria-expanded', String(show));
      if (show && !frame.src) frame.src = chrome.runtime.getURL('llm-settings.html');
      if (!show) { updatePreview(); settings.focus({preventScroll:true}); }
      position();
    });
    window.addEventListener('message', event => {
      if (event.source !== frame.contentWindow || event.origin !== chrome.runtime.getURL('').replace(/\/$/, '')) return;
      if (event.data?.rcAISettings === 'escape') closePanel();
      if (event.data?.rcAISettings === 'resize' && Number.isFinite(event.data.height) && event.data.height > 0 && event.data.height <= 10000)
        frame.style.height = Math.ceil(event.data.height) + 'px';
    });
  }
  let scheduled = false, mounted = false;
  const refresh = () => {
    scheduled = false;
    const root = document.querySelector('#rc-kit')?.shadowRoot;
    const main = root?.querySelector('#panel');
    if (!mounted && main) { mounted = true; mount(main, root.querySelector('.w')); }
    if (task && ![...document.querySelectorAll('.w-chat-input')].some(visible)) task.cancelled = true;
  };
  new MutationObserver(() => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(refresh); }
  }).observe(document.documentElement, {childList: true, subtree: true});
  refresh();
})();
