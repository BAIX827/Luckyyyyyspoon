'use strict';
window.LuckyCounter = (() => {
  const C = LuckyCore;
  const {button, icon} = LuckyView;
  const departments={desk:'桌面',cloth:'桌布',rack:'货架'};
  const colors = Object.keys(C.themes);
  const bays = ['发饰', '书写', '纸品', '随身'];
  const fixtures = ['velvet','holes','books','cards','files','pegs','velvet','cards','velvet','holes','files','files','holes','files','spindle','files','pegs','pegs','pegs','files','pegs','files','binder-rail','cup-grid'];
  const item = g => `<img draggable="false" alt="" class="counter-item" src="assets/items/${g.color}-${g.kind}-${g.variant}.png">`;
  const label = g => C.themes[g.color].name + C.itemName(g.color, g.kind, g.variant);
  const cardName = b => b.variant === null ? C.kinds[b.kind].name : C.itemName(b.color, b.kind, b.variant);
  const bagIcon = b => b.opened ? item({...b, variant:b.variant ?? 0}) : icon('bag', 22);
  const prop = (file, cls='') => `<img class="physical-prop ${cls}" draggable="false" alt="" src="assets/${file}">`;
  let previewRequested=false;
  function prepareOverview() {
    if(previewRequested)return;
    previewRequested=true;
    const image=new Image();
    image.decoding='async';image.fetchPriority='low';
    image.onerror=()=>{previewRequested=false;};
    image.src='assets/counter/stock-preview.webp';
    image.decode?.().catch(()=>{});
  }

  function receipt(a, expanded=false) {
    const busy = ['tear','gifts','seal'].includes(a.stage);
    if (expanded) {
      return '<div class="expanded-lines">' + a.bags.map((b,i) => {
        const description = b.opened ? cardName(b) : '第 ' + (i+1) + ' 袋';
        const progress = b.opened ? b.pieces.length+'/'+b.quantity : '待拆';
        return button('station-card', bagIcon(b) + `<span>${description}</span><em>${progress}</em>`,
          'note-line', i, `aria-label="${b.opened?C.themes[b.color].name:''}${description}，${progress}" ${busy?'disabled':''}`);
      }).join('') + '</div>';
    }
    const b = a.bags[a.current];
    const picked = b?.opened;
    const filled = picked && b.pieces.length === b.quantity;
    const name = picked ? cardName(b) : '';
    const tally = a.bags.map((card,i) => `<i class="ticket-mark ${card.opened?'opened':''} ${card.opened && card.pieces.length===card.quantity?'filled':''} ${card.opened && i===a.current?'reading':''}">${bagIcon(card)}</i>`).join('');
    const picture = picked ? item({...b,variant:b.variant??0}) : icon(a.theme,36);
    const count = picked ? `<em>${b.pieces.length}/${b.quantity}</em>` : '';
    const summary = picked ? C.themes[b.color].name + ' ' + name + ' ' + b.pieces.length+'/'+b.quantity : C.themes[a.theme].name;
    return button('ticket-zoom',
      `<span class="binder"></span><span class="slip-head"><b>${a.customer}</b><small>${a.level?'第 '+a.level+' 关':'#'+String(a.id).padStart(3,'0')}</small></span>
      <span class="slip-wish">${picture}<span><strong>${name}</strong></span>${count}</span>
      <span class="bag-marks" aria-hidden="true">${tally}</span>`,
      'ticket-paper'+(filled?' completed':''), '', `aria-label="${a.customer}的配货单，${summary}，查看五袋明细" aria-haspopup="dialog"`);
  }

  // A bay has a permanent address for every style. Both camera distances use these same cubbies.
  const shelves=bays.map(name=>C.kinds.flatMap((k,kind)=>k.drawer===name ?
    k.styles.map((style,variant)=>({kind,variant,style})) : []));
  function stockArt(g) {
    if(g.kind!==0 && g.kind!==14)return item(g);
    return `<img draggable="false" alt="" class="counter-item mounted-item ${g.variant?'twist':''}" src="assets/counter/${g.kind===0?'band':'roll'}-${g.color}.webp">`;
  }
  const keyOf=g=>[g.color,g.kind,g.variant].join('|');
  function inventory(a) {
    const gift=a.stage==='gifts', card=a.bags[a.current];
    const used=new Map();
    for(const g of gift?a.gifts:a.bags.flatMap(b=>b.pieces)){
      const key=keyOf(g);
      used.set(key,(used.get(key)||0)+1);
    }
    return {gift,used,capacity:C.kinds.map((_,kind)=>C.stockCapacity(a,kind,gift)),
      picking:gift?a.gifts.length<2:a.stage==='shelf' && !!card?.opened && card.pieces.length<card.quantity};
  }
  function bayAvailable(a,i) {
    return a.stage!=='seal' && shelves[i].some(g=>C.isStocked(a,g.kind) && (a.stage!=='gifts'||C.giftKinds.includes(g.kind)));
  }
  function cubbies(bay,stock,detail) {
    return shelves[bay].map(({kind,variant,style})=>{
      if(!stock.capacity[kind])return '<div class="stock-cubby vacant" aria-hidden="true"><div class="cubby-stock"></div><div class="shelf-edge"></div></div>';
      const offered=!stock.gift || C.giftKinds.includes(kind);
      const slots=colors.map(color=>{
        const g={kind,variant,color}, key=keyOf(g), used=stock.used.get(key)||0;
        const left=stock.capacity[kind]-used, cls='rack-slot'+(left?'':' sold-out');
        if(!detail){
          const mounted=kind===0||kind===14;
          return `<span class="${cls}" data-val="${key}"><i class="rack-preview${mounted?' on-rail':''}${mounted&&variant?' twisted':''}"></i></span>`;
        }
        return button(stock.gift?'gift-add':'add-piece',stockArt(g)+`<small class="${used?'count-changed':''}">×${left}</small>`,
          cls,key,`aria-label="${label(g)}，库存${left}" ${offered&&stock.picking&&left?'':'disabled'} ${stock.gift?'':'data-drag="stock-piece"'}`);
      }).join('');
      const group=detail?`role="group" aria-label="${style}"`:'';
      const mounted=kind===0||kind===14?' mounted-stock':'';
      return `<div class="stock-cubby ${fixtures[kind]} ${offered?'':'off-sale'}" data-kind="${kind}" data-variant="${variant}" ${group}><div class="cubby-stock${mounted}">${slots}</div><div class="shelf-edge"></div></div>`;
    }).join('');
  }
  function shelfBay(a,i,stock,detail=false) {
    const name=bays[i];
    const hit=detail?'':button('station-bay','','bay-hit',name,`aria-label="放大${name}区" ${bayAvailable(a,i)?'':'hidden'}`);
    return `<section class="shelf-bay${detail?' bay-detail':''}" data-bay="${name}" aria-label="${name}区" ${detail?'inert':''}>
      <div class="cabinet-crown"></div><div class="bay-stock" ${detail?'':'aria-hidden="true"'}>${cubbies(i,stock,detail)}</div>
      <div class="cabinet-base"><span>${name}</span></div>${hit}</section>`;
  }
  function stockroom(a) {
    const stock=inventory(a);
    return `<div class="stockroom" aria-label="货架"><div class="shop-canopy"></div><div class="aisle-window"><div class="shelf-world">
      ${bays.map((_,i)=>shelfBay(a,i,stock)).join('')}</div></div></div>`;
  }

  function parcel(a) {
    const total = C.pieceCount(a.bags), sealed = a.stage==='seal';
    let n = 0;
    const pieces = a.bags.flatMap((b,bag)=>b.pieces.map((g,index)=>{
      const slot=n++, rows=Math.ceil(total/4);
      const x=g.position?.x??(.15+(slot%4)*.23), y=g.position?.y??((Math.floor(slot/4)+.5)/Math.max(2,rows));
      if(a.stage==='photo')return `<span class="parcel-item" style="left:${x*100}%;top:${y*100}%">${item(g)}</span>`;
      return button('return-piece',item(g),'parcel-item',bag+'|'+index,`style="left:${x*100}%;top:${y*100}%" aria-label="取回${label(g)}" data-bag="${bag}" data-index="${index}" ${['pack','shelf'].includes(a.stage)?'data-drag="piece"':'disabled'}`);
    })).join('');
    const bonus = a.gifts.map((g,i)=>a.stage==='photo' ? `<span class="parcel-gift" style="right:${2+18*i}%">${item(g)}</span>` : button('gift-return',item(g),'parcel-gift',i,`style="right:${2+18*i}%" aria-label="收回赠品${label(g)}" ${a.stage==='gifts'?'':'disabled'}`)).join('');
    return `<div class="parcel ${sealed?'sealed':''}" data-box>${prop('counter/parcel-'+(sealed?'closed':'open')+'.webp')}${sealed?'':`<div class="tissue box-interior">${pieces}${bonus}</div>`}</div>`;
  }

  function hand(a) {
    const b=a.bags[a.current], next=a.bags.findIndex(card=>!card.opened);
    if(a.stage==='tear') {
      const bag=prop('props/bag-'+b.wrapper+'.png');
      return button('tear-all',`<span class="pouch"><span class="pouch-base">${bag}</span><span class="pouch-top">${bag}</span><i class="tear-track"></i></span><b class="prop-tag">撕开 →</b>`,
        'hand-prop tear-prop','',`data-gesture="tear" style="--cut:${a.tear*100}%" aria-label="向右撕开盲袋，也可轻点"`);
    }
    if(a.stage==='reveal') return button('station-unpack',`<span class="drawn-card">${item({...b,variant:b.variant??0})}<b>×${b.quantity}</b></span>${prop('props/open-'+b.wrapper+'.png','wrapper')}`,
      'hand-prop reveal-prop','','aria-label="收起图卡，去货架取货"');
    if(a.stage==='gifts') return button('photo',icon(a.theme,40)+`<b>贴封签</b><small>赠品 ${a.gifts.length}/2</small>`,'postage-sticker','','data-drag="postage" aria-label="贴封签，可拖到盒子上或轻点"');
    if(a.stage==='seal') return `<div class="dispatch-card"><small>收件人</small><b>${a.customer}</b><i class="barcode"></i><small>#${String(a.id).padStart(3,'0')}</small></div>`;
    if(next===-1)return '';
    const ready=!b?.opened || b.pieces.length===b.quantity;
    return button('station-card',prop('counter/scoop.webp')+`<b class="prop-tag">${C.count(a)?'下一袋':'舀一勺'}</b>`,'hand-prop scoop-prop'+(ready?' ready':''),next);
  }

  function deskParts(a) {
    const opened=C.count(a), n=C.pieceCount(a.bags);
    const action = a.stage==='pack' ? button('wrap','挑赠品','box-action') :
      a.stage==='seal' ? button('seal','寄出','box-action') :
      opened===5 && n && ['shelf','reveal','tray'].includes(a.stage) ? button('station-pack','核对装箱','box-action') : '';
    const extra = a.stage==='gifts' ? button('review','返回装盒','utility-label') : a.stage==='seal' ? button('rearrange','拆回','utility-label') : '';
    const stamp = a.stage==='seal' && a.level && a.level%10===0 ? (a.stamp?`<span class="stamped">${icon(a.theme,18)} 已盖章</span>`:button('stamp','盖纪念章','utility-label')) : '';
    return {tools:`${button('station-close-rack',icon('back',21),'pixel-tool rack-back','','aria-label="返回整面货架"')}${button('pause',icon('pause',20),'pixel-tool','','aria-label="暂停"')}${C.canUndo(a)?button('undo','↶','pixel-tool','','aria-label="撤回" title="撤回"'):''}${extra}${stamp}`, note:receipt(a), hand:hand(a), box:parcel(a)+action};
  }
  function render(s,l) {
    const a=s.active, zoom=a.stage==='seal'?null:l.zoomBay;
    const parts=deskParts(a);
    return `<section class="screen counter-scene" ${finishAttrs(s.display.equipped)} data-stage="${a.stage}" data-camera="${zoom?'near':'wide'}" aria-label="打包柜台">
      ${stockroom(a)}<div class="table-surface" aria-hidden="true"></div><header class="counter-tools">${parts.tools}</header>
      <div class="counter-desk"><aside class="counter-note">${parts.note}</aside><div class="hand-space">${parts.hand}</div><div class="parcel-space">${parts.box}</div></div>
      </section>`;
  }

  // Keep the overview at its own size. A visited bay keeps its full-size picking surface
  // so the camera can move it on the compositor without laying out the 180 products again.
  function connect(scene,a,zoom) {
    const aisle=scene.querySelector('.aisle-window'), overview=aisle.querySelector('.shelf-world'), canopy=scene.querySelector('.shop-canopy');
    const areas=[...aisle.querySelectorAll('.shelf-bay')].map((wide,i)=>{
      const rows=[...wide.querySelectorAll('.stock-cubby')].map((node,j)=>{
        const {kind,variant}=shelves[i][j];
        const products=[...node.querySelectorAll('.rack-slot')].map((sample,c)=>({
          sample,key:sample.dataset.val,name:label({kind,variant,color:colors[c]})
        }));
        return {node,kind,gift:C.giftKinds.includes(kind),products};
      });
      return {wide,rows,hit:wide.querySelector('.bay-hit')};
    });
    const elements={tools:scene.querySelector('.counter-tools'),note:scene.querySelector('.counter-note'),
      hand:scene.querySelector('.hand-space'),box:scene.querySelector('.parcel-space')};
    let previousOrder=a, previousZoom=null, previousStock=inventory(a), previousParts=deskParts(a), flight;
    function detailFor(i,order,stock) {
      const area=areas[i];
      if(!area.detail){
        aisle.insertAdjacentHTML('beforeend',shelfBay(order,i,stock,true));
        area.detail=aisle.lastElementChild;
        const rows=area.detail.querySelectorAll('.stock-cubby');
        area.rows.forEach((row,j)=>{
          row.detail=rows[j];
          const slots=row.detail.querySelectorAll('.rack-slot');
          row.products.forEach((product,c)=>{product.slot=slots[c];});
        });
      }
      return area.detail;
    }
    // A touch or a mouse entering the bay can start decoding before the tap is released.
    function prepareBay(event) {
      const hit=event.target.closest('.bay-hit');
      if(hit && !hit.hidden)detailFor(bays.indexOf(hit.dataset.val),previousOrder,previousStock);
    }
    overview.addEventListener('pointerover',prepareBay);
    overview.addEventListener('focusin',prepareBay);
    function aim(order,stock,selected,reduceMotion) {
      const i=bays.indexOf(selected||previousZoom), area=areas[i], detail=detailFor(i,order,stock);
      const animate=!reduceMotion && !!detail.animate;
      const from=animate?(flight?.node===detail || !selected?detail:area.wide).getBoundingClientRect():null;
      if(flight){
        flight.animation.onfinish=null;flight.animation.cancel();
        flight.node.classList.remove('camera-moving');flight=null;
      }
      const base=animate?detail.getBoundingClientRect():null;
      const to=animate?(selected?base:area.wide.getBoundingClientRect()):null;
      scene.dataset.camera=selected?'near':'wide';
      if(selected)overview.setAttribute('aria-hidden','true');else overview.removeAttribute('aria-hidden');
      if(selected)canopy.style.setProperty('--canopy-x',i*100/3+'%');
      detail.inert=!selected;detail.classList.toggle('inspected',!!selected);
      if(!animate)return;
      const transform=r=>`translate(${r.left-base.left}px,${r.top-base.top}px) scale(${r.width/base.width},${r.height/base.height})`;
      detail.classList.add('camera-moving');
      const animation=detail.animate([{transform:transform(from)},{transform:transform(to)}],{duration:270,easing:'cubic-bezier(.22,.68,.22,1)'});
      flight={node:detail,animation};
      animation.onfinish=()=>{detail.classList.remove('camera-moving');flight=null;};
    }
    function syncStock(next) {
      const modeChanged=next.gift!==previousStock.gift;
      for(const area of areas)for(const row of area.rows){
        const offered=!next.gift||row.gift;
        if(modeChanged){
          row.node.classList.toggle('off-sale',!offered);
          row.detail?.classList.toggle('off-sale',!offered);
        }
        for(const {sample,key,name,slot} of row.products){
          const used=next.used.get(key)||0, was=previousStock.used.get(key)||0;
          const left=next.capacity[row.kind]-used, changed=left!==previousStock.capacity[row.kind]-was;
          if(changed)sample.classList.toggle('sold-out',!left);
          if(!slot)continue;
          if(changed){
            slot.classList.toggle('sold-out',!left);
            slot.lastElementChild.textContent='×'+left;slot.setAttribute('aria-label',name+'，库存'+left);
          }
          if(!!used!==!!was)slot.lastElementChild.classList.toggle('count-changed',!!used);
          const disabled=!offered||!next.picking||!left;
          if(slot.disabled!==disabled)slot.disabled=disabled;
          if(modeChanged){
            slot.dataset.act=next.gift?'gift-add':'add-piece';
            if(next.gift)delete slot.dataset.drag;else slot.dataset.drag='stock-piece';
          }
        }
      }
      previousStock=next;
    }
    function update(order,selected,reduceMotion) {
      if(previousOrder===order && previousZoom===selected)return;
      if(order!==previousOrder){
        syncStock(inventory(order));
        const parts=deskParts(order);
        for(const key of Object.keys(elements))if(parts[key]!==previousParts[key])elements[key].innerHTML=parts[key];
        previousParts=parts;
      }
      if(order.stage!==previousOrder.stage)scene.dataset.stage=order.stage;
      if(previousZoom!==selected)aim(order,previousStock,selected,reduceMotion);
      if(previousZoom!==selected || previousOrder.stage!==order.stage){
        areas.forEach(({hit},i)=>{hit.hidden=!!selected||!bayAvailable(order,i);});
      }
      previousOrder=order;previousZoom=selected;
    }
    if(zoom)update(a,zoom,true);
    return update;
  }
  const photo = o => parcel({bags:o.cards,gifts:o.gifts,stage:'photo'});
  function finishAttrs(selection){
    return Object.keys(departments).map(part=>`data-${part}="${selection[part]}"`).join(' ');
  }
  function finishControls(s,l) {
    const part=l.finishPart, options=C.finishes[part], selected=options.find(f=>f.id===l.finishId);
    const funds=C.balance(s), active=s.display.equipped[part]===selected.id;
    const owned=C.ownsFinish(s,selected), through=C.completedLevels(s);
    const tabs=Object.entries(departments).map(([id,name])=>button('finish-part',name,'finish-tab',id,`aria-pressed="${part===id}"`)).join('');
    const available=options.filter(f=>C.finishAvailable(s,f,through));
    const upcoming=options.find(f=>!C.finishAvailable(s,f,through));
    const swatches=available.map(f=>button('finish-preview',`<i class="finish-chip chip-${f.id}"></i><span>${f.name}</span>`,'finish-swatch',f.id,`aria-pressed="${f.id===selected.id}"`)).join('');
    const sleeve=upcoming?`<div class="finish-swatch finish-sleeve" aria-label="寄出第 ${upcoming.after} 关订单后到样"><i class="finish-chip sleeve-paper" aria-hidden="true"></i><span>第 ${upcoming.after} 关到样</span></div>`:'';
    const caption=active?'已换上':owned?'换上':funds<selected.price?`${selected.price} 星币 · 差 ${selected.price-funds}`:`买下并换上 · ${selected.price}`;
    return `<div class="finish-tabs" aria-label="陈列部位">${tabs}</div><div class="finish-samples">${swatches}${sleeve}</div>
      <div class="finish-checkout"><span>${icon('star',18)} ${funds}</span>${button('finish-apply',caption,'btn primary',selected.id,active||!owned&&funds<selected.price?'disabled':'')}</div>`;
  }
  function showroom(s,l) {
    const preview={...s.display.equipped,[l.finishPart]:l.finishId};
    const order={stage:'display',bags:[],gifts:[],stockKinds:s.active?.gifts?s.active.stockKinds:C.stockKinds(s)};
    return `<section class="screen counter-scene showroom" data-camera="wide" ${finishAttrs(preview)} aria-label="柜台陈列">
      <div inert aria-hidden="true">${stockroom(order)}</div><div class="table-surface" aria-hidden="true"></div>
      <header class="counter-tools">${button('back',icon('back',21),'pixel-tool','','aria-label="回到店里"')}</header>
      <section class="finish-book" aria-label="柜台样本册">${finishControls(s,l)}</section></section>`;
  }
  return {render,connect,prepareOverview,fixtures,receipt,photo,showroom,finishControls};
})();
