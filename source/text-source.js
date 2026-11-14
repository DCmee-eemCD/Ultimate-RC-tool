    // Only read the exact message owning this canvas, never beforeContent or hints.
    function texCandidates(cont) {
        try {
            const key = Object.keys(cont).find(k => k.startsWith('__reactFiber$'));
            let f = key && cont[key], canvas = null;
            for (let lvl = 0; f && lvl < 20; lvl++, f = f.return) {
                const props = f.memoizedProps;
                if (!canvas && props?.canvas) {
                    const cs = Array.isArray(props.canvas) ? props.canvas : [props.canvas];
                    if (cs.length !== 1) return [];
                    canvas = cs[0];
                }
                if (!canvas || !Array.isArray(props?.messages)) continue;
                if (props.messages.length > 2000) return [];
                const matches = props.messages.filter(m => {
                    const c = m?.metadata?.canvas;
                    return m?.role === 'assistant' && c && !Array.isArray(c) &&
                        (c === canvas || (canvas.object_key && c.object_key === canvas.object_key));
                });
                if (matches.length !== 1) return [];
                const text = matches[0].content;
                return typeof text === 'string' && text.trim() && text.length <= 200000
                    ? [{path: 'L' + lvl + '.messages[matched].content', lvl, text}] : [];
            }
        } catch (_) {}
        return [];
    }
    function latexSourceOf(cont) {
        return texCandidates(cont)[0]?.text.trim() || null;
    }
    function originalResult(url) {
        if (!cfg.sourceFirst) return null;
        const matches = containers().filter(c => urlOfContainer(c) === url);
        if (matches.length !== 1) return null;
        const text = latexSourceOf(matches[0]);
        return text ? {text, segments: [{type: 'text', text}], original: true} : null;
    }
    function recoverOriginals() {
        if (!cfg.sourceFirst || !cfg.replaceBubble) return;
        for (const cont of containers()) {
            const text = latexSourceOf(cont);
            if (!text) continue;
            const box = cont.parentElement?.querySelector(':scope > .rc-ocr-text');
            if (box?.dataset.src === 'latex' && box.dataset.text === text) continue;
            const segs = segByUrl.get(urlOfContainer(cont)) || [];
            applyToContainer(cont, text, [{type: 'text', text}, ...segs.filter(g => g.type === 'img' && !g.preserved)]);
        }
    }
