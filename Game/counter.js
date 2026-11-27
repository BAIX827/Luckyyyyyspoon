'use strict';
window.LuckyCounter = (() => {
  const C = LuckyCore;
  const {button, icon} = LuckyView;
  const departments={desk:'桌面',cloth:'桌布',rack:'货架',trim:'花边'};
  const colors = Object.keys(C.themes);
  const bays = ['发饰', '书写', '纸品', '随身'];
  const fixtures = ['velvet','holes','books','cards','files','pegs','velvet','cards','velvet','holes','files','files','holes','files','spindle','files','pegs','pegs','pegs','files','pegs','files','binder-rail','cup-grid'];
  const item = g => `<img draggable="false" alt="" class="counter-item" src="assets/items/${g.color}-${g.kind}-${g.variant}.png">`;
  const label = g => C.themes[g.color].name + C.itemName(g.color, g.kind, g.variant);
  const num = id => String(id).padStart(3,'0');
  const cardName = b => b.variant === null ? C.kinds[b.kind].name : C.itemName(b.color, b.kind, b.variant);
  const bagIcon = b => b.opened ? item({...b, variant:b.variant ?? 0}) : icon('bag', 22);
  const prop = (file, cls='') => `<img class="physical-prop ${cls}" draggable="false" alt="" src="assets/${file}">`;
  const bead = g => `<span class="lucky-bead" style="--bead:${C.themes[colors[g.kind%colors.length]].swatch}">${item({...g,variant:0})}</span>`;
  function spoonful(beads) {
    return beads.map((g,i)=>{
      const radius=Math.sqrt((i+.5)/beads.length),angle=i*2.4;
      return `<span class="spoon-token" style="left:${50+radius*37*Math.cos(angle)}%;top:${49+radius*33*Math.sin(angle)}%;rotate:${(i%5-2)*9}deg">${bead(g)}</span>`;
    }).join('');
  }
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

  const misfits=b=>b.opened?b.pieces.filter(g=>!C.fits(b,g)).length:0;
  function receipt(a, expanded=false) {
    if(a.mode==='scoop'){
      if(expanded)return '<div class="expanded-lines">'+a.bags.map((b,i)=>
        button('station-card',bead(b)+item({...b,variant:0})+`<b>${C.kinds[b.kind].name}</b>${misfits(b)?`<i class="misfit-count">拿错 ${misfits(b)}</i>`:''}<em>${b.pieces.length-misfits(b)}/${b.quantity}</em>`,
          'note-line'+(misfits(b)?' has-misfit':''),i,`style="--tag-paper:${C.themes[b.color].pale}" ${i===a.current?'aria-current="true"':''} ${['scoop','drawn','gifts','seal'].includes(a.stage)?'disabled':''}`)).join('')+'</div>';
      const b=a.bags[a.current], packed=a.bags.reduce((sum,bag)=>sum+bag.pieces.length-misfits(bag),0);
      return `<div class="ticket-paper scoop-ticket"><span class="binder"></span><span class="slip-head"><b>${a.customer}</b><small>${a.level?C.levelName(a.level):'#'+num(a.id)}</small></span>
        <div class="scoop-order-strip"><span>${icon('spoon',24)}<b>${a.scoopTarget}<small> 满勺</small></b></span><span class="scoop-preference">${icon(a.theme,21)}${C.themes[a.theme].name}</span></div>
        ${b?button('ticket-zoom',item({...b,variant:0})+`<b>${C.kinds[b.kind].name}</b>${misfits(b)?`<i class="misfit-count">拿错 ${misfits(b)}</i>`:''}<em><strong>${b.pieces.length-misfits(b)}</strong>/${b.quantity}</em>`,'scoop-current'+(misfits(b)?' has-misfit':''),'','aria-label="'+C.kinds[b.kind].name+'，已装'+(b.pieces.length-misfits(b))+'件，共需'+b.quantity+'件'+(misfits(b)?'，另有拿错'+misfits(b)+'件':'')+'，查看配货单"'):''}
        <div class="scoop-ticket-foot"><span class="scoop-tally">${a.beads.length?'已装 '+packed+' / '+a.beads.length+' 件':''}</span>${button('bead-rules',icon('catalog',17)+'<span>珠子表</span>','bead-legend-link','','aria-label="查看珠子对照表"')}</div></div>`;
    }
    const busy = ['tear','gifts','seal'].includes(a.stage);
    function cardButton(b,i,compact) {
      const description = b.opened ? cardName(b) : '第 ' + (i+1) + ' 袋';
      const progress = b.opened ? b.pieces.length+'/'+b.quantity : '待拆';
      const current=i===a.current;
      const contents=bagIcon(b)+(compact ? `<em>${progress}</em>` : `<span>${description}</span><em>${progress}</em>`);
      return button('station-card',contents,compact?'ticket-tab':'note-line',i,
        `aria-label="${b.opened?C.themes[b.color].name:''}${description}，${progress}" ${current?'aria-current="true"':''} ${busy?'disabled':''}`);
    }
    if(expanded)return '<div class="expanded-lines">'+a.bags.map((b,i)=>cardButton(b,i,false)).join('')+'</div>';
    const b = a.bags[a.current];
    const picked = b?.opened;
    const filled = picked && b.pieces.length === b.quantity;
    const name = picked ? cardName(b) : '';
    const tally = a.bags.map((card,i) => `<i class="ticket-mark ${card.opened?'opened':''} ${card.opened && card.pieces.length===card.quantity?'filled':''} ${card.opened && i===a.current?'reading':''}">${bagIcon(card)}</i>`).join('');
    const picture = picked ? item({...b,variant:b.variant??0}) : icon(a.theme,36);
    const count = picked ? `<em>${b.pieces.length}/${b.quantity}</em>` : '';
    const summary = picked ? C.themes[b.color].name + ' ' + name + ' ' + b.pieces.length+'/'+b.quantity : C.themes[a.theme].name;
    const summaryButton=button('ticket-zoom',
      `<span class="binder"></span><span class="slip-head"><b>${a.customer}</b><small>${a.level?'第 '+a.level+' 关':'#'+num(a.id)}</small></span>
      <span class="slip-wish">${picture}<span><strong>${name}</strong></span>${count}</span>
      <span class="bag-marks" aria-hidden="true">${tally}</span>`,
      'ticket-summary', '', `aria-label="${a.customer}的配货单，${summary}，查看五袋明细" aria-haspopup="dialog"`);
    return `<div class="ticket-paper${filled?' completed':''}">${summaryButton}<div class="ticket-tabs">${a.bags.map((b,i)=>cardButton(b,i,true)).join('')}</div></div>`;
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
      if(!stock.capacity[kind])return '<div class="stock-cubby vacant" aria-hidden="true"><div class="cubby-stock"><i class="awaiting-crate"></i><i class="awaiting-crate"></i></div><div class="shelf-edge"></div></div>';
      const offered=!stock.gift || C.giftKinds.includes(kind);
      const slots=colors.map(color=>{
        const g={kind,variant,color}, key=keyOf(g), used=stock.used.get(key)||0;
        const left=stock.capacity[kind]-used, cls='rack-slot'+(left?'':' sold-out');
        if(!detail){
          const mounted=kind===0||kind===14;
          return `<span class="${cls}" data-val="${key}"><i class="rack-preview${mounted?' on-rail':''}${mounted&&variant?' twisted':''}"></i></span>`;
        }
        return button(stock.gift?'gift-add':'add-piece',stockArt(g)+`<small class="${used?'count-changed':''}">×${left}</small>`,
          cls,key,`aria-label="${label(g)}，库存${left}" ${offered&&stock.picking&&left?'':'disabled'} data-drag="stock-piece"`);
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
    const layoutTotal=a.mode==='scoop'?a.bags.reduce((sum,b)=>sum+b.quantity,0):total;
    const scale=Math.max(.78,Math.min(1.15,4.8/Math.sqrt(Math.max(1,layoutTotal))));
    const pieces = a.bags.flatMap((b,bag)=>b.pieces.map((g,index)=>{
      // Offset successive pieces within a loose pile. Coordinates stay stable as other cards fill.
      const seed=bag*17+index+1;
      const spread=(step,offset)=>(seed*step+offset)%1;
      const x=Math.min(.96,Math.max(.04,g.position?.x??(.12+.76*spread(.618034,.13))));
      const y=Math.min(.97,Math.max(.05,g.position?.y??(.16+.77*spread(.414214,.35))));
      const angle=Math.round(36*spread(.754878,.22)-18);
      const size=`width:${32*scale}%;height:${65*scale}%;z-index:${1+Math.round(y*100)};--tilt:${angle}deg`;
      const wrong=b.opened!==false && !C.fits(b,g)?' misfit':'';
      if(a.stage==='photo')return `<span class="parcel-item${wrong}" style="left:${x*100}%;top:${y*100}%;${size}">${item(g)}</span>`;
      return button('return-piece',item(g),'parcel-item'+wrong,bag+'|'+index,`style="left:${x*100}%;top:${y*100}%;${size}" aria-label="取回${label(g)}" data-bag="${bag}" data-index="${index}" ${['pack','shelf'].includes(a.stage)?'data-drag="piece"':a.mode==='scoop'&&a.stage==='gifts'?'':'disabled'}`);
    })).join('');
    const bonus = a.gifts.map((g,i)=>a.stage==='photo' ? `<span class="parcel-gift" style="right:${2+18*i}%">${item(g)}</span>` : button('gift-return',item(g),'parcel-gift',i,`style="right:${2+18*i}%" aria-label="收回赠品${label(g)}" ${a.stage==='gifts'?'data-drag="packed-gift"':'disabled'}`)).join('');
    const address=sealed&&a.customer?`<div class="dispatch-card"><small>收件人</small><b>${a.customer}</b><i class="barcode"></i><small>#${num(a.id)}</small></div>`:'';
    return `<div class="parcel ${sealed?'sealed':''}" data-box role="group" aria-label="礼盒">${prop('counter/parcel-'+(sealed?'closed':'open')+'.webp')}${address}${sealed?'':`<div class="parcel-content"><div class="tissue box-interior">${pieces}${bonus}</div></div>${prop('counter/parcel-open.webp','parcel-rim')}`}</div>`;
  }

  function hand(a) {
    if(a.mode==='scoop' && ['scoop','drawn'].includes(a.stage)){
      const loaded=a.stage==='drawn';
      return `<div class="scoop-station">${loaded?
        button('pour',`<span class="loaded-spoon"><span class="spoon-bowl">${spoonful(a.pendingBeads)}</span><i class="spoon-handle"></i></span><b class="prop-tag">倒进盘里</b>`,'hand-prop pour-prop','','data-drag="scoop-pour" aria-label="把勺子拖到盘子里，也可轻点倒出"'):
        button('scoop',prop('counter/bead-pool.webp')+`<b class="prop-tag">舀第 ${a.scoopsTaken+1} 勺</b>`,'hand-prop scoop-prop ready')}
        <div class="bead-tray waiting-tray" data-pour-tray aria-label="已倒出的珠子">${a.beads.map(bead).join('')}</div></div>`;
    }
    if(a.mode==='scoop' && ['shelf','pack','gifts','seal'].includes(a.stage)){
      // Unfinished categories stay at the front so a long order never hides what is left below the fold.
      const order=a.bags.map((b,index)=>index).sort((i,j)=>Number(a.bags[i].pieces.length>=a.bags[i].quantity && !misfits(a.bags[i]))-Number(a.bags[j].pieces.length>=a.bags[j].quantity && !misfits(a.bags[j]))||i-j);
      return `<div class="bead-tray live-beads" aria-label="点珠子对照取货">${order.map(index=>{const b=a.bags[index];
        const wrong=misfits(b), state=wrong?'misfit':b.pieces.length===b.quantity?'collected':'';
        return button('station-card',`<span class="bead-pile">${bead(b)}</span><span class="bead-goods">${item({...b,variant:0})}</span><small>×${b.quantity}</small>`,'tray-bead '+state+(index===a.current?' active':''),index,
          `aria-label="${C.kinds[b.kind].name}，${b.pieces.length-wrong}/${b.quantity}${wrong?'，拿错'+wrong+'件':''}" aria-pressed="${index===a.current}"`);
      }).join('')}</div>`;
    }
    const b=a.bags[a.current], next=a.bags.findIndex(card=>!card.opened);
    if(a.stage==='tear') {
      const bag=prop('props/bag-'+b.wrapper+'.png');
      return button('tear-all',`<span class="pouch"><span class="pouch-base">${bag}</span><span class="pouch-top">${bag}</span><i class="tear-track"></i></span><b class="prop-tag">撕开 →</b>`,
        'hand-prop tear-prop','',`data-gesture="tear" style="--cut:${a.tear*100}%" aria-label="向右撕开盲袋，也可轻点"`);
    }
    if(a.stage==='reveal') return button('station-unpack',`<span class="drawn-card">${item({...b,variant:b.variant??0})}<b>×${b.quantity}</b></span>${prop('props/open-'+b.wrapper+'.png','wrapper')}`,
      'hand-prop reveal-prop','','aria-label="收起图卡，去货架取货"');
    if(a.stage==='gifts' && a.mode!=='scoop') return button('photo',icon(a.theme,40)+`<b>贴封签</b><small>赠品 ${a.gifts.length}/2</small>`,'postage-sticker','','data-drag="postage" aria-label="贴封签，可拖到盒子上或轻点"');
    if(a.stage==='seal') return '';
    if(next===-1)return '';
    const ready=!b?.opened || b.pieces.length===b.quantity;
    return button('station-card',prop('counter/scoop.webp')+`<b class="prop-tag">${C.count(a)?'下一袋':'舀一勺'}</b>`,'hand-prop scoop-prop'+(ready?' ready':''),next);
  }

  // A scoop order ends with one object: the seal sticker beside the box. It waits while
  // the box is short, lights up once every bead is matched, and seals and sends in one go.
  function sticker(a) {
    const total=C.pieceCount(a.bags);
    if(!total || a.scoopsTaken!==a.scoopTarget || !['shelf','pack','gifts','seal'].includes(a.stage))return '';
    const done=a.bags.every(b=>b.pieces.length===b.quantity && !misfits(b));
    const state=a.stage==='shelf' && !done ? 'waiting' : 'ready';
    return button('seal-now',icon(a.theme,30)+`<span class="sticker-name">${a.customer}</span>`,
      'desk-seal '+state,'',`data-drag="postage" aria-label="封签：拖到盒子上或轻点，封箱寄出"`);
  }
  // Gifts are optional: a small dish beside the sticker opens the gift shelves only when tapped.
  function giftDish(a) {
    const done=a.bags.every(b=>b.pieces.length===b.quantity && !misfits(b));
    if(!(done && ['shelf','pack'].includes(a.stage)) && a.stage!=='gifts')return '';
    const open=a.stage==='gifts';
    const dots=`<i class="gift-dots" aria-hidden="true">${[0,1].map(i=>`<b class="${i<a.gifts.length?'on':''}"></b>`).join('')}</i>`;
    return button(open?'':'gift-dish',`<img class="pixel" alt="" src="assets/items/${a.theme}-${C.giftKinds[a.id%C.giftKinds.length]}-0.png"><span>赠品</span>${dots}`,
      'gift-dish'+(open?' open':''),'',open?`aria-label="赠品碟，已放 ${a.gifts.length}/2，去货架挑选" disabled`:'aria-label="挑赠品（可不挑）"');
  }
  function deskParts(a) {
    const opened=C.count(a), n=C.pieceCount(a.bags), scoop=a.mode==='scoop';
    const action = scoop ? giftDish(a)+sticker(a) : a.stage==='pack' ? button('wrap','挑赠品','box-action') :
      a.stage==='seal' ? button('seal','寄出','box-action') :
      opened===5 && n && ['shelf','reveal','tray'].includes(a.stage) ?
        button('station-pack','核对装箱','box-action'+(a.bags.every(b=>b.pieces.length===b.quantity)?' is-ready':'')) : '';
    const extra = scoop ? '' : a.stage==='gifts' ? button('review','返回装盒','utility-label') : a.stage==='seal' ? button('rearrange','拆回','utility-label') : '';
    const stamp = !scoop && a.stage==='seal' && a.level && a.level%10===0 ? (a.stamp?`<span class="stamped">${icon(a.theme,18)} 已盖章</span>`:button('stamp','盖纪念章','utility-label')) : '';
    return {tools:`${button('station-close-rack',icon('back',21),'pixel-tool rack-back','','aria-label="返回整面货架"')}${button('pause',icon('pause',20),'pixel-tool','','aria-label="暂停"')}${C.canUndo(a)?button('undo','↶','pixel-tool','','aria-label="撤回" title="撤回"'):''}${extra}${stamp}`, note:receipt(a), hand:hand(a), box:parcel(a)+action};
  }
  function render(s,l) {
    const a=s.active, zoom=a.stage==='seal'?null:l.zoomBay;
    const parts=deskParts(a);
    return `<section class="screen counter-scene" ${finishAttrs(s.display.equipped)} data-mode="${a.mode||'bags'}" data-theme="${a.theme}" data-stage="${a.stage}" data-camera="${zoom?'near':'wide'}" aria-label="打包柜台">
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
        area.detail.hidden=true;
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
      // The tray can jump straight from one enlarged bay to another.
      // A cached bay may paint only while selected or during its closing animation.
      for(const other of areas){
        if(!other.detail)continue;
        const active=other.detail===detail && !!selected;
        other.detail.inert=!active;
        other.detail.classList.toggle('inspected',active);
        other.detail.hidden=!active && !(animate && other.detail===detail);
      }
      scene.dataset.camera=selected?'near':'wide';
      if(selected)overview.setAttribute('aria-hidden','true');else overview.removeAttribute('aria-hidden');
      if(selected)canopy.style.setProperty('--canopy-x',i*100/3+'%');
      if(!animate)return;
      const base=detail.getBoundingClientRect();
      if(!base.width || !base.height){detail.hidden=!selected;return;}
      const to=selected?base:area.wide.getBoundingClientRect();
      const transform=r=>`translate(${r.left-base.left}px,${r.top-base.top}px) scale(${r.width/base.width},${r.height/base.height})`;
      detail.classList.add('camera-moving');
      const animation=detail.animate([{transform:transform(from)},{transform:transform(to)}],{duration:270,easing:'cubic-bezier(.22,.68,.22,1)'});
      flight={node:detail,animation};
      animation.onfinish=()=>{
        detail.classList.remove('camera-moving');
        detail.hidden=!selected;
        flight=null;
      };
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
  const photo = o => parcel({mode:o.mode,bags:o.cards,gifts:o.gifts,stage:'photo'});
  async function scoopMotion(scene,reduceMotion) {
    const pool=scene?.querySelector('.scoop-prop .physical-prop');
    if(!pool||reduceMotion||!pool.animate)return;
    scene.inert=true;scene.dataset.transferring='scoop';
    try{
      await pool.animate([
        {transform:'none'},
        {transform:'translateY(7px) rotate(-4deg) scale(.97)',offset:.45},
        {transform:'translateY(-4px) rotate(2deg)'},
      ],{duration:280,easing:'ease-in-out'}).finished;
    }catch{}finally{scene.inert=false;delete scene.dataset.transferring;}
  }
  async function pourMotion(scene,reduceMotion,dropRect,onBeads) {
    const spoon=scene?.querySelector('.loaded-spoon'),tray=scene?.querySelector('[data-pour-tray]');
    if(!spoon||!tray||reduceMotion||!spoon.animate){onBeads();return;}
    const animations=[],flights=[];
    scene.inert=true;scene.dataset.transferring='pour';spoon.style.animation='none';
    try{
      const origin=spoon.getBoundingClientRect(),bowl=spoon.querySelector('.spoon-bowl').getBoundingClientRect(),landing=tray.getBoundingClientRect();
      const fromX=dropRect?dropRect.left-origin.left:0,fromY=dropRect?dropRect.top-origin.top:0;
      const dx=landing.left+landing.width*.54-(bowl.left+bowl.width*.5);
      const dy=landing.top-12-bowl.bottom;
      const tilt=spoon.animate([
        {transform:`translate(${fromX}px,${fromY}px) rotate(0deg)`},
        {transform:`translate(${dx}px,${dy}px) rotate(32deg)`}
      ],{duration:300,easing:'cubic-bezier(.32,0,.3,1)',fill:'forwards'});
      animations.push(tilt);await tilt.finished;
      const tokens=[...spoon.querySelectorAll('.spoon-token')];
      const fall=tokens.map((token,i)=>{
        const r=token.getBoundingClientRect(),size=Math.max(12,Math.min(r.width,r.height));
        const flight=document.createElement('span');
        flight.className='bead-flight';flight.setAttribute('aria-hidden','true');
        flight.innerHTML=token.innerHTML;
        Object.assign(flight.style,{left:r.left+'px',top:r.top+'px',width:size+'px',height:size+'px',opacity:0});
        document.body.append(flight);flights.push(flight);
        const tx=landing.left+8+((i*47)%101)/101*Math.max(0,landing.width-size-16)-r.left;
        const ty=landing.top+8+((i*31)%97)/97*Math.max(0,landing.height-size-16)-r.top;
        const spin=(i%7-3)*21,delay=i*12,duration=480+(i%4)*25;
        if(i%3===0)onBeads(i/3,(delay+duration*.73)/1000);
        const empty=token.animate([{opacity:1},{opacity:0}],{duration:1,delay,fill:'forwards'});
        const movement=flight.animate([
          {transform:'translate(0,0) rotate(0deg)',opacity:1},
          {transform:`translate(${tx*.5}px,${Math.min(-8,ty*.25-15)}px) rotate(${spin*.4}deg)`,opacity:1,offset:.32},
          {transform:`translate(${tx}px,${ty}px) rotate(${spin}deg)`,opacity:1,offset:.73},
          {transform:`translate(${tx+3}px,${ty-7}px) rotate(${spin+12}deg)`,opacity:1,offset:.86},
          {transform:`translate(${tx+2}px,${ty}px) rotate(${spin+7}deg)`,opacity:1}
        ],{duration,delay,easing:'linear',fill:'forwards'});
        animations.push(empty,movement);
        return movement.finished;
      });
      await Promise.all(fall);
    }catch{}finally{
      for(const animation of animations)animation.cancel();
      for(const flight of flights)flight.remove();
      scene.inert=false;delete scene.dataset.transferring;
    }
  }
  // The climax of an order: the lid comes down, the address label is pressed on, and the
  // shop stamp lands. Stepped easing keeps the motion in the pixel idiom.
  async function sealMotion(scene,reduceMotion,play) {
    const parcel=scene?.querySelector('.parcel.sealed');
    if(!parcel)return;
    const theme=scene.dataset.theme;
    const mark=document.createElement('i');
    mark.className='parcel-stamp';mark.setAttribute('aria-hidden','true');
    mark.innerHTML=icon(theme||'pink',30);
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    scene.inert=true;scene.dataset.transferring='seal';
    const label=parcel.querySelector('.dispatch-card');
    if(label)label.style.opacity='0';
    try{
      if(reduceMotion||!parcel.animate){
        if(label)label.style.opacity='';
        parcel.append(mark);play('seal');await wait(350);return;
      }
      play('paper');
      await parcel.animate([{transform:'translateY(-6%) scale(1.03,.92)'},{transform:'translateY(1%) scale(.97,1.05)',offset:.55},{transform:'none'}],
        {duration:300,easing:'steps(6,end)'}).finished;
      if(label){
        label.style.opacity='';play('tape');
        await label.animate([{transform:'translate(-40%,-60%) rotate(-14deg)',opacity:0},{transform:'translate(0,-8%) rotate(-3deg)',opacity:1,offset:.7},{transform:'none',opacity:1}],
          {duration:320,easing:'steps(5,end)'}).finished;
      }
      await wait(120);
      parcel.append(mark);play('seal');
      await mark.animate([{transform:'scale(2.2)',opacity:0},{transform:'scale(.86)',opacity:1,offset:.6},{transform:'scale(1)',opacity:1}],
        {duration:240,easing:'steps(4,end)'}).finished;
      parcel.animate([{transform:'scale(1.02,.97)'},{transform:'none'}],{duration:140,easing:'steps(3,end)'});
      await wait(520);
    }catch{}finally{scene.inert=false;delete scene.dataset.transferring;}
  }
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
    const swatches=available.map(f=>button('finish-preview',`<i class="finish-chip chip-${f.id}" ${part==='trim'?`data-trim="${f.id}"`:''}></i><span>${f.name}</span>`,'finish-swatch',f.id,`aria-pressed="${f.id===selected.id}"`)).join('');
    const sleeve=upcoming?`<div class="finish-swatch finish-sleeve" aria-label="寄出第 ${upcoming.after} 关订单后到样"><i class="finish-chip sleeve-paper" aria-hidden="true"></i><span>第 ${upcoming.after} 关到样</span></div>`:'';
    const caption=active?'已换上':owned?'换上':funds<selected.price?`${selected.price} 星币 · 差 ${selected.price-funds}`:`买下并换上 · ${selected.price}`;
    return `<div class="finish-tabs" data-part="${part}" aria-label="陈列部位">${tabs}</div><div class="finish-samples">${swatches}${sleeve}</div>
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
  return {render,connect,prepareOverview,fixtures,receipt,photo,showroom,finishControls,bead,scoopMotion,pourMotion,sealMotion};
})();
