const assert = require('node:assert/strict');
const path = require('node:path');
const {launchExtension, TRANSFER} = require('./lib/browser.cjs');

const fixture = `<!doctype html>
<html><body>
  <div class="chat-window">
    <div class="chat-messages">
      <div class="message-container message-assistant">
        <div class="exercise-question-block">
          <div>Câu hỏi:</div>
          <p>Giải phương trình <span class="katex"><annotation encoding="application/x-tex">x^2 = 1</annotation><span class="katex-html" aria-hidden="true">x² = 1</span></span></p>
          <p>A. x = 1</p>
          <p>B. x = -1</p>
          <style>.not-question { display: none }</style>
        </div>
      </div>
    </div>
    <div class="w-chat-input">
      <textarea></textarea>
      <button class="hint" type="button">Gợi ý</button>
      <button data-intent="SUBMIT_ANSWER" type="button" disabled>Nộp</button>
    </div>
  </div>
</body></html>`;

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, label, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await pause(25);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function main() {
  const context = await launchExtension('auto-answer');
  try {
    await context.route('https://fsc-edunext.fpt.edu.vn/**', route => route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: fixture,
    }));
    // Install the backend double before navigation. Automatic answering starts
    // on mount, so a late mock would allow the real provider path to run.
    let worker = context.serviceWorkers()[0];
    if (!worker) worker = await context.waitForEvent('serviceworker');
    await worker.evaluate(() => {
      globalThis.__rcAnswerTest = {
        mode: 'answer',
        calls: [],
        resolve: null,
        error: 'Mock provider failed',
      };
      // The extension service worker owns the real API call. Replace only its
      // helper so this browser test can never make a provider request.
      globalThis.RCLLM = Object.freeze({
        handle: async message => {
          if (message?.op !== 'llm-answer') throw new Error('Unexpected operation');
          const state = globalThis.__rcAnswerTest;
          state.calls.push(message.question);
          if (state.mode === 'error') throw new Error(state.error);
          if (state.mode === 'pending') {
            return new Promise(resolve => { state.resolve = resolve; });
          }
          return {answer: 'mocked answer'};
        },
      });
    });

    const page = await context.newPage();
    // Bind the fixture before the extension's document-idle content script can
    // observe a stable question and submit the initial automatic answer.
    await page.addInitScript(() => {
      window.__rcFixture = {submits: 0, submittedValues: [], hints: 0};
      const install = () => {
        const editor = document.querySelector('.w-chat-input textarea');
        const submit = document.querySelector('button[data-intent="SUBMIT_ANSWER"]');
        const hint = document.querySelector('.hint');
        if (!editor || !submit || !hint || editor.dataset.rcTestBound) return;
        editor.dataset.rcTestBound = 'true';
        editor.addEventListener('input', () => {
          submit.disabled = !editor.value.trim();
        });
        submit.addEventListener('click', () => {
          if (submit.disabled) return;
          window.__rcFixture.submits += 1;
          window.__rcFixture.submittedValues.push(editor.value);
          // This models the chat app accepting the answer and clearing its
          // controlled input after one explicit submit.
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
          setter.call(editor, '');
          editor.dispatchEvent(new Event('input', {bubbles: true}));
        });
        hint.addEventListener('click', () => { window.__rcFixture.hints += 1; });
      };
      new MutationObserver(install).observe(document, {childList: true, subtree: true});
      install();
    });
    await page.goto('https://fsc-edunext.fpt.edu.vn/rc-auto-answer');

    const host = page.locator('.rc-answer-host');
    await host.waitFor({state: 'attached'});
    // The answer controls live in the singleton AI panel, which is exposed
    // beside the main console only while that console is open.
    await page.locator('#rc-kit #gear').waitFor({state: 'visible'});
    await page.locator('#rc-kit #gear').click();
    await page.locator('#rc-kit #panel').waitFor({state: 'visible'});
    const toggle = host.locator('#ai-toggle');
    await toggle.waitFor({state: 'visible'});
    assert.equal(await host.locator('#ai-panel').isHidden(), true, 'AI panel should start closed');
    await toggle.click();
    await host.locator('#ai-panel').waitFor({state: 'visible'});
    const answer = host.locator('#answer');
    const auto = host.locator('#auto');
    const settings = host.locator('#settings');
    const stop = host.locator('#stop');
    const status = host.locator('.status');
    const editor = page.locator('.w-chat-input textarea');
    const submit = page.locator('button[data-intent="SUBMIT_ANSWER"]');
    const hint = page.locator('.hint');
    assert.equal(await answer.count(), 1);
    assert.equal(await auto.count(), 1);
    assert.equal(await settings.count(), 1);
    assert.equal(await status.count(), 1);
    assert.equal(await stop.isHidden(), true);
    assert.equal(await submit.isDisabled(), true);
    assert.equal(await hint.isEnabled(), true);
    assert.equal(await auto.getAttribute('aria-pressed'), 'true', 'automatic answering should start enabled');

    const calls = () => worker.evaluate(() => __rcAnswerTest.calls.slice());
    const setMode = mode => worker.evaluate(value => {
      __rcAnswerTest.mode = value;
      __rcAnswerTest.resolve = null;
    }, mode);
    const resolvePending = () => worker.evaluate(() => {
      if (__rcAnswerTest.resolve) __rcAnswerTest.resolve({answer: 'late mocked answer'});
      __rcAnswerTest.resolve = null;
    });
    const setQuestion = text => page.evaluate(question => {
      const box = document.querySelector('.exercise-question-block');
      box.innerHTML = `<div>Câu hỏi:</div><p>${question}</p>`;
    }, text);
    const appendBotMessage = ({text = '', media = false} = {}) => page.evaluate(({text, media}) => {
      const message = document.createElement('div');
      message.className = 'message-container message-assistant';
      if (media) {
        const image = document.createElement('img');
        image.alt = 'chat media';
        image.width = 32;
        image.height = 32;
        message.append(image);
      } else {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        message.append(paragraph);
      }
      document.querySelector('.chat-messages').append(message);
    }, {text, media});
    const appendUserMessage = text => page.evaluate(messageText => {
      const message = document.createElement('div');
      message.className = 'message-container message-user';
      const paragraph = document.createElement('p');
      paragraph.textContent = messageText;
      message.append(paragraph);
      document.querySelector('.chat-messages').append(message);
    }, text);
    const submittedValues = () => page.evaluate(() => __rcFixture.submittedValues.slice());

    // Automatic mode owns the initial request. No answer-button click is used.
    await waitFor(async () => (await calls()).length === 1, 'automatic initial backend request');
    await waitFor(async () => (await page.evaluate(() => __rcFixture.submits)) === 1, 'automatic initial submit');
    const firstQuestion = (await calls())[0];
    assert.equal(firstQuestion, 'Giải phương trình $x^2 = 1$ \n\n A. x = 1\n\n B. x = -1');
    assert.equal(firstQuestion.includes('Câu hỏi'), false);
    assert.equal(firstQuestion.includes('not-question'), false);
    assert.equal(firstQuestion.includes('x²'), false);
    assert.equal(await page.evaluate(() => __rcFixture.hints), 0, 'active hint must not be clicked');
    assert.equal(await editor.inputValue(), '');
    assert.equal(await submit.isDisabled(), true);

    // Polling must not re-submit an already claimed question.
    await pause(1600);
    assert.equal((await calls()).length, 1, 'automatic mode must deduplicate the initial question');
    assert.equal(await page.evaluate(() => __rcFixture.submits), 1);

    // A changed question is sent automatically after its text remains stable;
    // the request must not happen on the first poll.
    await setQuestion('Automatic new question');
    await pause(700);
    assert.equal((await calls()).length, 1, 'question must be stable before automatic submission');
    await waitFor(async () => (await calls()).length === 2, 'automatic new-question backend request');
    await waitFor(async () => (await page.evaluate(() => __rcFixture.submits)) === 2, 'automatic new-question submit');
    await setQuestion('Automatic new question');
    await pause(1600);
    assert.equal((await calls()).length, 2, 'automatic mode must deduplicate a repeated question');

    // Automatic failures are attempted once and are not retried by polling.
    await setQuestion('Automatic question with provider failure');
    await setMode('error');
    await waitFor(async () => (await calls()).length === 3, 'automatic error backend request');
    await waitFor(async () => (await status.getAttribute('data-state')) === 'error', 'automatic error status');
    await pause(1600);
    assert.equal((await calls()).length, 3, 'automatic errors must not retry while enabled');
    assert.match(await status.textContent(), /Mock provider failed/);
    assert.equal(await page.evaluate(() => __rcFixture.submits), 2, 'automatic failure must not submit');

    // Pausing prevents the polling loop; resuming permits the failed key to be
    // attempted again, while successful keys remain deduplicated.
    await auto.click();
    assert.equal(await auto.getAttribute('aria-pressed'), 'false');
    await pause(1600);
    assert.equal((await calls()).length, 3, 'paused automatic mode must not request');
    await setMode('answer');
    await auto.click();
    assert.equal(await auto.getAttribute('aria-pressed'), 'true');
    await waitFor(async () => (await calls()).length === 4, 'resumed automatic retry');
    await waitFor(async () => (await page.evaluate(() => __rcFixture.submits)) === 3, 'resumed automatic submit');

    // Stop cancels an automatic request and pauses future polling as well.
    await setQuestion('Automatic question to stop');
    await setMode('pending');
    await waitFor(async () => (await calls()).length === 5, 'automatic cancel backend request');
    await stop.click();
    assert.equal(await auto.getAttribute('aria-pressed'), 'false', 'stop must pause automatic mode');
    await resolvePending();
    await waitFor(async () => !(await answer.isDisabled()), 'automatic cancel cleanup');
    assert.equal(await status.getAttribute('data-state'), 'notice');
    assert.equal(await page.evaluate(() => __rcFixture.submits), 3, 'cancelled automatic result must not submit');

    // The remaining checks exercise the explicit action with automation off.
    // This keeps the race and draft assertions focused on their manual guards.
    await page.screenshot({path: path.join(TRANSFER, 'auto-answer-fixture.png'), fullPage: true, animations: 'disabled'});

    // Page-generated clicks must not spend the user's API balance.
    await answer.evaluate(button => button.click());
    await pause(100);
    assert.equal((await calls()).length, 5);

    // An existing draft is left alone and blocks an explicit request.
    await setQuestion('A fresh question with a draft');
    await editor.fill('keep this draft');
    await answer.click();
    await pause(150);
    assert.equal((await calls()).length, 5, 'non-empty draft must block request');
    assert.equal(await editor.inputValue(), 'keep this draft');
    await editor.fill('');

    // If the question changes while the provider is pending, its result must
    // not be placed in (or submitted from) the newer question.
    await setQuestion('Question before provider delay');
    await setMode('pending');
    await answer.click();
    await waitFor(async () => (await calls()).length === 6, 'delayed backend request');
    assert.equal(await status.getAttribute('data-state'), 'working');
    assert.equal(await answer.getAttribute('aria-busy'), 'true');
    await setQuestion('Question after provider delay');
    await resolvePending();
    await waitFor(async () => !(await answer.isDisabled()), 'stale answer cleanup');
    assert.equal(await page.evaluate(() => __rcFixture.submits), 3, 'stale result must not submit');
    assert.equal(await editor.inputValue(), '');

    // Stopping a pending request prevents both filling and submitting it.
    await setQuestion('Question to cancel');
    await setMode('pending');
    await answer.click();
    await waitFor(async () => (await calls()).length === 7, 'cancel backend request');
    await stop.click();
    assert.equal(await auto.getAttribute('aria-pressed'), 'false', 'stop must pause automatic mode');
    await resolvePending();
    await waitFor(async () => !(await answer.isDisabled()), 'cancel cleanup');
    assert.equal(await status.getAttribute('data-state'), 'notice');
    assert.equal(await page.evaluate(() => __rcFixture.submits), 3, 'cancelled result must not submit');
    assert.equal(await editor.inputValue(), '');

    await setQuestion('Question while user starts typing');
    await setMode('pending');
    await answer.click();
    await waitFor(async () => (await calls()).length === 8, 'draft-race backend request');
    await editor.fill('new draft typed while waiting');
    await resolvePending();
    await waitFor(async () => !(await answer.isDisabled()), 'draft-race cleanup');
    assert.equal(await page.evaluate(() => __rcFixture.submits), 3);
    assert.equal(await editor.inputValue(), 'new draft typed while waiting');
    await editor.fill('');

    // Provider failures are shown in the status region and do not touch the
    // editor or the underlying submit button.
    await setQuestion('Question with provider failure');
    await setMode('error');
    await answer.click();
    await waitFor(async () => (await calls()).length === 9, 'error backend request');
    await waitFor(async () => !(await answer.isDisabled()), 'error cleanup');
    assert.equal(await status.getAttribute('data-state'), 'error');
    assert.match(await status.textContent(), /Mock provider failed/);
    assert.equal(await page.evaluate(() => __rcFixture.submits), 3, 'provider failure must not submit');
    assert.equal(await editor.inputValue(), '');

    // A repeated question with new hints is a new answer context.
    await setMode('answer');
    await setQuestion('Retry with hints');
    await answer.click();
    await waitFor(async () => (await page.evaluate(() => __rcFixture.submits)) === 4, 'answer before hint');
    await page.evaluate(() => {
      const message = document.querySelector('.message-assistant');
      const hint = document.createElement('p');
      hint.id = 'retry-hint';
      hint.textContent = 'Gợi ý 1: Xét cả nghiệm âm. Gợi ý 2: Kiểm tra lại kết quả.';
      message.append(hint);
    });
    await auto.click();
    await waitFor(async () => (await calls()).length === 11, 'automatic retry with hints');
    assert.match((await calls()).at(-1), /Gợi ý 1: Xét cả nghiệm âm/);
    assert.match((await calls()).at(-1), /Gợi ý 2: Kiểm tra lại kết quả/);
    await waitFor(async () => (await page.evaluate(() => __rcFixture.submits)) === 5, 'hint retry submit');
    await pause(1800);
    assert.equal((await calls()).length, 11, 'unchanged hints must not trigger duplicate requests');
    await auto.click();
    await setMode('pending');
    await page.locator('#retry-hint').evaluate(el => { el.textContent = 'Hint: Try factoring.'; });
    await answer.click();
    await waitFor(async () => (await calls()).length === 12, 'pending hint request');
    await page.locator('#retry-hint').evaluate(el => { el.textContent = 'Hint: Check both factors.'; });
    await resolvePending();
    await waitFor(async () => !(await answer.isDisabled()), 'changed hint cleanup');
    assert.equal(await page.evaluate(() => __rcFixture.submits), 5, 'changed hints invalidate pending answers');
    assert.equal(await editor.inputValue(), '');

    // Automatic mode can acknowledge a latest bot message that has no
    // exercise-question block. The literal acknowledgement uses the existing
    // submit flow and must not call the LLM provider.
    await setMode('answer');
    assert.equal(await auto.getAttribute('aria-pressed'), 'false');
    const beforeOkCalls = (await calls()).length;
    const beforeOkSubmits = await page.evaluate(() => __rcFixture.submits);
    await appendBotMessage({text: 'Thanks for the explanation.'});
    await auto.click();
    assert.equal(await auto.getAttribute('aria-pressed'), 'true');
    await waitFor(async () => (await page.evaluate(() => __rcFixture.submits)) === beforeOkSubmits + 1, 'automatic OK submit');
    assert.equal((await calls()).length, beforeOkCalls, 'automatic OK must not call the LLM');
    assert.equal((await submittedValues()).at(-1), 'ok');
    await pause(1600);
    assert.equal(await page.evaluate(() => __rcFixture.submits), beforeOkSubmits + 1, 'one bot message must receive one OK');

    // A separate message element with identical text is still a new message
    // and must receive its own acknowledgement.
    await appendBotMessage({text: 'Thanks for the explanation.'});
    await waitFor(async () => (await page.evaluate(() => __rcFixture.submits)) === beforeOkSubmits + 2, 'same-text new-message OK submit');
    assert.equal((await calls()).length, beforeOkCalls, 'same-text OK must not call the LLM');
    assert.equal((await submittedValues()).at(-1), 'ok');
    await pause(1600);
    assert.equal(await page.evaluate(() => __rcFixture.submits), beforeOkSubmits + 2, 'same-text message must not repeat OK');

    // A newer user message supersedes a bot statement before it becomes a
    // stable automatic-answer candidate.
    await appendBotMessage({text: 'This bot statement is immediately followed by the user.'});
    await appendUserMessage('User replied before the acknowledgement timer.');
    await pause(1800);
    assert.equal(await page.evaluate(() => __rcFixture.submits), beforeOkSubmits + 2, 'a newer user message must block automatic OK');
    assert.equal((await calls()).length, beforeOkCalls, 'a newer user message must not call the LLM');

    // Never overwrite a draft while automatic mode is enabled.
    await editor.fill('keep this draft while acknowledging');
    await appendBotMessage({text: 'This message must respect the draft.'});
    await pause(1800);
    assert.equal(await page.evaluate(() => __rcFixture.submits), beforeOkSubmits + 2, 'automatic OK must respect an existing draft');
    assert.equal((await calls()).length, beforeOkCalls, 'draft guard must not call the LLM');
    assert.equal(await editor.inputValue(), 'keep this draft while acknowledging');
    await editor.fill('');

    // Plain text that looks like a question, and media-only messages, are not
    // eligible for the literal acknowledgement.
    const beforeSkippedSubmits = await page.evaluate(() => __rcFixture.submits);
    await appendBotMessage({text: 'Could you explain this?'});
    await pause(1800);
    assert.equal(await page.evaluate(() => __rcFixture.submits), beforeSkippedSubmits, 'question-mark text must be skipped');
    assert.equal((await calls()).length, beforeOkCalls, 'question-mark text must not call the LLM');
    await appendBotMessage({media: true});
    await pause(1800);
    assert.equal(await page.evaluate(() => __rcFixture.submits), beforeSkippedSubmits, 'media-only messages must be skipped');
    assert.equal((await calls()).length, beforeOkCalls, 'media-only messages must not call the LLM');

    // Turning automation off prevents acknowledgement of later plain messages.
    await auto.click();
    assert.equal(await auto.getAttribute('aria-pressed'), 'false');
    await appendBotMessage({text: 'Automation is disabled for this message.'});
    await pause(1800);
    assert.equal(await page.evaluate(() => __rcFixture.submits), beforeSkippedSubmits, 'disabled automation must skip automatic OK');
    assert.equal((await calls()).length, beforeOkCalls, 'disabled automation must not call the LLM');
    assert.equal(await editor.inputValue(), '');

    // If the bot replaces a plain-text message with a question while the
    // automatic acknowledgement is being injected, never submit the stale
    // literal "ok" or leave it in the composer. The replacement question must
    // still be picked up by the next polling cycle.
    const beforeRaceCalls = (await calls()).length;
    const beforeRaceSubmits = await page.evaluate(() => __rcFixture.submits);
    await page.evaluate(() => {
      const message = document.createElement('div');
      message.className = 'message-container message-assistant';
      message.innerHTML = '<p>Preparing the next exercise.</p>';
      const editor = document.querySelector('.w-chat-input textarea');
      editor.addEventListener('input', () => {
        if (editor.value !== 'ok' || message.dataset.raced) return;
        message.dataset.raced = 'true';
        message.innerHTML = '<div class="exercise-question-block"><div>Câu hỏi:</div><p>Question created during acknowledgement</p></div>';
      });
      document.querySelector('.chat-messages').append(message);
    });
    await auto.click();
    assert.equal(await auto.getAttribute('aria-pressed'), 'true');
    await waitFor(async () => (await page.evaluate(() => __rcFixture.submits)) === beforeRaceSubmits + 1, 'replacement question submit', 7000);
    assert.equal((await calls()).length, beforeRaceCalls + 1, 'question created during acknowledgement must be answered');
    assert.equal(await page.evaluate(() => __rcFixture.submits), beforeRaceSubmits + 1, 'replacement question must submit exactly once');
    assert.equal((await submittedValues()).at(-1), 'mocked answer', 'stale OK must never be submitted');
    assert.equal(await editor.inputValue(), '', 'composer must be clear after the replacement answer');

    // Replacement text during the acknowledgement window must survive the
    // automatic task and must not be submitted or overwritten.
    const beforeDraftRaceSubmits = await page.evaluate(() => __rcFixture.submits);
    await auto.click();
    assert.equal(await auto.getAttribute('aria-pressed'), 'false');
    await page.evaluate(() => {
      const message = document.createElement('div');
      message.className = 'message-container message-assistant';
      message.innerHTML = '<p>Another plain bot statement.</p>';
      const editor = document.querySelector('.w-chat-input textarea');
      editor.addEventListener('input', () => {
        if (editor.value !== 'ok' || message.dataset.edited) return;
        message.dataset.edited = 'true';
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        setter.call(editor, 'user replacement');
        editor.dispatchEvent(new Event('input', {bubbles: true}));
      });
      document.querySelector('.chat-messages').append(message);
    });
    await auto.click();
    await pause(2200);
    assert.equal(await page.evaluate(() => __rcFixture.submits), beforeDraftRaceSubmits, 'user replacement must not be submitted');
    assert.equal(await editor.inputValue(), 'user replacement', 'user replacement must be preserved');
    await auto.click();
    assert.equal(await auto.getAttribute('aria-pressed'), 'false');
    await editor.fill('');

    // A manual click with a draft must not claim the question as attempted.
    // After the draft is cleared, automatic mode should still answer it.
    const beforeManualCalls = (await calls()).length;
    const beforeManualSubmits = await page.evaluate(() => __rcFixture.submits);
    await page.evaluate(() => {
      const message = document.createElement('div');
      message.className = 'message-container message-assistant';
      message.innerHTML = '<div class="exercise-question-block"><div>Câu hỏi:</div><p>Question after blocked manual click</p></div>';
      document.querySelector('.chat-messages').append(message);
    });
    await editor.fill('manual draft');
    await auto.click();
    assert.equal(await auto.getAttribute('aria-pressed'), 'true');
    await answer.click();
    await pause(200);
    assert.equal((await calls()).length, beforeManualCalls, 'manual draft must block the provider');
    assert.equal(await editor.inputValue(), 'manual draft', 'manual draft must remain untouched');
    await editor.fill('');
    await waitFor(async () => (await calls()).length === beforeManualCalls + 1, 'question after blocked manual click backend request');
    await waitFor(async () => (await page.evaluate(() => __rcFixture.submits)) === beforeManualSubmits + 1, 'question after blocked manual click submit');
    assert.equal((await submittedValues()).at(-1), 'mocked answer');
    assert.equal(await editor.inputValue(), '');
    await auto.click();
    assert.equal(await auto.getAttribute('aria-pressed'), 'false');

    console.log('PASS: automatic answers, multiple retry hints, hint deduplication, stale hints, drafts, cancellation and provider failures.');
  } finally {
    await context.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
