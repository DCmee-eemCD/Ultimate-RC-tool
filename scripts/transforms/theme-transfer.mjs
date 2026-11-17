// Portable theme export/import (runtime logic in source/theme-transfer.js).
export async function themeTransfer(p, {readText}) {
  p.before('        <h4>Tuỳ chỉnh màu</h4>', `        <div class="row2" style="margin-bottom:16px"><button class="sm fl" id="theme-export">Xuất theme</button><button class="sm fl" id="theme-import">Nhập theme</button></div>
        <input type="file" id="theme-file" accept="application/json,.json" hidden>
`);
  p.after("        const panel = $('#panel'), pill = $('#pill'), stat = $('#stat');", '\n' + await readText('source/theme-transfer.js'));
}
