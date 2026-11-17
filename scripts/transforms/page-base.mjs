// Adapts the userscript's page-feature half to the extension runtime:
// async storage, Rust palettes, CSP-safe styles and message-based OCR jobs.
// Later transforms (see ./index.mjs) layer the new features on top.
import {Patch} from '../lib/patch.mjs';

const prelude = version => `(async function () {
    'use strict';
    const HUB_VER = '${version}';
    const log = (...a) => console.log('%c[RC]', 'color:#f59e0b', ...a);
    const whenBody = fn => (document.body ? fn() : document.addEventListener('DOMContentLoaded', fn, { once: true }));
`;

/** @param features userscript text from the feature boundary onwards */
export function buildPageBase(features, version) {
  const p = new Patch(prelude(version) + features, 'Page base');

  // Settings load asynchronously from extension storage.
  p.once("let cfg = Object.assign({}, DEFAULTS, GM_getValue('chatKit', {}));",
    "let cfg = Object.assign({}, DEFAULTS);\n    await RC.ready;\n    Object.assign(cfg, GM_getValue('chatKit', {}));");

  // Image palettes come from Rust when available; stale async results are dropped.
  p.once('        im.onload = () => {', '        const requestedBg = cfg.bgImage;\n        im.onload = async () => {');
  p.once('                const pal = paletteFromPixels(x.getImageData(0, 0, 48, 48).data);', `                const pixels=x.getImageData(0, 0, 48, 48).data;
                let pal;
                try { pal=await RC.palette(pixels); }
                catch(e) { RC.paletteBackend='javascript'; pal=paletteFromPixels(pixels); }
                if (cfg.bgImage !== requestedBg) return;`);

  // Reload only after the asynchronous extension storage write has finished.
  p.once('save(); location.reload();', 'save(); RC.flush().then(() => location.reload());');

  // A page's style-src CSP can reject <style>; adopted stylesheets preserve the theme.
  p.after('        styleEl.textContent = css;', `
        if (!RC.themeSheet) {
            RC.themeSheet = new CSSStyleSheet();
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, RC.themeSheet];
        }
        RC.themeSheet.replaceSync(css);`);

  // OCR jobs go to the offscreen document instead of a storage inbox.
  p.between('    function postJob(job) {', '    function closeHub()', () => '    function postJob(job) { RC.postJob(job); }\n');

  // Page-world canvas interception starts before asynchronous storage is loaded.
  p.once('const od = P.drawImage;', 'const od = RC.originalDrawImage;');
  p.before('    // =====================================================================\n    // 5.', '    RC.earlyUrls.splice(0).forEach(noteUrl);\n\n');

  // Do not let anti-copy capture swallow the extension dock's own right-click handler.
  p.once('if (cfg[key] !== false) e.stopImmediatePropagation();',
    "if (cfg[key] !== false && !e.composedPath().some(n => n && n.id === 'rc-kit')) e.stopImmediatePropagation();");

  p.once('<small>v5.14</small>', `<small>v${version}</small>`);
  p.once("log('Ultimate RC tools v5.14 sẵn sàng');", `log('Ultimate RC tools v${version} sẵn sàng');`);
  return String(p);
}
