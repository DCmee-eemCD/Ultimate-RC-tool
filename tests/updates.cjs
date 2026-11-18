const assert = require('node:assert/strict');
const {launchExtension} = require('./lib/browser.cjs');
require('../extension/update-release.js');
const {compare, select} = globalThis.RCRelease;
const fixture = (v, tag = 'v' + v) => ({tag_name:tag, draft:false, prerelease:false, assets:[{
  name:`Ultimate-RC-tools-v${v}-unpacked.zip`, state:'uploaded',
  browser_download_url:`https://github.com/DCmee-eemCD/Ultimate-RC-tool/releases/download/${tag}/Ultimate-RC-tools-v${v}-unpacked.zip`
}]});
assert.equal(compare('2.10.0', '2.9.9'), 1);
assert.equal(compare('2.1', '2.1.0.0'), 0);
assert.equal(compare('2.0.0', '2.1.0'), -1);
assert.equal(select(fixture('2.0.0','Peak_realese')).version, '2.0.0');
assert.throws(() => select(fixture('2.0.0','v2.2.0')));
assert.throws(() => select({...fixture('2.2.0'), prerelease:true}));
assert.throws(() => select({...fixture('2.2.0'), assets:[]}));
const ambiguous = fixture('2.2.0'); ambiguous.assets.push({...ambiguous.assets[0]});
assert.throws(() => select(ambiguous));
const hostile = fixture('2.2.0'); hostile.assets[0].browser_download_url = 'https://evil.example/tool.zip';
assert.throws(() => select(hostile));

(async () => {
  const context = await launchExtension('updates');
  try {
    let payload = fixture('2.0.0','Peak_realese'), httpStatus = 200;
    await context.route('https://api.github.com/repos/DCmee-eemCD/Ultimate-RC-tool/releases/latest', route =>
      route.fulfill({status:httpStatus, contentType:'application/json', body:JSON.stringify(payload)}));
    await context.addInitScript(() => {
      if (location.protocol !== 'chrome-extension:') return;
      window.testDownloads = [];
      window.downloadFailure = false;
      window.downloadState = 'complete';
      chrome.downloads.download = async options => {
        window.testDownloads.push(options);
        if (window.downloadFailure) throw new Error('fixture download failure');
        return 42;
      };
      chrome.downloads.search = async () => [{id:42,state:window.downloadState}];
      chrome.downloads.onChanged.addListener = listener => { window.downloadChange = listener; };
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const url = new URL('updates.html', worker.url()).href;
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const state = value => page.waitForFunction(v => document.querySelector('#status').dataset.state === v, value);
    await page.goto(url);
    await state('current');
    assert.equal(await page.evaluate(() => testDownloads.length), 0, 'older release must not download');
    const installed = await page.evaluate(() => chrome.runtime.getManifest().version);
    payload = fixture(installed);
    await page.locator('#check').click(); await state('current');
    assert.equal(await page.evaluate(() => testDownloads.length), 0, 'same version must not download');
    payload = fixture('99.0.0');
    await page.locator('#check').click(); await state('downloaded');
    const downloads = await page.evaluate(() => testDownloads);
    assert.equal(downloads.length, 1);
    assert.equal(downloads[0].url, payload.assets[0].browser_download_url);
    assert.equal(await page.locator('ol li').count(), 4);
    await page.evaluate(() => { window.downloadFailure = true; });
    await page.locator('#download').click(); await state('error');
    assert.match(await page.locator('#status').textContent(), /Không tải được ZIP/);
    await page.evaluate(() => { window.downloadFailure = false; window.downloadState = 'in_progress'; });
    await page.locator('#download').click(); await state('downloading');
    assert.equal(await page.locator('#check').isDisabled(), true);
    await page.evaluate(() => downloadChange({id:42,state:{current:'interrupted'}}));
    await state('error');
    assert.equal(await page.locator('#download').isEnabled(), true);
    httpStatus = 429;
    await page.locator('#check').click(); await state('error');
    assert.match(await page.locator('#status').textContent(), /giới hạn/);
    httpStatus = 404;
    await page.locator('#check').click(); await state('error');
    assert.match(await page.locator('#status').textContent(), /Chưa tìm thấy/);
    httpStatus = 200; payload = fixture(installed);
    await page.locator('#check').click(); await state('current');
    await page.setViewportSize({width:360,height:800});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);

    // Exercise the actual MAIN -> isolated bridge -> background -> extension tab path.
    await context.route('https://fsc-edunext.fpt.edu.vn/**', route => route.fulfill({contentType:'text/html',body:'<html><body><div class="chat-messages"></div></body></html>'}));
    const edu = await context.newPage();
    await edu.goto('https://fsc-edunext.fpt.edu.vn/rc-update-test');
    await edu.locator('#rc-kit #gear').click();
    await edu.locator('#rc-kit [data-tab="feat"]').click();
    const opened = context.waitForEvent('page');
    await edu.locator('#rc-kit #rc-open-updates').click();
    const updatePage = await opened;
    await updatePage.waitForURL(url);
    await updatePage.waitForFunction(() => document.querySelector('#status')?.dataset.state === 'current');
    const extensionsOpened = context.waitForEvent('page');
    await updatePage.locator('#extensions').click();
    await (await extensionsOpened).waitForURL('chrome://extensions/');
    console.log('PASS: numeric versions, legacy tag, ZIP validation, no downgrades, downloads/retry/interruption, API errors, narrow layout, real console bridge and Chrome extensions button.');
  } finally { await context.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
