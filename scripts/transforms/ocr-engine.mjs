// Turns the userscript's OCR half into the extension's OCR engine
// (extension/ocr-engine.js): extension runtime hooks plus Rust/WASM kernels
// with the original JavaScript kept as the fallback branch.
import {Patch, replaceOnce} from '../lib/patch.mjs';

const SCOPE = 'OCR engine';
// Kernels are skipped for very large images; the JS path handles those.
const USE_KERNELS = 'kernels && px.byteLength <= 64 * 1024 * 1024';

function extensionRuntime(p) {
  p.once('(function () {', `(async function () {
    await RC.ready;
    const kernels = await RCWasm.ready;
    RC.pixelBackend = kernels ? "rust" : "javascript";`);
  p.once("if (location.hostname === 'cdn-lab.fpt.edu.vn')", "if (location.protocol === 'chrome-extension:')");
  p.all('window.close()', 'RC.closeSelf()');
  p.once('const im = await waitImg();', `const im = new Image();
                im.src = new URLSearchParams(location.hash.slice(1)).get('src');
                await im.decode();`);
  p.all('Tesseract.createWorker(langs)', 'Tesseract.createWorker(langs, 1, RC.workerOptions)');
  // Prevent an empty scheduler from waiting forever when worker initialization fails.
  p.once('if (adds.length) await Promise.all(adds);',
    "if (adds.length) await Promise.all(adds);\n                if (!workers) throw new Error('Không khởi tạo được OCR worker');");
}

// Each kernel keeps the original JS region as its `else` branch.
function rustKernels(p) {
  p.between('        const inkMap =', '        good = good.filter', js => `        let figs;
        if (${USE_KERNELS}) {
            const rects = kernels.figures(px, W, H, covered);
            T.push(performance.now()); T.push(performance.now());
            figs = [];
            for (let i = 0; i < rects.length; i += 6) {
                const [cx, cy, cw, ch, y0, y1] = rects.slice(i, i + 6);
                const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
                cv.getContext('2d').drawImage(orig, cx, cy, cw, ch, 0, 0, cw, ch);
                figs.push({type:'img', y0, y1, src:cv.toDataURL('image/webp', 0.9), w:Math.round(cw / scale), h:Math.round(ch / scale)});
            }
        } else {
${replaceOnce(js, 'const figs = [];', 'figs = [];', SCOPE)}        }
`);

  const readPixels = '        const id = x.getImageData(0, 0, c.width, c.height), px = id.data;\n';
  p.between('        const lut = new Uint8ClampedArray(256);', '        x.putImageData', js => `${readPixels}        if (${USE_KERNELS}) kernels.preprocess(px);
        else {
${replaceOnce(js, readPixels, '', SCOPE)}        }
`);

  // Rust computes the full crop boxes; canvas copies and scheduler jobs remain JS.
  p.between('        const THR = 200;', '        const M = 14;', js => `        const THR = 200; let chunks;
        if (${USE_KERNELS}) {
            const boxes=kernels.strips(px,W,H,k); chunks=[];
            for(let i=0;i<boxes.length;i+=4) chunks.push({x0:boxes[i],y0:boxes[i+1],x1:boxes[i+2],y1:boxes[i+3]});
            if(chunks.length<2) return recognize(c);
        } else {
${replaceOnce(js, 'const chunks = [];', 'chunks = [];', SCOPE)}        }
`);

  const cropInit = '            let x0 = W, x1 = -1;\n';
  p.between(cropInit, '            const cw =', js => `            let x0 = ch.x0 ?? W, x1 = ch.x1 ?? -1;
            if (ch.x0 === undefined) {
${replaceOnce(js, cropInit, '', SCOPE)}            }
`, {from: 'const parts = await Promise.all'});
}

/** @param engineSource userscript text before the feature boundary */
export function buildOcrEngine(engineSource, version, fidelitySource = '') {
  const p = new Patch(engineSource + '\n})();\n', SCOPE);
  extensionRuntime(p);
  rustKernels(p);
  if (fidelitySource.trim()) {
    p.after("    const log = (...a) => console.log('%c[RC]', 'color:#f59e0b', ...a);",
      `\n${fidelitySource.trim()}\n`);
    p.once('        const res = buildResult(data, orig, scale);',
      '        protectGlyphs(data, orig, scale);\n        const res = buildResult(data, orig, scale);');
  }
  p.all("const HUB_VER = '5.13'", `const HUB_VER = '${version}'`);
  return String(p);
}
