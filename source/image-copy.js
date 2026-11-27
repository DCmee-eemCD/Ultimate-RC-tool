    // Cross-origin answer canvases cannot be copied by Chrome, even when their
    // contextmenu event is allowed. Hit-test the original image while hovered.
    // Keep the canvas visible and forward clicks so the site's zoom still works.
    let copyImage = null;
    const clearCopyImage = () => { copyImage?.remove(); copyImage = null; };
    window.addEventListener('mouseover', e => {
        const canvas = e.target;
        if (canvas === copyImage) return;
        if (cfg.antiCopy === false || !canvas?.matches?.('canvas[data-testid="chat-canvas-message"]')) { clearCopyImage(); return; }
        const parent = canvas.parentElement;
        const src = RC.canvasImages.get(canvas);
        if (!src || !parent?.matches('[data-testid="chat-canvas-zoom-target"]')) return;
        if (copyImage?.previousElementSibling === canvas) return;
        clearCopyImage();
        const img = document.createElement('img');
        img.dataset.rcCopyImage = '';
        img.alt = '';
        img.setAttribute('aria-hidden', 'true');
        img.draggable = false;
        img.src = src;
        img.style.cssText = `position:absolute!important;left:${canvas.offsetLeft}px!important;top:${canvas.offsetTop}px!important;width:${canvas.clientWidth}px!important;height:${canvas.clientHeight}px!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;opacity:0!important;pointer-events:auto!important;cursor:zoom-in`;
        img.addEventListener('click', event => {
            event.stopPropagation();
            clearCopyImage();
            canvas.click();
        });
        img.addEventListener('mouseleave', clearCopyImage);
        img.addEventListener('error', clearCopyImage, {once:true});
        canvas.after(img);
        copyImage = img;
    }, true);
    window.addEventListener('resize', clearCopyImage);
    window.addEventListener('blur', clearCopyImage);
