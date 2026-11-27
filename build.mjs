// Builds the extension's generated files from the unchanged 5.14 userscript:
//   extension/console.css   Tailwind/daisyUI output of source/console.css
//   extension/ocr-engine.js legacy image-tab OCR engine
//   extension/ocr-core.js   active shared OCR pipeline
//   extension/app.js        page UI and behavior
// Run with `npm run build` (works from any working directory).
import {execFileSync} from 'node:child_process';
import {ROOT, readText, readBase64, writeText, copy} from './scripts/lib/project.mjs';
import {buildOcrEngine} from './scripts/transforms/ocr-engine.mjs';
import {buildOcrCore} from './scripts/transforms/ocr-core.mjs';
import {buildPageBase} from './scripts/transforms/page-base.mjs';
import {applyPageTransforms} from './scripts/transforms/index.mjs';
import {replaceOnce} from './scripts/lib/patch.mjs';

const USERSCRIPT = 'source/Ultimate-RC-tools-5.14.txt';
const FEATURE_BOUNDARY = '    // =====================================================================\n    // 1.';

function buildConsoleCss() {
  execFileSync(process.execPath, [
    'node_modules/@tailwindcss/cli/dist/index.mjs',
    '-i', 'source/console.css', '-o', 'extension/console.css', '--minify',
  ], {cwd: ROOT, stdio: 'inherit'});
  return Promise.all([
    copy('node_modules/daisyui/LICENSE', 'extension/DAISYUI-LICENSE.txt'),
    copy('node_modules/tailwindcss/LICENSE', 'extension/TAILWIND-LICENSE.txt'),
  ]);
}

/** Split the userscript body into its OCR engine half and page-feature half. */
function splitUserscript(source) {
  const start = source.indexOf('(function () {');
  if (start < 0) throw new Error('Userscript: missing IIFE start');
  const body = source.slice(start);
  const split = body.indexOf(FEATURE_BOUNDARY);
  if (split < 0) throw new Error('Userscript: missing feature boundary');
  return {engineSource: body.slice(0, split), features: body.slice(split)};
}

await buildConsoleCss();
// The isolated answer UI uses the same bundled components in its shadow root.
await writeText('extension/auto-answer.js', replaceOnce(await readText('source/auto-answer.js'),
  '/* RC_ANSWER_CSS */', JSON.stringify((await readText('extension/console.css')) + '\n' + (await readText('source/assistant.css'))), 'assistant styles'));
const {version} = JSON.parse(await readText('extension/manifest.json'));
const {engineSource, features} = splitUserscript(await readText(USERSCRIPT));
const fidelitySource = await readText('source/ocr-fidelity.js');
const tableSource = await readText('source/ocr-tables.js');

const engine = buildOcrEngine(engineSource, version, fidelitySource, tableSource);
await writeText('extension/ocr-engine.js', engine);
await writeText('extension/ocr-core.js', buildOcrCore(engine));

const ctx = {version, readText, readBase64};
await writeText('extension/app.js', await applyPageTransforms(buildPageBase(features, version), ctx));

console.log(`Built extension ${version} from the unchanged 5.14 source.`);
