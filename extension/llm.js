/*
 * BYOK, OpenAI-compatible chat backend.
 *
 * This file intentionally only exposes a helper.  The service worker owns the
 * message listener and can route the llm-* operations to RCLLM.handle().
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'rcLlmConfig';
  const SETTINGS_PAGE = 'llm-settings.html';
  const EDU_NEXT_ORIGIN = 'https://fsc-edunext.fpt.edu.vn';
  const MAX_QUESTION_LENGTH = 24000;
  const MAX_ANSWER_LENGTH = 4000;
  const MAX_RESPONSE_BYTES = 1024 * 1024;
  const REQUEST_TIMEOUT_MS = 45000;
  const hasOwn = Object.prototype.hasOwnProperty;

  const SYSTEM_PROMPT =
    'Bạn là trợ lý học tập. Hãy trả lời câu hỏi bằng tiếng Việt, ngắn gọn, chính xác và dễ hiểu. ' +
    'Chỉ đưa ra câu trả lời cần thiết, không nêu suy nghĩ nội bộ.';

  function error(message) {
    throw new Error(message);
  }

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function cleanString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  async function readConfig() {
    let data;
    try {
      data = await chrome.storage.local.get(STORAGE_KEY);
    } catch {
      error('LLM configuration unavailable');
    }

    const raw = isRecord(data?.[STORAGE_KEY]) ? data[STORAGE_KEY] : {};
    return {
      endpoint: cleanString(raw.endpoint),
      model: cleanString(raw.model),
      key: cleanString(raw.key),
    };
  }

  function publicConfig(config) {
    return {
      endpoint: config.endpoint,
      model: config.model,
      hasKey: config.key.length > 0,
    };
  }

  function runtimeUrl(path) {
    try {
      return chrome.runtime.getURL(path);
    } catch {
      return '';
    }
  }

  function isExtensionSender(sender) {
    return !!sender && sender.id === chrome.runtime.id;
  }

  function isSettingsSender(sender) {
    return isExtensionSender(sender) && sender.url === runtimeUrl(SETTINGS_PAGE);
  }

  function senderOrigin(sender) {
    if (!isExtensionSender(sender) || sender.frameId !== 0 || typeof sender.url !== 'string') return '';
    try {
      return new URL(sender.url).origin;
    } catch {
      return '';
    }
  }

  function assertSender(op, sender) {
    const allowed = op === 'llm-config-get' || op === 'llm-config-save'
      ? isSettingsSender(sender)
      : op === 'llm-answer' && senderOrigin(sender) === EDU_NEXT_ORIGIN;
    if (!allowed) error('Untrusted sender');
  }

  function normalizeEndpoint(value) {
    const url = new URL(RCEndpoint.normalize(value));

    const path = url.pathname.replace(/\/+$/, '');
    if (!path.toLowerCase().endsWith('/chat/completions')) {
      url.pathname = `${path}/chat/completions` || '/chat/completions';
    }
    return url.toString();
  }

  async function saveConfig(message) {
    const current = await readConfig();
    const endpointValue = hasOwn.call(message, 'endpoint') ? message.endpoint : current.endpoint;
    const modelValue = hasOwn.call(message, 'model') ? message.model : current.model;
    if (typeof endpointValue !== 'string') error('Invalid LLM configuration');
    const endpoint = endpointValue.trim();
    const model = cleanString(modelValue);
    if (endpoint.length > 2048 || !model || model.length > 200) {
      error('Invalid LLM configuration');
    }
    if (endpoint) normalizeEndpoint(endpoint);

    const key = cleanString(message.key);
    if (key.length > 4096 || /[\r\n]/.test(key)) error('Invalid API key');
    const clearKey = message.clearKey === true;
    let endpointChanged = true;
    try { endpointChanged = normalizeEndpoint(endpoint) !== normalizeEndpoint(current.endpoint); } catch { /* Invalid old config cannot authorize key reuse. */ }
    if (endpoint && endpointChanged && current.key && !key && !clearKey) {
      error('New API key required when changing endpoint');
    }

    const next = { endpoint, model };
    if (!clearKey) {
      if (key) next.key = key;
      else if (current.key) next.key = current.key;
    }

    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: next });
    } catch {
      error('LLM configuration unavailable');
    }
    return publicConfig({ endpoint, model, key: next.key || '' });
  }

  function endpointForRequest(value) {
    // Revalidate stored configuration before a secret can be sent to a provider.
    return normalizeEndpoint(value);
  }

  function createTimeoutSignal() {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    // The timer only bounds this one request and must not keep the worker alive.
    if (typeof timer?.unref === 'function') timer.unref();
    return controller.signal;
  }

  async function responseText(response) {
    const lengthHeader = response?.headers?.get?.('content-length');
    if (lengthHeader && Number.isFinite(Number(lengthHeader)) && Number(lengthHeader) > MAX_RESPONSE_BYTES) {
      error('LLM response was too large');
    }

    if (response?.body?.getReader) {
      const reader = response.body.getReader();
      const chunks = [];
      let total = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          const chunk = part.value instanceof Uint8Array ? part.value : new Uint8Array(part.value);
          total += chunk.byteLength;
          if (total > MAX_RESPONSE_BYTES) {
            try { await reader.cancel(); } catch { /* best effort */ }
            error('LLM response was too large');
          }
          chunks.push(chunk);
        }
      } catch (e) {
        if (e?.message === 'LLM response was too large') throw e;
        error('LLM provider request failed');
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return new TextDecoder().decode(bytes);
    }

    if (typeof response?.text !== 'function') error('LLM provider request failed');
    let text;
    try {
      text = await response.text();
    } catch {
      error('LLM provider request failed');
    }
    if (typeof text !== 'string') error('LLM provider request failed');
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
      error('LLM response was too large');
    }
    return text;
  }

  function answerContent(payload) {
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map(part => {
        if (typeof part === 'string') return part;
        return typeof part?.text === 'string' ? part.text : '';
      }).join('');
    }
    return '';
  }

  async function answerQuestion(message) {
    if (typeof message.question !== 'string' || message.question.length > MAX_QUESTION_LENGTH) {
      error('Invalid LLM question');
    }
    const question = message.question.trim();
    if (!question) error('Invalid LLM question');

    const config = await readConfig();
    if (!config.endpoint || !config.model || !config.key) error('LLM is not configured');
    const url = endpointForRequest(config.endpoint);
    const signal = createTimeoutSignal();
    const body = JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: question },
      ],
    });

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        credentials: 'omit',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.key}`,
        },
        body,
      });
    } catch {
      error('LLM provider request failed');
    }

    const status = Number(response?.status);
    const ok = response?.ok === undefined ? status >= 200 && status < 300 : response.ok;
    if (!ok) error(status ? `LLM provider request failed (HTTP ${status})` : 'LLM provider request failed');

    const text = await responseText(response);
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      error('LLM provider request failed');
    }
    if (payload?.choices?.[0]?.finish_reason === 'length') error('LLM answer was cut off; try another model');
    if (payload?.choices?.[0]?.message?.refusal) error('LLM declined to answer');
    const answer = answerContent(payload).trim();
    if (!answer) error('LLM returned an empty answer');
    if (answer.length > MAX_ANSWER_LENGTH) error('LLM answer was too long');
    return { answer };
  }

  async function handle(message, sender) {
    if (!isRecord(message) || typeof message.op !== 'string') error('Unsupported operation');
    const op = message.op;
    if (!['llm-config-get', 'llm-config-save', 'llm-answer'].includes(op)) {
      error('Unsupported operation');
    }
    assertSender(op, sender);

    if (op === 'llm-config-get') return publicConfig(await readConfig());
    if (op === 'llm-config-save') return saveConfig(message);
    return answerQuestion(message);
  }

  globalThis.RCLLM = Object.freeze({ handle });
})();
