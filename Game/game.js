'use strict';
(function controller(){
  const C=LuckyCore,P=LuckyPlatform,V=LuckyView;
  const root=document.getElementById('game'),message=document.getElementById('messages');
  let state, introTimer, messageTimer, pointer, draggedElement=null, chain=Promise.resolve();
  const local={page:'home',modals:[],trail:[],catalog:'pink',catalogItem:null,request:'pink',selectedSlot:null,orderId:0};
  local.streak=0; local.chapter=0; local.level=1; local.giftKind=4; local.giftVariant=0;
  function note(text){clearTimeout(messageTimer);message.textContent=text;message.classList.add('show');messageTimer=setTimeout(()=>message.classList.remove('show'),2700);}
  const reduced=()=>state.settings.motion==='on'||(state.settings.motion==='system'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  function syncCounterMusic(){
    P.syncMusic(state.settings.music && local.page==='play' &&
      local.modals.every(name=>name==='ticket'));
  }
  function render(reset=false){
    const id=[local.page,state.active?.stage||'',local.modals.join('/')].join(':');
    const keep=!reset&&root.dataset.view===id;
    const scroll=keep?(root.querySelector('.scroll')?.scrollTop||0):0, dialogScroll=keep?(root.querySelector('.dialog')?.scrollTop||0):0;
    const prevFocus=document.activeElement?.dataset?.act,prevVal=document.activeElement?.dataset?.val;
    root.dataset.view=id;root.classList.toggle('reduced',reduced());root.dataset.page=local.page;
    const theme=C.themes[state.active?.theme||local.request]||C.themes.pink;
    root.style.setProperty('--order-color',theme.swatch);
    root.innerHTML=V.page(state,local)+V.dialog(state,local);
    syncCounterMusic();
    const sc=root.querySelector('.scroll');if(sc)sc.scrollTop=scroll;
    const dl=root.querySelector('.dialog');if(dl){dl.scrollTop=dialogScroll;root.querySelector('.screen').inert=true;}
    if(keep&&prevFocus){
      const btn=[...root.querySelectorAll('[data-act]')].find(el=>el.dataset.act===prevFocus&&el.dataset.val===prevVal&&(!dl||dl.contains(el)));
      btn?.focus({preventScroll:true});
    }else if(dl){dl.querySelector('button')?.focus({preventScroll:true});}
    if(!keep&&!dl) root.querySelector('h1')?.setAttribute('tabindex','-1');
  }
  function go(page,remember=false){if(remember)local.trail.push({page:local.page,id:local.orderId,scroll:root.querySelector('.scroll')?.scrollTop||0});else local.trail=[];local.page=page;local.modals=[];local.selectedSlot=null;render(true);}
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
  async function takeFromRack(goods,dragged=false) {
    const a=state.active, card=a?.bags[a.current], value=[goods.color,goods.kind,goods.variant].join('|');
    const slot=[...root.querySelectorAll('.rack-slot')].find(el=>el.dataset.val===value);
    const from=dragged?null:slot?.getBoundingClientRect(), image='assets/items/'+goods.color+'-'+goods.kind+'-'+goods.variant+'.png';
    if(!await change('add-piece',goods))return false;
    itemSound(goods.kind);
    const packed=state.active.bags[state.active.current];
    if(packed.pieces.length===packed.quantity){
      const matched=packed.pieces.every(g=>g.kind===card.kind && g.color===card.color &&
        (card.variant===null || g.variant===card.variant));
      if(matched){sound('match'+(local.streak%4));local.streak++;}else local.streak=0;
    }
    if(!slot)return true;
    const updated=[...root.querySelectorAll('.rack-slot')].find(el=>el.dataset.val===value);
    if(C.remaining(state.active,goods)>0){
      updated?.classList.add('restock');
      const {id,current}=a;
      const soft=['velvet','files','books','cards'].includes(LuckyCounter.fixtures[goods.kind]);
      setTimeout(()=>{if(state.active?.id===id && state.active.current===current &&
        local.page==='play' && !local.modals.length)sound(soft?'soft-restock':'restock');},150);
    }
    const box=root.querySelector('[data-box]')?.getBoundingClientRect();
    if(from && box && image && !reduced() && Element.prototype.animate){
      const ghost=document.createElement('img');ghost.src=image;ghost.className='stock-flight';ghost.setAttribute('aria-hidden','true');
      const size=Math.min(from.width,from.height)*.84,x=from.left+(from.width-size)/2,y=from.top;
      Object.assign(ghost.style,{left:x+'px',top:y+'px',width:size+'px',height:size+'px'});document.body.append(ghost);
      const dx=box.left+box.width*.5-x-size/2,dy=box.top+box.height*.48-y-size/2;
      const lift=goods.kind===14?'translateX(15%)':'translateY(-22%)';
      const animation=ghost.animate([{transform:'none'},{transform:lift,offset:.2},{transform:'translate('+dx+'px,'+dy+'px) scale(.72)',opacity:.25}],{duration:285,easing:'ease-out'});
      animation.onfinish=animation.oncancel=()=>ghost.remove();
    }
    return true;
  }
  function startIntro(replay=false){
    local.replay=replay;go('intro');sound('bell');
    clearTimeout(introTimer);introTimer=setTimeout(()=>queue(()=>finishIntro()),3500);
  }
  async function finishIntro(){
    if(local.page!=='intro')return;
    clearTimeout(introTimer);
    if(!state.seenIntro)await change('intro',null,false);
    go(local.replay?'settings':'home');
  }
  const goodsVal=value=>{const [color,kind,variant]=value.split('|');return {color,kind:Number(kind),variant:Number(variant)};};
  function request(){local.request=V.colors[Math.floor(Math.random()*V.colors.length)];go('request');}
  function resetOrderTools(){
    local.streak=0;local.giftKind=4;local.giftVariant=0;
  }
  function setShelfDrawer(name,edit){
    const idx=C.kinds.findIndex(k=>k.drawer===name);
    if(edit){local.editDrawer=name;local.editKind=idx;local.editVariant=0;local.editGoods=null;render();}
    else return change('drawer',name);
  }
  async function act(name,val){
    const a=state.active, n=Number(val);
    switch(name){
      case 'book':local.chapter=Math.floor((C.unlockedLevel(state)-1)/10);go('book',true);return;
      case 'chapter':if(Number.isInteger(n)&&C.chapters[n]){local.chapter=n;render(true);}return;
      case 'level-ticket':
        if(a){if(a.level===n){go('play');}return;}
        if(!C.levels[n-1] || n>C.unlockedLevel(state))return;
        local.level=n;local.request=C.levels[n-1].theme;go('level-request',true);return;
      case 'accept-level':
        if(await change('start-level',n,false)){resetOrderTools();go('play');sound('bell');}return;
      case 'ticket-zoom': modal('ticket');return;
      case 'station-card':
        if(await change('station-card',n,false)){
          if(local.modals.at(-1)==='ticket')local.modals.pop();
          render();sound(a.bags[n].opened?'paper':'beads');
        }return;
      case 'station-unpack': if(await change('station-unpack'))sound('paper');return;
      case 'station-bay': {
        const kind=C.kinds.findIndex(k=>k.drawer===val);
        if(await change('station-browse',{kind,variant:0}))sound('book');return;
      }
      case 'station-type': if(await change('station-browse',{kind:n,variant:0}))sound('tick');return;
      case 'station-style': if(await change('station-browse',{kind:a.stage==='reveal'?a.bags[a.current].kind:(a.shelfKind??0),variant:n}))sound('tick');return;
      case 'station-pack': if(await change('station-pack'))sound('book');return;
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
        if(await change('wrap'))sound('place');return;
      case 'wrap-confirm':
        if(await change('wrap',null,false)){local.modals=[];render(true);sound('place');}return;
      case 'review':await change('review');return;
      case 'gift-kind':local.giftKind=n;local.giftVariant=0;render();return;
      case 'gift-variant':local.giftVariant=n;render();return;
      case 'gift-add':{const g=goodsVal(val);if(await change('add-gift',g))sound('gift');return;}
      case 'gift-return':if(await change('return-gift',n))sound('tick');return;
      case 'stamp':if(await change('stamp'))sound('reveal');return;
      case 'finish-intro':return finishIntro();
      case 'home':go('home');return;
      case 'back':case 'close':back();return;
      case 'settings':go('settings',true);return;
      case 'new-order':if(!a)request();else go('play');return;
      case 'wish':if(C.themes[val]){local.request=val;render();sound('tick');}return;
      case 'accept':if(await change('start-free',local.request,false)){resetOrderTools();go('play');sound('bell');}return;
      case 'resume':if(a){go('play');}return;
      case 'pause':modal('pause');return;
      case 'help':modal('help');return;
      case 'replay':startIntro(true);return;
      case 'setting':await change('setting',{key:val,value:!state.settings[val]});return;
      case 'discard-prompt':modal('discard');return;
      case 'discard':if(await change('discard',null,false)){if(a.level){local.chapter=Math.floor((a.level-1)/10);go('book');}else request();}return;
      case 'pick':if(await change('pick',n))sound('tick');return;
      case 'tear-all':if(await change('tear',1)){sound('tear');sound('reveal',.14);}return;
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
      case 'undo':local.streak=0;if(await change('undo',null,false)){local.selectedSlot=null;render(true);note('已撤回上一次配货操作。');}return;
      case 'next':local.selectedSlot=null;await change('next');return;
      case 'photo':local.selectedSlot=null;if(await change('photo'))sound('tick');return;
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
      if(document.hidden || heldStock!==hold || state.active?.id!==hold.order || state.active.current!==hold.bag || local.page!=='play' || local.modals.length)return;
      ignoreStockClick=true;
      const goods=goodsVal(hold.value);
      if(await takeFromRack(goods)){
        if(heldStock===hold)hold.timer=setTimeout(()=>queue(repeat),175);
      }
    };
    P.unlock();hold.timer=setTimeout(()=>queue(repeat),340);
  });
  for(const name of ['pointerup','pointercancel'])document.addEventListener(name,event=>{
    if(heldStock?.pointer===event.pointerId)stopStockHold();
  });
  window.addEventListener('blur',stopStockHold);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopStockHold();if(state)syncCounterMusic();});
  root.addEventListener('click',event=>{
    const el=event.target.closest('[data-act]');if(!el||el.disabled||event.detail && el===draggedElement)return;
    if(el.dataset.act==='add-piece' && ignoreStockClick && event.detail){ignoreStockClick=false;return;}
    P.unlock();const {act:name,val}=el.dataset;queue(()=>act(name,val));
  });
  root.addEventListener('change',e=>{if(e.target.id==='motion')queue(()=>change('setting',{key:'motion',value:e.target.value}));});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(local.modals.length){back();}else if(local.page==='play'){modal('pause');}else if(local.page==='intro'){queue(finishIntro);}else{back();}}
    if(e.key==='Tab'&&local.modals.length){const btns=[...root.querySelectorAll('.dialog button:not(:disabled),.dialog select')];if(!btns.length)return;if(e.shiftKey&&document.activeElement===btns[0]){e.preventDefault();btns.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===btns.at(-1)){e.preventDefault();btns[0].focus();}}
  });
  root.addEventListener('pointerdown',e=>{
    if(pointer||!state?.active||e.button!==0||local.modals.length)return;
    const el=e.target.closest('[data-gesture],[data-drag]');if(!el)return;
    P.unlock();const type=el.dataset.gesture||el.dataset.drag;
    pointer={id:e.pointerId,type,el,x:e.clientX,y:e.clientY,last:state.active.tear,sounded:false,start:state.active.tear,from:Number(el.dataset.slot),moved:false,order:state.active.id,current:state.active.current};
    if(type==='tear')el.setPointerCapture(e.pointerId);
  });
  function savePartial(p,val){
    queue(async()=>{if(state.active?.id!==p.order||state.active.current!==p.current||state.active.stage!=='tear')return;
      const done=await change('tear',val,false);
      if(done&&state.active.stage==='reveal'){render(true);sound('reveal');}
    });
  }
  document.addEventListener('pointermove',e=>{
    const p=pointer;if(!p||p.id!==e.pointerId)return;
    const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.hypot(dx,dy)<5&&!p.moved)return;p.moved=true;
    if(p.type==='stock-piece')stopStockHold();
    if(p.type==='tear'){
      const next=Math.min(1,Math.max(p.last,p.start+dx/(p.el.clientWidth*.58)));
      p.last=next;p.el.style.setProperty('--cut',(next*100)+'%');
      if(!p.sounded && next-p.start>=.04){p.sounded=true;sound('tear');}
      if(next===1 && !p.finished){p.finished=true;savePartial(p,1);}
    }else{
      p.el.classList.add('dragging');p.el.style.setProperty('--dx',dx+'px');p.el.style.setProperty('--dy',dy+'px');
    }
  });
  function finishPointer(e,cancelled=false){
    const p=pointer;if(!p||p.id!==e.pointerId)return;pointer=null;
    if(p.type==='tear'){if(p.moved)draggedElement=p.el;if(!p.finished && p.last>p.start)savePartial(p,p.last);return;}
    if(!p.moved)return;
    draggedElement=p.el;
    p.el.classList.remove('dragging');p.el.style.removeProperty('--dx');p.el.style.removeProperty('--dy');
    if(cancelled)return;
    const target=document.elementFromPoint(e.clientX,e.clientY);
    if(p.type==='stock-piece'){
      if(target?.closest('[data-box]') && state.active?.id===p.order && state.active?.current===p.current)
        queue(()=>takeFromRack(goodsVal(p.el.dataset.val),true));
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
  media.addEventListener?.('change',()=>{if(state)root.classList.toggle('reduced',reduced());});
  async function boot(){
    try {state=await P.read();if(state.seenIntro)go('home');else startIntro();if(P.didRecover())note('已恢复上一次保存的进度。');}
    catch(error){const reason=error.message==='invalid-save'?'存档内容损坏，当前进度和备份均已保留。':'本机存储暂时无法访问，请稍后重试。';root.innerHTML='<section class="screen failure"><h1>暂时读不到存档</h1><p>'+reason+'</p><button class="btn primary" id="retry">重新读取</button></section>';root.querySelector('#retry').onclick=boot;}
  }
  boot();
})();
