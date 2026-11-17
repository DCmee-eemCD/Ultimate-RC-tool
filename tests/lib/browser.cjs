// Shared setup for browser tests: locates Playwright and Chrome for Testing and
// launches an isolated profile with the unpacked extension loaded.
//
//   RC_PLAYWRIGHT  Playwright module path (default: .transfer/package, then `playwright`)
//   RC_CHROME      Chrome for Testing executable (default: .transfer/chrome-win64/chrome.exe)
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const TRANSFER = path.join(ROOT, '.transfer');
const EXTENSION = path.join(ROOT, 'extension');

const localOr = (envValue, local, fallback) => envValue || (fs.existsSync(local) ? local : fallback);

function playwright() {
  return require(localOr(process.env.RC_PLAYWRIGHT, path.join(TRANSFER, 'package'), 'playwright'));
}

function chromePath() {
  return localOr(process.env.RC_CHROME, path.join(TRANSFER, 'chrome-win64', 'chrome.exe'), undefined);
}

/**
 * Launch a headless persistent context with the extension loaded.
 * The profile is a fresh directory under .transfer/ named `<name>-XXXXXX`;
 * the user's real browser profile is never used.
 */
function launchExtension(name, {args = [], ...options} = {}) {
  fs.mkdirSync(TRANSFER, {recursive: true});
  const profile = fs.mkdtempSync(path.join(TRANSFER, name + '-'));
  return playwright().chromium.launchPersistentContext(profile, {
    headless: true,
    executablePath: chromePath(),
    ...options,
    args: ['--disable-extensions-except=' + EXTENSION, '--load-extension=' + EXTENSION, ...args],
  });
}

module.exports = {ROOT, TRANSFER, EXTENSION, launchExtension};
