'use strict';
window.LuckyCounter = (() => {
  const C=LuckyCore, {button,icon}=LuckyView, colors=Object.keys(C.themes);
  const bays=['发饰','书写','纸品','随身'];
  const fixtures=['velvet','holes','books','cards','files','pegs','velvet','cards','velvet','holes','files','files','holes','files','spindle','files','pegs','pegs','pegs','files','pegs','files','binder-rail','cup-grid'];
  const image=(g)=>`<img draggable="false" alt="" class="counter-item" src="assets/items/${g.color}-${g.kind}-${g.variant}.png">`;
  const mounted=g=>`<img class="counter-item mounted-item ${g.variant?'twist':''}" draggable="false" alt="" src="assets/counter/${g.kind===0?'band':'roll'}-${g.color}.webp">`;
  const label=g=>C.themes[g.color].name+C.itemName(g.color,g.kind,g.variant);
  function receipt(a,expanded=false) {
    const busy=['tear','gifts','seal'].includes(a.stage);
    const lines=a.bags.map((b,i)=>{
      const complete=b.pieces.length===b.quantity;
      const description=b.opened?(expanded?C.themes[b.color].name+' · '+(b.variant===null?C.kinds[b.kind].name:C.itemName(b.color,b.kind,b.variant)):C.kinds[b.kind].name):'待拆盲袋';
      return button('station-card',`<i style="--dot:${b.opened?C.themes[b.color].swatch:'#d5c8b8'}"></i><span>${description}</span><em>${b.opened?b.pieces.length+'/'+b.quantity:'·'}</em>`,'note-line '+(a.current===i?'current ':'')+(complete?'filled':''),i,busy?'disabled':'');
    }).join('');
    if(expanded)return '<div class="expanded-lines">'+lines+'</div>';
    const preview=a.bags.map(b=>`<span class="ticket-preview-line"><i style="--dot:${b.opened?C.themes[b.color].swatch:'#d5c8b8'}"></i>${b.opened?C.kinds[b.kind].name:'待拆盲袋'}<em>${b.opened?b.pieces.length+'/'+b.quantity:'·'}</em></span>`).join('');
    return `<aside class="counter-note"><div class="binder"></div><header><small>配货单 ${String(a.id).padStart(3,'0')}</small><b>${a.customer} · ${C.themes[a.theme].name}</b></header><div class="note-lines">${lines}</div><div class="compact-ticket">${button('ticket-zoom',preview+'<small>放大订单 ↗</small>','zoom-ticket','','aria-label="放大配货单" aria-haspopup="dialog"')}</div></aside>`;
  }
  function drawRack(a,l) {
    const gift=a.stage==='gifts', revealing=a.stage==='reveal';
    const kind=gift?l.giftKind:revealing?a.bags[a.current].kind:(a.shelfKind??0);
    const k=C.kinds[kind], variant=gift?l.giftVariant:revealing?0:(a.shelfVariant??0), drawer=k.drawer;
    const types=gift?C.giftKinds:C.kinds.flatMap((v,i)=>v.drawer===drawer?[i]:[]);
    const canTake=gift?a.gifts.length<2:(a.stage==='shelf'||revealing)&&a.bags[a.current].pieces.length<a.bags[a.current].quantity;
    const styleTabs=k.styles.map((v,i)=>button(gift?'gift-variant':'station-style',v,'rack-style '+(i===variant?'chosen':''),i,`aria-pressed="${i===variant}"`)).join('');
    return `<aside class="rack-panel"><div class="rack-menu">${types.map(i=>button(gift?'gift-kind':'station-type',C.kinds[i].name,i===kind?'chosen':'',i,`aria-pressed="${i===kind}"`)).join('')}</div><div class="rack-slots ${fixtures[kind]} ${kind===0||kind===14?'mounted-rail':''}">${colors.map(color=>{
      const g={kind,color,variant}, left=C.remaining(a,g,gift), val=[color,kind,variant].join('|');
      return button(gift?'gift-add':'add-piece',`<span class="fixture-pin"></span>${left>0?((kind===0||kind===14)?mounted(g):image(g)):''}<small style="--dot:${C.themes[color].swatch}">${left>0?C.themes[color].name.slice(-1)+'×'+left:'已取完'}</small>`,'rack-slot',val,`aria-label="${label(g)}，库存${left}" ${canTake&&left?'':'disabled'} ${gift?'':'data-drag="stock-piece"'}`);
    }).join('')}</div><div class="rack-styles">${styleTabs}</div></aside>`;
  }
  function parcel(a) {
    const total=C.pieceCount(a.bags), sealed=a.stage==='seal';
    let n=0;
    const pieces=a.bags.flatMap((b,bag)=>b.pieces.map((g,index)=>{
      const slot=n++, col=slot%4,row=Math.floor(slot/4);
      const rows=Math.ceil(total/4), x=g.position?.x??(.15+col*.23), y=g.position?.y??((row+.5)/Math.max(2,rows));
      const movable=['pack','shelf'].includes(a.stage);
      return button('return-piece',image(g),'parcel-item',bag+'|'+index,`style="left:${x*100}%;top:${y*100}%" aria-label="取回${label(g)}" data-bag="${bag}" data-index="${index}" ${movable?'data-drag="piece"':'disabled'}`);
    })).join('');
    return `<div class="parcel ${sealed?'sealed':''}" data-box><div class="parcel-lid"></div><div class="tissue box-interior">${pieces}${a.gifts.map((g,i)=>button('gift-return',image(g),'parcel-gift',i,`style="right:${2+18*i}%" aria-label="收回赠品${label(g)}" ${a.stage==='gifts'?'':'disabled'}`)).join('')}</div><div class="box-front">${sealed?'✧　快递包裹　✧':icon(a.theme,18)+'　'+total+' 件'+(a.gifts.length?' ＋ '+a.gifts.length+' 赠':'')}</div></div>`;
  }
  function hand(a) {
    const bag=a.bags[a.current], next=a.bags.findIndex(b=>!b.opened);
    if(a.stage==='tear')return button('tear-all',`<img draggable="false" src="assets/props/bag-${bag.wrapper}.png" alt=""><span>向右撕开 ›</span>`,'hand-prop tear-prop','',`data-gesture="tear" style="--cut:${a.tear*100}%"`);
    if(a.stage==='reveal')return button('station-unpack',image({kind:bag.kind,color:bag.color,variant:bag.variant??0})+`<span>${C.themes[bag.color].name} · ${C.kinds[bag.kind].name} ×${bag.quantity}<br>收起图卡 ›</span>`,'hand-prop reveal-prop');
    if(a.stage==='gifts')return `<div class="hand-prop gift-saucer">${icon('star',30)}<b>奶一口</b><span>已加赠 ${a.gifts.length}/2</span></div>`;
    if(a.stage==='seal')return `<div class="hand-prop mail-mark">${icon('bag',28)}<b>${a.customer} 收</b></div>`;
    return button('station-card',`<img draggable="false" class="scoop-image" src="assets/counter/scoop.webp" alt=""><span>${next<0?'五袋已开':'舀一勺'}</span>`,'hand-prop scoop-prop',next,next<0?'disabled':'');
  }
  function render(s,l) {
    const a=s.active,b=a.bags[a.current], kind=a.stage==='reveal'?b.kind:(a.shelfKind??0), opened=C.count(a), total=C.pieceCount(a.bags);
    const cardHint=b&&b.pieces.length===b.quantity ? (opened<5?'这一袋配齐了 · 再舀一勺':'五袋已开 · 可以核对装箱') : '';
    const hint={tray:'舀一勺，抽出今天的第一只盲袋',tear:'捏住袋口向右撕，也可以轻点',reveal:b?`${C.themes[b.color].name} · ${b.variant===null?C.kinds[b.kind].name:C.itemName(b.color,b.kind,b.variant)} ×${b.quantity} · 点右侧取货`:'',shelf:cardHint||(b?`${C.themes[b.color].name} · ${b.variant===null?C.kinds[b.kind].name:C.itemName(b.color,b.kind,b.variant)}　${b.pieces.length}/${b.quantity}`:''),pack:'核对小票，拖动物件摆好位置',gifts:'挑零至两件小礼物，随盒寄出',seal:'封签已贴好，包裹可以寄出了'}[a.stage];
    let action='';
    if(['shelf','tray','reveal'].includes(a.stage)&&opened===5&&total)action=button('station-pack','核对装箱','counter-primary');
    if(a.stage==='pack')action=button('wrap','挑赠品 ›','counter-primary');
    if(a.stage==='gifts')action=button('review','再摆一摆','bench-quiet')+button('photo','贴签封箱','counter-primary');
    if(a.stage==='seal')action=button('rearrange','拆回','bench-quiet')+(a.level&&a.level%10===0&&!a.stamp?button('stamp','盖纪念章','bench-quiet'):'')+button('seal','发货 ↗','counter-primary ship');
    const rackLocked=['gifts','seal'].includes(a.stage);
    return `<section class="screen counter-scene" data-stage="${a.stage}" aria-label="横屏打包工作台"><header class="counter-head"><span>${a.level?'第 '+a.level+' 关':'随心单'}<i></i>${a.customer}的订单</span>${button('pause','Ⅱ','pause-counter','','aria-label="暂停"')}</header><nav class="shelf-bays" aria-label="四区货架">${bays.map(name=>button('station-bay',`<span>${name}</span>`,C.kinds[kind].drawer===name?'on':'',name,`aria-label="${name}货架" ${rackLocked?'disabled':''}`)).join('')}</nav><div class="counter-desk">${receipt(a)}<div class="hand-space">${hand(a)}</div><div class="parcel-space">${parcel(a)}</div>${a.stage==='seal'?`<aside class="dispatch-card"><small>快递面单</small><b>${a.customer} 收</b><div class="barcode"></div><span>LUCKY · ${String(a.id).padStart(5,'0')}</span></aside>`:drawRack(a,l)}</div><footer class="counter-foot"><span class="bench-hint" role="status">${hint}</span><div>${C.canUndo(a)?button('undo','↶ 撤回','bench-quiet'):''}${action}</div></footer></section>`;
  }
  return {render,fixtures,receipt};
})();
