// Guarded text patching for the userscript -> extension build.
// Every operation fails loudly when its anchor text is missing, so an upstream
// source change can never silently drop a transform. Replacements are always
// applied through a function, so `$&`, `$1`, etc. in inserted code stay literal.

const preview = text => JSON.stringify(String(text).slice(0, 80));

function occurrences(text, needle) {
  let count = 0;
  for (let i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + needle.length)) count++;
  return count;
}

const asReplacer = to => (typeof to === 'function' ? to : () => to);

/** Replace a substring that must occur exactly once. */
export function replaceOnce(text, from, to, scope = 'patch') {
  const count = occurrences(text, from);
  if (count !== 1) throw new Error(`${scope}: expected 1 match, found ${count}: ${preview(from)}`);
  return text.replace(from, asReplacer(to));
}

export class Patch {
  constructor(text, scope) {
    this.text = text;
    this.scope = scope;
  }

  fail(message, anchor) {
    throw new Error(`${this.scope}: ${message}: ${preview(anchor)}`);
  }

  /** Replace an anchor that must occur exactly once. `to` may be a string or fn(match). */
  once(from, to) {
    this.text = replaceOnce(this.text, from, to, this.scope);
    return this;
  }

  /** Insert code immediately after a unique anchor. */
  after(anchor, code) {
    return this.once(anchor, anchor + code);
  }

  /** Insert code immediately before a unique anchor. */
  before(anchor, code) {
    return this.once(anchor, code + anchor);
  }

  /** Replace every occurrence of a string; at least one must exist. */
  all(from, to) {
    if (!this.text.includes(from)) this.fail('no match', from);
    this.text = this.text.replaceAll(from, asReplacer(to));
    return this;
  }

  /** Apply a regular expression replacement; at least one match must exist. */
  regex(pattern, replacer) {
    const probe = new RegExp(pattern.source, pattern.flags.replace('g', ''));
    if (!probe.test(this.text)) this.fail('no regex match', pattern);
    this.text = this.text.replace(pattern, asReplacer(replacer));
    return this;
  }

  /**
   * Replace the region that starts at `start` (inclusive) and ends at `end`
   * (exclusive). `rewrite(region)` returns the new text. When `from` is given,
   * the search for `start` begins at that anchor.
   */
  between(start, end, rewrite, {from} = {}) {
    let offset = 0;
    if (from !== undefined) {
      offset = this.text.indexOf(from);
      if (offset < 0) this.fail('missing region anchor', from);
    }
    const a = this.text.indexOf(start, offset);
    if (a < 0) this.fail('missing region start', start);
    const b = this.text.indexOf(end, a);
    if (b < 0) this.fail('missing region end', end);
    this.text = this.text.slice(0, a) + rewrite(this.text.slice(a, b)) + this.text.slice(b);
    return this;
  }

  /** Assert that some text exists (used after regex-based insertions). */
  expect(text) {
    if (!this.text.includes(text)) this.fail('expected text missing', text);
    return this;
  }

  toString() {
    return this.text;
  }
}
