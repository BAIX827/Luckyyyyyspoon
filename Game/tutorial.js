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
  // New stock is announced by objects, not by the gesture caption: a delivery slip clipped
  // beside the order ticket, and a twinkle on the cubby that now holds it.
  function syncArrival(scene, a) {
    const d = a?.mode === 'scoop' && C.deliveries.find(x => x.after === a.level - 1);
    const kind = d && !progress.learned['goods-' + d.kind] ? d.kind : null;
    scene.querySelectorAll('.stock-cubby.fresh-stock').forEach(n => { if (Number(n.dataset.kind) !== kind) n.classList.remove('fresh-stock'); });
    let tag = scene.querySelector('.arrival-tag');
    if (kind === null) { tag?.remove(); return; }
    scene.querySelectorAll(`.stock-cubby[data-kind="${kind}"]`).forEach(n => n.classList.add('fresh-stock'));
    const desk = scene.querySelector('.counter-desk'), note = scene.querySelector('.counter-note .ticket-paper');
    if (!desk || !note) return;
    if (!tag) {
      tag = document.createElement('div');
      tag.className = 'arrival-tag';
      tag.setAttribute('role', 'note');
      tag.innerHTML = `<img class="pixel" alt="" src="assets/items/${a.theme}-${kind}-0.png"><span><small>新到货</small><b></b></span>`;
      tag.querySelector('b').textContent = C.kinds[kind].name;
      desk.append(tag);
    }
    // Clip the slip over the ticket's top-right corner.
    const box = desk.getBoundingClientRect(), n = note.getBoundingClientRect();
    tag.style.left = Math.round(n.right - box.left - tag.offsetWidth * .4) + 'px';
    tag.style.top = Math.round(n.top - box.top - tag.offsetHeight * .85) + 'px';
  }
  function showTutorial() {
    const a = progress.active;
    const scene = game.querySelector('.counter-scene');
    if (scene && a) syncArrival(scene, a);
    if (!scene || !a || a.mode!=='scoop' || game.querySelector('.veil')) { clearTutorial(); return; }
    const delivery = C.deliveries.find(d => d.after === a.level - 1);
    let lesson = a.level === 1 ? 'first-order' : delivery ? 'goods-' + delivery.kind : null;
    if (lesson && progress.learned[lesson]) lesson = null;
    // Once the basics are learned, the first category that needs four or more pieces teaches press-and-hold.
    const open = a.bags?.[a.current];
    if (!lesson && !progress.learned.hold && a.mode === 'scoop' && a.stage === 'shelf' && open &&
        open.quantity - open.pieces.length >= 4 && open.pieces.every(g => C.fits(open,g))) lesson = 'hold';
    if (!lesson) { clearTutorial(); return; }
    if (tutorialOrder !== a.id) { tutorialOrder = a.id; firstBag = null; }
    const card = a.bags[a.current];
    if (card && firstBag === null) firstBag = a.current;
    const find = selector => scene.querySelector(selector);
    const instruction = (key, selector, text) => ({key, target:find(selector), text});
    let hint = null;
    // A prop that carries its own wooden tag needs only the hand. Words are kept for new ideas, once.
    if (a.stage === 'scoop') hint = instruction('scoop','.scoop-prop','');
    else if (a.stage === 'drawn') hint = instruction('pour','.pour-prop','');
    else if (lesson === 'hold') {
      if (scene.dataset.camera === 'near' && find('.shelf-bay.inspected'))
        hint = instruction('hold',`.shelf-bay.inspected [data-act="add-piece"][data-val="${card.color}|${card.kind}|${card.variant ?? 0}"]`,'按住不放，连续取货');
    } else if (lesson === 'first-order') {
      if (a.current === firstBag && a.stage === 'shelf' && card) {
        const wrong = card.pieces.findIndex(g => !C.fits(card,g));
        if (wrong >= 0) hint = instruction('return',`[data-act="return-piece"][data-val="${a.current}|${wrong}"]`,'颜色不对，点它退回');
        else if (card.pieces.length < card.quantity) hint = pickingHint(card,false);
      }
      // Once the box is complete the hand only shows the sticker; gifts stay the player's own idea.
      if (find('.desk-seal.ready') && (a.stage === 'gifts' || a.bags.every(b => b.pieces.length === b.quantity && b.pieces.every(g => C.fits(b,g)))))
        hint = instruction('send','.desk-seal.ready','');
    } else if (card?.kind === delivery.kind) {
      const correct = card.pieces.some(g => C.fits(card,g));
      if (correct) { clearTutorial(); return; }
      if (a.stage === 'shelf') hint = pickingHint(card);
    }
    function pickingHint(b) {
      const drawer = C.kinds[b.kind].drawer;
      if (scene.dataset.camera !== 'near' || !find('.shelf-bay.inspected'))
        return instruction('bay',`[data-act="station-bay"][data-val="${drawer}"]`,'');
      const selector = `.shelf-bay.inspected [data-act="add-piece"][data-val="${b.color}|${b.kind}|${b.variant ?? 0}"]`;
      return instruction('pick',selector,'');
    }
    if (!hint?.target || hint.target.disabled || !hint.target.getClientRects().length) { clearTutorial(); return; }
    const key = lesson + ':' + hint.key;
    if (stepKey === key && stepTarget === hint.target && tutorialLayer?.isConnected) { positionTutorial(); return; }
    clearTutorial();
    stepKey = key;
    stepTarget = hint.target;
    gestureKind = ['pick','pour','send'].includes(hint.key) ? 'drag' : hint.key === 'hold' ? 'hold' : 'tap';
    tutorialLayer = document.createElement('div');
    tutorialLayer.className = 'in-game-tutorial';
    tutorialLayer.dataset.demo = gestureKind;
    tutorialLayer.innerHTML = '<div class="tutorial-halo" aria-hidden="true"></div><div class="gesture-demo" aria-hidden="true"><img class="gesture-goods" alt=""><img class="gesture-hand" src="' + handArt + '" alt=""><i class="tap-ripple"></i></div><div class="tutorial-caption"><p role="status"></p></div>';
    tutorialLayer.querySelector('p').textContent = hint.text;
    tutorialLayer.querySelector('.tutorial-caption').hidden = !hint.text;
    const ghost = tutorialLayer.querySelector('.gesture-goods');
    if (hint.key === 'pick') ghost.src = 'assets/items/' + card.color + '-' + card.kind + '-' + (card.variant ?? 0) + '.png';
    else ghost.hidden = true;
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
    if (stepTarget.matches('.scoop-prop, .pour-prop')) y = r.top - bounds.top + r.height * .32;
    // Point at the sticker's lower edge so the hand does not cover its words.
    if (stepTarget.matches('.postage-sticker')) y = r.bottom - bounds.top - 4;
    const halo = tutorialLayer.querySelector('.tutorial-halo'), demo = tutorialLayer.querySelector('.gesture-demo');
    const size = gestureKind === 'drag' ? Math.max(30,Math.min(r.width,r.height) * .9) : 44;
    Object.assign(halo.style,{left:x+'px',top:y+'px',width:size+'px',height:size+'px'});
    Object.assign(demo.style,{left:x+'px',top:y+'px'});
    let dx = 0, dy = 0;
    if (gestureKind === 'drag') {
      const box = game.querySelector(stepTarget.matches('.pour-prop') ? '.waiting-tray' : '[data-box]')?.getBoundingClientRect();
      if (box) { dx = box.left - bounds.left + box.width * .5 - x; dy = box.top - bounds.top + box.height * .45 - y; }
    }
    const caption = tutorialLayer.querySelector('.tutorial-caption');
    // Choose a spot beside the action that leaves the shop controls exposed.
    const w=caption.offsetWidth, h=caption.offsetHeight, gap=9;
    const clamp=(n,min,max)=>Math.max(min,Math.min(n,max));
    const cx=bounds.left+x, cy=bounds.top+y;
    const left=clamp(cx-w/2,bounds.left+6,bounds.right-w-6);
    const top=clamp(cy-h/2,bounds.top+6,bounds.bottom-h-6);
    // Large targets (a whole bay or the scoop) only need clearance around the gesture.
    const halfW=Math.min(r.width/2,Math.max(22,size/2)), halfH=Math.min(r.height/2,Math.max(22,size/2));
    const choices=[
      {side:'above',x:left,y:cy-halfH-gap-h}, {side:'below',x:left,y:cy+halfH+gap},
      {side:'right',x:cx+halfW+gap,y:top}, {side:'left',x:cx-halfW-gap-w,y:top}
    ];
    const controls=[game.querySelector('.counter-tools')]
      .filter(Boolean).map(el=>el.getBoundingClientRect());
    const fits=pos=>pos.x>=bounds.left+4 && pos.x+w<=bounds.right-4 &&
      pos.y>=bounds.top+4 && pos.y+h<=bounds.bottom-4 &&
      controls.every(box=>pos.x+w+4<=box.left || pos.x>=box.right+4 ||
        pos.y+h+4<=box.top || pos.y>=box.bottom+4);
    const place=choices.find(fits);
    caption.style.visibility=place?'visible':'hidden';
    if(place){
      const vertical=place.side==='above'||place.side==='below';
      const tip=vertical?clamp(cx-place.x,9,w-9):clamp(cy-place.y,9,h-9);
      caption.dataset.side=place.side;
      caption.style.setProperty('--tip',Math.round(tip)+'px');
      caption.style.left=Math.round(place.x-bounds.left)+'px';
      caption.style.top=Math.round(place.y-bounds.top)+'px';
    }
    demo.style.setProperty('--travel-x',dx+'px');
    demo.style.setProperty('--travel-y',dy+'px');
  }
  window.addEventListener('resize',positionTutorial);
  game.addEventListener('scroll',positionTutorial,{capture:true,passive:true});
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
