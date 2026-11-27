const fs = require('node:fs');
const assert = require('node:assert/strict');
const {launchExtension} = require('./lib/browser.cjs');

(async () => {
  const ctx = await launchExtension('ocr-tables');
  try {
    const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker');
    const page = await ctx.newPage();
    await page.goto('chrome-extension://' + new URL(sw.url()).host + '/offscreen.html');
    const input = process.argv[2] ? 'data:image/png;base64,' + fs.readFileSync(process.argv[2]).toString('base64') : null;
    const result = await page.evaluate(async input => {
      const core = await RCOcrReady;
      const worker = await Tesseract.createWorker('vie+eng', 1, RC.workerOptions);
      const scheduler = Tesseract.createScheduler();
      scheduler.addWorker(worker);
      try {
        let im;
        if (input) { im = new Image(); im.src = input; await im.decode(); }
        else {
          im = document.createElement('canvas'); im.width = 800; im.height = 330;
          const c = im.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 800, 330);
          c.font = '20px Arial'; c.fillStyle = '#111'; c.fillText('Before the table', 20, 28);
          c.fillStyle = '#e5e7eb'; c.fillRect(20, 60, 760, 50);
          c.strokeStyle = '#9ca3af'; c.lineWidth = 1;
          for (const x of [20, 400, 780]) { c.beginPath(); c.moveTo(x+.5,60); c.lineTo(x+.5,260); c.stroke(); }
          for (const y of [60,110,160,210,260]) { c.beginPath(); c.moveTo(20,y+.5); c.lineTo(780,y+.5); c.stroke(); }
          c.fillStyle = '#111';
          [['Product','Application'],['Gasoline','Engine fuel'],['Diesel','Diesel engine'],['Paraffin','Wax']].forEach((row,r) => row.forEach((t,col) => c.fillText(t,30+col*380,92+r*50)));
          c.fillText('After the table',20,302);
        }
        return await core.ocrPipeline(im, async c => (await scheduler.addJob('recognize', c.toDataURL(), {}, {blocks:true,text:true})).data, 2);
      } finally { await scheduler.terminate(); }
    }, input);
    const tables = result.segments.filter(s => s.type === 'table');
    if (process.argv.includes('--fallback')) {
      assert.equal(tables.length, 0, 'unsupported background must not create a partial table');
      assert.ok(result.text.trim(), 'ordinary OCR still returns text');
      assert.ok(result.segments.length, 'ordinary OCR/image segments are retained');
      console.log('PASS: unsupported background preserves ordinary OCR/image fallback.');
      return;
    }
    assert.equal(tables.length, 1, 'reconstruct one table instead of an image');
    assert.equal(tables[0].rows[0].length, 2);
    assert.equal(tables[0].rows.length, input ? 10 : 4);
    assert.match(tables[0].rows[0][0], input ? /Phân đoạn/i : /Product/i, 'shaded header remains readable');
    assert.match(tables[0].rows[0][1], input ? /Ứng dụng/i : /Application/i, 'second header remains readable');
    assert.ok(tables[0].text.includes('\t'), 'copy keeps column boundaries');
    assert.match(result.text, input ? /diesel/i : /Gasoline/);
    if (!input) {
      assert.ok(result.text.indexOf('Before') < result.text.indexOf('Product'), result.text);
      assert.ok(result.text.indexOf('Wax') < result.text.indexOf('After'), result.text);
    }
    const render = fs.readFileSync('source/ocr-table-render.js', 'utf8');
    await page.evaluate(render);
    const dom = await page.evaluate(table => {
      const host = document.createElement('div'); document.body.append(host);
      renderOcrTable(host, table);
      return {rows:host.querySelectorAll('tr').length, cells:host.querySelectorAll('td,th').length,
        text:host.textContent, focus:host.firstElementChild.tabIndex};
    }, tables[0]);
    assert.equal(dom.rows, tables[0].rows.length);
    assert.equal(dom.cells, tables[0].rows.length * 2);
    assert.equal(dom.focus, 0);
    const safe = await page.evaluate(() => {
      const body = document.createElement('div');
      renderOcrTable(body, {rows:[['<img src=x onerror=alert(1)>', '']],header:false});
      return {images:body.querySelectorAll('img').length, text:body.textContent, cells:body.querySelectorAll('td').length};
    });
    assert.equal(safe.images, 0);
    assert.equal(safe.cells, 2);
    assert.match(safe.text, /<img/);
    const app = fs.readFileSync('extension/app.js', 'utf8');
    const styleStart = app.indexOf('            .rc-ocr-table-wrap {');
    const styles = app.slice(styleStart, app.indexOf('            .rc-ocr-fig {', styleStart));
    await page.evaluate(styles => {
      const style = document.createElement('style');
      style.textContent = styles + 'body {margin:20px;color:#172033;background:#fff;font:16px "Segoe UI",sans-serif}';
      document.head.append(style);
    }, styles);
    await page.setViewportSize({width:960,height:760});
    await page.screenshot({path:'.transfer/ocr-table-preview.png'});
    await page.setViewportSize({width:390,height:760});
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    assert.ok(fits, 'table scroll stays inside a narrow viewport');
    console.log('PASS: local OCR reconstructs table, preserves reading order and renders selectable cells.', JSON.stringify(tables[0].rows));
  } finally { await ctx.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
