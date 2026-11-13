// EduNext owns the original image nodes; retain them for React reconciliation.
(() => {
  const icons = {
    'Account avatar': ['user', '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'],
    'Home': ['house', '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'],
    'Assignments': ['file-text', '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>'],
    'Upcoming slots': ['calendar-clock', '<path d="M16 14v2.2l1.6 1"/><path d="M16 2v3"/><path d="M21 7.338V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2.338"/><path d="M3 9h5.859"/><path d="M8 2v3"/><circle cx="16" cy="16" r="6"/>'],
    'User guide': ['book-open-text', '<path d="M12 5v16"/><path d="M16 13h2"/><path d="M16 9h2"/><path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"/><path d="M6 13h2"/><path d="M6 9h2"/>'],
    'Contact Support': ['headset', '<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/>'],
    'Frequently Asked Questions': ['circle-question-mark', '<circle cx="12" cy="12" r="10"/><path d="M9 9.5a3 2.5 0 016 0c0 2-2 2-3 3.5"/><path d="M12 17h.01"/>'],
  };
  const aliases = {Account: 'Account avatar', Support: 'Contact Support', FAQ: 'Frequently Asked Questions'};
  const owned = new WeakMap();
  const offsets = new WeakMap();
  const observed = new WeakSet();
  function centerIcons() {
    document.querySelectorAll('.left-navigation').forEach(nav => {
      const bounds = nav.getBoundingClientRect();
      if (!bounds.width) return;
      const center = bounds.left + bounds.width / 2;
      nav.querySelectorAll('.rc-nav-svg').forEach(svg => {
        const rect = svg.getBoundingClientRect();
        if (!rect.width) return;
        const offset = (offsets.get(svg) || 0) + center - rect.left - rect.width / 2;
        offsets.set(svg, offset);
        const verticalOffset = svg.classList.contains('lucide-user') ? 8 : 0;
        svg.style.setProperty('translate', `${offset}px ${verticalOffset}px`, 'important');
      });
    });
  }
  const layoutObserver = new ResizeObserver(centerIcons);
  // Account lives in a menu label, unlike the other items' centered icon slots.
  // Preserve its original 32px avatar footprint and center that label even after
  // the site's menu stylesheet finishes loading.
  const accountSheet = new CSSStyleSheet();
  accountSheet.replaceSync(`
    .left-navigation .ps-menu-button:has(.ps-menu-icon .rc-nav-svg) > .ps-menu-label {
      display:none !important;
    }
    .left-navigation .ps-menu-button:has(.rc-nav-svg) {
      padding-inline:0 !important; justify-content:center !important;
      align-items:center !important;
    }
    .left-navigation .ps-menu-icon:has(.rc-nav-svg) {
      margin-inline:0 !important; display:flex !important;
      justify-content:center !important; align-items:center !important;
      flex-shrink:0 !important;
    }
    .left-navigation .ps-menu-label:has(img:is([alt="Account avatar"], [alt="Account"])) {
      flex:1 1 auto !important; width:100% !important; text-align:center !important;
    }
    .left-navigation [role="button"]:has(> img:is([alt="Account avatar"], [alt="Account"])) {
      width:100% !important; text-align:center !important;
      display:flex !important; flex-direction:column !important; align-items:center !important;
    }
    .left-navigation .rc-nav-svg.lucide-user {
      display:block !important; box-sizing:content-box !important;
      width:24px !important; height:24px !important; padding:4px !important;
      margin:0 !important; vertical-align:middle !important;
    }
  `);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, accountSheet];
  function scan() {
    document.querySelectorAll('.left-navigation, .left-navigation .ps-menu-button').forEach(el => {
      if (!observed.has(el)) { observed.add(el); layoutObserver.observe(el); }
    });
    document.querySelectorAll('.left-navigation img[alt]').forEach(img => {
      const label = img.getAttribute('alt');
      const key = aliases[label] || label;
      const icon = Object.hasOwn(icons, key) && icons[key];
      const previous = owned.get(img);
      if (!icon) {
        if (previous) { previous.svg.remove(); img.style.display = previous.display; owned.delete(img); }
        return;
      }
      if (previous?.key === key && img.nextElementSibling === previous.svg) return;
      previous?.svg.remove();
      const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${icon[0]} preview-icon rc-nav-svg">${icon[1]}</svg>`;
      const svg = document.importNode(new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement, true);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', label);
      svg.setAttribute('focusable', 'false');
      svg.style.cssText = 'width:24px;height:24px;flex-shrink:0;vertical-align:middle;pointer-events:none';
      owned.set(img, {key, svg, display: previous?.display ?? img.style.display});
      img.after(svg);
      img.style.display = 'none';
    });
    centerIcons();
  }
  function start() {
    scan();
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; scan(); });
    }).observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['alt', 'class']});
    window.addEventListener('resize', centerIcons);
    document.fonts?.ready.then(centerIcons);
  }
  document.body ? start() : document.addEventListener('DOMContentLoaded', start, {once:true});
})();
