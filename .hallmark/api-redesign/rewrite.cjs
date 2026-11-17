const fs=require('node:fs');
const css=`/* Hallmark · shape: app screen · genre: modern-minimal · theme: Console (3/3, adapted to saved palette) · redesign: full · nav: kept companion · signature: unified credential field · states: existing form states · v2.0.0 */
/* Hallmark · pre-emit critique: P4 H4 E4 S4 R4 V4 · weakest: density, removed repeated dividers and grouped key actions */
:root {
 color-scheme:dark;
 --llm-font: "Segoe UI", system-ui, sans-serif;
 --llm-bg: oklch(18% .008 250); --llm-fg: oklch(95% .005 250);
 --llm-muted: oklch(72% .01 250); --llm-surface: oklch(22% .009 250);
 --llm-accent: oklch(80% .11 250); --llm-danger: oklch(72% .16 25);
 --llm-clear: transparent; --llm-radius:6px;
}
html,body{overflow-x:clip}
html{scrollbar-width:none;overscroll-behavior:contain}
@supports selector(::-webkit-scrollbar){::-webkit-scrollbar{display:none}}
.w {
 --settings-bg:var(--bg,var(--llm-bg)); --settings-fg:var(--fg,var(--llm-fg));
 --settings-muted:var(--muted,var(--llm-muted)); --settings-surface:var(--surface,var(--llm-surface));
 --settings-accent:var(--acc,var(--llm-accent));
 --settings-rule:color-mix(in srgb,var(--settings-muted) 55%,var(--settings-bg));
 --settings-error:color-mix(in srgb,var(--settings-fg) 60%,var(--llm-danger));
 margin:0;min-width:0;min-height:100dvh;background:var(--settings-bg);color:var(--settings-fg);
 font:14px/1.5 var(--llm-font);
}
.w *,.w *::before,.w *::after{box-sizing:border-box}
.w :is(button,input){font-family:var(--llm-font)}
.settings-shell{width:min(100%,480px);margin:0 auto;padding:var(--space-2xl) var(--space-lg)}
.settings-card{border:0;background:var(--llm-clear)}
.settings-header{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;gap:var(--space-xs);margin-bottom:var(--space-lg)}
h1{margin:0;font-size:26px;font-weight:600;letter-spacing:-.025em;line-height:1.2;min-width:0;overflow-wrap:break-word;text-wrap:balance}
.brand-line{margin:0;color:var(--settings-muted);font-size:12px}
.intro{grid-column:1/-1;margin:0;color:var(--settings-muted);font-size:13px;line-height:1.6;max-width:48ch}
#settings{display:flex;flex-direction:column;gap:var(--space-lg);padding:0}
.field{min-width:0;margin:0;padding:0;border:0}
label{display:block;margin:0 0 var(--space-xs);font-size:13px;font-weight:600;color:var(--settings-fg)}
.optional{font-weight:400;font-size:12px;color:var(--settings-muted)}
.field-help{font-size:12px;line-height:1.5;margin:0 0 var(--space-xs);color:var(--settings-muted)}
.settings-card .ui-input{display:block;min-width:0;width:100%;height:44px;min-height:44px;padding:var(--space-xs) var(--space-sm);border:1px solid var(--settings-rule);border-radius:var(--llm-radius);background:var(--settings-surface);color:var(--settings-fg);box-shadow:none;font-size:14px;outline-offset:2px}
.settings-card .ui-input::placeholder{color:var(--settings-muted);opacity:1}
.settings-card .ui-input:hover{border-color:var(--settings-muted)}
.ui-btn{min-height:40px;height:auto;padding:var(--space-xs) var(--space-sm);border:1px solid var(--settings-rule);border-radius:var(--llm-radius);color:var(--settings-fg);background:var(--settings-surface);font-size:12px;font-weight:500;box-shadow:none;white-space:nowrap}
.ui-btn:hover{background:color-mix(in srgb,var(--settings-fg) 8%,var(--settings-surface))}
.ui-btn:active:not(:disabled){filter:brightness(.9);transform:none}
.key-control{position:relative}
.settings-card .key-control .ui-input{padding-right:88px}
.key-toggle{position:absolute;right:var(--space-2xs);top:var(--space-2xs);min-height:36px;height:36px;padding:0 var(--space-xs);border:0;background:var(--llm-clear);color:var(--settings-muted);border-radius:4px}
.key-toggle:hover{color:var(--settings-fg);background:color-mix(in srgb,var(--settings-fg) 6%,var(--settings-surface))}
.key-meta{display:flex;align-items:center;justify-content:space-between;gap:var(--space-xs);min-height:36px}
.key-status{margin:0;font-size:12px;color:var(--settings-muted)}
.key-status[data-state=saved]{color:var(--settings-fg)}
#clear-key{border:0;background:var(--llm-clear);color:var(--settings-muted);min-height:36px;padding:var(--space-2xs) 0;font-size:12px;font-weight:400;text-decoration:underline;text-underline-offset:3px}
#clear-key:hover{color:var(--settings-fg)}
#key-help{margin:0;font-size:12px;line-height:1.5}
.disclosure{margin:0;padding:var(--space-sm) 0 0;border-top:1px solid var(--settings-rule);font-size:11px;line-height:1.6;color:var(--settings-muted)}
.actions{display:flex;margin:0;padding:0;border:0}
.actions .save-button{width:100%;min-height:44px;background:var(--settings-accent);border-color:var(--settings-accent);color:var(--settings-bg);font-size:14px;font-weight:600}
.actions .save-button:hover{background:color-mix(in srgb,var(--settings-accent) 88%,var(--settings-fg))}
.status{margin:0;font-size:12px;line-height:1.5;color:var(--settings-fg);overflow-wrap:anywhere}
.status:empty{display:none}
.status[data-state=error],.field-error{color:var(--settings-error)}
.field-error{font-size:12px;margin:var(--space-xs) 0 0;line-height:1.5}
.field.has-error .ui-input{border-color:var(--settings-error)}
.w :is(button,input,a,[tabindex]):focus-visible{outline:2px solid var(--settings-fg);outline-offset:2px;transition:none}
.w :is(button,input):disabled{cursor:not-allowed;opacity:.55}
[hidden]{display:none!important}
html[data-embedded] .w{min-height:0}
html[data-embedded] .settings-shell{width:100%;margin:0;padding:var(--space-2xs) var(--space-2xs) var(--space-xs)}
html[data-embedded] .settings-header{display:none}
html[data-embedded] #settings{gap:var(--space-md)}
html[data-embedded] #endpoint-help,html[data-embedded] #model-help{display:none}
@media(max-width:500px){.settings-shell{padding:var(--space-lg) var(--space-md)}}
@media(pointer:coarse){.settings-card .ui-input{font-size:16px;height:48px;min-height:48px}.actions .save-button{min-height:48px}.key-toggle{height:40px;min-height:40px}.key-meta{min-height:48px}#clear-key{min-height:48px}}
@media(prefers-reduced-motion:reduce){.w *,.w *::before,.w *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;
fs.writeFileSync('extension/llm-settings.css',css);
