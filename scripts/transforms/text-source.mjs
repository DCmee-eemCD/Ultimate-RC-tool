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
  const recovery = await readText('source/text-source.js');
  p.between('    const TEX_RE =', '    function probeLatex()', () => recovery + '\n');
  p.once("filter(g => g.type === 'img')", "filter(g => g.type === 'img' && !g.preserved)");
  p.after('im.width = g.w;', " if(g.preserved) { im.title=g.copyText; im.style.cssText='display:block;max-width:100%;height:auto;border-radius:4px'; }");
  p.once("                if (g.type === 'img')", RICH_SEGMENT);
  p.after("box.dataset.src = tex ? 'latex' : 'ocr';", FIDELITY_NOTE);
  p.all('Ưu tiên nguồn LaTeX', 'Ưu tiên văn bản gốc');
  p.all('Nếu trang giữ công thức gốc thì dùng thay cho chữ OCR', 'Giữ nguyên Unicode, emoji và LaTeX khi trang có văn bản gốc');
}
