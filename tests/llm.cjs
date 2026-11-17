const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'extension', 'llm.js'), 'utf8');
const extensionId = 'test-extension-id';
const settingsUrl = `chrome-extension://${extensionId}/llm-settings.html`;
const pageUrl = 'https://fsc-edunext.fpt.edu.vn/course/one';
const store = Object.create(null);
let fetchImpl;
const requests = [];

const context = {
  chrome: {
    runtime: {
      id: extensionId,
      getURL: path => `chrome-extension://${extensionId}/${path}`,
    },
    storage: {
      local: {
        get: async key => ({ [key]: store[key] }),
        set: async values => Object.assign(store, values),
      },
    },
  },
  fetch: (...args) => {
    requests.push(args);
    return fetchImpl(...args);
  },
  URL,
  URLSearchParams,
  AbortController,
  AbortSignal,
  TextEncoder,
  TextDecoder,
  Uint8Array,
  Response,
  Headers,
  setTimeout,
  clearTimeout,
  console,
};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '..', 'extension', 'llm-endpoint.js'), 'utf8'), context);
vm.runInNewContext(source, context, { filename: 'extension/llm.js' });

const settingsSender = { id: extensionId, url: settingsUrl, frameId: 0 };
const pageSender = { id: extensionId, url: pageUrl, frameId: 0 };
const childSender = { id: extensionId, url: pageUrl, frameId: 1 };

const jsonResponse = (value, init = {}) => new Response(JSON.stringify(value), {
  status: 200,
  headers: { 'content-type': 'application/json' },
  ...init,
});
const plain = value => JSON.parse(JSON.stringify(value));

async function main() {
  const llm = context.RCLLM;
  assert.equal(typeof llm?.handle, 'function');

  store.rcLlmConfig = {
    endpoint: 'https://api.example.test/v1',
    model: 'model-a',
    key: 'secret-original',
  };
  const got = await llm.handle({ op: 'llm-config-get' }, settingsSender);
  assert.deepEqual(plain(got), {
    endpoint: 'https://api.example.test/v1',
    model: 'model-a',
    hasKey: true,
  });
  assert.equal(JSON.stringify(got).includes('secret-original'), false);
  await assert.rejects(() => llm.handle({ op: 'llm-config-get' }, pageSender), /Untrusted sender/);
  console.log('PASS config-get is secret-free and settings-only');

  const kept = await llm.handle({
    op: 'llm-config-save', endpoint: 'https://api.example.test/v1', model: 'model-b', key: '',
  }, settingsSender);
  assert.deepEqual(plain(kept), { endpoint: 'https://api.example.test/v1', model: 'model-b', hasKey: true });
  assert.equal(store.rcLlmConfig.key, 'secret-original');
  await assert.rejects(() => llm.handle({
    op: 'llm-config-save', endpoint: 'https://other.example.test/v1', model: 'model-b', key: '',
  }, settingsSender), /New API key required/);
  const saved = await llm.handle({
    op: 'llm-config-save', endpoint: 'https://other.example.test/v1', model: 'model-b', key: 'secret-new',
  }, settingsSender);
  assert.deepEqual(plain(saved), { endpoint: 'https://other.example.test/v1', model: 'model-b', hasKey: true });
  assert.equal(store.rcLlmConfig.key, 'secret-new');
  const cleared = await llm.handle({
    op: 'llm-config-save', endpoint: 'https://other.example.test/v1', model: 'model-b', clearKey: true,
  }, settingsSender);
  assert.deepEqual(plain(cleared), { endpoint: 'https://other.example.test/v1', model: 'model-b', hasKey: false });
  assert.equal(Object.hasOwn(store.rcLlmConfig, 'key'), false);
  console.log('PASS config-save keeps, replaces, and explicitly clears keys');

  const groq = await llm.handle({op:'llm-config-save',endpoint:' api.groq.com ',model:'fixture-model',key:'fixture-groq-key'}, settingsSender);
  assert.equal(groq.endpoint, 'api.groq.com');
  const sameGroq = await llm.handle({op:'llm-config-save',endpoint:'https://API.GROQ.COM/',model:'fixture-model',key:''}, settingsSender);
  assert.equal(sameGroq.endpoint, 'https://API.GROQ.COM/');
  assert.equal(sameGroq.hasKey, true);
  assert.equal(store.rcLlmConfig.key, 'fixture-groq-key');
  await assert.rejects(() => llm.handle({op:'llm-config-save',endpoint:'other.example.test/v1',model:'fixture-model',key:''}, settingsSender), /New API key required/);
  fetchImpl = async url => {
    assert.equal(url, 'https://api.groq.com/chat/completions');
    return jsonResponse({choices:[{message:{content:'fixture answer'}}]});
  };
  await llm.handle({op:'llm-answer',question:'fixture'},pageSender);
  for (const endpoint of ['ftp://api.groq.com','javascript:alert(1)','api.groq.com?key=secret','user:pass@api.groq.com','api.groq.com\\@evil.test','not a host']) {
    await assert.rejects(() => llm.handle({op:'llm-config-save',endpoint,model:'fixture-model',key:'fixture'},settingsSender), /Invalid LLM endpoint/);
  }
  console.log('PASS shorthand endpoints normalize safely and retain same-provider keys');
  for (const [input, expected] of [
    ['custom.example/v2', 'https://custom.example/v2'],
    ['custom.example/v1/chat/completions', 'https://custom.example/v1/chat/completions'],
    ['localhost:8765/v1', 'http://localhost:8765/v1'],
    ['https://localhost:8765/v1', 'https://localhost:8765/v1'],
    ['//api.groq.com', 'https://api.groq.com'],
    ['api.groq.com/custom', 'https://api.groq.com/custom'],
    ['api.groq.com.example.test', 'https://api.groq.com.example.test'],
  ]) assert.equal(context.RCEndpoint.normalize(input), expected);

  // A blank endpoint resolves to a visible default, never a guessed key provider.
  const defaulted = await llm.handle({
    op: 'llm-config-save', endpoint: '  ', model: 'model-b', key: 'fixture-default-key',
  }, settingsSender);
  assert.equal(defaulted.endpoint, '');
  await assert.rejects(() => llm.handle({op:'llm-answer',question:'fixture'}, pageSender), /LLM is not configured/);
  await assert.rejects(() => llm.handle({
    op: 'llm-config-save', endpoint: 42, model: 'model-b', key: '',
  }, settingsSender), /Invalid LLM configuration/);
  store.rcLlmConfig = {endpoint:'https://other.example.test/v1',model:'model-b',key:'fixture-custom-key'};
  await llm.handle({op:'llm-config-save',endpoint:'',model:'model-b',key:''}, settingsSender);
  assert.equal(store.rcLlmConfig.endpoint, '');
  await assert.rejects(() => llm.handle({op:'llm-config-save',endpoint:'other.example/v1',model:'model-b',key:''}, settingsSender), /New API key required/);
  console.log('PASS blank endpoints remain blank and cannot send requests');

  store.rcLlmConfig = {
    endpoint: 'https://api.example.test/v1',
    model: 'model-a',
    key: 'secret-answer',
  };
  requests.length = 0;
  fetchImpl = async (url, options) => {
    assert.equal(options.method, 'POST');
    return jsonResponse({ choices: [{ message: { content: '  Đây là câu trả lời ngắn.  ' } }] });
  };
  const answer = await llm.handle({ op: 'llm-answer', question: 'Câu hỏi thử nghiệm?' }, pageSender);
  assert.equal(answer.answer, 'Đây là câu trả lời ngắn.');
  assert.equal(requests.length, 1);
  assert.equal(requests[0][0], 'https://api.example.test/v1/chat/completions');
  const requestOptions = requests[0][1];
  assert.equal(requestOptions.credentials, 'omit');
  assert.equal(requestOptions.redirect, 'error');
  assert.equal(requestOptions.headers.Authorization, 'Bearer secret-answer');
  const requestBody = JSON.parse(requestOptions.body);
  assert.equal(requestBody.model, 'model-a');
  assert.equal(requestBody.messages[0].role, 'system');
  assert.match(requestBody.messages[0].content, /tiếng Việt/);
  assert.equal(requestBody.messages[1].content, 'Câu hỏi thử nghiệm?');
  console.log('PASS answer uses the appended chat-completions URL and bearer auth');

  store.rcLlmConfig.endpoint = 'https://api.example.test/v1/chat/completions';
  fetchImpl = async url => {
    assert.equal(url, 'https://api.example.test/v1/chat/completions');
    return jsonResponse({ choices: [{ message: { content: 'ok' } }] });
  };
  assert.equal((await llm.handle({ op: 'llm-answer', question: 'x' }, pageSender)).answer, 'ok');
  store.rcLlmConfig.endpoint = 'http://localhost:8765/v1';
  fetchImpl = async url => {
    assert.equal(url, 'http://localhost:8765/v1/chat/completions');
    return jsonResponse({ choices: [{ message: { content: 'local ok' } }] });
  };
  assert.equal((await llm.handle({ op: 'llm-answer', question: 'x' }, pageSender)).answer, 'local ok');
  for (const endpoint of [
    'http://example.test/v1',
    'https://api.example.test/v1?leak=yes',
    'https://user:pass@api.example.test/v1',
    'https://api.example.test/v1#fragment',
  ]) {
    store.rcLlmConfig.endpoint = endpoint;
    await assert.rejects(() => llm.handle({ op: 'llm-answer', question: 'x' }, pageSender), /Invalid LLM endpoint/);
  }
  console.log('PASS endpoint policy allows localhost HTTP and rejects unsafe URLs');

  store.rcLlmConfig.endpoint = 'https://api.example.test/v1';
  let calls = 0;
  fetchImpl = async () => {
    calls += 1;
    return new Response('provider secret: do not expose', { status: 503 });
  };
  await assert.rejects(() => llm.handle({ op: 'llm-answer', question: 'x' }, pageSender), e => {
    assert.equal(e.message, 'LLM provider request failed (HTTP 503)');
    assert.equal(e.message.includes('provider secret'), false);
    return true;
  });
  assert.equal(calls, 1);
  fetchImpl = async () => jsonResponse({ choices: [{ message: { content: '   ' } }] });
  await assert.rejects(() => llm.handle({ op: 'llm-answer', question: 'x' }, pageSender), /empty answer/);
  fetchImpl = async () => jsonResponse({ choices: [{ message: { content: 'x'.repeat(4001) } }] });
  await assert.rejects(() => llm.handle({ op: 'llm-answer', question: 'x' }, pageSender), /answer was too long/);
  fetchImpl = async () => new Response('{bad json', { status: 200 });
  await assert.rejects(() => llm.handle({ op: 'llm-answer', question: 'x' }, pageSender), /provider request failed/);
  fetchImpl = async () => jsonResponse({choices: [{finish_reason: 'length', message: {content: 'An incomplete answer'}}]});
  await assert.rejects(() => llm.handle({op: 'llm-answer', question: 'x'}, pageSender), /cut off/);
  fetchImpl = async () => jsonResponse({choices: [{message: {content: 'No', refusal: 'Refused'}}]});
  await assert.rejects(() => llm.handle({op: 'llm-answer', question: 'x'}, pageSender), /declined/);
  await assert.rejects(() => llm.handle({ op: 'llm-answer', question: 'x'.repeat(24001) }, pageSender), /Invalid LLM question/);
  await assert.rejects(() => llm.handle({ op: 'llm-answer', question: 'x' }, childSender), /Untrusted sender/);
  console.log('PASS provider, empty-answer, size/input, and frame errors stay generic');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
