// Routes OCR to the offscreen worker pool instead of a visible OCR tab.
const OFFSCREEN_OCR = `    const langsString = () => [cfg.ocrVie !== false && 'vie', cfg.ocrEng !== false && 'eng'].filter(Boolean).join('+') || 'vie';
    const hubAlive = () => !!GM_getValue('rc_ocr_status', {}).workers;
    const closeHub = () => RC.ocrStop().catch(e => toast(e.message));
    const ocrUrl = url => RC.ocr({url, langs:langsString(), threads:+cfg.ocrThreads || 0, idle:+cfg.hubIdle, keepWarm:!!cfg.ocrHub});
`;

const LABELS = [
  ['Giữ tab OCR chạy sẵn', 'Giữ OCR sẵn trong nền'],
  ['Quét nhanh hơn, không mở tab mới mỗi ảnh', 'Tái sử dụng worker; không mở tab phụ'],
  ['Tự đóng tab OCR sau', 'Giải phóng worker sau'],
  ['Đóng tab OCR ngay', 'Giải phóng OCR'],
  ['Đã gửi lệnh đóng tab OCR', 'Đã yêu cầu giải phóng OCR khi quét xong'],
  ['Tự động (CPU − 1)', 'Tự động (theo ảnh / RAM)'],
];

export function ocrBackend(p) {
  p.between('    function ocrLegacy(url)', '    function partsFor(id)', () => OFFSCREEN_OCR);
  for (const [from, to] of LABELS) p.all(from, to);
  p.regex(/const hubTxt = .*?;/, `const hubTxt = hubAlive() ? 'OCR nền: ' + GM_getValue('rc_ocr_hub_info', '') : 'OCR nền sẵn sàng · không mở tab phụ';`);
}
