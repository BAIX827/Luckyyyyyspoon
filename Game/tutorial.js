'use strict';
window.LuckyTutorial = (() => {
  const C = LuckyCore, game = document.getElementById('game');
  let progress = C.initial();
  let tutorialFrame = null, tutorialLayer = null, tutorialOrder = null, firstBag = null;
  let stepKey = '', stepTarget = null, trackingFrame = null;
  let gestureKind = 'tap';
  const handCanvas = document.createElement('canvas');
  handCanvas.width = 20; handCanvas.height = 25;
  const handRows = [
    '.....xxx............',
    '....xwwwx...........',
    '....xwwwx...........',
    '....xwwwx...........',
    '....xwwwxxxx........',
    '....xwwwxwwwxxx.....',
    '....xwwwxwwwxwwxx...',
    '....xwwwxwwwxwwxwx..',
    '.xxx.xwwwwwwwwwwxwx.',
    'xwwwxxwwwwwwwwwwxwx.',
    'xwwwwxwwwwwwwwwwwwx.',
    '.xwwwwwwwwwwwwwwwwx.',
    '..xwwwwwwwwwwwwwwwx.',
    '..xwwwwwwwwwwwwwwwx.',
    '...xwwwwwwwwwwwwwx..',
    '...xwwwwwwwwwwwwwx..',
    '....xwwwwwwwwwwwx...',
    '....xwwwwwwwwwwwx...',
    '.....xwwwwwwwwwx....',
    '.....xxxxxxxxxxx....',
    '.....xpppppppppx....',
    '.....xpppppppppx....',
    '.....xpppppppppx....',
    '.....xxxxxxxxxxx....'
  ];
  const handContext = handCanvas.getContext('2d');
  handRows.forEach((row,y) => [...row].forEach((pixel,x) => {
    const ink = {x:'#593b49',w:'#fff7dc',p:'#df8196'}[pixel];
    if (ink) { handContext.fillStyle = ink; handContext.fillRect(x,y,1,1); }
  }));
  const handArt = handCanvas.toDataURL();
  function queueTutorial() {
    if (tutorialFrame !== null) return;
    tutorialFrame = requestAnimationFrame(() => { tutorialFrame = null; showTutorial(); });
  }
  function clearTutorial() {
    cancelAnimationFrame(trackingFrame);
    tutorialLayer?.remove();
    tutorialLayer = null;
    stepKey = '';
    stepTarget = null;
  }
  function showTutorial() {
    const a = progress.active;
    const scene = game.querySelector('.counter-scene');
    if (!scene || !a || a.mode!=='scoop' || game.querySelector('.veil')) { clearTutorial(); return; }
    const delivery = C.deliveries.find(d => d.after === a.level - 1);
    const lesson = a.level === 1 ? 'first-order' : delivery ? 'goods-' + delivery.kind : null;
    if (!lesson || progress.learned[lesson]) { clearTutorial(); return; }
    if (tutorialOrder !== a.id) { tutorialOrder = a.id; firstBag = null; }
    const card = a.bags[a.current];
    if (card && firstBag === null) firstBag = a.current;
    const find = selector => scene.querySelector(selector);
    const instruction = (key, selector, text) => ({key, target:find(selector), text});
    let hint = null;
    if (a.stage === 'scoop') hint = instruction('scoop','.scoop-prop','舀一勺');
    else if (a.stage === 'drawn') hint = instruction('pour','.pour-prop',delivery ? C.kinds[delivery.kind].name+'到货 · 倒进盘里' : '倒进盘里');
    else if (lesson === 'first-order') {
      if (a.current === firstBag && a.stage === 'shelf' && card) {
        const wrong = card.pieces.findIndex(g => g.kind !== card.kind || g.color !== card.color || card.variant !== null && g.variant !== card.variant);
        if (wrong >= 0) hint = instruction('return',`[data-act="return-piece"][data-val="${a.current}|${wrong}"]`,'点一下，退回');
        else if (card.pieces.length < card.quantity) hint = pickingHint(card,false);
      } else if (a.stage === 'pack') hint = instruction('wrap','[data-act="wrap"]','配齐了，挑赠品');
      else if (a.stage === 'gifts') hint = instruction('gifts','[data-act="photo"]','贴上封签');
      else if (a.stage === 'seal') hint = instruction('send','[data-act="seal"]','寄给客人');
    } else if (card?.kind === delivery.kind) {
      const correct = card.pieces.some(g => g.kind === card.kind && g.color === card.color && (card.variant === null || g.variant === card.variant));
      if (correct) { clearTutorial(); return; }
      if (a.stage === 'shelf') hint = pickingHint(card);
    }
    function pickingHint(b) {
      const drawer = C.kinds[b.kind].drawer;
      if (scene.dataset.camera !== 'near' || !find('.shelf-bay.inspected'))
        return instruction('bay',`[data-act="station-bay"][data-val="${drawer}"]`,'点开货架');
      const selector = `.shelf-bay.inspected [data-act="add-piece"][data-val="${b.color}|${b.kind}|${b.variant ?? 0}"]`;
      return instruction('pick',selector,'把它放进盒子');
    }
    if (!hint?.target || hint.target.disabled || !hint.target.getClientRects().length) { clearTutorial(); return; }
    const key = lesson + ':' + hint.key;
    if (stepKey === key && stepTarget === hint.target && tutorialLayer?.isConnected) { positionTutorial(); return; }
    clearTutorial();
    stepKey = key;
    stepTarget = hint.target;
    gestureKind = ['pick','pour'].includes(hint.key) ? 'drag' : 'tap';
    tutorialLayer = document.createElement('div');
    tutorialLayer.className = 'in-game-tutorial';
    tutorialLayer.dataset.demo = gestureKind;
    tutorialLayer.innerHTML = '<div class="tutorial-halo" aria-hidden="true"></div><div class="gesture-demo" aria-hidden="true"><img class="gesture-goods" alt=""><img class="gesture-hand" src="' + handArt + '" alt=""><i class="tap-ripple"></i></div><div class="tutorial-caption"><p role="status"></p></div><button type="button" class="skip-lesson">跳过引导</button>';
    tutorialLayer.querySelector('p').textContent = hint.text;
    const ghost = tutorialLayer.querySelector('.gesture-goods');
    if (hint.key === 'pick') ghost.src = 'assets/items/' + card.color + '-' + card.kind + '-' + (card.variant ?? 0) + '.png';
    else ghost.hidden = true;
    tutorialLayer.querySelector('button').dataset.act = 'tutorial-skip';
    tutorialLayer.querySelector('button').dataset.val = lesson;
    game.append(tutorialLayer);
    positionTutorial();
    const until = performance.now() + 750;
    function trackCamera() {
      positionTutorial();
      if (performance.now() < until && tutorialLayer?.isConnected) trackingFrame = requestAnimationFrame(trackCamera);
    }
    trackingFrame = requestAnimationFrame(trackCamera);
  }
  function positionTutorial() {
    if (!tutorialLayer || !stepTarget?.isConnected) return;
    const r = stepTarget.getBoundingClientRect(), bounds = game.getBoundingClientRect();
    let x = r.left - bounds.left + r.width / 2, y = r.top - bounds.top + r.height / 2;
    if (stepTarget.matches('.scoop-prop')) y = r.top - bounds.top + r.height * .32;
    const halo = tutorialLayer.querySelector('.tutorial-halo'), demo = tutorialLayer.querySelector('.gesture-demo');
    const size = gestureKind === 'drag' ? Math.max(30,Math.min(r.width,r.height) * .9) : 44;
    Object.assign(halo.style,{left:x+'px',top:y+'px',width:size+'px',height:size+'px'});
    Object.assign(demo.style,{left:x+'px',top:y+'px'});
    let dx = 0, dy = 0;
    if (gestureKind === 'drag') {
      const box = game.querySelector(stepTarget.matches('.pour-prop') ? '.waiting-tray' : '[data-box]')?.getBoundingClientRect();
      if (box) { dx = box.left - bounds.left + box.width * .5 - x; dy = box.top - bounds.top + box.height * .45 - y; }
    }
    demo.style.setProperty('--travel-x',dx+'px');
    demo.style.setProperty('--travel-y',dy+'px');
  }
  window.addEventListener('resize',positionTutorial);
  const connectCounter = LuckyCounter.connect;
  LuckyCounter.connect = (...args) => {
    const update = connectCounter(...args);
    queueTutorial();
    return (...updates) => { update(...updates); queueTutorial(); };
  };
  game.addEventListener('click',() => queueTutorial());
  game.addEventListener('touchend',() => queueTutorial(),{passive:true});
  game.addEventListener('pointerdown',e => {
    if (stepTarget?.contains(e.target)) tutorialLayer?.classList.add('performing');
  });
  document.addEventListener('pointerup',() => tutorialLayer?.classList.remove('performing'));
  document.addEventListener('pointercancel',() => tutorialLayer?.classList.remove('performing'));
  return {update(state){progress=state;queueTutorial();}};
})();
