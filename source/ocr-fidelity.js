    // Preserve unsupported glyphs visually rather than presenting invented text.
    function protectGlyphs(data, orig, scale) {
        const ctx = orig.getContext('2d', {willReadFrequently:true});
        const W = orig.width, H = orig.height;
        for (const b of data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) {
            const bb = l.bbox;
            if (!bb) continue;
            const y0 = Math.max(0, Math.floor(bb.y0 - 4 * scale));
            const y1 = Math.min(H, Math.ceil(bb.y1 + 4 * scale));
            if (y1 <= y0) continue;
            // Scan full width: Tesseract can omit an emoji before/after the text bbox.
            const pixels = ctx.getImageData(0, y0, W, y1-y0).data;
            let colored = 0;
            const columns = new Uint16Array(W);
            for (let i=0; i<pixels.length; i+=4) {
                const hi = Math.max(pixels[i],pixels[i+1],pixels[i+2]);
                const lo = Math.min(pixels[i],pixels[i+1],pixels[i+2]);
                if (hi-lo > 65 && lo < 200) { colored++; columns[(i/4)%W]++; }
            }
            const text = l.text || '';
            const math = /[=\u03c0\u221a\u222b\u2211]|\\(?:frac|sqrt)|[\u00b2\u00b3\u2080-\u2089]/u.test(text);
            const color = colored >= 12 * scale * scale;
            if (!math && !color) continue;
            if (!math && l.words?.length) {
                const ranges=[];
                for(let x=0;x<W;x++) if(columns[x]>=scale) {
                    const last=ranges[ranges.length-1];
                    if(last && x-last.x1<=10*scale) last.x1=x; else ranges.push({x0:x,x1:x});
                }
                // Small colored components are preserved inline; large colored text stays a line image.
                if(ranges.length && ranges.every(r=>r.x1-r.x0<=48*scale)) {
                    const parts=[];
                    for(const r of ranges) {
                        r.x0=Math.max(0,r.x0-3*scale);r.x1=Math.min(W,r.x1+3*scale);
                        const icon=document.createElement('canvas');icon.width=r.x1-r.x0;icon.height=y1-y0;
                        icon.getContext('2d').drawImage(orig,r.x0,y0,icon.width,icon.height,0,0,icon.width,icon.height);
                        parts.push({x:r.x0,type:'icon',src:icon.toDataURL('image/png'),w:icon.width/scale,h:icon.height/scale});
                    }
                    for(const word of l.words) {
                        const box=word.bbox;
                        if(!box || ranges.some(r=>Math.min(r.x1,box.x1)-Math.max(r.x0,box.x0)>0.1*(box.x1-box.x0))) continue;
                        parts.push({x:box.x0,type:'text',text:word.text});
                    }
                    parts.sort((a,b)=>a.x-b.x);
                    l.rcVisual={type:'rich',parts,preserved:true,reason:'color',copyText:parts.map(p=>p.type==='icon'?'[emoji/ký hiệu trong ảnh]':p.text).join(' ')};
                    continue;
                }
            }
            const crop = document.createElement('canvas');
            crop.width=W; crop.height=y1-y0;
            crop.getContext('2d').drawImage(orig,0,y0,W,y1-y0,0,0,W,y1-y0);
            l.rcVisual = {type:'img', src:crop.toDataURL('image/png'), w:Math.round(W/scale), h:Math.round((y1-y0)/scale),
                reason:math?'math':'color', preserved:true,
                copyText:math?'[Công thức: xem ảnh gốc]':'[Dòng có emoji/ký hiệu màu: xem ảnh gốc]'};
        }
        return data;
    }
