'use strict';

(() => {
  if (window !== window.top) {
    document.documentElement.dataset.embedded = 'true';
    // Send geometry only; the parent never receives form values or API keys.
    let lastHeight = 0;
    const reportHeight = () => {
      const height = Math.ceil(document.querySelector('.settings-shell').getBoundingClientRect().height) + 2;
      if (height > 2 && height !== lastHeight) {
        lastHeight = height;
        parent.postMessage({rcAISettings:'resize', height}, 'https://fsc-edunext.fpt.edu.vn');
      }
    };
    new ResizeObserver(reportHeight).observe(document.querySelector('.settings-shell'));
    window.addEventListener('message', event => {
      if (event.source !== parent || event.origin !== 'https://fsc-edunext.fpt.edu.vn' || event.data?.rcAISettings !== 'theme') return;
      const names = {'--bg':'--bg','--fg':'--fg','--surface':'--surface','--line':'--line','--acc':'--acc','--secondary':'--secondary','--mut':'--muted'};
      for (const [name, target] of Object.entries(names)) {
        const value = event.data.colors?.[name];
        if (typeof value === 'string' && /^#[a-f\d]{6}$/i.test(value)) {
          document.body.style.setProperty(target, value);
          if (name === '--mut') document.documentElement.style.setProperty('--scrollbar-thumb', value);
        }
      }
    });
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape') parent.postMessage({rcAISettings:'escape'}, 'https://fsc-edunext.fpt.edu.vn');
    });
  }
  const {normalize: normalizeEndpoint} = RCEndpoint;
  const MAX_ENDPOINT_LENGTH = 2048;
  const MAX_MODEL_LENGTH = 200;
  const MAX_KEY_LENGTH = 4096;
  const state = { endpoint: '', model: '', hasKey: false, busy: '', dirty: false };

  const byId = id => document.getElementById(id);

  function safeError(error, secret = '') {
    let message = error instanceof Error ? error.message : String(error || 'Lỗi không xác định');
    if (secret) message = message.split(secret).join('••••');
    return message || 'Lỗi không xác định';
  }

  function send(message) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = response => {
        if (settled) return;
        settled = true;
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(String(runtimeError.message || runtimeError)));
          return;
        }
        if (response?.error) reject(new Error(String(response.error)));
        else resolve(response?.result);
      };
      try {
        const returned = chrome.runtime.sendMessage(message, finish);
        if (returned && typeof returned.then === 'function') {
          returned.then(finish, error => {
            if (!settled) {
              settled = true;
              reject(new Error(safeError(error)));
            }
          });
        } else if (returned !== undefined) {
          finish(returned);
        }
      } catch (error) {
        if (!settled) {
          settled = true;
          reject(new Error(safeError(error)));
        }
      }
    });
  }

  function setStatus(message, kind = '') {
    const status = byId('status');
    status.textContent = message;
    if (kind) status.dataset.state = kind;
    else delete status.dataset.state;
  }

  function setKeyState(hasKey) {
    state.hasKey = Boolean(hasKey);
    const status = byId('key-status');
    status.textContent = state.hasKey ? 'Đã lưu khóa API' : 'Chưa lưu khóa API';
    status.dataset.state = state.hasKey ? 'saved' : 'empty';
  }

  function resetKeyInput() {
    const key = byId('key');
    const toggle = byId('toggle-key');
    key.value = '';
    key.type = 'password';
    toggle.textContent = 'Hiện khóa';
    toggle.setAttribute('aria-pressed', 'false');
  }

  function setFieldError(input, error, message) {
    const field = input.closest('.field');
    error.textContent = message;
    error.hidden = !message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    field.classList.toggle('has-error', Boolean(message));
  }

  function endpointError(value) {
    const raw = value.trim();
    if (!raw) return '';
    if (raw.length > MAX_ENDPOINT_LENGTH) return `Endpoint không được dài quá ${MAX_ENDPOINT_LENGTH} ký tự.`;
    try {
      normalizeEndpoint(raw);
    } catch {
      return 'Nhập tên miền hoặc URL HTTPS hợp lệ; HTTP chỉ dành cho localhost. Không thêm tài khoản, query hoặc fragment.';
    }
    return '';
  }

  function validateFields() {
    const endpoint = byId('endpoint');
    const model = byId('model');
    const key = byId('key');
    const endpointMessage = endpointError(endpoint.value);
    const modelValue = model.value.trim();
    const modelMessage = !modelValue
      ? 'Vui lòng nhập model ID.'
      : modelValue.length > MAX_MODEL_LENGTH
        ? `Model không được dài quá ${MAX_MODEL_LENGTH} ký tự.`
        : '';
    const keyMessage = key.value.length > MAX_KEY_LENGTH
      ? `API key không được dài quá ${MAX_KEY_LENGTH} ký tự.`
      : '';
    setFieldError(endpoint, byId('endpoint-error'), endpointMessage);
    setFieldError(model, byId('model-error'), modelMessage);
    setFieldError(key, byId('key-error'), keyMessage);
    if (endpointMessage) {
      endpoint.focus();
      return false;
    }
    if (modelMessage) model.focus();
    else if (keyMessage) key.focus();
    return !modelMessage && !keyMessage;
  }

  function setBusy(action) {
    state.busy = action || '';
    const save = byId('save');
    const clear = byId('clear-key');
    const toggle = byId('toggle-key');
    save.disabled = Boolean(action);
    clear.disabled = Boolean(action);
    toggle.disabled = Boolean(action);
    ['endpoint', 'model', 'key'].forEach(id => { byId(id).disabled = Boolean(action); });
    save.textContent = action === 'save' ? 'Đang lưu…' : 'Lưu cấu hình';
    clear.textContent = action === 'clear' ? 'Đang xóa…' : 'Xóa khóa';
  }

  function applyConfig(config) {
    if (!config || typeof config !== 'object') return;
    const endpoint = typeof config.endpoint === 'string' && config.endpoint.trim()
      ? config.endpoint.trim()
      : '';
    byId('endpoint').value = endpoint;
    state.endpoint = endpoint;
    if (typeof config.model === 'string') {
      state.model = config.model;
      byId('model').value = config.model;
    }
    setKeyState(config.hasKey === true);
  }

  async function loadConfig() {
    state.dirty = false;
    setBusy('load');
    try {
      const config = await send({ op: 'llm-config-get' });
      if (!state.dirty) applyConfig(config);
      setStatus('');
    } catch (error) {
      setStatus(`Không thể tải cấu hình: ${safeError(error)}`, 'error');
    } finally {
      setBusy('');
    }
  }

  async function saveConfig(event) {
    event.preventDefault();
    if (state.busy || !validateFields()) return;

    const endpoint = byId('endpoint').value.trim();
    const model = byId('model').value.trim();
    const secret = byId('key').value;
    const endpointChanged = endpoint !== state.endpoint;
    setBusy('save');
    try {
      const result = await send({ op: 'llm-config-save', endpoint, model, key: secret });
      state.endpoint = endpoint;
      byId('endpoint').value = endpoint;
      state.model = model;
      resetKeyInput();
      if (typeof result?.hasKey === 'boolean') setKeyState(result.hasKey);
      else if (secret) setKeyState(true);
      else setKeyState(endpointChanged ? false : state.hasKey);
      setStatus('Đã lưu cấu hình. Khóa API không được hiển thị lại.', 'success');
    } catch (error) {
      setStatus(`Không thể lưu cấu hình: ${safeError(error, secret)}`, 'error');
    } finally {
      setBusy('');
    }
  }

  async function clearKey() {
    if (state.busy) return;
    const endpoint = state.endpoint;
    const model = state.model;
    setBusy('clear');
    try {
      await send({ op: 'llm-config-save', endpoint, model, key: '', clearKey: true });
      resetKeyInput();
      setKeyState(false);
      setStatus('Đã xóa khóa API.', 'success');
    } catch (error) {
      setStatus(`Không thể xóa khóa API: ${safeError(error)}`, 'error');
    } finally {
      setBusy('');
    }
  }

  function init() {
    const form = byId('settings');
    const endpoint = byId('endpoint');
    const model = byId('model');
    const key = byId('key');
    const toggle = byId('toggle-key');
    endpoint.value = '';
    form.addEventListener('submit', saveConfig);
    form.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.isComposing) event.preventDefault();
    });
    byId('clear-key').addEventListener('click', clearKey);
    toggle.addEventListener('click', () => {
      const visible = key.type === 'text';
      key.type = visible ? 'password' : 'text';
      toggle.textContent = visible ? 'Hiện khóa' : 'Ẩn khóa';
      toggle.setAttribute('aria-pressed', String(!visible));
      if (!visible) key.focus();
    });
    endpoint.addEventListener('input', () => {
      state.dirty = true;
      setFieldError(endpoint, byId('endpoint-error'), '');
    });
    model.addEventListener('input', () => {
      state.dirty = true;
      setFieldError(model, byId('model-error'), '');
    });
    key.addEventListener('input', () => {
      state.dirty = true;
      setFieldError(key, byId('key-error'), '');
    });
    void loadConfig();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
