'use strict';
(function viewsModule() {
  const C=LuckyCore, colors=Object.keys(C.themes), drawers=['发饰','书写','纸品','随身'];
  const wishes={pink:'想收一盒草莓粉，像刚做好的莓果牛奶。',blue:'今天想念海边，帮我配一盒海盐蓝吧。',purple:'葡萄刚熟的紫色，是我今天最想要的颜色。',yellow:'想让书桌亮一点，这次请给我柠檬黄。',green:'阳台的薄荷长新叶了，想要一盒同样的绿。',orange:'给周末带点好心情，今天想拆蜜橘橙。'};
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
  const head=(s,a)=>`<header class="workhead"><div><small>${a.customer}的订单 · ${num(a.id)}</small><b>${icon(a.theme,23)}想要${C.themes[a.theme].name}</b></div>${mini('pause','pause','暂停')}</header><div class="meter"><span>${a.stage==='tray'?'盲袋托盘':a.stage==='seal'?'封箱贴签':a.stage==='pack'?'装盒台':'第 '+(C.count(a)+1)+' 袋'}</span><div class="stamps">${Array.from({length:5},(_,i)=>`<i>${i<C.count(a)?icon(a.theme,15):''}</i>`).join('')}</div><span>已装 ${C.count(a)} / 5</span></div>`;
  const foot=(hint,buttons)=>`<footer class="controls"><p>${hint}</p><div class="actions">${buttons}</div></footer>`;
  const section=(body,cls='')=>`<section class="screen ${cls}">${body}</section>`;
  const drawerButtons=(current,act)=>`<div class="drawers">${drawers.map(name=>button(act,name,'drawer '+(current===name?'chosen':''),name,`aria-pressed="${current===name}"`)).join('')}</div>`;
  function picker(a, local, exchange=false) {
    const target=exchange?a.bags[a.slots[local.editSlot]].kind:a.bags[a.current].kind;
    const drawer=exchange?local.editDrawer:a.drawer, kind=exchange?local.editKind:local.shelfKind;
    const variant=exchange?local.editVariant:local.shelfVariant;
    const choice=exchange?local.editGoods:a.choice;
    let html=`<div class="ticket slim"><span>图卡想要</span><b>${C.kinds[target].name}</b>${chip(a.theme)}</div>`+drawerButtons(drawer,exchange?'edit-drawer':'drawer');
    if(!drawer) return html+`<div class="shelf-preview">${drawers.map((n,i)=>button('drawer',sprite(colors[(i+a.id)%6],[0,1,2,5][i],0)+`<b>${n}</b>`,'drawer-bin',n)).join('')}</div>`;
    const options=C.kinds.map((k,i)=>({k,i})).filter(x=>x.k.drawer===drawer);
    const active=options.some(x=>x.i===kind)?kind:options[0].i;
    html+=`<div class="cat-tabs">${options.map(x=>button(exchange?'edit-kind':'kind',x.k.name,'tab '+(x.i===active?'selected':''),x.i)).join('')}</div>`;
    html+=`<div class="variants">${C.kinds[active].styles.map((text,i)=>button(exchange?'edit-variant':'variant',text,'variant '+(variant===i?'selected':''),i)).join('')}</div>`;
    const offset=(a.id+(a.current??0)+active)%6, palette=colors.slice(offset).concat(colors.slice(0,offset));
    html+=`<div class="stock">${palette.map(cl=>{
      const picked=choice?.kind===active&&choice.variant===variant&&choice.color===cl;
      return button(exchange?'edit-color':'stock',sprite(cl,active,variant)+`<span class="stock-label"><i style="background:${C.themes[cl].swatch}"></i>${C.themes[cl].name}</span>`,'stock-item '+(picked?'selected':''),[cl,active,variant].join('|'),`aria-pressed="${picked}" aria-label="${C.themes[cl].name}${C.itemName(cl,active,variant)}"`);
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
  function play(s,l) {
    const a=s.active, cur=a.current===null?null:a.bags[a.current], placed=C.count(a), undo=(a.history.length?button('undo','撤回','text-btn'):'');
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
    const sc=C.score(o.theme,o.items);
    const reaction=o.satisfaction===100?'颜色和东西全都对上了，这一盒太合我心意了！':o.satisfaction>=76?'有几件特别喜欢，我把配货单也一起收好啦。':o.satisfaction>=48?'收到啦。下次可以再看看我想要的颜色和图卡吗？':'这盒跟我的愿望差了不少，下次请照着图卡挑吧。';
    return section(nav(detail?'订单详情':'这盒装好了',detail?'back':'home')+`<div class="scroll receipt"><div class="receipt-photo">${boxView(o.items)}</div><div class="ticket result-ticket"><div class="ticket-top"><small>${o.customer} · 订单 ${num(o.id)}</small>${chip(o.theme)}</div><div class="numbers"><div><small>顾客满意度</small><b>${o.satisfaction}<i>%</i></b></div><div><small>本单收益</small><b>+${o.earnings}<i> 星币</i></b></div></div><p>“${reaction}”</p></div><h2>逐件对单</h2><div class="lines">${o.items.map((g,i)=>`<div class="line">${sprite(g.color,g.kind,g.variant)}<div><b>${C.themes[g.color].name} · ${packName(g)}</b><small>${C.kinds[g.wish].name}图卡 · ${sc.lines[i].kindOK?'品类 ✓':'品类不符'} · ${sc.lines[i].colorOK?'颜色 ✓':'颜色不符'}</small></div><strong>+${sc.lines[i].points}</strong></div>`).join('')}</div>${o.fresh.length?`<p class="note">本单点亮 ${o.fresh.length} 款收藏</p>`:''}</div>`+(detail?'':foot(`累计收益 ${total(s)} 星币`,primary('new-order','再接一单')+button('album','查看订单册','text-btn'))),'library');
  }
  function page(s,l){
    if(l.page==='play' && s.active) return play(s,l);
    if(l.page==='intro')return section(`<div class="intro-art"><div class="shutter"></div><div class="shop-sign">${icon('bag',32)}幸运盲袋</div></div><div class="intro-note"><span>第一张订单</span><b>“帮我挑一盒小东西吧。”</b></div>${button('finish-intro','跳过','skip')}`,'intro');
    if(l.page==='request'){
      const customer=C.customers[(s.nextId-1)%C.customers.length], theme=l.request;
      return section(nav('顾客点单')+`<div class="scroll request"><div class="customer-ticket"><span class="mail-stamp">${icon(theme,45)}</span><small>${customer}的来信 · 订单 ${num(s.nextId)}</small><h2>${wishes[theme]}</h2><div class="ticket-bottom">${chip(theme)}<span>五件小物</span></div></div><h2>顾客的颜色愿望</h2><div class="palette">${colors.map(k=>button('wish',icon(k,27)+C.themes[k].name,'color-choice '+(k===theme?'selected':''),k,`aria-pressed="${k===theme}"`)).join('')}</div><p class="note">这里可以替顾客指定颜色。接单后，六种颜色的现货都会摆在货架上。</p></div>`+foot('品类匹配 +12，颜色匹配 +8，每件最多 20 星币。',primary('accept','接下这单')),'library');
    }
    if(l.page==='result'||l.page==='detail')return receipt(s,l.orderId,l.page==='detail');
    if(l.page==='album')return section(nav('订单册')+`<div class="scroll"><div class="summary-strip"><b>${s.orders.length} 笔已完成</b><span>累计 ${total(s)} 星币</span></div>${s.orders.length?`<div class="album-grid">${[...s.orders].reverse().map(o=>button('detail',boxView(o.items)+`<b>${o.customer} · ${num(o.id)}</b><small>${C.themes[o.theme].name} · ${o.satisfaction}% · +${o.earnings} 星币</small>`,'album-card',o.id)).join('')}</div>`:noData('订单册还是空的','封好第一盒，这里就会留下它的照片。','home','回到柜台')}</div>`,'library');
    if(l.page==='catalog'){
      const got=C.collection(s),cl=l.catalog, n=C.kinds.reduce((sum,k,i)=>sum+[0,1].filter(v=>got.has(C.itemKey(cl,i,v))).length,0);
      return section(nav('小物图鉴')+`<div class="scroll"><div class="summary-strip"><b>${got.size===72?'全部收齐！':'已收藏 '+got.size+' / 72'}</b><span>${C.themes[cl].name} ${n}/12</span></div><div class="palette compact">${colors.map(k=>button('catalog-color',icon(k,17)+C.themes[k].name,'color-choice '+(k===cl?'selected':''),k)).join('')}</div><div class="catalog-grid">${C.kinds.map((k,i)=>[0,1].map(v=>{const owns=got.has(C.itemKey(cl,i,v));return button('catalog-item',sprite(cl,i,v)+`<b>${owns?C.itemName(cl,i,v):k.name+'剪影'}</b>`,'catalog-item '+(owns?'':'unknown'),[cl,i,v].join('|'));}).join('')).join('')}</div></div>`,'library');
    }
    if(l.page==='settings'){
      return section(nav('设置')+`<div class="scroll settings">${[['sound','打包音效'],['haptic','轻触反馈']].map(([k,t])=>button('setting',`<b>${t}</b><span>${s.settings[k]?'开启':'关闭'}</span>`,'setting-row',k,`role="switch" aria-checked="${s.settings[k]}"`)).join('')}<div class="setting-row"><b>减少动态效果</b><select aria-label="减少动态效果" id="motion">${[['system','跟随系统'],['on','开启'],['off','关闭']].map(([k,t])=>`<option value="${k}" ${s.settings.motion===k?'selected':''}>${t}</option>`).join('')}</select></div>${secondary('help','怎么玩')}${secondary('replay','重看开场')}</div>`,'library');
    }
    return section(`<header class="home-head"><span class="brand-mark">${icon('bag',30)}</span><h1>幸运盲袋</h1>${mini('settings','gear','设置')}</header><div class="home-hero"><img class="pixel" src="${asset('shop.webp')}" alt="装满彩色文具和发饰的像素杂货铺"><div class="home-balance">${icon('star',15)} ${total(s)} 星币</div></div><div class="home-desk"><div class="shop-ticket"><div class="ticket-top"><small>${s.active?'进行中':'柜台订单夹'}</small><span>${s.active?'订单 '+num(s.active.id):'第 '+num(s.nextId)+' 单'}</span></div><h2>${s.active?s.active.customer+'的'+C.themes[s.active.theme].name+'订单':'今天，给客人装一盒什么？'}</h2><p>${s.active?'已有 '+C.count(s.active)+' 件入盒，进度已保留。':'开盲袋看图卡，从六色货架挑出客人想要的小物。'}</p></div>${primary(s.active?'resume':'new-order',s.active?'继续打包':'接新单')}<div class="home-nav">${secondary('album',icon('album',23)+'订单册')}${secondary('catalog',icon('catalog',23)+'小物图鉴')}</div></div>`,'home');
  }
  function dialog(s,l){
    const name=l.modals.at(-1);if(!name)return '';
    let title='',body='';
    if(name==='pause'){title='暂停打包';body=`<p>订单 ${num(s.active.id)} · ${C.themes[s.active.theme].name} · 已装 ${C.count(s.active)} / 5</p>`+primary('close','继续打包')+secondary('help','怎么玩')+secondary('home','保存回店')+button('discard-prompt','结束本单并重新接单','text-btn');}
    if(name==='discard'){title='结束这笔订单？';body='<p>这盒还未封箱，本单的小物与收益会一起放弃。</p>'+primary('close','保留本单')+secondary('discard','结束并重新点单');}
    if(name==='help'){title='怎样配好一盒';body=`<ol class="guide"><li><b>先看顾客点的颜色</b><p>撕袋露卡，记住图卡上的品类。</p></li><li><b>货架上六色都有</b><p>打开抽屉，挑品类、款式和颜色。拿错可以撤回，也可以点盒中小物重新配货。</p></li><li><b>装满五件再贴封签</b><p>每件品类相符得 12 分，颜色相符得 8 分。整单最多 100 分，每分换 1 星币。</p></li></ol>`+primary('close','知道了');}
    if(name==='edit'){title='重新配货';body=picker(s.active,l,true)+primary('edit-confirm','替换盒中这件','',!l.editGoods);}
    if(name==='catalog-item'){const g=l.catalogItem;const id=C.collection(s).get(C.itemKey(g.color,g.kind,g.variant));title=id?packName(g):C.kinds[g.kind].name+'剪影';body=`<div class="detail-art ${id?'':'unknown'}">${sprite(g.color,g.kind,g.variant)}</div><p>${C.themes[g.color].name} · ${id?'首次收录于订单 '+num(id):'在货架上挑选这个款式，并完成封箱即可收藏。'}</p>`+primary('close','合上');}
    return `<div class="veil"><section class="dialog" role="dialog" aria-modal="true" aria-label="${title}"><header><h2>${title}</h2>${mini('close','close','关闭')}</header>${body}</section></div>`;
  }
  window.LuckyView={page,dialog,colors,icon,button};
})();
