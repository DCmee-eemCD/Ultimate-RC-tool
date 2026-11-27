// Ordered feature transforms applied to the page app after ./page-base.mjs.
// Order matters: later steps anchor on text produced by earlier ones
// (e.g. source-first relies on text-source labels, console-ui on the dashboard
// defaults, the toolbar on emoji-free button labels).
import {Patch} from '../lib/patch.mjs';
import {navIcons} from './nav-icons.mjs';
import {dashboardTheme} from './dashboard-theme.mjs';
import {ocrBackend} from './ocr-backend.mjs';
import {themeTransfer} from './theme-transfer.mjs';
import {textSource} from './text-source.mjs';
import {launcher, plainButtonLabels} from './launcher.mjs';
import {music} from './music.mjs';
import {ocrToolbar} from './ocr-toolbar.mjs';
import {sourceFirst} from './source-first.mjs';
import {consoleUI} from './console-ui.mjs';

async function imageCopy(p, ctx) {
  p.after("    const save = () => GM_setValue('chatKit', cfg);", '\n' + await ctx.readText('source/image-copy.js'));
}

export const PAGE_TRANSFORMS = [
  navIcons,
  dashboardTheme,
  ocrBackend,
  themeTransfer,
  textSource,
  launcher,
  music,
  plainButtonLabels,
  ocrToolbar,
  sourceFirst,
  consoleUI,
  imageCopy,
];

export async function applyPageTransforms(app, ctx) {
  for (const transform of PAGE_TRANSFORMS) {
    const p = new Patch(app, transform.name);
    await transform(p, ctx);
    app = String(p);
  }
  return app;
}
