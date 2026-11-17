// React-safe SVG replacements for EduNext's left navigation (source/nav-icons.js).
export async function navIcons(p, {readText}) {
  p.before('    whenBody(initUI);', (await readText('source/nav-icons.js')) + '\n');
}
