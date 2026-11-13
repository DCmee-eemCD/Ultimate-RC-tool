    const TEX_RE = /\\(?:frac|dfrac|sqrt|cdot|times|pi|alpha|beta|theta|sum|int|left|right|begin|end|text|mathrm|ge|le|geq|leq|neq|approx|circ|angle|degree)\b|\$[^$\n]+\$|\\\(|\\\[/;
    const SOURCE_KEY = /^(content|text|markdown|message|answer|response|body|source|rawText)$/i;
    const SKIP_KEY = /^(url|src|href|id|className|key|ref|style|children|messages|history|conversation|testid|data-testid)$/i;
    function texCandidates(cont) {
        const out = [], seen = new Set();
        let budget=300;
        const scan = (v,path,depth,lvl,key) => {
            if (v == null || depth > 4 || --budget < 0) return;
            if (typeof v === 'string') {
                if (v.length >= 2 && v.length <= 200000 && !seen.has(v) &&
                    (TEX_RE.test(v) || SOURCE_KEY.test(key)) && !/^\s*(?:https?:|data:)/i.test(v)) {
                    seen.add(v); out.push({path,lvl,text:v});
                }
                return;
            }
            // Never search lists of other messages or React children.
            if (typeof v !== 'object' || Array.isArray(v) || v instanceof Node || seen.has(v)) return;
            seen.add(v);
            for (const k of Object.keys(v).slice(0,40)) if (!SKIP_KEY.test(k)) {
                try { scan(v[k],path+'.'+k,depth+1,lvl,k); } catch (_) {}
            }
        };
        try {
            const key=Object.keys(cont).find(k=>k.startsWith('__reactFiber$'));
            let f=key && cont[key];
            for(let lvl=0;f && lvl<12;lvl++,f=f.return) {
                if (lvl && f.stateNode instanceof Element &&
                    (f.stateNode.matches('.chat-messages') || f.stateNode.querySelectorAll('[data-testid="chat-canvas-container"]').length>1)) break;
                scan(f.memoizedProps,'L'+lvl,0,lvl,'');
                if(out.length) break;
            }
        } catch (_) {}
        return out.sort((a,b)=>a.lvl-b.lvl || b.text.length-a.text.length);
    }
    function latexSourceOf(cont) {
        return texCandidates(cont)[0]?.text.trim() || null;
    }
