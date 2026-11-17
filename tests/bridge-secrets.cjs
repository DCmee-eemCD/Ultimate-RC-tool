const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'extension', 'bridge.js'), 'utf8');
const origin = 'https://fsc-edunext.fpt.edu.vn';
const posted = [];
const listeners = {};
let onChanged;
const stored = {
  rcLlmConfig: {endpoint: 'https://api.example.test/v1', key: 'KEY_SENTINEL'},
  chatKit: {theme: 'light'},
  chatKitBgVid: 'https://cdn.example.test/video.webm',
  rc_ocr_demo: 'visible',
  privateThing: 'must stay private',
};

const window = {
  addEventListener(type, handler) { listeners[type] = handler; },
  postMessage(message) { posted.push(message); },
};
const context = {
  window,
  location: {origin},
  chrome: {
    storage: {
      local: {
        get: async () => ({...stored}),
        set: async () => {},
        remove: async () => {},
      },
      onChanged: {addListener(handler) { onChanged = handler; }},
    },
    runtime: {
      sendMessage: async () => ({result: undefined}),
      connect: () => { throw new Error('fetch is outside this test'); },
    },
  },
  Promise,
  Object,
  Array,
  Blob,
  Uint8Array,
  atob: value => Buffer.from(value, 'base64').toString('binary'),
  navigator: {},
  document: {},
  console,
};

vm.runInNewContext(source, context, {filename: 'extension/bridge.js'});

async function main() {
  assert.equal(typeof listeners.message, 'function');
  assert.equal(typeof onChanged, 'function');

  await listeners.message({source: window, origin, data: {rcExtension: 'hello'}});
  const init = posted.at(-1);
  assert.equal(init.rcExtension, 'init');
  assert.deepEqual(init.values.chatKit, stored.chatKit);
  assert.equal(init.values.chatKitBgVid, stored.chatKitBgVid);
  assert.equal(init.values.rc_ocr_demo, stored.rc_ocr_demo);
  assert.equal(Object.hasOwn(init.values, 'rcLlmConfig'), false);
  assert.equal(JSON.stringify(init).includes('KEY_SENTINEL'), false);

  onChanged({
    rcLlmConfig: {newValue: {key: 'KEY_SENTINEL'}},
    chatKit: {newValue: {theme: 'dark'}},
    privateThing: {newValue: 'still private'},
  }, 'local');
  const changes = posted.at(-1);
  assert.equal(changes.rcExtension, 'changes');
  assert.deepEqual(changes.changes.chatKit, {newValue: {theme: 'dark'}});
  assert.equal(Object.hasOwn(changes.changes, 'rcLlmConfig'), false);
  assert.equal(JSON.stringify(changes).includes('KEY_SENTINEL'), false);
  assert.equal(Object.hasOwn(changes.changes, 'privateThing'), false);

  onChanged({chatKit: {newValue: {theme: 'sync should not leak'}}}, 'sync');
  assert.deepEqual(posted.at(-1), changes, 'only local storage changes are bridged');
  console.log('PASS: bridge init and local changes expose chat state without rcLlmConfig secrets.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
