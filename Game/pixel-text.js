'use strict';
// The pixel font is drawn on a 12px grid; below that its strokes merge into blobs.
// Any text that the layout shrinks under 12px is lifted to exactly 12px.
(() => {
  const game = document.getElementById('game');
  const FLOOR = 12;
  let frame = 0, pending = new Set();
  function lift(el) {
    if (!el.isConnected || el.closest('svg')) return;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
    if (el.style.fontSize === FLOOR + 'px') return;
    if (parseFloat(getComputedStyle(el).fontSize) < FLOOR - .05) el.style.fontSize = FLOOR + 'px';
  }
  function flush() {
    frame = 0;
    const nodes = [...pending]; pending = new Set();
    for (const node of nodes) {
      if (!node.isConnected) continue;
      lift(node);
      node.querySelectorAll?.('*').forEach(lift);
    }
  }
  function queue(node) {
    if (node.nodeType === 3) node = node.parentElement;
    if (!node || node.nodeType !== 1) return;
    pending.add(node);
    if (!frame) frame = requestAnimationFrame(flush);
  }
  new MutationObserver(records => {
    for (const r of records) {
      if (r.type === 'characterData') queue(r.target);
      else r.addedNodes.forEach(queue);
    }
  }).observe(game, {childList: true, subtree: true, characterData: true});
  // clamp() sizes follow the viewport, so a resize re-measures everything from scratch.
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      game.querySelectorAll('[style*="font-size: 12px"]').forEach(el => el.style.removeProperty('font-size'));
      queue(game);
    }, 120);
  });
  document.fonts?.ready.then(() => queue(game));
})();
