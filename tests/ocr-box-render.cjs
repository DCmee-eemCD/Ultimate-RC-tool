const fs = require('node:fs');
const assert = require('node:assert/strict');
const {launchExtension} = require('./lib/browser.cjs');
(async () => {
  const ctx = await launchExtension('ocr-box');
  try {
    const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker');
    const page = await ctx.newPage();
    await page.goto('chrome-extension://' + new URL(sw.url()).host + '/offscreen.html');
    let text = 'Cau hoi:\nWhich place?\nA) Grand Canyon\nD) Neither\nPlease answer using this format:\nAnswer: [your answer]';
    if (process.argv[2]) {
      const src = 'data:image/png;base64,' + fs.readFileSync(process.argv[2]).toString('base64');
      text = await page.evaluate(async src => {
        const core = await RCOcrReady;
        const worker = await Tesseract.createWorker('vie+eng', 1, RC.workerOptions);
        try {
          const im = new Image(); im.src = src; await im.decode();
          return (await core.ocrPipeline(im, async c => (await worker.recognize(c.toDataURL(), {}, {blocks:true,text:true})).data, 1)).text;
        } finally { await worker.terminate(); }
      }, src);
    }
    const app = fs.readFileSync('extension/app.js', 'utf8');
    const code = app.slice(app.indexOf('    function splitQuestionBoxes('), app.indexOf('    function applyToContainer('));
    await page.evaluate('(() => { const cfg = {qBox:true};' + code + ';globalThis.renderQuestionTest = renderTextSeg; })()');
    const result = await page.evaluate(text => {
      const body = document.createElement('div'); renderQuestionTest(body, text);
      return {boxes:body.querySelectorAll('.rc-qbox').length, label:body.querySelector('.rc-qlab')?.textContent,
        question:body.querySelector('.rc-qbody')?.textContent,
        plain:[...body.querySelectorAll('.rc-seg-text')].map(e => e.textContent).join('\n')};
    }, text);
    assert.equal(result.boxes, 1); assert.equal(result.label, 'Câu hỏi');
    assert.match(result.question, /D\) Neither/);
    assert.doesNotMatch(result.question, /Please answer|Answer:/);
    assert.match(result.plain, /Please answer/);
    console.log('PASS: question box, restored label, answer options, and separate instructions.');
  } finally { await ctx.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
