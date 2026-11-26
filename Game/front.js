'use strict';

window.LuckyFront = (() => {
  const C = LuckyCore;
  const {button, icon} = LuckyView;
  const arrow = '<i class="pixel-arrow" aria-hidden="true"></i>';
  const maps = [
    {file:'street.webp', focus:40, route:[[7,65],[16.5,64],[26,64],[36,63],[46,59],[54,56],[64.5,59.5],[75,63],[85,59],[95,61]]},
    {file:'chapters/02-study.webp', focus:50, route:[[7,64],[16.5,65],[26,65],[36,62],[46,59],[55,60],[65,63],[75,65],[85,66],[95,65]]},
    {file:'chapters/03-post.webp', focus:60, route:[[7,67],[16.5,69],[26,69],[36,68],[46,65],[55,64],[65,66],[75,69],[85,69],[95,67]]},
    {file:'chapters/04-greenhouse.webp', focus:40, route:[[7,62],[16.5,63],[26,62],[36,60],[46,58],[55,59],[65,61],[75,63],[85,63],[95,62]]},
    {file:'chapters/05-seaside.webp', focus:20, route:[[7,57],[16.5,58],[26,57],[36,54],[46,52],[55,53],[65,56],[75,57],[85,56],[95,55]]},
    {file:'chapters/06-rain.webp', focus:60, route:[[7,67],[16.5,68],[26,67],[36,66],[46,63],[55,63],[65,65],[75,67],[85,68],[95,67]]},
    {file:'chapters/07-nightmarket.webp', focus:60, route:[[7,69],[16.5,69],[26,68],[36,67],[46,66],[55,66],[65,67],[75,68],[85,69],[95,69]]},
    {file:'chapters/08-craft.webp', focus:60, route:[[7,69],[16.5,69],[26,68],[36,66],[46,63],[55,64],[65,68],[75,69],[85,69],[95,69]]},
    {file:'chapters/09-neighbors.webp', focus:55, route:[[7,66],[16.5,67],[26,66],[36,63],[46,60],[55,61],[65,64],[75,65],[85,66],[95,65]]},
    {file:'chapters/10-celebration.webp', focus:40, route:[[7,60],[16.5,64],[26,63],[36,60],[46,56],[55,57],[65,61],[75,64],[85,62],[95,60]]}
  ];
  const sceneLoads = new Map();
  function prepareChapter(chapter) {
    if(!maps[chapter])return Promise.resolve();
    if(!sceneLoads.has(chapter)){
      const image = new Image();
      image.src = 'assets/front/' + maps[chapter].file;
      const ready = image.decode().catch(() => { sceneLoads.delete(chapter); });
      sceneLoads.set(chapter, ready);
    }
    return sceneLoads.get(chapter);
  }

  function home(state, opening = false) {
    const level = state.active?.level || C.unlockedLevel(state);
    const finished = state.orders.some(order => order.level === 100);
    const action = opening ? 'finish-intro' : state.active ? 'resume' : finished ? 'new-order' : 'level-ticket';
    const label = opening ? '开门' : state.active ? '继续打包' : finished ? '随心接单' : '开始营业';
    const entry = (act, key, name) => button(act, icon(key,19) + name, 'shop-entry');
    return `<section class="scene title-scene${opening ? ' opening-scene' : ''}">
      <div class="store-art" aria-hidden="true"></div>
      <div class="title-menu">
        <h1><img src="assets/front/title.png" alt="幸运盲袋"></h1>
        <nav class="start-menu" aria-label="开始游戏">
          ${button(action, arrow + label, 'start-game', level)}
          ${opening ? '' : button('book', icon('catalog',21) + '选择关卡', 'select-map')}
        </nav>
      </div>
      ${opening ? '' : `<div class="shop-menu">
        ${button('shop-menu', icon('bag',19) + '店务', 'hud-button', '', 'aria-expanded="false" aria-controls="shop-entries"')}
        <nav class="shop-entries" id="shop-entries" aria-label="店务" hidden>
          ${entry('album','album','订单册')}${entry('catalog','bag','小物图鉴')}
          ${state.active || finished ? '' : entry('new-order','shell','随心接单')}
          ${entry('showroom','star','柜台陈列 · ' + C.balance(state))}${entry('settings','gear','设置')}
        </nav>
      </div>`}
    </section>`;
  }

  function ticket(state, id) {
    const level = C.levels[id - 1];
    const locked = id > C.unlockedLevel(state);
    const done = state.orders.some(order => order.level === id);
    let control;
    if (locked) {
      control = `<span class="locked-note">${C.levelName(id - 1)}后解锁</span>`;
    } else if (state.active) {
      control = button('resume', (state.active.level === id ? '继续打包' : '回柜台') + arrow, 'take-ticket');
    } else {
      control = button('accept-level', (done ? '再玩一次' : '接单') + arrow, 'take-ticket', id);
    }
    return `<div class="order-name"><small>${C.scoopsFor(id)} 满勺 · 喜欢${C.themes[level.theme].name}</small><h2>${C.levelName(id)}</h2></div>${control}`;
  }

  function book(state, local) {
    const available = C.unlockedLevel(state);
    const first = local.chapter * 10 + 1;
    const levels = C.levels.slice(first - 1, first + 9);
    const selected = levels.some(level => level.id === local.selectedLevel) ? local.selectedLevel : first;
    local.selectedLevel = selected;
    const shipped = new Map();
    for (const order of state.orders) {
      if (order.level) shipped.set(order.level, Math.max(shipped.get(order.level) || 0, C.levelStars(order.satisfaction)));
    }
    const map = maps[local.chapter];
    const nodes = levels.map((level, index) => {
      const status = shipped.has(level.id) ? 'done' : level.id <= available ? 'current' : 'later';
      const stars = shipped.get(level.id);
      const description = status === 'done' ? '最高 '+stars+' 星' : status === 'current' ? '可接单' : '未解锁';
      const [x,y] = map.route[index];
      return button('map-select',
        `<span class="marker-face"><b>${level.id}</b></span>${status === 'done' ? `<span class="delivered" aria-hidden="true">${'★'.repeat(stars)}<i>${'★'.repeat(3-stars)}</i></span>` : ''}<i class="here-flag" aria-hidden="true"></i>`,
        'map-stop ' + status, level.id,
        `style="left:${x}%;top:${y}%" aria-pressed="${selected === level.id}" aria-label="${C.levelName(level.id)}，${description}"`);
    }).join('');
    return `<section class="scene street-scene" data-chapter="${local.chapter+1}" style="--map-focus:${map.focus}%;--map-offset:-${map.focus}%">
      <div class="street-camera" tabindex="0" aria-label="横向关卡街道">
        <div class="street-world"><div class="street-art">
          <img class="panorama" src="assets/front/${map.file}" alt="">
          <canvas class="stepping-stones" width="896" height="352" aria-hidden="true"></canvas>
          ${nodes}
        </div></div>
      </div>
      <header class="map-hud">${button('home', icon('back',22), 'hud-button home-key', '', 'aria-label="返回主页面"')}
        <div class="chapter-sign"><small>第 ${local.chapter + 1} 章</small><h1>${C.chapters[local.chapter].name}</h1></div>
      </header>
      <div class="map-progress" aria-label="本章已寄订单">${icon('album',19)} ${levels.filter(level => shipped.has(level.id)).length} / 10</div>
      ${button('map-walk', arrow, 'walk walk-left', -1, 'aria-label="向左看"')}
      ${button('map-walk', arrow, 'walk walk-right', 1, 'aria-label="向右看"')}
      <article class="street-ticket-card" aria-label="所选关卡">${ticket(state, selected)}</article>
      <div hidden>
        ${local.chapter > 0 ? button('chapter','上一章','',local.chapter - 1) : ''}
        ${local.chapter < 9 ? button('chapter','下一章','',local.chapter + 1) : ''}
      </div>
    </section>`;
  }

  function smooth(root) {
    return root.classList.contains('reduced') ? 'auto' : 'smooth';
  }

  function centerOn(scene, node, animate = false) {
    const camera = scene.querySelector('.street-camera');
    const target = node.getBoundingClientRect();
    const viewport = camera.getBoundingClientRect();
    camera.scrollTo({
      left: camera.scrollLeft + target.left + target.width / 2 - viewport.left - viewport.width * .43,
      behavior: animate ? smooth(scene.parentElement) : 'auto'
    });
  }

  function edges(camera) {
    return {
      left: camera.scrollLeft <= 2,
      right: camera.scrollLeft + camera.clientWidth >= camera.scrollWidth - 2
    };
  }

  function updateArrows(scene, local) {
    if (!scene.isConnected) return;
    const camera = scene.querySelector('.street-camera');
    const limits = edges(camera);
    scene.querySelector('[data-act="map-walk"][data-val="-1"]').hidden = limits.left && local.chapter === 0;
    scene.querySelector('[data-act="map-walk"][data-val="1"]').hidden = limits.right && local.chapter === 9;
    const node = scene.querySelector('.map-stop[aria-pressed="true"]');
    const target = node.getBoundingClientRect();
    const viewport = camera.getBoundingClientRect();
    scene.querySelector('.street-ticket-card').hidden = target.right < viewport.left || target.left > viewport.right;
  }

  function select(root, state, local, id, keyboard = false) {
    const scene = root.querySelector('.street-scene');
    const node = scene?.querySelector(`[data-act="map-select"][data-val="${id}"]`);
    if (!node) return;
    local.selectedLevel = id;
    for (const stop of scene.querySelectorAll('.map-stop')) {
      stop.setAttribute('aria-pressed', String(stop === node));
    }
    scene.querySelector('.street-ticket-card').innerHTML = ticket(state, id);
    if (keyboard) {
      node.focus({preventScroll:true});
      centerOn(scene, node, true);
    }
    updateArrows(scene, local);
  }

  function turn(scene, local, direction) {
    const chapter = local.chapter + direction;
    const control = scene.querySelector(`[data-act="chapter"][data-val="${chapter}"]`);
    control?.click();
  }

  function walk(root, local, direction) {
    const scene = root.querySelector('.street-scene');
    if (!scene) return;
    const camera = scene.querySelector('.street-camera');
    const limits = edges(camera);
    if (direction < 0 ? limits.left : limits.right) {
      turn(scene, local, direction);
    } else {
      camera.scrollBy({left:direction * camera.clientWidth * .68, behavior:smooth(root)});
    }
  }

  function connect(scene, local) {
    if (!scene?.classList.contains('street-scene')) return;
    const camera = scene.querySelector('.street-camera');
    const canvas = scene.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const stops = maps[local.chapter].route;
    for (let i = 0; i < stops.length - 1; i++) {
      const [x0,y0] = stops[i], [x1,y1] = stops[i + 1];
      for (let j = 1; j <= 7; j++) {
        const fraction = j / 8;
        const x = Math.round((x0 + (x1-x0) * fraction) * canvas.width / 100);
        const y = Math.round((y0 + (y1-y0) * fraction) * canvas.height / 100);
        ctx.fillStyle = '#936b4b'; ctx.fillRect(x-2,y,5,2);
        ctx.fillStyle = '#fff0b9'; ctx.fillRect(x-2,y-1,4,2);
      }
    }
    centerOn(scene, scene.querySelector('.map-stop[aria-pressed="true"]'));
    updateArrows(scene, local);
    prepareChapter(local.chapter+1);
    prepareChapter(local.chapter-1);
    camera.addEventListener('scroll', () => updateArrows(scene, local), {passive:true});
    let drag = null, suppressClick = false;
    camera.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      suppressClick = false;
      drag = {x:event.clientX, left:camera.scrollLeft};
    });
    camera.addEventListener('pointermove', event => {
      if (!drag || !event.buttons) { drag = null; return; }
      const distance = event.clientX - drag.x;
      if (Math.abs(distance) < 6 && !suppressClick) return;
      suppressClick = true;
      camera.setPointerCapture(event.pointerId);
      camera.scrollLeft = drag.left - distance;
    });
    camera.addEventListener('pointerup', () => { drag = null; });
    camera.addEventListener('pointercancel', () => { drag = null; });
    camera.addEventListener('click', event => {
      if (suppressClick) { suppressClick = false; event.stopPropagation(); }
    }, true);
    let start = null;
    camera.addEventListener('touchstart', event => {
      start = event.touches.length === 1
        ? {x:event.touches[0].clientX, y:event.touches[0].clientY, ...edges(camera)} : null;
    }, {passive:true});
    camera.addEventListener('touchend', event => {
      if (!start) return;
      const dx = event.changedTouches[0].clientX - start.x;
      const dy = event.changedTouches[0].clientY - start.y;
      const direction = dx < 0 ? 1 : -1;
      if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 2 &&
          (direction > 0 ? start.right : start.left)) turn(scene, local, direction);
      start = null;
    }, {passive:true});
    camera.addEventListener('touchcancel', () => { start = null; });
  }

  function resize(root, local) {
    const scene = root.querySelector('.street-scene');
    if (!scene) return;
    centerOn(scene, scene.querySelector('.map-stop[aria-pressed="true"]'));
    updateArrows(scene, local);
  }

  function closeMenu(root) {
    const menu = root.querySelector('.shop-entries');
    if (!menu || menu.hidden) return false;
    menu.hidden = true;
    root.querySelector('[data-act="shop-menu"]').setAttribute('aria-expanded','false');
    return true;
  }

  function toggleMenu(root) {
    const menu = root.querySelector('.shop-entries');
    if (!menu) return;
    menu.hidden = !menu.hidden;
    root.querySelector('[data-act="shop-menu"]').setAttribute('aria-expanded',String(!menu.hidden));
  }

  return {home, book, connect, select, walk, resize, closeMenu, toggleMenu, prepareChapter};
})();
