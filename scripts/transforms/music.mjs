// Music tab and floating YouTube/Spotify player (runtime in source/music.js).
const MUSIC_SECTION = `<div class="sec" data-sec="music">
    <h4>YouTube / Spotify</h4><input id="rc-music-url" type="url" placeholder="Dán link bài hát / playlist" style="box-sizing:border-box;width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg)">
    <div class="row2 mt"><button class="sm fl" id="rc-music-load">Mở trình phát</button><button class="sm" id="rc-music-stop">Dừng</button></div>
    <div class="stat" id="rc-music-status">Không tự phát khi tải trang. Spotify có thể chỉ phát bản nghe thử; một số video không cho nhúng.</div>
    <a id="rc-music-external" target="_blank" rel="noopener noreferrer" hidden>Mở trên dịch vụ gốc ↗</a></div>`;

export async function music(p, {readText}) {
  p.after('<button class="tab" data-tab="ocr">OCR</button>', '<button class="tab" data-tab="music">Nhạc</button>');
  p.after('<div class="body">', MUSIC_SECTION);
  p.before('        const setTab = t => {', (await readText('source/music.js')) + '\n');
  p.once("['feat', 'ocr'].includes(cfg.uiTab)", "['feat', 'ocr', 'music'].includes(cfg.uiTab)");
}
