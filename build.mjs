import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {upgrade} from './scripts/build-transforms.mjs';
execFileSync(process.execPath, ['node_modules/@tailwindcss/cli/dist/index.mjs', '-i', 'source/console.css', '-o', 'extension/console.css', '--minify'], {stdio:'inherit'});
await fs.copyFile('node_modules/daisyui/LICENSE', 'extension/DAISYUI-LICENSE.txt');
await fs.copyFile('node_modules/tailwindcss/LICENSE', 'extension/TAILWIND-LICENSE.txt');
const {version} = JSON.parse(await fs.readFile('extension/manifest.json', 'utf8'));
const source = await fs.readFile(new URL('./source/Ultimate-RC-tools-5.14.txt', import.meta.url), 'utf8');
await fs.mkdir('extension', {recursive:true});
function replaceOnce(s, a, b) {
  if (!s.includes(a) || s.indexOf(a)!==s.lastIndexOf(a)) throw new Error('Source changed: '+a.slice(0,80));
  return s.replace(a,b);
}
let app = source.slice(source.indexOf('(function () {'));
const split = app.indexOf('    // =====================================================================\n    // 1.');
if(split < 0) throw new Error('Missing feature boundary');
let engine = app.slice(0,split) + '\n})();\n';
engine = replaceOnce(engine, '(function () {', '(async function () {\n    await RC.ready;');
engine = replaceOnce(engine, '    await RC.ready;', '    await RC.ready;\n    const kernels = await RCWasm.ready;\n    RC.pixelBackend = kernels ? "rust" : "javascript";');
engine = replaceOnce(engine, "if (location.hostname === 'cdn-lab.fpt.edu.vn')", "if (location.protocol === 'chrome-extension:')");
engine = engine.replaceAll('window.close()', 'RC.closeSelf()');
engine = replaceOnce(engine, 'const im = await waitImg();', `const im = new Image();
                im.src = new URLSearchParams(location.hash.slice(1)).get('src');
                await im.decode();`);
engine = engine.replaceAll('Tesseract.createWorker(langs)', 'Tesseract.createWorker(langs, 1, RC.workerOptions)');
// Prevent an empty scheduler from waiting forever when worker initialization fails.
engine = replaceOnce(engine, 'if (adds.length) await Promise.all(adds);', "if (adds.length) await Promise.all(adds);\n                if (!workers) throw new Error('Không khởi tạo được OCR worker');");
// The JS implementation stays intact as a fallback if WASM cannot initialize.
const figStart=engine.indexOf('        const inkMap =');
const figEnd=engine.indexOf('        good = good.filter',figStart);
const figureJS=engine.slice(figStart,figEnd).replace('const figs = [];','figs = [];');
if(figStart<0||figEnd<0)throw new Error('Missing figure kernel');
engine=engine.slice(0,figStart)+`        let figs;
        if (kernels && px.byteLength <= 64 * 1024 * 1024) {
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
${figureJS}        }
`+engine.slice(figEnd);
const preStart=engine.indexOf('        const lut = new Uint8ClampedArray(256);');
const preEnd=engine.indexOf('        x.putImageData',preStart);
const preprocessJS=engine.slice(preStart,preEnd).replace('        const id = x.getImageData(0, 0, c.width, c.height), px = id.data;\n','');
if(preStart<0||preEnd<0)throw new Error('Missing preprocessing kernel');
engine=engine.slice(0,preStart)+`        const id = x.getImageData(0, 0, c.width, c.height), px = id.data;
        if (kernels && px.byteLength <= 64 * 1024 * 1024) kernels.preprocess(px);
        else {
${preprocessJS}        }
`+engine.slice(preEnd);
// Rust computes the full crop boxes; canvas copies and scheduler jobs remain JS.
const stripsStart=engine.indexOf('        const THR = 200;');
const stripsEnd=engine.indexOf('        const M = 14;',stripsStart);
const stripsJS=engine.slice(stripsStart,stripsEnd).replace('const chunks = [];','chunks = [];');
if(stripsStart<0||stripsEnd<0)throw new Error('Missing strips kernel');
engine=engine.slice(0,stripsStart)+`        const THR = 200; let chunks;
        if (kernels && px.byteLength <= 64 * 1024 * 1024) {
            const boxes=kernels.strips(px,W,H,k); chunks=[];
            for(let i=0;i<boxes.length;i+=4) chunks.push({x0:boxes[i],y0:boxes[i+1],x1:boxes[i+2],y1:boxes[i+3]});
            if(chunks.length<2) return recognize(c);
        } else {
${stripsJS}        }
`+engine.slice(stripsEnd);
const cropStart=engine.indexOf('            let x0 = W, x1 = -1;',engine.indexOf('const parts = await Promise.all'));
const cropEnd=engine.indexOf('            const cw =',cropStart);
const cropJS=engine.slice(cropStart,cropEnd).replace('            let x0 = W, x1 = -1;\n','');
engine=engine.slice(0,cropStart)+`            let x0 = ch.x0 ?? W, x1 = ch.x1 ?? -1;
            if (ch.x0 === undefined) {
${cropJS}            }
`+engine.slice(cropEnd);
engine=engine.replaceAll("const HUB_VER = '5.13'", `const HUB_VER = '${version}'`);
await fs.writeFile('extension/ocr-engine.js', engine);
// Keep all original page features, styles and markup; the OCR engine lives in its own extension tab.
app = '(async function () {\n    \'use strict\';\n' +
  "    const HUB_VER = '5.15-rust';\n    const log = (...a) => console.log('%c[RC]', 'color:#f59e0b', ...a);\n" +
  "    const whenBody = fn => (document.body ? fn() : document.addEventListener('DOMContentLoaded', fn, { once: true }));\n" + app.slice(split);
app = replaceOnce(app, "let cfg = Object.assign({}, DEFAULTS, GM_getValue('chatKit', {}));", "let cfg = Object.assign({}, DEFAULTS);\n    await RC.ready;\n    Object.assign(cfg, GM_getValue('chatKit', {}));");
app = replaceOnce(app, '        im.onload = () => {', '        const requestedBg = cfg.bgImage;\n        im.onload = async () => {');
app = replaceOnce(app, '                const pal = paletteFromPixels(x.getImageData(0, 0, 48, 48).data);', `                const pixels=x.getImageData(0, 0, 48, 48).data;
                let pal;
                try { pal=await RC.palette(pixels); }
                catch(e) { RC.paletteBackend='javascript'; pal=paletteFromPixels(pixels); }
                if (cfg.bgImage !== requestedBg) return;`);
// Reload only after the asynchronous extension storage write has finished.
app = replaceOnce(app, "save(); location.reload();", "save(); RC.flush().then(() => location.reload());");
// A page's style-src CSP can reject <style>; adopted stylesheets preserve the theme.
app = replaceOnce(app, '        styleEl.textContent = css;', `        styleEl.textContent = css;
        if (!RC.themeSheet) {
            RC.themeSheet = new CSSStyleSheet();
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, RC.themeSheet];
        }
        RC.themeSheet.replaceSync(css);`);
const start = app.indexOf('    function postJob(job) {');
const end = app.indexOf('    function closeHub()',start);
if(start<0 || end<0) throw new Error('Missing inbox writer');
app = app.slice(0,start) + '    function postJob(job) { RC.postJob(job); }\n' + app.slice(end);
// Page-world canvas interception starts before asynchronous storage is loaded.
app = replaceOnce(app, 'const od = P.drawImage;', 'const od = RC.originalDrawImage;');
app = replaceOnce(app, '    // =====================================================================\n    // 5.', '    RC.earlyUrls.splice(0).forEach(noteUrl);\n\n    // =====================================================================\n    // 5.');
// Do not let anti-copy capture swallow the extension dock\'s own right-click handler.
app = replaceOnce(app, 'if (cfg[key] !== false) e.stopImmediatePropagation();', "if (cfg[key] !== false && !e.composedPath().some(n => n && n.id === 'rc-kit')) e.stopImmediatePropagation();");
app = replaceOnce(app, '<small>v5.14</small>', '<small>v5.15.0</small>');
app = replaceOnce(app, "log('Ultimate RC tools v5.14 sẵn sàng');", "log('Ultimate RC tools v5.15.0 sẵn sàng');");
app = await upgrade(app, engine, version);
await fs.writeFile('extension/app.js', app);
console.log('Built page features and OCR engine from the unchanged 5.14 source.');
