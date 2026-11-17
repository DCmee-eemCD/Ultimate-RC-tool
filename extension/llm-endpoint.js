// Shared by the extension settings page and service worker. Never reads credentials.
(() => {
  'use strict';

  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  function normalize(value) {
    const invalid = () => { throw new Error('Invalid LLM endpoint'); };
    if (typeof value !== 'string') return invalid();
    let raw = value.trim();
    if (!raw) return '';
    if (raw.length > 2048 || /[\s\\\u0000-\u001f\u007f]/.test(raw)) return invalid();
    const explicit = /^[a-z][a-z\d+.-]*:\/\//i.test(raw);
    // Distinguish a host:port shorthand from an explicit non-HTTP scheme.
    if (!explicit && /^[a-z][a-z\d+.-]*:(?!\d+(?:[/?#]|$))/i.test(raw)) return invalid();
    if (!explicit) raw = raw.startsWith('//') ? 'https:' + raw : 'https://' + raw;
    let url;
    try { url = new URL(raw); } catch { return invalid(); }
    if (url.username || url.password || url.search || url.hash) return invalid();
    const local = localHosts.has(url.hostname);
    if (!explicit && local) url.protocol = 'http:';
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return invalid();
    if (!local && !url.hostname.includes('.') && !url.hostname.startsWith('[')) return invalid();
    let path = url.pathname.replace(/\/+$/, '');
    url.pathname = path || '/';
    const endpoint = url.toString().replace(/\/$/, '');
    if (endpoint.length > 2048) return invalid();
    return endpoint;
  }
  globalThis.RCEndpoint = Object.freeze({normalize});
})();
