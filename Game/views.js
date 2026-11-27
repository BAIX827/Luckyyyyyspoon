'use strict';
(function viewsModule() {
  const C=LuckyCore, colors=Object.keys(C.themes), drawers=['发饰','书写','纸品','随身'];
  const asset=name=>'assets/'+name;
  const icon=(key,size=20)=>`<img class="pixel icon" alt="" width="${size}" height="${size}" src="${LuckyIcons[key]}">`;
  const sprite=(color,kind,variant,alt='')=>`<img class="pixel goods" src="${asset('items/'+color+'-'+kind+'-'+variant+'.png')}" alt="${alt}" draggable="false">`;
  const button=(act,text,cls='',val='',extra='')=>`<button type="button" data-act="${act}" data-val="${val}" class="${cls}" ${extra}>${text}</button>`;
  const primary=(act,text,val='',disabled=false)=>button(act,text,'btn primary',val,disabled?'disabled':'');
  const secondary=(act,text,val='')=>button(act,text,'btn secondary',val);
  const mini=(act,key,label)=>button(act,icon(key,21),'tool','',`aria-label="${label}" title="${label}"`);
  const nav=(title,act='back')=>`<header class="nav">${mini(act,'back','返回')}<h1>${title}</h1><span class="nav-spacer"></span></header>`;
  const num=id=>String(id).padStart(3,'0');
  const chip=(key)=>`<span class="chip" style="--chip:${C.themes[key].pale}">${icon(key,18)}${C.themes[key].name}</span>`;
  const packName=g=>C.itemName(g.color,g.kind,g.variant);
  const total=s=>s.orders.reduce((sum,o)=>sum+o.earnings,0);
  const bag=(color,open=false)=>`<span class="bag-art"><img class="pixel" draggable="false" alt="" src="${asset('props/'+(open?'open':'bag')+'-'+color+'.png')}"><i>${icon(color,31)}</i></span>`;
  const noData=(headline,body,act,label)=>`<div class="empty"><div class="empty-icon">${icon('album',58)}</div><h2>${headline}</h2><p>${body}</p>${secondary(act,label)}</div>`;
  const head=(s,a)=>`<header class="workhead"><div><small>${a.customer} · ${a.level?'第 '+a.level+' 关 · '+C.chapterFor(a.level).name:'订单 '+num(a.id)}</small><b>${icon(a.theme,23)}想要${C.themes[a.theme].name}</b></div>${mini('pause','pause','暂停')}</header><div class="meter"><span>${a.stage==='tray'?'盲袋托盘':a.stage==='seal'?'封箱贴签':a.stage==='pack'?'装盒台':a.stage==='gifts'?'赠品碟':a.gifts?'盲袋图卡':'第 '+(C.count(a)+1)+' 袋'}</span><div class="stamps">${Array.from({length:5},(_,i)=>`<i>${i<C.count(a)?icon(a.theme,15):''}</i>`).join('')}</div><span>${a.gifts?'已开':'已装'} ${C.count(a)} / 5</span></div>`;
  const foot=(hint,buttons)=>`<footer class="controls"><p>${hint}</p><div class="actions">${buttons}</div></footer>`;
  const section=(body,cls='')=>`<section class="screen ${cls}">${body}</section>`;
  const drawerButtons=(current,act)=>`<div class="drawers">${drawers.map(name=>button(act,name,'drawer '+(current===name?'chosen':''),name,`aria-pressed="${current===name}"`)).join('')}</div>`;
  function picker(a, local, exchange=false) {
    const target=exchange?a.bags[a.slots[local.editSlot]].kind:a.bags[a.current].kind;
    const drawer=exchange?local.editDrawer:a.drawer, kind=exchange?local.editKind:(a.shelfKind??a.choice?.kind);
    const variant=exchange?local.editVariant:(a.shelfVariant??a.choice?.variant??0);
    const choice=exchange?local.editGoods:a.choice;
    const card=!exchange && a.gifts ? a.bags[a.current] : null;
    let html=`<div class="ticket slim"><span>图卡想要</span><b>${card?((card.variant===null?C.kinds[target].name:C.itemName(card.color,target,card.variant))+' ×'+card.quantity):C.kinds[target].name}</b>${chip(card?.color||a.theme)}</div>`+drawerButtons(drawer,exchange?'edit-drawer':'drawer');
    if(!drawer) return html+`<div class="shelf-preview">${drawers.map((n,i)=>button('drawer',sprite(colors[(i+a.id)%6],[0,1,2,5][i],0)+`<b>${n}</b>`,'drawer-bin',n)).join('')}</div>`;
    const options=C.kinds.map((k,i)=>({k,i})).filter(x=>x.k.drawer===drawer);
    const active=options.some(x=>x.i===kind)?kind:options[0].i;
    html+=`<div class="cat-tabs">${options.map(x=>button(exchange?'edit-kind':'kind',x.k.name,'tab '+(x.i===active?'selected':''),x.i)).join('')}</div>`;
    html+=`<div class="variants">${C.kinds[active].styles.map((text,i)=>button(exchange?'edit-variant':'variant',text,'variant '+(variant===i?'selected':''),i)).join('')}</div>`;
    const offset=(a.id+(a.current??0)+active)%6, palette=colors.slice(offset).concat(colors.slice(0,offset));
    html+=`<div class="stock">${palette.map(cl=>{
      const picked=choice?.kind===active&&choice.variant===variant&&choice.color===cl;
      const left=card?C.remaining(a,{kind:active,color:cl,variant}):null;
      const disabled=card && (left===0 || card.pieces.length>=card.quantity);
      return button(exchange?'edit-color':card?'add-piece':'stock',sprite(cl,active,variant)+(card?'<small>×'+left+'</small>':''),'stock-item '+(picked?'selected':''),[cl,active,variant].join('|'),`${disabled?'disabled':''} aria-pressed="${picked}" aria-label="${C.themes[cl].name}${C.itemName(cl,active,variant)}"`);
    }).join('')}</div>`;
    return html;
  }
  function boxView(pieces, interactive=false, selected=null, pending=false) {
    return `<div class="giftbox ${interactive?'live-box':'photo-box'}"><img class="box-art pixel" src="${asset('props/box.png')}" alt="" draggable="false"><div class="box-interior">${Array.from({length:5},(_,idx)=>{
      const g=pieces[idx], content=g?sprite(g.color,g.kind,g.variant,packName(g)):`<span class="empty-slot">${pending?'＋':'·'}</span>`;
      if(!interactive) return `<span class="box-slot pos${idx}">${content}</span>`;
      return button('slot',content,`box-slot pos${idx} ${idx===selected?'is-selected':''}`,idx,`data-slot="${idx}" ${g?'data-drag="slot"':''} aria-label="${g?'第'+(idx+1)+'格 '+C.themes[g.color].name+packName(g):'放到第'+(idx+1)+'格'}"`);
    }).join('')}</div></div>`;
  }

  const units=['只','支','本','只','张','只','个','只','条','支','块','个','支','本','卷','枚','个','只','只','面','把','个','只','只'];
  const goodsLabel=g=>C.themes[g.color].name+' · '+packName(g);
  const requirement=b=>C.themes[b.color].name+' '+(b.variant===null ? C.kinds[b.kind].name : C.itemName(b.color,b.kind,b.variant))+' ×'+b.quantity;
  function orderCounter(s,l,level=null) {
    const theme=level?.theme ?? l.request;
    const customer=level?.customer ?? C.customers[(s.nextId-1)%C.customers.length];
    const swatches=level?'':`<div class="wish-stamps" role="group" aria-label="订单颜色">${colors.map(k=>button('wish',icon(k,24),'wish-stamp',k,`aria-label="${C.themes[k].name}" title="${C.themes[k].name}" aria-pressed="${k===theme}"`)).join('')}</div>`;
    const scoops=level?C.scoopsFor(level.id):(l.scoops||1);
    const options=level?'':`<div class="scoop-options" role="group" aria-label="订单勺数">${[1,2,3].map(n=>button('scoop-count',n+' 勺','',n,`aria-pressed="${n===scoops}"`)).join('')}</div>`;
    return section(`<div class="shop-utilities">${mini('back','back','返回')}</div>
      <article class="street-ticket order-letter scoop-order-letter"><i class="binder"></i>
      <header class="order-stub"><span>${icon('bag',18)} ${customer}的订单</span><h1>${level?C.levelName(level.id):'随心接单'}</h1></header>
      <div class="order-specification"><div class="order-scoops">${icon('spoon',64)}<span><b>${scoops}</b><small>满勺</small></span></div>
        <div class="order-color"><small>喜欢</small>${icon(theme,42)}<b>${C.themes[theme].name}</b></div></div>
      <p class="order-greeting">“帮我装得满满的。”</p>${options}${swatches}
      <div class="letter-foot">${primary(level?'accept-level':'accept','接下这单',level?.id??'')}</div></article>`,'shop-front order-front'+(level&&level.id>10?' chapter-'+Math.ceil(level.id/10):''));
  }
  const orderPhoto=o=>o.cards?LuckyCounter.photo(o):boxView(o.items);
  const uses=['戴着发箍去上课，刘海终于没挡住字。','拿到笔就想试写，我先写了你的店名。','新本子的第一页，我已经写上日期啦。','发夹戴上刚好，低头写字也很牢。','我挑了一张贴在日记的封面上。','硬币装好了，出门再也不用翻包底。','我用发圈扎好了头发，正好出门。','头发一盘，抓夹咔哒一下就扣好了。','发带挺合适，碎头发都拢住了。','我把书里最喜欢的那行划亮了。','刚写错的字，拿新橡皮一擦就干净了。','错的那一格已经盖住，重新写好了。','笔芯按出来一点点，正合手。','我撕了张便签，留在门口给家里人。','花胶带正好够贴住信封口。','流苏露在书外头，一翻就是昨天那页。','星星扣上钥匙串，摇起来叮当响。','车票装进卡套，明早就能用。','散在桌上的小东西全收到袋里了。','小镜子正好塞进我外套的口袋。','梳子已经放在玄关，出门前能用上。','削下来的木屑卷成了一朵小花。','我把四散的纸夹成了整整齐齐的一叠。','杯子刚洗好，第一杯想泡点茶。'];
  function customerReply(o,level){
    const shortage=o.cards.find(b=>b.pieces.length<b.quantity);
    if(shortage)return '我数了两遍，'+C.kinds[shortage.kind].name+'还少'+(shortage.quantity-shortage.pieces.length)+units[shortage.kind]+'。';
    for(const b of o.cards){
      const mismatch=b.pieces.find(g=>g.kind!==b.kind||g.color!==b.color||b.variant!==null&&g.variant!==b.variant);
      if(mismatch){
        if(mismatch.kind!==b.kind)return o.mode==='scoop'?'珠子对应的是'+C.kinds[b.kind].name+'，盒里却放了'+C.kinds[mismatch.kind].name+'。':'我那袋'+C.kinds[b.kind].name+'里，拆出来一'+units[mismatch.kind]+C.kinds[mismatch.kind].name+'。';
        if(mismatch.color!==b.color)return C.kinds[b.kind].name+'收到了，我原本想要'+C.themes[b.color].name+'的那款。';
        return '我认得这款'+C.kinds[b.kind].name+'，不过惦记的是'+C.itemName(b.color,b.kind,b.variant)+'。';
      }
    }
    if(o.mode==='scoop')return '这一盒配得刚刚好，都是我喜欢的小物！';
    if(level?.reply && C.cardsFor(level).every(b=>o.cards.some(c=>c.kind===b.kind&&c.quantity===b.quantity&&c.color===b.color&&c.variant===b.variant)))return level.reply;
    const focus=o.cards.find(b=>b.variant!==null||b.color!==o.theme)||o.cards[(o.id-1)%o.cards.length];
    return uses[focus.kind];
  }
  function giftReply(gifts) {
    if(!gifts.length) return '';
    const names=gifts.map(g=>C.themes[g.color].name+'的'+C.kinds[g.kind].name);
    const what=names.length===2 && names[0]===names[1]?'两'+units[gifts[0].kind]+names[0]:names.join('和');
    return '里面还有'+what+'，谢谢你！';
  }
  function batchReceipt(s,o,detail) {
    const level=C.levels[o.level-1];
    const reaction=customerReply(o,level);
    const stars=C.levelStars(o.satisfaction);
    const rating=level ? `<span class="order-stars" aria-label="本单 ${stars} 星，满分三星">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</span>` : '';
    // Only lines that went wrong are listed; a clean box needs no breakdown.
    const rows=o.cards.map(b=>{
      const wrong=new Map();
      for(const g of b.pieces)if(!C.fits(b,g)){const name=goodsLabel(g);wrong.set(name,(wrong.get(name)||0)+1);}
      const missing=b.quantity-b.pieces.length;
      if(!wrong.size&&missing<=0)return '';
      const notes=[...wrong].map(([name,n])=>'混入 '+name+' ×'+n).concat(missing>0?['缺 '+missing+units[b.kind]]:[]);
      return `<div class="receipt-line"><div><b>${requirement(b)}</b></div><p>${notes.join(' · ')}</p></div>`;
    }).join('');
    const chapter=o.level?Math.floor((o.level-1)/10):-1;
    const earlier=s.orders.filter(x=>x.id!==o.id&&x.id<o.id);
    const crowned=chapter>=0&&C.perfectChapters(earlier.concat(o))[chapter]&&!C.perfectChapters(earlier)[chapter];
    const crown=crowned?`<p class="chapter-crown">${C.chapters[chapter].name} 全部三星 · ${icon('star',16)} <b>+${C.chapterBonus}</b> 星币</p>`:'';
    const first=o.level===100?s.orders.find(x=>x.level===1):null;
    const photo=first?`<div class="paired-parcels"><figure>${orderPhoto(first)}<figcaption>阿梨的第一盒</figcaption></figure><figure>${orderPhoto(o)}<figcaption>第一百盒</figcaption></figure></div>`:orderPhoto(o);
    const next=level&&o.level<100?primary('level-ticket','下一单',o.level+1):primary('new-order','随心接单');
    const income=`${icon('star',18)} <b>+${o.earnings}</b> 星币`;
    const sample=o.sample && C.finishCatalog.find(f=>f.id===o.sample);
    const tag=sample?`<small class="receipt-sample"><i class="chip-${sample.id}" aria-hidden="true"></i>新样 · ${sample.name} ›</small>`:'';
    const till=detail?`<span>${income}</span>`:button('showroom',income+(tag||' ›'),'receipt-till',sample?.id||'',
      sample?`aria-label="试摆陈列新样，${sample.name}"`:'aria-label="用星币挑柜台陈列"');
    const arrival=Number.isInteger(o.arrival)&&C.kinds[o.arrival]?`<div class="arrival-slip">${sprite(o.theme,o.arrival,0)}<span><small>到货单 · ${C.kinds[o.arrival].drawer}区</small><b>${C.itemName(o.theme,o.arrival,0)}</b></span></div>`:'';
    return section(`<div class="shop-utilities">${mini(detail?'back':'home','back',detail?'返回':'回到店里')}</div>
      <div class="delivery-photo" aria-label="本单的装盒照片">${photo}</div>
      <i class="mail-envelope" aria-hidden="true"></i><article class="reply-paper"><div class="scroll reply-scroll"><div class="letter-head"><span>${level?C.levelName(level.id):'来信'}</span><small>#${num(o.id)}${o.mode==='scoop'?' · '+o.scoopTarget+' 勺':''}</small></div><h1>${o.customer}的回信</h1>
      <p class="customer-voice">“${reaction}${giftReply(o.gifts)}”</p><div class="letter-signature">—— ${o.customer}</div><div class="reply-totals"><span>${level?rating:'满意度 <b>'+o.satisfaction+'%</b>'}</span>${till}</div>${crown}
      ${arrival}${o.stamp?'<p class="gift-note">纪念封签 · '+C.chapterFor(o.level).paper+'</p>':''}${rows?`<div class="receipt-fixes">${rows}</div>`:''}</div>
      ${detail?'':`<div class="letter-foot">${button('book','关卡册','reply-bookmark')}${next}</div>`}</article>`,'shop-front delivery-front');
  }
  function play(s,l) {
    const a=s.active, cur=a.current===null?null:a.bags[a.current], placed=C.count(a), undo=(C.canUndo(a)?button('undo','撤回','text-btn'):'');
    let body,bar;
    if(a.stage==='tray'){
      body=`<div class="desk tray-scene"><div class="tray-title"><b>挑一只盲袋</b><small>${a.customer} · 想要${C.themes[a.theme].name}</small></div><div class="tray">${a.bags.map((b,i)=>a.slots.includes(i)?`<div class="used">${icon('star',22)}<b>${C.kinds[b.kind].name}</b><small>已配货</small></div>`:button('pick',bag(b.wrapper)+`<small>${i+1} 号袋</small>`,'tray-bag',i,`aria-label="拆${i+1}号袋"`)).join('')}</div></div>`;
      bar=foot(s.learned.tray?'任选剩下的袋子':'袋子里藏着这位顾客想要的品类。',undo||`<span class="note">一袋兑一件</span>`);
    }else if(a.stage==='tear'){
      body=`<div class="desk tear-scene" id="tear-zone" data-gesture="tear" style="--cut:${Math.round(a.tear*100)}%"><div class="hero-pouch"><div class="base-pouch">${bag(cur.wrapper)}</div><div class="torn-pouch">${bag(cur.wrapper,true)}</div><span class="tear-tab" aria-hidden="true">✦</span><div class="tear-dash"></div></div></div>`;
      bar=foot(a.tear?'沿着裂口接着向右撕':'按住袋口缺口，向右撕',primary('tear-all','点一下撕开'));
    }else if(a.stage==='reveal'){
      body=`<div class="desk reveal-scene"><div class="reveal-card"><small>品类图卡</small><span class="category-sprite">${sprite('pink',cur.kind,0)}</span><strong>${C.kinds[cur.kind].name}</strong></div><div class="reveal-bag">${bag(cur.wrapper,true)}</div></div>`;
      bar=foot(`给${a.customer}找一件${C.themes[a.theme].name}的${C.kinds[cur.kind].name}`,primary('shelf','去货架挑款'));
    }else if(a.stage==='shelf'){
      body=`<div class="scroll shelf">${picker(a,l)}</div>`;
      bar=foot(a.choice?`已拿起：${C.themes[a.choice.color].name} · ${packName(a.choice)}`:'打开抽屉，从六色现货中挑一件',primary('take','拿去装盒','',!a.choice)+undo);
    }else if(a.stage==='pack'){
      const pending=!a.slots.includes(a.current), pieces=a.slots.map(idx=>idx===null?null:a.bags[idx].goods);
      body=`<div class="desk pack-scene">${boxView(pieces,true,l.selectedSlot,pending)}${pending?`<button class="loose" data-act="loose" data-drag="pending">${sprite(cur.goods.color,cur.goods.kind,cur.goods.variant)}<span>盒边 · ${C.themes[cur.goods.color].name}${C.kinds[cur.goods.kind].name}</span></button>`:''}</div>`;
      let hint,actions='';
      if(l.selectedSlot!==null && pieces[l.selectedSlot]){
        const idx=a.slots[l.selectedSlot],g=pieces[l.selectedSlot];hint=`图卡要${C.kinds[a.bags[idx].kind].name} · 盒内是${C.themes[g.color].name}${C.kinds[g.kind].name}`;
        actions=secondary('edit','重配这件',l.selectedSlot)+button('deselect','取消选择','text-btn');
      }else if(pending){
        hint='点一个空位装盒，也可以把盒边的小物拖进去';
        actions=primary('auto-place','放入空位')+button('repick','重新挑货','text-btn');
      }else{
        hint=placed===5?'五件齐了。点小物可重配，拖动可换位。':'小物已入盒。点它可调整或重新配货。';
        actions=primary(placed===5?'photo':'next',placed===5?'封盒留影':'拆下一袋');
      }
      bar=foot(hint,actions+undo);
    }else{
      body=`<div class="desk seal-scene"><div class="closed-box" data-dropseal><img class="pixel" src="${asset('props/closed.png')}" alt="已合上的纸盒"><div class="seal-target">封签贴这里</div></div><button class="seal-sticker" data-drag="seal" data-act="seal-hint">${icon(a.theme,31)} ${a.customer}收</button></div>`;
      bar=foot('贴稳封签后，顾客会核对每件货并付款。',primary('seal','贴好封签')+button('rearrange','返回整理','text-btn'));
    }
    return section(head(s,a)+body+bar,'work');
  }
  function receipt(s,id,detail=false){
    const o=s.orders.find(x=>x.id===id);if(!o)return '';
    if(o.cards) return batchReceipt(s,o,detail);
    const sc=C.score(o.theme,o.items);
    const reaction=o.satisfaction===100?'颜色和东西全都对上了，这一盒太合我心意了！':o.satisfaction>=76?'有几件特别喜欢，我把配货单也一起收好啦。':o.satisfaction>=48?'收到啦。下次可以再看看我想要的颜色和图卡吗？':'这盒跟我的愿望差了不少，下次请照着图卡挑吧。';
    return section(nav(detail?'订单详情':'这盒装好了',detail?'back':'home')+`<div class="scroll receipt"><div class="receipt-photo">${boxView(o.items)}</div><div class="ticket result-ticket"><div class="ticket-top"><small>${o.customer} · 订单 ${num(o.id)}</small>${chip(o.theme)}</div><div class="numbers"><div><small>顾客满意度</small><b>${o.satisfaction}<i>%</i></b></div><div><small>本单收益</small><b>+${o.earnings}<i> 星币</i></b></div></div><p>“${reaction}”</p></div><h2>逐件对单</h2><div class="lines">${o.items.map((g,i)=>`<div class="line">${sprite(g.color,g.kind,g.variant)}<div><b>${C.themes[g.color].name} · ${packName(g)}</b><small>${C.kinds[g.wish].name}图卡 · ${sc.lines[i].kindOK?'品类 ✓':'品类不符'} · ${sc.lines[i].colorOK?'颜色 ✓':'颜色不符'}</small></div><strong>+${sc.lines[i].points}</strong></div>`).join('')}</div>${o.fresh.length?`<p class="note">本单点亮 ${o.fresh.length} 款收藏</p>`:''}</div>`+(detail?'':foot(`累计收益 ${total(s)} 星币`,primary('new-order','再接一单')+button('album','查看订单册','text-btn'))),'library');
  }
  function page(s,l){
    if(l.page==='showroom')return LuckyCounter.showroom(s,l);
    if(l.page==='play' && s.active) return s.active.gifts ? LuckyCounter.render(s,l) : play(s,l);
    if(l.page==='book') return LuckyFront.book(s,l);
    if(l.page==='level-request') return orderCounter(s,l,C.levels[l.level-1]);
    if(l.page==='intro')return LuckyFront.home(s,true);
    if(l.page==='request')return orderCounter(s,l);
    if(l.page==='result'||l.page==='detail')return receipt(s,l.orderId,l.page==='detail');
    if(l.page==='album')return section(nav('订单册')+`<div class="scroll"><div class="summary-strip"><b>${s.orders.length} 笔已完成</b><span>累计 ${total(s)} 星币</span></div>${s.orders.length?`<div class="album-grid">${[...s.orders].reverse().map(o=>button('detail',orderPhoto(o)+`<b>${o.customer} · ${num(o.id)}</b><small>${C.themes[o.theme].name} · ${o.satisfaction}% · +${o.earnings} 星币</small>`,'album-card',o.id)).join('')}</div>`:noData('订单册还是空的','封好第一盒，这里就会留下它的照片。','home','回到柜台')}</div>`,'library shop-book order-album');
    if(l.page==='catalog'){
      const got=C.collection(s),cl=l.catalog, perColor=C.kinds.reduce((sum,k)=>sum+k.styles.length,0), maximum=perColor*colors.length, n=C.kinds.reduce((sum,k,i)=>sum+k.styles.filter((_,v)=>got.has(C.itemKey(cl,i,v))).length,0);
      return section(nav('小物图鉴')+`<div class="scroll"><div class="summary-strip"><b>${got.size===maximum?'全部收齐！':'已收藏 '+got.size+' / '+maximum}</b><span>${C.themes[cl].name} ${n}/${perColor}</span></div><div class="palette compact">${colors.map(k=>button('catalog-color',icon(k,17)+C.themes[k].name,'color-choice '+(k===cl?'selected':''),k)).join('')}</div><div class="catalog-grid">${C.kinds.map((k,i)=>k.styles.map((_,v)=>{const owns=got.has(C.itemKey(cl,i,v));return button('catalog-item',sprite(cl,i,v)+`<b>${owns?C.itemName(cl,i,v):k.name+'剪影'}</b>`,'catalog-item '+(owns?'':'unknown'),[cl,i,v].join('|'));}).join('')).join('')}</div></div>`,'library shop-book specimen-book');
    }
    if(l.page==='settings'){
      return section(nav('设置')+`<div class="scroll settings">${[['music','店内音乐'],['sound','打包音效'],['haptic','轻触反馈']].map(([k,t])=>button('setting',`<b>${t}</b><span>${s.settings[k]?'开启':'关闭'}</span>`,'setting-row',k,`role="switch" aria-checked="${s.settings[k]}"`)).join('')}<div class="setting-row"><b>减少动态效果</b><select aria-label="减少动态效果" id="motion">${[['system','跟随系统'],['on','开启'],['off','关闭']].map(([k,t])=>`<option value="${k}" ${s.settings.motion===k?'selected':''}>${t}</option>`).join('')}</select></div>${secondary('help','怎么玩')}${secondary('replay','重看开场')}</div>`,'library shop-book shop-settings');
    }
    return LuckyFront.home(s);
  }
  function dialog(s,l){
    const name=l.modals.at(-1);if(!name)return '';
    let title='',body='';
    if(name==='ticket'){title=s.active.customer+'的配货单';body=LuckyCounter.receipt(s.active,true);}
    if(name==='bead-rules'){title='珠子对照表';body=`<div class="bead-rules">${C.stockKinds(s).map(kind=>`<div class="bead-rule">${LuckyCounter.bead({kind,color:s.active.theme})}<span>→</span><img class="counter-item pixel" src="assets/items/${s.active.theme}-${kind}-0.png" alt=""><b>${C.kinds[kind].name}</b></div>`).join('')}</div>`;}
    if(name==='pause'){title='暂停打包';body=`<p>订单 ${num(s.active.id)} · ${C.themes[s.active.theme].name} · ${s.active.gifts?'已开':'已装'} ${C.count(s.active)} / 5</p>`+primary('close','继续打包')+secondary('help','怎么玩')+secondary('home','保存回店')+button('discard-prompt','结束本单并重新接单','text-btn');}
    if(name==='discard'){title='结束这笔订单？';body='<p>这盒还未封箱，本单的小物与收益会一起放弃。</p>'+primary('close','保留本单')+secondary('discard','结束并重新点单');}
    if(name==='help'){title='怎样配好一盒';body=`<ol class="guide"><li><b>先看顾客点的颜色</b><p>撕袋露卡，看清图卡上的品类、数量和目标颜色。</p></li><li><b>货架上六色都有</b><p>点货架上的区域放大，再从架上挑小物。拿错可以撤回，也可以点盒中小物重新配货。</p></li><li><b>五袋揭晓后，挑赠品、贴封签</b><p>每张卡最多 20 分，缺件按比例计入满意度。赠品可送零至两件，单独记入回信。封好关卡订单就能继续下一关。</p></li></ol>`+primary('close','知道了');}
    if(s.active?.mode==='scoop'&&name==='pause'){title='暂停打包';body=`<p>${s.active.scoopTarget} 勺 · 已倒出 ${s.active.beads.length} 颗 · 已装 ${C.pieceCount(s.active.bags)} 件</p>`+primary('close','继续打包')+secondary('help','怎么玩')+secondary('home','保存回店')+button('discard-prompt','结束本单并重新接单','text-btn');}
    if(s.active?.mode==='scoop'&&name==='help'){title='怎样配好一盒';body='<ol class="guide"><li><b>按订单舀珠子</b><p>舀起一勺，倒进盘子，每颗珠子对应一件货。舀完订单上的勺数，再开始配货。</p></li><li><b>看珠子找实物</b><p>点盘里的珠子看对应货品，按客人的偏好配色。可以打开小票上的珠子对照表。点货架区域放大，在原货格取货。</p></li><li><b>装盒寄出</b><p>重复珠子就配多件。配齐后核对装箱，可加零至两件赠品，再贴签寄出。</p></li></ol>'+primary('close','知道了');}
    if(name==='unlock'){title='解锁完整版';body='<p class="unlock-pitch">第一章十关免费开放。解锁后继续第二到第十章的 90 关，新货随关卡陆续到店。一次购买，永久有效，换设备可用同一 Apple 账户恢复。</p>'+
      primary('purchase',l.storeBusy?'正在连接 App Store…':l.price?'解锁 · '+l.price:'解锁完整版','',!!l.storeBusy)+secondary('restore','恢复购买')+secondary('close','先不用');}
    if(name==='shortage'){title='还有几样没配齐';body=s.active.bags.filter(b=>b.pieces.length<b.quantity).map(b=>'<p>'+requirement(b)+' · 还差 '+(b.quantity-b.pieces.length)+units[b.kind]+'</p>').join('')+primary('close','回去补货')+secondary('wrap-confirm','照单装盒');}
    if(name==='edit'){title='重新配货';body=picker(s.active,l,true)+primary('edit-confirm','替换盒中这件','',!l.editGoods);}
    if(name==='catalog-item'){
      const g=l.catalogItem,id=C.collection(s).get(C.itemKey(g.color,g.kind,g.variant));
      const delivery=C.deliveries.find(d=>d.kind===g.kind), available=C.stockKinds(s).includes(g.kind);
      const caption=id?'首次收录于订单 '+num(id):available?'已经上架，随包裹寄出即可收藏。':'寄出关卡册第 '+delivery.after+' 单后到货。';
      title=id?packName(g):C.kinds[g.kind].name+'剪影';
      body=`<div class="detail-art ${id?'':'unknown'}">${sprite(g.color,g.kind,g.variant)}</div><p>${caption}</p>`+primary('close','合上');
    }
    return `<div class="veil"><section class="dialog" role="dialog" aria-modal="true" aria-label="${title}"><header><h2>${name==='ticket'?icon('pink',23):''}${title}</h2>${mini('close','close','关闭')}</header>${body}</section></div>`;
  }
  window.LuckyView={page,dialog,colors,icon,button};
})();
