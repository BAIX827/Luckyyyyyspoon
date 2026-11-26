'use strict';
(function controller(){
  const C=LuckyCore,P=LuckyPlatform,V=LuckyView;
  const root=document.getElementById('game'),message=document.getElementById('messages');
  let state, introTimer, messageTimer, pointer, updateCounter, draggedElement=null, chain=Promise.resolve();
  const local={page:'home',modals:[],trail:[],catalog:'pink',catalogItem:null,request:'pink',selectedSlot:null,orderId:0};
  local.streak=0; local.chapter=0; local.level=1; local.selectedLevel=1; local.zoomBay=null; local.scoops=1;
  function note(text){clearTimeout(messageTimer);message.textContent=text;message.classList.add('show');messageTimer=setTimeout(()=>message.classList.remove('show'),2700);}
  const reduced=()=>state.settings.motion==='on'||(state.settings.motion==='system'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  function syncSceneMusic(){
    P.syncMusic(state.settings.music &&
      !local.modals.some(name=>name==='pause'||name==='discard'));
  }
  function render(reset=false){
    const id=[local.page,state.active?.stage||'',local.modals.join('/')].join(':');
    const keep=!reset&&root.dataset.view===id;
    const counter=local.page==='play' && Array.isArray(state.active?.gifts);
    const scroll=keep&&!counter?(root.querySelector('.scroll')?.scrollTop||0):0;
    const dialogScroll=keep&&local.modals.length?(root.querySelector('.dialog')?.scrollTop||0):0;
    const focused=document.activeElement,prevFocus=focused?.dataset?.act,prevVal=focused?.dataset?.val;
    root.dataset.view=id;root.classList.toggle('reduced',reduced());root.dataset.page=local.page;
    const theme=C.themes[state.active?.theme||local.request]||C.themes.pink;
    root.style.setProperty('--order-color',theme.swatch);
    if(local.page==='showroom' && root.firstElementChild?.classList.contains('showroom')){
      const scene=root.firstElementChild;
      Object.assign(scene.dataset,state.display.equipped,{[local.finishPart]:local.finishId});
      scene.querySelector('.finish-book').innerHTML=LuckyCounter.finishControls(state,local);
    }else if(counter && updateCounter){
      updateCounter(state.active,local.zoomBay,reduced());
      if(root.lastElementChild.matches('.veil'))root.lastElementChild.remove();
    }else{
      root.innerHTML=V.page(state,local);
      updateCounter=counter?LuckyCounter.connect(root.firstElementChild,state.active,local.zoomBay):null;
      LuckyFront.connect(root.firstElementChild,local);
      if(local.page==='request'||local.page==='level-request'||(local.page==='home' && state.active?.gifts))LuckyCounter.prepareOverview();
    }
    const modalHTML=V.dialog(state,local);
    if(modalHTML)root.insertAdjacentHTML('beforeend',modalHTML);
    syncSceneMusic();
    const sc=counter?null:root.querySelector('.scroll');if(sc)sc.scrollTop=scroll;
    const dl=modalHTML?root.querySelector('.dialog'):null;
    window.LuckyTutorial?.update(state);
    if(root.firstElementChild && root.firstElementChild.inert!==!!dl)root.firstElementChild.inert=!!dl;
    if(dl)dl.scrollTop=dialogScroll;
    if(keep&&prevFocus&&!focused.isConnected){
      const btn=(dl||root).querySelector(`[data-act="${CSS.escape(prevFocus)}"][data-val="${CSS.escape(prevVal??'')}"]`);
      btn?.focus({preventScroll:true});
    }else if(dl&&!dl.contains(document.activeElement)){dl.querySelector('button')?.focus({preventScroll:true});}
    if(!keep&&!dl) root.querySelector('h1')?.setAttribute('tabindex','-1');
  }
  function go(page,remember=false){if(remember)local.trail.push({page:local.page,id:local.orderId,scroll:root.querySelector('.scroll')?.scrollTop||0});else local.trail=[];local.page=page;local.modals=[];local.selectedSlot=null;local.zoomBay=null;render(true);}
  const openers=[];
  function modal(name){
    const active=document.activeElement;
    openers[local.modals.length]=active?.dataset.act ? {act:active.dataset.act,val:active.dataset.val} : null;
    local.modals.push(name);render(true);
  }
  function back(){if(local.modals.length){
      local.modals.pop();const opener=openers[local.modals.length];render(true);
      if(opener)[...root.querySelectorAll('[data-act]')].find(el=>el.dataset.act===opener.act && el.dataset.val===opener.val && !el.closest('[inert]'))?.focus({preventScroll:true});
      return;
    }else if(local.trail.length){const h=local.trail.pop();local.page=h.page;local.orderId=h.id;render(true);const el=root.querySelector('.scroll');if(el)el.scrollTop=h.scroll;return;}else local.page='home';render(true);}
  function queue(fn){const result=chain.then(fn);chain=result.catch(error=>{note(error.message==='conflict'?'另一窗口已更新进度，请从柜台继续。':'存档未写入。请检查本机存储空间，再试一次。');});return chain;}
  async function change(action,arg,draw=true){
    const prev=state,next=C.step(prev,action,arg);
    if(next===prev)return false;
    try{await P.write(prev.revision,next);}
    catch(e){if(e.message==='conflict'){state=await P.read();go('home');}throw e;}
    state=next;if(draw)render();return true;
  }
  function sound(which,delay=0){P.play(which,state.settings,delay);}
  function itemSound(kind){sound(['cloth','pen','book','clip','paper','zip','cloth','clip','cloth','pen','paper','tape','pen','paper','tape','paper','clip','clip','cloth','clip','cloth','clip','clip','ceramic'][kind]);}
  async function takeFromRack(goods,dropped=null) {
    const a=state.active, card=a?.bags[a.current], value=[goods.color,goods.kind,goods.variant].join('|');
    const slot=root.querySelector(`.shelf-bay.inspected .rack-slot[data-val="${value}"]`);
    const from=!reduced() ? dropped || slot?.querySelector('img')?.getBoundingClientRect() : null;
    const image='assets/items/'+goods.color+'-'+goods.kind+'-'+goods.variant+'.png';
    if(!await change('add-piece',goods,false))return false;
    render();
    const misfit=card && !C.fits(card,goods);
    itemSound(goods.kind);
    const packed=state.active.bags[state.active.current];
    if(slot && C.remaining(state.active,goods)>0){
      if(!reduced() && slot.closest('.inspected'))slot.firstElementChild.animate?.(
        [{opacity:.2,transform:'translateY(-12%)'},{opacity:1,transform:'none'}],{duration:240,easing:'steps(4,end)'});
      const {id,current}=a;
      const soft=['velvet','files','books','cards'].includes(LuckyCounter.fixtures[goods.kind]);
      setTimeout(()=>{if(state.active?.id===id && state.active.current===current &&
        local.page==='play' && !local.modals.length)sound(soft?'soft-restock':'restock');},150);
    }
    const placed=root.querySelector(`.parcel-item[data-bag="${a.current}"][data-index="${card.pieces.length}"]`);
    const destination=from && placed?.querySelector('img')?.getBoundingClientRect();
    if(destination && Element.prototype.animate){
      const ghost=document.createElement('img');ghost.src=image;ghost.className='stock-flight';ghost.setAttribute('aria-hidden','true');
      Object.assign(ghost.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px'});document.body.append(ghost);
      placed.style.visibility='hidden';
      const scene=root.firstElementChild;scene.dataset.transferring='goods';
      const animation=ghost.animate([
        {left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px',rotate:'0deg'},
        {left:(from.left+(destination.left-from.left)*.4)+'px',top:(Math.min(from.top,destination.top)-24)+'px',rotate:'-7deg',offset:.38},
        {left:destination.left+'px',top:(destination.top-4)+'px',width:destination.width+'px',height:destination.height+'px',rotate:'2deg',offset:.86},
        {left:destination.left+'px',top:destination.top+'px',width:destination.width+'px',height:destination.height+'px',rotate:'0deg'}
      ],{duration:dropped?220:360,easing:'cubic-bezier(.2,.65,.35,1)',fill:'forwards'});
      try{await animation.finished;}catch{}finally{
        animation.cancel();ghost.remove();placed.style.visibility='';delete scene.dataset.transferring;
      }
    }
    sound([0,2,4,5,6,8,13,14,15,17,18].includes(goods.kind)?'land-soft':'land-hard');
    // The last piece in: the box settles with a small squash and a chord, and the check button bobs.
    if(state.active.bags.every(b=>b.pieces.length===b.quantity)){
      if(!reduced())root.querySelector('.parcel')?.animate?.([{scale:'1 1'},{scale:'1.05 .93'},{scale:'.98 1.03'},{scale:'1 1'}],{duration:420,easing:'steps(6,end)'});
      sound('full',.08);
    }
    if(misfit){
      local.streak=0;sound('miss',.06);
      const wrong=root.querySelector(`.parcel-item[data-bag="${a.current}"][data-index="${card.pieces.length}"]`);
      wrong?.animate?.([{translate:'0 0'},{translate:'-3px 0'},{translate:'3px 0'},{translate:'0 0'}],{duration:240,easing:'steps(4,end)'});
    }
    if(packed.pieces.length===packed.quantity){
      const matched=packed.pieces.every(g=>C.fits(card,g));
      if(matched){sound('match'+(local.streak%4));local.streak++;root.querySelector('.ticket-paper')?.classList.add('stamping');}else local.streak=0;
    }
    if(state.active?.id===a.id && state.active.current===a.current && local.page==='play' &&
      state.active.bags[a.current].pieces.length===card.quantity && !state.active.bags.some(b=>
        b.opened && b.pieces.length<b.quantity && C.kinds[b.kind].drawer===local.zoomBay)){
      local.zoomBay=null;render();
    }
    return true;
  }
  const needsUnlock=n=>n>C.freeLevels && !P.fullGame();
  function openUnlock(){
    modal('unlock');
    if(!local.price)P.price().then(price=>{if(price){local.price=price;if(local.modals.at(-1)==='unlock')render(true);}});
  }
  function startIntro(replay=false){
    local.replay=replay;go('intro');sound('bell');
    clearTimeout(introTimer);introTimer=setTimeout(()=>queue(()=>finishIntro()),3500);
  }
  async function finishIntro(){
    if(local.page!=='intro')return;
    clearTimeout(introTimer);
    if(!state.seenIntro)await change('intro',null,false);
    go(local.replay?'settings':'home');sound('bell');
  }
  const goodsVal=value=>{const [color,kind,variant]=value.split('|');return {color,kind:Number(kind),variant:Number(variant)};};
  function request(){local.request=V.colors[Math.floor(Math.random()*V.colors.length)];go('request');}
  function resetOrderTools(){
    local.streak=0;local.zoomBay=null;
  }
  function setShelfDrawer(name,edit){
    const idx=C.kinds.findIndex(k=>k.drawer===name);
    if(edit){local.editDrawer=name;local.editKind=idx;local.editVariant=0;local.editGoods=null;render();}
    else return change('drawer',name);
  }
  async function act(name,val){
    const a=state.active, n=Number(val);
    switch(name){
      case 'showroom': {
        const sample=val && C.finishCatalog.find(f=>f.id===val);
        if(val && (!sample || !C.finishAvailable(state,sample)))return;
        local.finishPart=sample?.part||'cloth';
        local.finishId=sample?.id||state.display.equipped[local.finishPart];
        go('showroom',true);return;
      }
      case 'finish-part':
        if(local.page==='showroom' && Object.hasOwn(C.finishes,val)){local.finishPart=val;local.finishId=state.display.equipped[val];render();}return;
      case 'finish-preview': {
        if(local.page!=='showroom')return;
        const sample=C.finishes[local.finishPart].find(f=>f.id===val);
        if(sample && C.finishAvailable(state,sample)){local.finishId=val;render();}return;
      }
      case 'finish-apply':
        if(local.page==='showroom' && val===local.finishId && await change('furnish',{part:local.finishPart,id:val}))sound('place');return;
      case 'book':
        local.selectedLevel=state.active?.level||C.unlockedLevel(state);
        local.chapter=Math.floor((local.selectedLevel-1)/10);
        await LuckyFront.prepareChapter(local.chapter);
        go('book',true);sound('paper');return;
      case 'chapter':
        if(Number.isInteger(n)&&C.chapters[n]){
          await LuckyFront.prepareChapter(n);
          local.selectedLevel=n>local.chapter?n*10+1:(n+1)*10;
          local.chapter=n;render(true);sound('paper');
        }return;
      case 'map-select':
        LuckyFront.select(root,state,local,n);sound('tick');return;
      case 'map-walk':
        LuckyFront.walk(root,local,n);return;
      case 'shop-menu':
        LuckyFront.toggleMenu(root);sound('tick');return;
      case 'level-ticket':
        if(a){if(a.level===n){go('play');}return;}
        if(!C.levels[n-1] || n>C.unlockedLevel(state))return;
        if(needsUnlock(n)){openUnlock();return;}
        local.level=n;local.request=C.levels[n-1].theme;go('level-request',true);sound('paper');return;
      case 'unlock-full':openUnlock();return;
      case 'purchase':case 'restore':{
        if(local.storeBusy)return;
        local.storeBusy=true;render(true);
        const result=await (name==='purchase'?P.purchase():P.restore());
        local.storeBusy=false;
        if(result==='owned'){
          if(local.modals.at(-1)==='unlock')local.modals.pop();
          render(true);sound('seal');note(name==='purchase'?'完整版已解锁，九十关都开放了。':'已恢复完整版。');
        }else{
          render(true);
          if(result==='pending')note('购买正在等待确认，确认后会自动解锁。');
          else if(name==='restore')note('这个 Apple 账户还没有完整版的购买记录。');
          else if(result!=='cancelled')note('暂时连不上 App Store，请稍后再试。');
        }
        return;
      }
      case 'accept-level':
        if(needsUnlock(n)){openUnlock();return;}
        if(await change('start-scoop-level',n,false)){resetOrderTools();go('play');sound('bell');}return;
      case 'scoop-count':
        if([1,2,3].includes(n)){local.scoops=n;render(true);}return;
      case 'scoop':
        if(await change('scoop',null,false)){
          sound('scoop');
          await LuckyCounter.scoopMotion(root.firstElementChild,reduced());
          local.zoomBay=null;render();
        }return;
      case 'pour':
        if(await change('pour',null,false)){
          await LuckyCounter.pourMotion(root.firstElementChild,reduced(),typeof val==='object'?val:null,(index=0,delay=0)=>sound('bead-hit'+index,delay));
          local.zoomBay=null;render();
        }return;
      case 'bead-rules':modal('bead-rules');return;
      case 'tutorial-skip':await change('tutorial-skip',val);return;
      case 'ticket-zoom': modal('ticket');return;
      case 'station-card':
        if(await change('station-card',n,false)){
          const card=a.bags[n];
          // A bead on the tray goes straight to the bay that stocks it.
          if(a.mode==='scoop' && card.opened)local.zoomBay=C.kinds[card.kind].drawer;
          else if(!card.opened || C.kinds[card.kind].drawer!==local.zoomBay)local.zoomBay=null;
          if(local.modals.at(-1)==='ticket')local.modals.pop();
          render();sound(card.opened?'paper':'beads');
          const focus=local.zoomBay?'station-close-rack':card.opened?'ticket-zoom':'tear-all';
          root.querySelector(`[data-act="${focus}"]`)?.focus({preventScroll:true});
        }else if(a?.stage==='shelf' && a.current===n && local.modals.at(-1)==='ticket'){
          back();
        }else if(a?.mode==='scoop' && a.stage==='shelf' && a.current===n && !local.zoomBay){
          local.zoomBay=C.kinds[a.bags[n].kind].drawer;render();sound('book');
          root.querySelector('[data-act="station-close-rack"]')?.focus({preventScroll:true});
        }
        return;
      case 'station-unpack': if(await change('station-unpack'))sound('paper');return;
      case 'station-bay': {
        const kind=C.kinds.findIndex(k=>k.drawer===val);
        if(kind<0 || local.zoomBay || a.stage==='seal')return;
        const current=a.stage!=='reveal' && a.shelfKind===kind && a.shelfVariant===0 && a.drawer===val;
        if(current || a.stage==='gifts' || await change('station-browse',{kind,variant:0},false)){
          local.zoomBay=val;render();sound('book');
          root.querySelector('[data-act="station-close-rack"]')?.focus({preventScroll:true});
        }return;
      }
      case 'station-close-rack':{
        const bay=local.zoomBay;local.zoomBay=null;render();
        root.querySelector(`[data-act="station-bay"][data-val="${bay}"]`)?.focus({preventScroll:true});return;
      }
      case 'station-pack': if(await change('station-pack',null,false)){local.zoomBay=null;render();sound('book');}return;
      case 'add-piece':{
        const goods=goodsVal(val);
        await takeFromRack(goods);
        return;
      }
      case 'return-piece':{
        const [bag,index]=val.split('|').map(Number);
        if(await change('return-piece',{bag,index}))sound('tick');return;
      }
      case 'finish-card':await change('finish-card');return;
      case 'refill':if(await change('refill',n,false)){render(true);}return;
      case 'wrap':
        if(a?.bags.some(b=>b.pieces.length<b.quantity)){modal('shortage');return;}
        if(await change('wrap',null,false)){local.zoomBay=null;render();sound('place');}return;
      case 'wrap-confirm':
        if(await change('wrap',null,false)){local.zoomBay=null;local.modals=[];render(true);sound('place');}return;
      case 'review':if(await change('review',null,false)){local.zoomBay=null;render();}return;
      case 'gift-add':{const g=goodsVal(val);if(await change('add-gift',g))sound('gift');return;}
      case 'gift-return':if(await change('return-gift',n))sound('tick');return;
      case 'stamp':if(await change('stamp'))sound('reveal');return;
      case 'finish-intro':return finishIntro();
      case 'home':go('home');sound('tick');return;
      case 'back':case 'close':back();return;
      case 'settings':go('settings',true);return;
      case 'new-order':if(!a)request();else go('play');return;
      case 'wish':if(C.themes[val]){local.request=val;render();sound('tick');}return;
      case 'accept':if(await change('start-scoop-free',{theme:local.request,scoops:local.scoops},false)){resetOrderTools();go('play');sound('bell');}return;
      case 'resume':if(a){go('play');sound('tick');}return;
      case 'pause':modal('pause');return;
      case 'help':modal('help');return;
      case 'replay':startIntro(true);return;
      case 'setting':await change('setting',{key:val,value:!state.settings[val]});return;
      case 'discard-prompt':modal('discard');return;
      case 'discard':if(await change('discard',null,false)){if(a.level){local.chapter=Math.floor((a.level-1)/10);go('book');}else request();}return;
      case 'pick':if(await change('pick',n))sound('tick');return;
      case 'tear-all':if(await change('tear',1,false)){local.zoomBay=null;render();sound('tear');sound('reveal',.14);}return;
      case 'shelf':if(await change('shelf'))sound('tick');return;
      case 'drawer':await setShelfDrawer(val,false);return;
      case 'kind':await change('browse',{kind:n,variant:0});return;
      case 'variant':await change('browse',{kind:a.shelfKind??a.choice?.kind??C.kinds.findIndex(k=>k.drawer===a.drawer),variant:n});return;
      case 'stock':{const g=goodsVal(val);if(await change('choose',g))sound('tick');return;}
      case 'take':local.selectedSlot=null;if(await change('take'))sound('tick');return;
      case 'repick':await change('repick');render();return;
      case 'loose':local.selectedSlot=null;render();note('点一个空格，把手上的小物放进去。');return;
      case 'slot':{
        if(!a||a.stage!=='pack')return;
        if(local.selectedSlot!==null&&local.selectedSlot!==n){
          const from=local.selectedSlot;local.selectedSlot=null;if(await change('move',{from,to:n}))sound('place');
        }else if(a.slots[n]!==null){local.selectedSlot=local.selectedSlot===n?null:n;render();}
        else if(!a.slots.includes(a.current)){local.selectedSlot=null;if(await change('place',n))sound(a.bags[a.current].goods.kind===2?'book':'place');}
        return;
      }
      case 'auto-place':{const slot=a?.slots.indexOf(null);if(slot>=0){local.selectedSlot=null;if(await change('place',slot))sound(a.bags[a.current].goods.kind===2?'book':'place');}return;}
      case 'deselect':local.selectedSlot=null;render();return;
      case 'edit':{
        if(!a||a.slots[n]==null)return;
        const g=a.bags[a.slots[n]].goods;
        Object.assign(local,{editSlot:n,editDrawer:C.kinds[g.kind].drawer,editKind:g.kind,editVariant:g.variant,editGoods:{...g}});modal('edit');return;
      }
      case 'edit-drawer':setShelfDrawer(val,true);return;
      case 'edit-kind':local.editKind=n;local.editVariant=0;local.editGoods=null;render();return;
      case 'edit-variant':local.editVariant=n;local.editGoods=null;render();return;
      case 'edit-color':local.editGoods=goodsVal(val);render();return;
      case 'edit-confirm':if(await change('replace',{slot:local.editSlot,goods:local.editGoods},false)){local.selectedSlot=null;back();sound('tick');}return;
      case 'undo':local.streak=0;if(await change('undo',null,false)){local.selectedSlot=null;render(true);sound('tick');}return;
      case 'next':local.selectedSlot=null;await change('next');return;
      case 'photo':local.selectedSlot=null;if(await change('photo',null,false)){local.zoomBay=null;render();sound('tick');}return;
      case 'rearrange':await change('rearrange');return;
      case 'seal-hint':note('把封签拖到盒子中缝，或点下方按钮。');return;
      case 'seal':{if(!a)return;const id=a.id;if(await change('seal',null,false)){local.orderId=id;go('result');sound('seal');}return;}
      case 'album':go('album',true);return;
      case 'detail':go('detail',true);local.orderId=n;render(true);return;
      case 'catalog':go('catalog',true);return;
      case 'catalog-color':local.catalog=val;render();return;
      case 'catalog-item':local.catalogItem=goodsVal(val);modal('catalog-item');return;
    }
  }
  let heldStock=null, ignoreStockClick=false;
  function stopStockHold(){
    if(heldStock)clearTimeout(heldStock.timer);
    heldStock=null;
  }
  root.addEventListener('pointerdown',event=>{
    const el=event.target.closest('[data-act="add-piece"]');
    draggedElement=null;
    ignoreStockClick=false;
    if(!el || el.disabled || event.button!==0 || heldStock)return;
    const hold={pointer:event.pointerId,value:el.dataset.val,order:state.active.id,bag:state.active.current};
    heldStock=hold;
    const repeat=async()=>{
      if(document.hidden || heldStock!==hold || el.disabled || !el.closest('.inspected') || state.active?.id!==hold.order || state.active.current!==hold.bag || local.page!=='play' || local.modals.length)return;
      ignoreStockClick=true;
      const goods=goodsVal(hold.value);
      if(!state.learned.hold)await change('tutorial-skip','hold',false);
      if(await takeFromRack(goods)){
        if(heldStock===hold)hold.timer=setTimeout(()=>queue(repeat),75);
      }
    };
    P.unlock();hold.timer=setTimeout(()=>queue(repeat),340);
  });
  for(const name of ['pointerup','pointercancel'])document.addEventListener(name,event=>{
    if(heldStock?.pointer===event.pointerId)stopStockHold();
  });
  window.addEventListener('blur',stopStockHold);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopStockHold();if(state)syncSceneMusic();});
  // The camera can move back on drop. Handle a stationary counter tap on touchend
  // even if the browser suppresses its compatibility click after that drag.
  let counterTap=null;
  root.addEventListener('touchstart',event=>{
    const el=event.target.closest('.counter-scene button:not(:disabled)');
    const t=event.touches[0];
    counterTap=el && event.touches.length===1 ? {el,x:t.clientX,y:t.clientY} : null;
  },{passive:true});
  root.addEventListener('touchmove',event=>{
    const t=event.touches[0];
    if(counterTap && Math.hypot(t.clientX-counterTap.x,t.clientY-counterTap.y)>=5)counterTap=null;
  },{passive:true});
  root.addEventListener('touchcancel',()=>{counterTap=null;});
  root.addEventListener('touchend',event=>{
    const tap=counterTap,t=event.changedTouches[0];counterTap=null;
    // A full bag can pull the camera back while the finger is still down.
    // Consume that release even if the shelf overview is now under the finger.
    if(ignoreStockClick){if(event.cancelable)event.preventDefault();return;}
    if(!tap || !event.cancelable || !tap.el.isConnected || tap.el.disabled ||
      !tap.el.contains(document.elementFromPoint(t.clientX,t.clientY)))return;
    event.preventDefault();
    tap.el.click();
  },{passive:false});
  root.addEventListener('click',event=>{
    if(!event.target.closest('.shop-menu'))LuckyFront.closeMenu(root);
    const el=event.target.closest('[data-act]');if(!el||el.disabled||event.detail && el===draggedElement)return;
    if(ignoreStockClick && event.detail){ignoreStockClick=false;return;}
    P.unlock();const {act:name,val}=el.dataset;queue(()=>act(name,val));
  });
  root.addEventListener('change',e=>{if(e.target.id==='motion')queue(()=>change('setting',{key:'motion',value:e.target.value}));});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&LuckyFront.closeMenu(root)){
      root.querySelector('[data-act="shop-menu"]')?.focus();return;
    }
    if(local.page==='book'&&['ArrowLeft','ArrowRight'].includes(e.key)){
      e.preventDefault();
      const direction=e.key==='ArrowRight'?1:-1,id=local.selectedLevel+direction;
      const stop=root.querySelector(`[data-act="map-select"][data-val="${id}"]`);
      if(stop){P.unlock();LuckyFront.select(root,state,local,id,true);sound('tick');}
      else queue(()=>act('chapter',String(local.chapter+direction)));
      return;
    }
    if(e.key==='Escape'){if(local.modals.length){back();}else if(local.page==='play'&&local.zoomBay){queue(()=>act('station-close-rack',''));}else if(local.page==='play'){modal('pause');}else if(local.page==='intro'){queue(finishIntro);}else{back();}}
    if(e.key==='Tab'&&local.modals.length){const btns=[...root.querySelectorAll('.dialog button:not(:disabled),.dialog select')];if(!btns.length)return;if(e.shiftKey&&document.activeElement===btns[0]){e.preventDefault();btns.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===btns.at(-1)){e.preventDefault();btns[0].focus();}}
  });
  root.addEventListener('pointerdown',e=>{
    if(pointer||!state?.active||e.button!==0||local.modals.length)return;
    const el=e.target.closest('[data-gesture],[data-drag]');if(!el||el.disabled)return;
    P.unlock();const type=el.dataset.gesture||el.dataset.drag;
    pointer={id:e.pointerId,type,el,x:e.clientX,y:e.clientY,last:state.active.tear,sounded:false,start:state.active.tear,from:Number(el.dataset.slot),moved:false,order:state.active.id,current:state.active.current};
    if(type==='tear'){pointer.tearDistance=Math.max(1,el.clientWidth*.58);el.setPointerCapture(e.pointerId);}
  });
  function savePartial(p,val){
    queue(async()=>{if(state.active?.id!==p.order||state.active.current!==p.current||state.active.stage!=='tear')return;
      const done=await change('tear',val,false);
      if(done&&state.active.stage==='reveal'){local.zoomBay=null;render(true);sound('reveal');}
    });
  }
  function drawDrag(p){
    p.frame=0;
    if(!p.el.isConnected)return;
    if(p.type==='tear'){
      p.el.style.setProperty('--cut',p.last*100+'%');
    }else if(p.type==='stock-piece'){
      if(!p.ghost){
        const sprite=p.el.querySelector('img');if(!sprite)return;
        const rect=sprite.getBoundingClientRect();
        p.ghost=sprite.cloneNode();p.ghost.className='stock-flight held';p.ghost.setAttribute('aria-hidden','true');
        Object.assign(p.ghost.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
        document.body.append(p.ghost);p.el.classList.add('dragging');
      }
      p.ghost.style.transform=`translate3d(${p.dx}px,${p.dy}px,0)`;
    }else{
      p.el.classList.add('dragging');p.el.style.setProperty('--dx',p.dx+'px');p.el.style.setProperty('--dy',p.dy+'px');
    }
  }
  document.addEventListener('pointermove',e=>{
    const p=pointer;if(!p||p.id!==e.pointerId)return;
    p.dx=e.clientX-p.x;p.dy=e.clientY-p.y;if(!p.moved && Math.hypot(p.dx,p.dy)<5)return;
    p.moved=true;
    if(p.type==='stock-piece'){stopStockHold();if(ignoreStockClick)return;}
    if(p.type==='tear'){
      p.last=Math.min(1,Math.max(p.last,p.start+p.dx/p.tearDistance));
      if(!p.sounded && p.last-p.start>=.04){p.sounded=true;sound('tear');}
      if(p.last===1 && !p.finished){p.finished=true;savePartial(p,1);}
    }
    if(!p.frame)p.frame=requestAnimationFrame(()=>drawDrag(p));
  });
  function finishPointer(e,cancelled=false){
    const p=pointer;if(!p||p.id!==e.pointerId)return;pointer=null;
    if(p.frame)cancelAnimationFrame(p.frame);
    const dropped=p.ghost?.getBoundingClientRect();
    const spoonDrop=p.type==='scoop-pour'?p.el.querySelector('.loaded-spoon')?.getBoundingClientRect():null;
    p.ghost?.remove();
    if(p.type==='tear'){
      if(p.moved)draggedElement=p.el;
      if(!p.finished && p.last>p.start){drawDrag(p);savePartial(p,p.last);}
      return;
    }
    if(!p.moved)return;
    draggedElement=p.el;
    p.el.classList.remove('dragging');p.el.style.removeProperty('--dx');p.el.style.removeProperty('--dy');
    if(cancelled || (p.type==='stock-piece' && ignoreStockClick))return;
    const target=document.elementFromPoint(e.clientX,e.clientY);
    if(p.type==='scoop-pour'){
      if(target?.closest('[data-pour-tray]') && state.active?.id===p.order && state.active.stage==='drawn')
        queue(()=>act('pour',spoonDrop));
      return;
    }
    if(p.type==='postage'){
      if(target?.closest('[data-box],.parcel-space') && state.active?.id===p.order && state.active.stage==='gifts')
        queue(()=>act('photo',''));
      return;
    }
    if(p.type==='stock-piece'){
      if(target?.closest('[data-box],.parcel-space') && state.active?.id===p.order && state.active?.current===p.current)
        queue(()=>takeFromRack(goodsVal(p.el.dataset.val),dropped));
      return;
    }
    if(p.type==='piece'){
      if(!p.el.isConnected)return;
      const rect=p.el.closest('.box-interior').getBoundingClientRect();
      const fraction=v=>Math.max(0,Math.min(1,v));
      const placement={bag:Number(p.el.dataset.bag),index:Number(p.el.dataset.index),
        x:fraction((e.clientX-rect.left)/rect.width),y:fraction((e.clientY-rect.top)/rect.height)};
      queue(async()=>{if(state.active?.id===p.order && await change('position',placement))sound('place');});
      return;
    }
    if(p.type==='seal'&&target?.closest('[data-dropseal]'))queue(()=>act('seal',''));
    const slot=target?.closest('[data-slot]');if(!slot)return;
    const to=Number(slot.dataset.slot);
    if(p.type==='pending')queue(async()=>{if(await change('place',to))sound('place');});
    if(p.type==='slot')queue(async()=>{local.selectedSlot=null;if(await change('move',{from:p.from,to}))sound('place');});
  }
  document.addEventListener('pointerup',e=>finishPointer(e));document.addEventListener('pointercancel',e=>finishPointer(e,true));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&pointer?.type==='tear')savePartial(pointer,pointer.last);});
  window.addEventListener('storage',event=>{if(event.key===P.key)queue(async()=>{const latest=await P.read();if(latest.revision!==state.revision){state=latest;go('home');note('进度已与另一窗口同步。');}});});
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  window.addEventListener('resize',()=>LuckyFront.resize(root,local));
  media.addEventListener?.('change',()=>{if(state)root.classList.toggle('reduced',reduced());});
  async function boot(){
    window.addEventListener('lucky-store',()=>P.refreshStore().then(()=>{if(P.fullGame()&&local.modals.at(-1)==='unlock')local.modals.pop();if(state)render(true);}));
    await P.refreshStore();
    try {state=await P.read();if(state.seenIntro)go('home');else startIntro();if(P.didRecover())note('已恢复上一次保存的进度。');}
    catch(error){const reason=error.message==='invalid-save'?'存档内容损坏，当前进度和备份均已保留。':'本机存储暂时无法访问，请稍后重试。';root.innerHTML='<section class="screen failure"><h1>暂时读不到存档</h1><p>'+reason+'</p><button class="btn primary" id="retry">重新读取</button></section>';root.querySelector('#retry').onclick=boot;}
  }
  boot();
})();
