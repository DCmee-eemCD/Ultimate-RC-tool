// Original-content recovery (source/text-source.js) and rendering of OCR
// segments that keep part of the original image.
const RICH_SEGMENT = `                if(g.type === 'rich') {
                    const line=document.createElement('div'); line.className='rc-seg-text';
                    for(let i=0;i<g.parts.length;i++) {
                        const part=g.parts[i], prev=g.parts[i-1], next=g.parts[i+1];
                        if(part.type==='text') {
                            if(prev?.type==='icon') line.appendChild(document.createTextNode(' '));
                            line.appendChild(document.createTextNode(part.text));
                            if(next?.type==='icon') line.appendChild(document.createTextNode(' '));
                        } else { const icon=document.createElement('img'); icon.src=part.src; icon.width=part.w; icon.height=part.h; icon.alt='[emoji/ký hiệu trong ảnh]'; icon.title='Giữ ảnh gốc; chưa nhận dạng thành Unicode'; icon.style.cssText='display:inline-block;vertical-align:middle;max-width:100%'; line.appendChild(icon); }
                    }
                    body.appendChild(line);
                } else if (g.type === 'img')`;

const FIDELITY_NOTE = `
        const bar=box.querySelector('.rc-ocr-bar');
        bar.querySelector('.rc-fidelity-note')?.remove();
        if(!tex && segs?.some(g=>g.preserved)) { const note=document.createElement('small'); note.className='rc-fidelity-note'; note.textContent='Ký hiệu chưa đọc chắc: giữ ảnh; Copy có đánh dấu.'; bar.appendChild(note); }`;

export async function textSource(p, {readText}) {
  p.before('    function applyToContainer(', (await readText('source/ocr-table-render.js')) + '\n');
  p.after('            segs.forEach(g => {', "\n                if (g.type === 'table') { renderOcrTable(body, g); return; }");
  p.before('            .rc-ocr-fig {', `            .rc-ocr-table-wrap { max-width:100%; overflow:auto; margin:10px 0; white-space:normal; background:#fff !important; color:#1f2937 !important; }
            .rc-ocr-table-wrap:focus-visible { outline:2px solid currentColor; outline-offset:2px; }
            html body .rc-ocr-table { width:100%; table-layout:fixed; border-collapse:collapse; border-spacing:0; color:#1f2937 !important; background:#fff !important; font-family:inherit; font-size:1rem; line-height:1.5; }
            html body .rc-ocr-table :is(thead,tbody,tr) { background:#fff !important; color:#1f2937 !important; }
            html body .rc-ocr-table th, html body .rc-ocr-table td { border:1px solid #9ca3af !important; padding:9px 10px; text-align:start; vertical-align:top; white-space:pre-wrap; overflow-wrap:anywhere; background:#fff !important; color:#1f2937 !important; font-weight:400; box-shadow:none !important; }
            html body .rc-ocr-table th { font-weight:700; background:#e5e7eb !important; }
`);
  const recovery = await readText('source/text-source.js');
  p.between('    const TEX_RE =', '    function probeLatex()', () => recovery + '\n');
  p.once("filter(g => g.type === 'img')", "filter(g => g.type === 'img' && !g.preserved)");
  p.after('im.width = g.w;', " if(g.preserved) { im.title=g.copyText; im.style.cssText='display:block;max-width:100%;height:auto;border-radius:4px'; }");
  p.once("                if (g.type === 'img')", RICH_SEGMENT);
  p.after("box.dataset.src = tex ? 'latex' : 'ocr';", FIDELITY_NOTE);
  p.all('Ưu tiên nguồn LaTeX', 'Ưu tiên văn bản gốc');
  p.all('Nếu trang giữ công thức gốc thì dùng thay cho chữ OCR', 'Giữ nguyên Unicode, emoji và LaTeX khi trang có văn bản gốc');
}
