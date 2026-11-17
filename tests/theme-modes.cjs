const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const {launchExtension} = require('./lib/browser.cjs');

const URL = 'https://fsc-edunext.fpt.edu.vn/rc-theme-modes';
const PRESET_COUNT = 6;

function rgbLuminance(rgb) {
  const values = rgb.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (values.length < 3) return NaN;
  return (0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2]) / 255;
}

function hexToCssRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgb(${value >> 16 & 255}, ${value >> 8 & 255}, ${value & 255})`;
}

async function readThemeState(page) {
  return page.evaluate(() => {
    const host = document.querySelector('#rc-kit');
    const wrapper = host?.shadowRoot?.querySelector('.w');
    const cfg = GM_getValue('chatKit') || {};
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    const wrapperStyle = wrapper ? getComputedStyle(wrapper) : null;
    return {
      mode: cfg.imageThemeMode,
      pageBg: cfg.pageBg,
      bodyBg: bodyStyle.backgroundColor,
      pageScheme: rootStyle.colorScheme,
      dashboardScheme: wrapperStyle?.colorScheme || '',
      dashboardBg: wrapperStyle?.getPropertyValue('--bg').trim() || '',
      primary: cfg.primary,
    };
  });
}

async function openPanel(page) {
  const gear = page.locator('#rc-kit #gear');
  await gear.waitFor({state: 'visible'});
  if (!(await page.locator('#rc-kit #panel').isVisible())) await gear.click();
  await page.locator('#rc-kit [data-theme-mode]').first().waitFor({state: 'visible'});
}

async function setThemeMode(page, mode) {
  const button = page.locator(`#rc-kit [data-theme-mode="${mode}"]`);
  await button.click();
  assert.equal(await button.getAttribute('aria-pressed'), 'true', `${mode} theme mode should be selected`);
}

async function flushAndReload(page) {
  await page.evaluate(() => RC.flush());
  await page.reload();
  await openPanel(page);
}

(async () => {
  const context = await launchExtension('theme-modes', {viewport: {width: 1280, height: 900}});
  try {
    await context.route('https://fsc-edunext.fpt.edu.vn/**', route => route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><html><head><style>
        .ps-menu-button { display:block; width:60px; height:50px; }
        .css-site > .ps-menu-button:hover { background:rgb(243,243,243); }
        .MuiMenuItem-root, .MuiTypography-root { color:rgba(0,0,0,.87); }
      </style></head><body style="background:#e7ecf2">
        <div class="left-navigation"><div class="css-site"><a href="#" class="ps-menu-button"><span>Home</span></a></div></div>
        <div class="MuiPopover-root"><div class="MuiPaper-root MuiMenu-paper"><ul>
          <li class="MuiMenuItem-root"><b class="MuiTypography-root">user.demo@example.com</b></li>
          <li class="MuiMenuItem-root">Logout</li>
        </ul></div></div><div class="chat-messages"></div></body></html>`,
    }));

    const page = await context.newPage();
    await page.goto(URL);
    await openPanel(page);
    assert.equal(await page.locator('#rc-kit .pre').count(), PRESET_COUNT);

    const states = {dark: [], light: []};
    for (const mode of ['dark', 'light']) {
      for (let preset = 0; preset < PRESET_COUNT; preset++) {
        await setThemeMode(page, mode);
        await page.locator(`#rc-kit .pre[data-pre="${preset}"]`).click();
        const selected = await readThemeState(page);
        assert.equal(selected.mode, mode, `preset ${preset} should retain ${mode} mode`);
        assert.equal(selected.pageScheme, mode, `preset ${preset} page color scheme`);
        assert.equal(selected.dashboardScheme, mode, `preset ${preset} dashboard color scheme`);
        assert.equal(selected.bodyBg, hexToCssRgb(selected.pageBg), `preset ${preset} ${mode} page color should be applied`);
        assert.notEqual(selected.bodyBg, 'rgba(0, 0, 0, 0)', `preset ${preset} should color the page`);
        states[mode][preset] = selected;

        // Portal menu text must contrast with its themed surface, and native
        // sidebar hover CSS must not restore the site's fixed white highlight.
        const menu = await page.locator('.MuiMenu-paper').evaluate(el => ({
          bg: getComputedStyle(el).backgroundColor,
          colors: [...el.querySelectorAll('li, b')].map(node => getComputedStyle(node).color),
        }));
        for (const color of menu.colors) {
          assert.ok(Math.abs(rgbLuminance(color) - rgbLuminance(menu.bg)) > 0.45,
            `preset ${preset} ${mode} account text contrast`);
        }
        await page.locator('.ps-menu-button').hover();
        const hoverBg = await page.locator('.ps-menu-button').evaluate(el => getComputedStyle(el).backgroundColor);
        assert.notEqual(hoverBg, 'rgb(243, 243, 243)', 'sidebar hover must override site white');
        assert.notEqual(hoverBg, selected.bodyBg, 'sidebar hover must be visible');
        await page.mouse.move(600, 400);

        await flushAndReload(page);
        const persisted = await readThemeState(page);
        assert.deepEqual(
          {mode: persisted.mode, pageBg: persisted.pageBg, bodyBg: persisted.bodyBg, pageScheme: persisted.pageScheme, dashboardScheme: persisted.dashboardScheme},
          {mode: selected.mode, pageBg: selected.pageBg, bodyBg: selected.bodyBg, pageScheme: selected.pageScheme, dashboardScheme: selected.dashboardScheme},
          `preset ${preset} ${mode} values should survive reload`,
        );
      }
    }

    for (let preset = 0; preset < PRESET_COUNT; preset++) {
      assert.notEqual(states.dark[preset].pageBg, states.light[preset].pageBg, `preset ${preset} needs distinct light/dark page colors`);
      assert.ok(
        rgbLuminance(states.light[preset].bodyBg) > rgbLuminance(states.dark[preset].bodyBg),
        `preset ${preset} light page should be brighter than dark page`,
      );
    }

    // Use browser-local Date construction so the test remains valid outside the
    // workstation's timezone; the extension's automatic mode reads getHours().
    const clockPage = await context.newPage();
    await clockPage.goto('about:blank');
    const times = await clockPage.evaluate(() => ({
      dawn: new Date(2026, 10, 14, 6, 59).getTime(),
      day: new Date(2026, 10, 14, 7, 0).getTime(),
      dusk: new Date(2026, 10, 14, 18, 59).getTime(),
      night: new Date(2026, 10, 14, 19, 0).getTime(),
    }));
    await clockPage.clock.install({time: times.dawn});
    await clockPage.goto(URL + '-clock');
    await openPanel(clockPage);
    await setThemeMode(clockPage, 'auto');
    await clockPage.locator('#rc-kit .pre[data-pre="2"]').click();
    let state = await readThemeState(clockPage);
    assert.equal(state.mode, 'auto');
    assert.equal(state.pageScheme, 'dark', '06:59 should be dark in automatic mode');

    await clockPage.clock.setFixedTime(times.day);
    await clockPage.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await clockPage.waitForFunction(() => getComputedStyle(document.documentElement).colorScheme === 'light');
    state = await readThemeState(clockPage);
    assert.equal(state.mode, 'auto');
    assert.equal(state.pageScheme, 'light', '07:00 should switch to light in automatic mode');

    await clockPage.clock.setFixedTime(times.dusk);
    await clockPage.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await clockPage.waitForFunction(() => getComputedStyle(document.documentElement).colorScheme === 'light');

    await clockPage.clock.setFixedTime(times.night);
    await clockPage.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await clockPage.waitForFunction(() => getComputedStyle(document.documentElement).colorScheme === 'dark');
    state = await readThemeState(clockPage);
    assert.equal(state.mode, 'auto');
    assert.equal(state.pageScheme, 'dark', '19:00 should switch to dark in automatic mode');

    // Explicit modes are not clock-controlled: light stays light at night and
    // dark stays dark during the day.
    await setThemeMode(clockPage, 'light');
    await clockPage.waitForFunction(() => getComputedStyle(document.documentElement).colorScheme === 'light');
    await clockPage.clock.setFixedTime(times.dawn);
    await clockPage.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await clockPage.waitForFunction(() => getComputedStyle(document.documentElement).colorScheme === 'light');
    state = await readThemeState(clockPage);
    assert.equal(state.mode, 'light');
    assert.equal(state.pageScheme, 'light');

    await setThemeMode(clockPage, 'dark');
    await clockPage.waitForFunction(() => getComputedStyle(document.documentElement).colorScheme === 'dark');
    await clockPage.clock.setFixedTime(times.day);
    await clockPage.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await clockPage.waitForFunction(() => getComputedStyle(document.documentElement).colorScheme === 'dark');
    state = await readThemeState(clockPage);
    assert.equal(state.mode, 'dark');
    assert.equal(state.pageScheme, 'dark');

    // Portable themes must preserve the automatic mode as well as fixed modes.
    await openPanel(page);
    await setThemeMode(page, 'auto');
    await page.locator('#rc-kit .pre[data-pre="4"]').click();
    const download = page.waitForEvent('download');
    await page.locator('#rc-kit #theme-export').click();
    const exported = JSON.parse(await fs.readFile(await (await download).path(), 'utf8'));
    assert.equal(exported.theme.imageThemeMode, 'auto');
    await setThemeMode(page, 'dark');
    const themeFile = page.locator('#rc-kit #theme-file');
    await Promise.all([
      page.waitForEvent('domcontentloaded'),
      themeFile.setInputFiles({name: 'auto-theme.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported))}),
    ]);
    await openPanel(page);
    state = await readThemeState(page);
    const expectedCurrentScheme = await page.evaluate(() => {
      const hour = new Date().getHours();
      return hour >= 7 && hour < 19 ? 'light' : 'dark';
    });
    assert.equal(state.mode, 'auto');
    assert.equal(state.pageScheme, expectedCurrentScheme);

    console.log('PASS: six quick themes, light/dark colors, persistence, local-time automatic mode transitions, and manual overrides.');
  } finally {
    await context.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
