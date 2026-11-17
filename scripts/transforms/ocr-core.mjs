// Derives the active shared OCR pipeline (extension/ocr-core.js) from the
// engine: text stays selectable text, coordinates stay in image space, and the
// legacy image-tab runner is cut off.
import {Patch} from '../lib/patch.mjs';

function textFidelity(p) {
  // Text remains text: never rasterize a line merely for containing '=' or color.
  // Short enumerated answers such as "a) ..." are admitted.
  p.once('const ok = (clean &&', 'const ok = (al >= 3 && hh <= 100 && l.confidence >= 35 && /^\\s*[a-zA-Z0-9][).]/.test(t)) || (clean && n >= 8 && l.confidence >= 45 && hh <= 100) || (clean &&');
  p.regex(/^            t = t\.replace\(.*$/m, '');
  p.once('lines.push({ t, ok, weak:', 'lines.push({ visual:l.rcVisual, t, ok:ok || !!l.rcVisual, weak:');
  p.once('good.filter(l => !l.weak)', 'good.filter(l => !l.weak || l.visual)');
  p.once('good = good.filter(l => !l.weak ||', 'good = good.filter(l => l.visual || !l.weak ||');
  p.once("({ type: 'line', y0:", "({ visual:l.visual, type: 'line', y0:");
  p.after('        items.forEach(it => {', '\n            if(it.visual) { flush(); segs.push(it.visual); return; }');
  p.once("segs.filter(g => g.type === 'text').map(g => g.text)", "segs.filter(g => g.type === 'text' || g.preserved).map(g => g.preserved ? g.copyText : g.text)");
}

function originalCoordinates(p) {
  // Keep all nested OCR coordinates in the original image coordinate system.
  p.once('off: ch.y0 - M, ci,', 'off: ch.y0 - M, offX:x0 - M, ci,');
  p.once('({ d, off, ci })', '({ d, off, offX, ci })');
  p.once('{ y0: bb.y0 + off, y1: bb.y1 + off }', '{ x0:bb.x0 + offX, x1:bb.x1 + offX, y0: bb.y0 + off, y1: bb.y1 + off }');
  p.once('bbox: sh(l.bbox), ck: ci', 'bbox: sh(l.bbox), words:(l.words || []).map(w=>({...w,bbox:sh(w.bbox),symbols:(w.symbols || []).map(s=>({...s,bbox:sh(s.bbox)}))})), ck: ci');
}

export function buildOcrCore(engine) {
  const p = new Patch(engine, 'OCR core');
  textFidelity(p);
  originalCoordinates(p);
  const text = String(p);
  const end = text.indexOf('    function runImageTab()');
  if (end < 0) throw new Error('OCR core: missing image-tab boundary');
  const core = new Patch(text.slice(0, end), 'OCR core')
    .once('(async function () {', 'globalThis.RCOcrReady = (async function () {');
  return core + '\nreturn {ocrPipeline, backend: RC.pixelBackend};\n})();\n';
}
