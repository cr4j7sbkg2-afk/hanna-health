// Builds index.html (the phone version on GitHub Pages) from the Design canvas artboard.
// Usage: node tools/build-phone.js source/Main.dc.html index.html
// It keeps the artboard's template and logic as they are and adds a small Preact-based runner,
// full-screen phone sizing (iPhone safe areas), home-screen app tags and noindex.
const fs = require('fs');
const [srcPath, outPath] = process.argv.slice(2);
if (!srcPath || !outPath) {
  console.error('Usage: node tools/build-phone.js <Main.dc.html> <index.html>');
  process.exit(1);
}
const src = fs.readFileSync(srcPath, 'utf8');

let tpl = src.slice(src.indexOf('<x-dc>') + '<x-dc>'.length, src.indexOf('</x-dc>'));
tpl = tpl.replace(/<helmet>[\s\S]*?<\/helmet>/, '').trim();
const logicMatch = src.match(/<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/);
if (!logicMatch) throw new Error('No logic script found in ' + srcPath);
const logic = logicMatch[1];

// Fit the 390×844 artboard to the phone screen, with the iPhone safe areas.
const swaps = [
  ['<div style="width: 390px; height: 844px; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden;',
   '<div style="width: 100%; max-width: 480px; margin: 0 auto; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; position: relative;'],
  ['<header style="position: relative; z-index: 5; height: 64px; flex-shrink: 0; box-sizing: border-box; padding: 0 10px 0 20px;',
   '<header style="position: relative; z-index: 5; height: calc(64px + env(safe-area-inset-top)); flex-shrink: 0; box-sizing: border-box; padding: env(safe-area-inset-top) 10px 0 20px;'],
  ['position: absolute; top: 60px; right: 10px; width: 256px;',
   'position: absolute; top: calc(60px + env(safe-area-inset-top)); right: 10px; width: 256px;'],
  ['<main style="height: 708px; flex-shrink: 0">',
   '<main style="flex: 1 1 auto; min-height: 0; position: relative">'],
  ['<nav aria-label="Fő menü" style="height: 72px; flex-shrink: 0; box-sizing: border-box;',
   '<nav aria-label="Fő menü" style="height: calc(72px + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); flex-shrink: 0; box-sizing: border-box;']
];
for (const [a, b] of swaps) {
  if (tpl.split(a).length !== 2) throw new Error('Layout anchor changed in the artboard, update tools/build-phone.js: ' + a.slice(0, 70));
  tpl = tpl.replace(a, b);
}
const screens = tpl.split('height: 708px;').length - 1;
if (screens < 6) throw new Error('Expected at least 6 screen heights of 708px, found ' + screens);
tpl = tpl.split('height: 708px;').join('height: 100%;');

const runtime = `
(function () {
  var mount = document.getElementById('app');
  if (!window.preact) {
    mount.innerHTML = '<p class="boot">Nem sikerült betölteni az appot. Ellenőrizd az internetkapcsolatot, és töltsd újra az oldalt.</p>';
    return;
  }
  var h = preact.h;
  var root = document.getElementById('tpl').content.firstElementChild;
  var EVENTS = { onclick: 'onClick', onkeydown: 'onKeyDown', onchange: 'onChange' };
  var ONE = /^\\{\\{\\s*([^}]+?)\\s*\\}\\}$/;
  var ANY = /\\{\\{\\s*([^}]+?)\\s*\\}\\}/g;
  var ids = new WeakMap(), nextId = 0;
  function idOf(n) { if (!ids.has(n)) ids.set(n, 'n' + (nextId++)); return ids.get(n); }

  function lookup(path, scope, vals) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    var parts = path.split('.');
    var v = Object.prototype.hasOwnProperty.call(scope, parts[0]) ? scope : vals;
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function interp(str, scope, vals) {
    var m = str.match(ONE);
    if (m) return lookup(m[1], scope, vals);
    return str.replace(ANY, function (_, p) { var v = lookup(p, scope, vals); return v == null ? '' : String(v); });
  }
  function kids(node, scope, vals, out, prefix) {
    var c = node.childNodes;
    for (var i = 0; i < c.length; i++) build(c[i], scope, vals, out, prefix ? prefix + ':' + i : null);
  }
  function build(node, scope, vals, out, key) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      if (t.indexOf('{{') >= 0) { var r = interp(t, scope, vals); out.push(r == null ? '' : String(r)); }
      else out.push(t);
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.localName;
    if (tag === 'sc-if') {
      if (interp(node.getAttribute('value'), scope, vals)) kids(node, scope, vals, out, idOf(node));
      return;
    }
    if (tag === 'sc-for') {
      var list = interp(node.getAttribute('list'), scope, vals) || [];
      var as = node.getAttribute('as');
      for (var j = 0; j < list.length; j++) {
        var s = Object.assign({}, scope); s[as] = list[j];
        kids(node, s, vals, out, null);
      }
      return;
    }
    var props = {};
    if (key) props.key = key;
    for (var k = 0; k < node.attributes.length; k++) {
      var a = node.attributes[k], name = a.name;
      if (name.indexOf('hint-') === 0) continue;
      var val = a.value.indexOf('{{') >= 0 ? interp(a.value, scope, vals) : a.value;
      if (EVENTS[name]) {
        name = EVENTS[name];
        if (name === 'onChange' && (tag === 'textarea' || (tag === 'input' && node.getAttribute('type') !== 'file'))) name = 'onInput';
      } else if (name === 'disabled') {
        val = val === true || val === 'true';
      }
      props[name] = val;
    }
    var children = [];
    kids(node, scope, vals, children, null);
    out.push(h(tag, props, children));
  }

  var comp = new Component({ variant: 'holdciklus' });
  var lastView = '';
  function draw() {
    var vals = comp.renderVals();
    var out = [];
    build(root, {}, vals, out, null);
    preact.render(out[0], mount);
    var s = comp.state;
    var view = [s.tab, s.kbView, s.videoId, s.forumView, s.threadId, s.liliView, s.step].join('|');
    if (view !== lastView) {
      lastView = view;
      var screen = mount.querySelector('main > div');
      if (screen) screen.scrollTop = 0;
    }
  }
  var queued = false;
  window.__dcRender = function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; draw(); });
  };
  mount.innerHTML = '';
  draw();
})();
`;

const page = `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#FFFFFF">
<meta name="robots" content="noindex, nofollow">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Hanna Health">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="manifest" href="manifest.webmanifest">
<title>Hanna Health – telefonos teszt</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;600&family=Gilda+Display&family=Karla:wght@400;500;600;700&family=Fraunces:wght@300;400;500&family=Jost:wght@300;400;500;600&display=swap">
<style>
html, body { margin: 0; height: 100%; overflow: hidden; overscroll-behavior: none; background: #E9E9EE; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
* { -webkit-tap-highlight-color: transparent; }
button, label, input, textarea { touch-action: manipulation; }
#app { height: 100vh; height: 100dvh; }
/* iOS nagyít, ha egy beviteli mező betűmérete 16px alatti */
input, textarea { font-size: 16px !important; }
.boot { margin: 0; padding: calc(40px + env(safe-area-inset-top)) 24px 24px; font: 16px/1.5 -apple-system, system-ui, sans-serif; color: #26294F; text-align: center; }
</style>
</head>
<body>
<div id="app"><p class="boot">Betöltés…</p></div>
<template id="tpl">
${tpl}
</template>
<script src="https://cdn.jsdelivr.net/npm/preact@10.19.3/dist/preact.umd.js"></script>
<script>
class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(p) {
    this.state = Object.assign({}, this.state, typeof p === 'function' ? p(this.state) : p);
    if (window.__dcRender) window.__dcRender();
  }
}
</script>
<script>
${logic}
</script>
<script>
${runtime}
</script>
</body>
</html>
`;
fs.writeFileSync(outPath, page);
console.log('Wrote ' + outPath + ' (' + page.length + ' characters, ' + screens + ' screens)');
