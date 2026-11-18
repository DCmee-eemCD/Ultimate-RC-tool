(() => {
  const installed = chrome.runtime.getManifest().version;
  const status = document.querySelector('#status');
  const check = document.querySelector('#check');
  const download = document.querySelector('#download');
  let release = null, busy = false, downloadId = null;
  document.querySelector('#installed').textContent = 'v' + installed;
  const setStatus = (state, text) => { status.dataset.state = state; status.textContent = text; };
  function downloadState(state) {
    if (state === 'complete') {
      setStatus('downloaded', 'Đã tải ZIP v' + release.version + '. Làm theo 4 bước bên dưới để hoàn tất cập nhật.');
      busy = false; check.disabled = false; download.disabled = false;
    } else if (state === 'interrupted') {
      setStatus('error', 'Tải ZIP bị gián đoạn hoặc đã hủy. Bấm Tải lại ZIP hoặc xem bản phát hành trên GitHub.');
      busy = false; check.disabled = false; download.disabled = false;
    }
  }
  chrome.downloads.onChanged.addListener(change => {
    if (change.id === downloadId && change.state) downloadState(change.state.current);
  });
  async function startDownload() {
    busy = true; check.disabled = true; download.disabled = true;
    try {
      downloadId = await chrome.downloads.download({url:release.url, filename:'Ultimate-RC-tools-v' + release.version + '-unpacked.zip', conflictAction:'uniquify'});
      setStatus('downloading', 'Đang tải ZIP v' + release.version + '. Chờ Chrome tải xong rồi làm theo hướng dẫn bên dưới.');
      download.hidden = false;
      // Catch downloads that completed before the onChanged listener knew their ID.
      const [item] = await chrome.downloads.search({id:downloadId});
      if (item) downloadState(item.state);
    } catch {
      busy = false; check.disabled = false; download.disabled = false; download.hidden = false;
      setStatus('error', 'Không tải được ZIP. Thử lại hoặc mở bản phát hành trên GitHub để tải thủ công.');
    }
  }
  async function checkRelease() {
    if (busy) return;
    busy = true; release = null; downloadId = null; check.disabled = true; download.hidden = true;
    setStatus('checking', 'Đang kiểm tra bản phát hành trên GitHub…');
    try {
      const response = await fetch('https://api.github.com/repos/DCmee-eemCD/Ultimate-RC-tool/releases/latest', {
        headers:{Accept:'application/vnd.github+json'}, credentials:'omit', cache:'no-store', signal:AbortSignal.timeout(15000)
      });
      if (response.status === 404) throw new Error('Chưa tìm thấy bản phát hành công khai. Hãy xem GitHub.');
      if (response.status === 403 || response.status === 429) throw new Error('GitHub đang giới hạn lượt kiểm tra. Thử lại sau hoặc mở bản phát hành.');
      if (!response.ok) throw new Error('GitHub chưa phản hồi được (HTTP ' + response.status + '). Hãy thử lại sau.');
      release = RCRelease.select(await response.json());
      if (RCRelease.compare(release.version, installed) <= 0) {
        setStatus('current', 'Không có bản mới hơn. Bạn đang dùng v' + installed + '; bản phát hành trên GitHub là v' + release.version + '.');
      } else {
        await startDownload();
        return;
      }
    } catch (error) {
      const message = ['TimeoutError','AbortError'].includes(error.name) ? 'GitHub phản hồi quá lâu. Kiểm tra kết nối rồi thử lại.' :
        error instanceof TypeError ? 'Không kết nối được GitHub hoặc dữ liệu không hợp lệ. Hãy thử lại hoặc xem bản phát hành.' : error.message;
      setStatus('error', message);
    }
    busy = false; check.disabled = false;
  }
  check.addEventListener('click', checkRelease);
  download.addEventListener('click', () => { if (!busy && release) void startDownload(); });
  document.querySelector('#extensions').addEventListener('click', async () => {
    try { await chrome.tabs.create({url:'chrome://extensions/'}); }
    catch { document.querySelector('#open-status').textContent = 'Nhập chrome://extensions vào thanh địa chỉ Chrome.'; }
  });
  void checkRelease();
})();
