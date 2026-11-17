const assert = require('node:assert/strict');
const {launchExtension} = require('./lib/browser.cjs');

(async () => {
  const context = await launchExtension('theme-style-order');
  try {
    await context.route('https://fsc-edunext.fpt.edu.vn/**', route => route.fulfill({
      contentType: 'text/html', body: '<!doctype html><html><head></head><body><div class="chat-messages"></div><main></main></body></html>',
    }));
    const page = await context.newPage();
    await page.goto('https://fsc-edunext.fpt.edu.vn/rc-style-order');
    await page.locator('#rc-kit #gear').click();
    for (const mode of ['dark', 'light']) {
      await page.locator(`#rc-kit [data-theme-mode="${mode}"]`).click();
      await page.locator('#rc-kit .pre[data-pre="0"]').click();
      // Mount a new SPA module only after the extension has applied its theme.
      await page.evaluate(() => {
        document.querySelector('main').innerHTML = `
          <h1 class="prj-header__title late-title">Projects</h1>
          <p class="prj-header__subtitle">Description</p>
          <section class="MuiBox-root late-box"><div class="MuiPaper-root">
            <h4 class="MuiTypography-root late-title">Final Project Title Confirmation</h4>
            <table><thead><tr><th class="MuiTableCell-root MuiTableCell-head late-title">Reference</th></tr></thead></table>
            <div class="table-header late-title">Header</div>
          </div></section><div class="MuiBox-root" id="transparent-layout">Layout only</div>`;
        const style = document.createElement('style');
        style.textContent = '.late-title { color:rgb(44,62,80) !important } .late-box { background-color:rgb(245,246,250) !important }';
        document.head.appendChild(style);
      });
      const result = await page.evaluate(() => {
        const rgb = hex => `rgb(${hex.slice(1).match(/../g).map(v => parseInt(v, 16)).join(', ')})`;
        const cfg = GM_getValue('chatKit');
        return {
          expectedBg: rgb(cfg.pageBg),
          boxBg: getComputedStyle(document.querySelector('.late-box')).backgroundColor,
          colors: [...document.querySelectorAll('.late-title')].map(el => getComputedStyle(el).color),
          layoutBg: getComputedStyle(document.querySelector('#transparent-layout')).backgroundColor,
        };
      });
      assert.equal(result.boxBg, result.expectedBg, `${mode}: wrapper uses page surface`);
      assert.equal(result.layoutBg, 'rgba(0, 0, 0, 0)', 'layout-only boxes stay transparent');
      for (const color of result.colors) {
        assert.notEqual(color, 'rgb(44, 62, 80)', `${mode}: late module must not restore navy text`);
        const channels = color.match(/\d+/g).map(Number);
        assert.equal(channels.every(v => v > 180), mode === 'dark', `${mode}: readable text`);
      }
      // Reproduce the fixture's exact equal-specificity race using the active
      // adopted sheet, without adding an observer or rewriting it on mutation.
      const raceColor = await page.evaluate(() => {
        const sheet = document.adoptedStyleSheets.find(s => [...s.cssRules].some(r => r.cssText.includes('.prj-header__title')));
        const index = sheet.insertRule('.rc-race * { color:rgb(232,226,234) !important }', sheet.cssRules.length);
        const box = document.createElement('div');
        box.className = 'rc-race';
        box.innerHTML = '<h2 class="late-race">Later route</h2>';
        document.body.appendChild(box);
        const late = document.createElement('style');
        late.textContent = '.late-race { color:rgb(44,62,80) !important }';
        document.head.appendChild(late);
        const color = getComputedStyle(box.firstElementChild).color;
        sheet.deleteRule(index);
        box.remove();
        late.remove();
        return color;
      });
      assert.equal(raceColor, 'rgb(232, 226, 234)', 'adopted sheet wins equal-specificity late style');
    }
    console.log('PASS: lazy SPA headings, table headers, wrapper surfaces and equal-specificity late CSS in dark/light modes.');
  } finally {
    await context.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
