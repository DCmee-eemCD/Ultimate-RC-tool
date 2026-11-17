// Fe logo launcher button and emoji-free static button labels.
export async function launcher(p, {readBase64}) {
  const icon = await readBase64('extension/icons/icon-48.png');
  p.regex(/(<button[^>]*id="gear"[^>]*>)[^<]*(<\/button>)/, (_, open, close) =>
    open + '<img alt="Ultimate RC" width="28" height="28" style="display:block;object-fit:contain;pointer-events:none" src="data:image/png;base64,' + icon + '">' + close);
  p.once('.gear{width:40px;height:40px;border-radius:50%;background:#0f172a;font-size:18px}',
    '.gear{width:40px;height:40px;padding:0;display:grid;place-items:center;border-radius:0;background:transparent;box-shadow:none;font-size:18px}.gear img{width:40px;height:40px;filter:drop-shadow(0 0 3px rgba(0,0,0,.65))}.gear:focus-visible{outline:2px solid var(--acc,#60a5fa);outline-offset:3px}');
}

// Strip decorative emoji from plain button labels; SVG controls are untouched.
const EMOJI = new RegExp('[\\p{Extended_Pictographic}\\uFE0F\\u200D]', 'gu');
export function plainButtonLabels(p) {
  p.regex(/(<button\b[^>]*>)([^<>]*)(<\/button>)/gu, (_, open, label, close) =>
    open + label.replace(EMOJI, '').trim() + close);
}
