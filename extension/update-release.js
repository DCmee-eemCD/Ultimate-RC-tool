// Shared by the extension page and offline release-selection tests.
(() => {
  const repo = 'https://github.com/DCmee-eemCD/Ultimate-RC-tool';
  function version(raw) {
    if (typeof raw !== 'string' || !/^v?\d+(?:\.\d+){1,3}$/.test(raw)) return null;
    const parts = raw.replace(/^v/, '').split('.').map(Number);
    return parts.every(n => Number.isInteger(n) && n <= 65535) ? parts : null;
  }
  function compare(a, b) {
    const left = version(a), right = version(b);
    if (!left || !right) throw new Error('Không đọc được số phiên bản. Hãy xem bản phát hành trên GitHub.');
    for (let i = 0; i < 4; i++) {
      const delta = (left[i] || 0) - (right[i] || 0);
      if (delta) return Math.sign(delta);
    }
    return 0;
  }
  function select(release) {
    if (!release || release.draft || release.prerelease || !Array.isArray(release.assets))
      throw new Error('Chưa có bản phát hành ổn định phù hợp.');
    const zips = release.assets.filter(a => a && typeof a.name === 'string' && /\.zip$/i.test(a.name) && a.state === 'uploaded');
    const unpacked = zips.filter(a => /unpacked/i.test(a.name));
    const candidates = unpacked.length ? unpacked : zips;
    if (candidates.length !== 1) throw new Error('Chưa có một ZIP cập nhật rõ ràng. Hãy chọn bản dành cho Chrome trên GitHub.');
    const asset = candidates[0];
    const named = asset.name.match(/(?:^|[-_])v?(\d+(?:\.\d+){1,3})(?=-unpacked\.zip$|_unpacked\.zip$|\.zip$)/i)?.[1];
    const tag = version(release.tag_name) ? release.tag_name.replace(/^v/, '') : null;
    const latest = tag || named;
    if (!version(latest) || (tag && named && compare(tag, named) !== 0))
      throw new Error('Phiên bản của bản phát hành và ZIP không rõ hoặc không khớp. Hãy kiểm tra trên GitHub.');
    const url = new URL(asset.browser_download_url);
    if (url.origin !== 'https://github.com' || url.username || url.password || url.search || url.hash ||
        !url.pathname.startsWith('/DCmee-eemCD/Ultimate-RC-tool/releases/download/') || !url.pathname.endsWith('.zip'))
      throw new Error('Đường dẫn ZIP không thuộc kho phát hành Ultimate RC.');
    return {version: latest, url: url.href, name: asset.name};
  }
  globalThis.RCRelease = {repo, version, compare, select};
})();
