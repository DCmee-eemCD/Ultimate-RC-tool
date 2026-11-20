const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
let exists = true, closes = 0, creates = 0, finishJob;
const saved = {chatKit: {ocrEng: true}};
const context = vm.createContext({
  URL, console, importScripts() {},
  chrome: {
    tabs: {onRemoved: {addListener() {}}},
    runtime: {
      id: 'test', getURL: path => 'chrome-extension://test/' + path,
      getContexts: async () => exists ? [{}] : [],
      sendMessage: () => new Promise(resolve => { finishJob = resolve; }),
      onMessage: {addListener() {}}, onConnect: {addListener() {}}
    },
    offscreen: {
      closeDocument: async () => { exists = false; closes++; },
      createDocument: async () => { exists = true; creates++; }
    },
    storage: {local: {set: async values => Object.assign(saved, values)}}
  }
});
vm.runInContext(fs.readFileSync('extension/background.js', 'utf8'), context);
(async () => {
  // A running scan must not prevent reset, nor return stale text afterwards.
  const oldJob = context.offscreen('run');
  while (!finishJob) await new Promise(resolve => setImmediate(resolve));
  await Promise.all([context.resetOcr(), context.resetOcr()]);
  assert.equal(closes, 1);
  assert.equal(saved.rc_ocr_status.pending, 0);
  assert.equal(saved.chatKit.ocrEng, true);
  finishJob({result: {text: 'stale'}});
  await assert.rejects(oldJob, /OCR/);
  await context.resetOcr(); // Reset with no document is also valid.
  assert.equal(closes, 1);
  finishJob = null;
  const freshJob = context.offscreen('run');
  while (!finishJob) await new Promise(resolve => setImmediate(resolve));
  finishJob({result: {text: 'fresh'}});
  assert.equal((await freshJob).text, 'fresh');
  assert.equal(creates, 1);
  console.log('PASS: immediate reset, duplicate reset, stale result rejection, settings retained, fresh OCR session.');
})().catch(error => { console.error(error); process.exitCode = 1; });
