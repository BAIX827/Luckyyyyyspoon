'use strict';

(function (root) {
  const {levels,chapters,deliveries} = root.LuckyLevels || require('./levels.js');
  const giftKinds = [4,3,1,10,15,22];
  const themes = {
    pink: { name: '草莓粉', mark: '草莓', swatch: '#f98aa9', pale: '#ffe3dd', dark: '#92354e' },
    blue: { name: '海盐蓝', mark: '贝壳', swatch: '#7ccbdc', pale: '#dcf5ef', dark: '#265e78' },
    purple: { name: '葡萄紫', mark: '葡萄', swatch: '#bea2e6', pale: '#f0e4f8', dark: '#684588' },
    yellow: { name: '柠檬黄', mark: '柠檬', swatch: '#f3d365', pale: '#fff2bf', dark: '#775117' },
    green: { name: '薄荷绿', mark: '四叶草', swatch: '#83cba2', pale: '#dcf2dc', dark: '#2e654d' },
    orange: { name: '蜜橘橙', mark: '蜜橘', swatch: '#f2a466', pale: '#ffead5', dark: '#884124' }
  };
  const kinds = [
    { name: '发箍', drawer: '发饰', styles: ['格纹蝴蝶结发箍', '扭结布艺发箍'] },
    { name: '笔', drawer: '书写', styles: ['造型笔帽按动笔', '透明笔杆笔'] },
    { name: '本子', drawer: '纸品', styles: ['线圈本', '扣带硬壳本'] },
    { name: '发夹', drawer: '发饰', styles: ['花朵边夹', '长条树脂夹'] },
    { name: '贴纸', drawer: '纸品', styles: ['拼贴贴纸', '长条封口贴'] },
    { name: '零钱包', drawer: '随身', styles: ['半月拉链包', '方形口金包'] },
    { name: '发圈', drawer: '发饰', styles: ['花瓣绒发圈'] },
    { name: '抓夹', drawer: '发饰', styles: ['贝壳抓夹'] },
    { name: '发带', drawer: '发饰', styles: ['交叉束发带'] },
    { name: '荧光笔', drawer: '书写', styles: ['斜头荧光笔'] },
    { name: '橡皮', drawer: '书写', styles: ['双色纸套橡皮'] },
    { name: '修正带', drawer: '书写', styles: ['水滴修正带'] },
    { name: '自动铅笔', drawer: '书写', styles: ['金属细芯铅笔'] },
    { name: '便签', drawer: '纸品', styles: ['方格便签砖'] },
    { name: '和纸胶带', drawer: '纸品', styles: ['花点和纸胶带'] },
    { name: '书签', drawer: '纸品', styles: ['流苏书签'] },
    { name: '钥匙扣', drawer: '随身', styles: ['星星钥匙扣'] },
    { name: '卡套', drawer: '随身', styles: ['透明挂绳卡套'] },
    { name: '收纳袋', drawer: '随身', styles: ['束口小布袋'] },
    { name: '折叠镜', drawer: '随身', styles: ['贝母口袋镜'] },
    { name: '发梳', drawer: '发饰', styles: ['圆柄气垫梳'] },
    { name: '卷笔刀', drawer: '书写', styles: ['双孔卷笔刀'] },
    { name: '长尾夹', drawer: '纸品', styles: ['烤漆长尾夹'] },
    { name: '水杯', drawer: '随身', styles: ['花釉马克杯'] }
  ];
  const finishCatalog = [
    {part:'desk', id:'maple', name:'原木', after:0, price:0},
    {part:'cloth', id:'gingham', name:'亚麻方格', after:0, price:0},
    {part:'rack', id:'beech', name:'榉木柜', after:0, price:0},
    {part:'cloth', id:'tide', name:'海盐条纹', after:1, price:80},
    {part:'desk', id:'walnut', name:'胡桃木', after:5, price:340},
    {part:'rack', id:'sage', name:'青瓷漆柜', after:12, price:760},
    {part:'cloth', id:'berry', name:'莓果织花', after:27, price:1380},
    {part:'desk', id:'milk', name:'奶油漆木', after:50, price:2300},
    {part:'rack', id:'cherry', name:'樱桃木柜', after:90, price:3400}
  ];
  const finishes=Object.fromEntries(['desk','cloth','rack'].map(part=>[part,finishCatalog.filter(f=>f.part===part)]));
  const basicDisplay=()=>({purchases:{},equipped:{desk:'maple',cloth:'gingham',rack:'beech'}});
  // Every level of a chapter shipped at three stars pays a one-time bonus, derived from the orders themselves.
  const chapterBonus=200;
  // Chapter one is the free trial; later levels need the one-time full-game purchase.
  const freeLevels=10;
  function perfectChapters(orders) {
    const best=new Map();
    for(const o of orders)if(o.level)best.set(o.level,Math.max(best.get(o.level)||0,levelStars(o.satisfaction)));
    return chapters.map((_,c)=>Array.from({length:10},(_,i)=>c*10+i+1).every(id=>best.get(id)===3));
  }
  const balance=s=>s.orders.reduce((sum,o)=>sum+o.earnings,0)+perfectChapters(s.orders).filter(Boolean).length*chapterBonus-Object.values(s.display?.purchases||{}).reduce((sum,price)=>sum+price,0);
  const ownsFinish=(s,f)=>f.price===0 || Object.hasOwn(s.display?.purchases||{},f.id);
  const finishAvailable=(s,f,through=completedLevels(s))=>ownsFinish(s,f) || through>=f.after;
  function stockKinds(s) {
    const through=completedLevels(s);
    const owned=new Set([0,1,2,3,4,5]);
    for(const d of deliveries)if(d.after<=through)owned.add(d.kind);
    // A shop upgraded from the open-stock version keeps goods already sent to customers.
    for(const o of s.orders)for(const g of o.items.concat(o.gifts||[]))owned.add(g.kind);
    return [...owned];
  }
  const isStocked=(a,kind)=>!a.stockKinds || a.stockKinds.includes(kind);
  const copy = value => JSON.parse(JSON.stringify(value));
  const initial = () => ({
    format: 1, revision: 0, nextId: 1, seenIntro: false,
    settings: { music: true, sound: true, haptic: true, motion: 'system' }, learned: {},
    active: null, orders: [], display:basicDisplay()
  });
  const count = order => order.gifts ? order.bags.filter(b=>b.opened).length : order.slots.filter(index => index !== null).length;
  const itemName = (theme, kind, variant) =>
    kind === 1 && variant === 0 ? themes[theme].mark + '笔帽按动笔' : kinds[kind].styles[variant];
  const itemKey = (theme, kind, variant) => [theme, kind, variant].join('-');
  function collection(state) {
    const found = new Map();
    for (const order of state.orders) {
      for (const item of order.items.concat(order.gifts || [])) {
        const key = itemKey(item.color, item.kind, item.variant);
        if (!found.has(key)) found.set(key, order.id);
      }
    }
    return found;
  }
  function score(theme, items) {
    const lines=items.map(item=>{
      const kindOK=item.kind===item.wish, colorOK=item.color===theme;
      return {kindOK,colorOK,points:(kindOK?12:0)+(colorOK?8:0)};
    });
    const satisfaction=lines.reduce((sum,line)=>sum+line.points,0);
    return {lines,satisfaction,earnings:satisfaction};
  }
  function packedItems(order) {
    return order.slots.filter(index=>index!==null).map(index=>({
      ...order.bags[index].goods,wish:order.bags[index].kind,bag:index
    }));
  }
  function saveUndo(order) {
    const {history,...content}=order;
    order.history = [...(history||[]),copy(content)];
    if(order.history.length>30) order.history.shift();
  }
  function validGoods(item) {
    return item && Number.isInteger(item.kind) && !!kinds[item.kind] &&
      Object.hasOwn(themes,item.color) && Number.isInteger(item.variant) && kinds[item.kind].styles[item.variant] !== undefined;
  }
  function completedLevels(state) {
    const finished = new Set(state.orders.map(order=>order.level));
    const next=levels.find(level=>!finished.has(level.id));
    return next ? next.id-1 : levels.length;
  }
  const unlockedLevel=state=>Math.min(completedLevels(state)+1,levels.length);
  const chapterFor = id => chapters[Math.floor((id-1)/10)];
  const scoopsFor = level => level <= 10 ? 1 : level <= 40 ? 2 : 3;
  const levelName = value => {
    if(value===100)return '第一百关';
    const digits='一二三四五六七八九';
    const number=value<10?digits[value-1]:(value<20?'':digits[Math.floor(value/10)-1])+'十'+(value%10?digits[value%10-1]:'');
    return '第'+number+'关';
  };
  const scoopSize = {min:20,max:28};
  const legacyBeadsPerScoop = 6;
  function cardsFor(level) {
    return level.quantities.flatMap((quantity,kind)=>quantity ? [{
      kind, quantity, color: level.accent?.kind === kind ? level.accent.color : level.theme,
      variant: level.style?.kind === kind ? level.style.variant : null
    }] : []);
  }
  function pieceCount(bags) {
    return bags.reduce((sum,bag)=>sum+bag.pieces.length,0);
  }
  function stockCapacity(order, kind, gift=false) {
    if(!isStocked(order,kind))return 0;
    const demand = order.mode === 'scoop'
      ? order.bags.filter(b=>b.kind===kind).reduce((sum,b)=>sum+b.quantity,0)
      : order.bags.find(b=>b.kind===kind)?.quantity;
    return gift ? 2 : (demand || 1) + (order.reserve || 0);
  }
  function remaining(order, goods, gift=false) {
    const group = gift ? order.gifts : order.bags.flatMap(b=>b.pieces);
    const used = group.filter(g=>g.kind===goods.kind && g.color===goods.color && g.variant===goods.variant).length;
    return stockCapacity(order,goods.kind,gift) - used;
  }
  // Three stars only for a box with nothing wrong or missing.
  function levelStars(satisfaction) {
    if (satisfaction >= 100) return 3;
    if (satisfaction >= 80) return 2;
    if (satisfaction >= 60) return 1;
    return 0;
  }
  const fits=(card,g)=>g.kind===card.kind && g.color===card.color && (card.variant===null || g.variant===card.variant);
  function rateCards(cards) {
    const lines = cards.map(card=>{
      const points = card.pieces.reduce((sum,g)=>{
        const sameKind = g.kind===card.kind;
        const kindPoints = sameKind ? (card.variant===null ? 12 : 8) : 0;
        const stylePoints = sameKind && card.variant!==null && g.variant===card.variant ? 4 : 0;
        return sum+kindPoints+stylePoints+(g.color===card.color ? 8 : 0);
      },0);
      return points/card.quantity;
    });
    const normalized=lines.map(points=>points*5/Math.max(1,cards.length));
    const perfect=cards.every(card=>card.pieces.length===card.quantity && card.pieces.every(g=>fits(card,g)));
    const total=Math.round(normalized.reduce((sum,points)=>sum+points,0));
    const satisfaction=perfect?100:Math.min(99,total);
    return {lines:normalized,satisfaction,earnings:satisfaction};
  }
  function beginScoop(next, level, theme, scoops) {
    const id=next.nextId++;
    next.active={id,mode:'scoop',level:level?.id||null,theme,stockKinds:stockKinds(next),
      customer:level?.customer||customers[(id-1)%customers.length],
      scoopTarget:scoops,scoopsTaken:0,scoopSizes:[],beads:[],pendingBeads:[],
      stage:'scoop',current:null,tear:0,drawer:null,reserve:2,
      gifts:[],history:[],stamp:false,bags:[]};
  }
  function scoopAction(next, action, random) {
    const a=next.active;
    if(action==='scoop'){
      if(a.stage!=='scoop'||a.scoopsTaken>=a.scoopTarget)return false;
      const debut=deliveries.find(d=>d.after===a.level-1);
      const amount=a.scoopSizes ? scoopSize.min+Math.floor(random()*(scoopSize.max-scoopSize.min+1)) : legacyBeadsPerScoop;
      a.pendingBeads=Array.from({length:amount},(_,i)=>({
        kind:a.scoopsTaken===0 && i===0 && debut ? debut.kind :
          a.stockKinds[Math.floor(random()*a.stockKinds.length)],
        color:a.theme,variant:null
      }));
      a.stage='drawn';
    }else if(action==='pour'){
      if(a.stage!=='drawn'||!a.pendingBeads.length)return false;
      a.scoopSizes?.push(a.pendingBeads.length);
      for(const bead of a.pendingBeads){
        let card=a.bags.find(b=>b.kind===bead.kind&&b.color===bead.color);
        if(!card){
          card={...bead,wrapper:bead.color,quantity:0,pieces:[],opened:true};
          a.bags.push(card);
        }
        card.quantity++;
        a.beads.push({...bead});
      }
      a.pendingBeads=[];a.scoopsTaken++;
      a.stage=a.scoopsTaken===a.scoopTarget?'shelf':'scoop';
      a.current=a.stage==='shelf'?0:null;
      a.drawer=a.stage==='shelf'?kinds[a.bags[0].kind].drawer:null;
      a.shelfKind=a.stage==='shelf'?a.bags[0].kind:null;a.shelfVariant=0;
      a.history=[];
    }else return false;
    return true;
  }
  function beginBatch(next, level, theme, random) {
    const id=next.nextId++;
    const stock=stockKinds(next);
    let cards;
    if (level) {
      cards=cardsFor(level);
      for(let i=cards.length-1;i>0;i--) {
        const j=Math.floor(random()*(i+1));
        [cards[i],cards[j]]=[cards[j],cards[i]];
      }
      const debut=deliveries.find(d=>d.after===level.id-1);
      const first=debut?cards.findIndex(b=>b.kind===debut.kind):-1;
      if(first>0)[cards[0],cards[first]]=[cards[first],cards[0]];
    } else {
      cards=shuffled(random,stock).map(kind=>({kind,color:theme,variant:null,
        quantity:1+Math.floor(random()*3)}));
    }
    next.active={id,level:level?.id || null,theme,stockKinds:stock,customer:level?.customer || customers[(id-1)%customers.length],
      stage:'tray',current:null,tear:0,drawer:null,reserve:2,gifts:[],history:[],stamp:false,
      bags:cards.map((card,i)=>({...card,wrapper:Object.keys(themes)[(id+i)%6],opened:false,pieces:[]}))};
  }
  // The bag owns its pieces throughout picking, corrections, and packing.
  // Shelf counts derive from those pieces so returning or undoing never loses stock.
  function batchAction(next,action,arg) {
    const a=next.active, card=a.bags[a.current];
    switch(action) {
      case 'station-browse': {
        if(!['tray','tear','reveal','shelf','pack'].includes(a.stage) || !Number.isInteger(arg?.kind) || !isStocked(a,arg.kind) ||
          !Number.isInteger(arg.variant) || !kinds[arg.kind]?.styles[arg.variant]) return false;
        a.shelfKind=arg.kind; a.shelfVariant=arg.variant; a.drawer=kinds[arg.kind].drawer;
        if(a.stage==='reveal') a.stage='shelf';
        break;
      }
      case 'station-card': {
        const selected=a.bags[arg];
        if(!Number.isInteger(arg) || !selected || !['tray','shelf','pack','reveal'].includes(a.stage)) return false;
        if(a.stage==='shelf' && a.current===arg)return false;
        a.stage=selected.opened?'shelf':'tear'; a.current=arg; a.tear=selected.opened?1:0;
        if(selected.opened){a.shelfKind=selected.kind; a.shelfVariant=0; a.drawer=kinds[selected.kind].drawer;}
        a.history=[]; next.learned.tray=true; break;
      }
      case 'station-unpack': {
        if(a.stage!=='reveal') return false;
        a.stage='shelf'; a.shelfKind=card.kind; a.shelfVariant=0; a.drawer=kinds[card.kind].drawer;
        next.learned.shelf=true; break;
      }
      case 'station-pack':
        if(!['shelf','tray','reveal'].includes(a.stage) || !a.bags.every(b=>b.opened) || !pieceCount(a.bags) ||
          a.mode==='scoop' && a.scoopsTaken!==a.scoopTarget) return false;
        a.stage='pack'; a.current=null; a.history=[]; break;
      case 'pick': {
        if(a.stage!=='tray' || !Number.isInteger(arg) || !a.bags[arg]) return false;
        a.current=arg; a.drawer=null; a.tear=0; a.history=[];
        a.stage=a.bags[arg].opened ? 'shelf' : 'tear';
        next.learned.tray=true; break;
      }
      case 'add-piece': {
        const revealing=a.stage==='reveal';
        if((!revealing && a.stage!=='shelf') || !validGoods(arg) || !card ||
            kinds[arg.kind].drawer!==(revealing ? kinds[card.kind].drawer : a.drawer) ||
            card.pieces.length>=card.quantity || remaining(a,arg)<=0) return false;
        if(revealing){
          a.stage='shelf'; a.shelfKind=card.kind; a.shelfVariant=0;
          a.drawer=kinds[card.kind].drawer; next.learned.shelf=true;
        }
        saveUndo(a); card.pieces.push({...arg});
        if(a.mode==='scoop'&&arg.kind===card.kind&&arg.color===card.color)
          next.learned['goods-'+arg.kind]=true;
        break;
      }
      case 'return-piece': {
        const bag=a.bags[arg?.bag], index=arg?.index;
        if(!['shelf','pack'].includes(a.stage) || !bag || !Number.isInteger(index) || !bag.pieces[index]) return false;
        saveUndo(a); bag.pieces.splice(index,1); break;
      }
      case 'finish-card':
        if(a.stage!=='shelf') return false;
        a.stage=a.bags.every(b=>b.opened) ? 'pack' : 'tray';
        a.current=null; a.drawer=null; a.history=[]; break;
      case 'refill':
        if(a.stage!=='pack' || !Number.isInteger(arg) || !a.bags[arg]?.opened) return false;
        a.stage='shelf'; a.current=arg; a.drawer=null; a.history=[]; break;
      case 'position': {
        const piece=a.bags[arg?.bag]?.pieces[arg?.index];
        if(!['shelf','pack'].includes(a.stage) || !piece || ![arg.x,arg.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1))return false;
        saveUndo(a);piece.position={x:arg.x,y:arg.y};break;
      }
      case 'wrap':
        if(a.stage!=='pack' || !a.bags.every(b=>b.opened) || !pieceCount(a.bags)) return false;
        a.stage='gifts'; a.history=[]; break;
      case 'add-gift':
        if(a.stage!=='gifts' || a.gifts.length>=2 || !validGoods(arg) || !giftKinds.includes(arg.kind) || remaining(a,arg,true)<=0) return false;
        saveUndo(a); a.gifts.push({...arg}); break;
      case 'return-gift':
        if(a.stage!=='gifts' || !Number.isInteger(arg) || !a.gifts[arg]) return false;
        saveUndo(a); a.gifts.splice(arg,1); break;
      case 'review':
        if(a.stage!=='gifts') return false;
        a.stage='pack'; a.history=[]; break;
      case 'photo':
        if(a.stage!=='gifts') return false;
        a.stage='seal'; break;
      case 'rearrange':
        if(a.stage!=='seal') return false;
        a.stage='gifts'; a.history=[]; break;
      case 'stamp':
        if(a.stage!=='seal' || !a.level || a.level%10!==0 || a.stamp) return false;
        a.stamp=true; break;
      case 'seal': {
        if(a.stage!=='seal' || !pieceCount(a.bags) || !a.bags.every(b=>b.opened)) return false;
        const cards=a.bags.map(({kind,color,variant,quantity,pieces})=>({kind,color,variant,quantity,pieces}));
        const items=cards.flatMap(b=>b.pieces);
        const known=collection(next);
        const keys=items.concat(a.gifts).map(g=>itemKey(g.color,g.kind,g.variant));
        const {satisfaction,earnings}=rateCards(cards);
        const delivery=deliveries.find(d=>d.after===a.level);
        const arrival=delivery && !next.orders.some(o=>o.level===a.level) && !stockKinds(next).includes(delivery.kind) &&
          !items.concat(a.gifts).some(g=>g.kind===delivery.kind) ? delivery.kind : null;
        const sample=finishCatalog.find(f=>f.after===a.level);
        const newSample=sample && a.level===completedLevels(next)+1 && !ownsFinish(next,sample);
        next.orders=next.orders.concat({id:a.id,level:a.level,theme:a.theme,customer:a.customer,arrival,
          ...(a.mode==='scoop'?{mode:a.mode,scoopTarget:a.scoopTarget,scoopsTaken:a.scoopsTaken,scoopSizes:a.scoopSizes,beads:a.beads}:{}),
          ...(newSample?{sample:sample.id}:{}),
          completed:arg || new Date().toISOString(),cards,items,gifts:a.gifts,stamp:a.stamp,
          fresh:[...new Set(keys.filter(key=>!known.has(key)))],satisfaction,earnings});
        if(a.mode==='scoop'&&a.level===1)next.learned['first-order']=true;
        next.active=null; break;
      }
      default: return false;
    }
    return true;
  }
  const customers=['阿梨','小满','可可','小岚','团子','阿柚','云朵','南南'];
  function shuffled(random, catalogue) {
    const values = catalogue.slice();
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values.slice(0,5);
  }
  function step(state, action, arg, random = Math.random) {
    if(action==='furnish'){
      const options=Object.hasOwn(finishes,arg?.part)?finishes[arg.part]:null;
      const finish=options?.find(f=>f.id===arg.id);
      if(!finish || !finishAvailable(state,finish))return state;
      const display=state.display||basicDisplay();
      if(display.equipped[arg.part]===finish.id)return state;
      const charge=!ownsFinish(state,finish);
      if(charge && balance(state)<finish.price)return state;
      const purchases=charge?{...display.purchases,[finish.id]:finish.price}:display.purchases;
      return {...state,revision:state.revision+1,display:{purchases,equipped:{...display.equipped,[arg.part]:finish.id}}};
    }
    const next = {...state,learned:{...state.learned},settings:{...state.settings}};
    if(state.active){
      const {history,...current}=state.active;
      // Completed orders and earlier undo snapshots are immutable.
      next.active={...copy(current),history:history.slice()};
    }
    const order = next.active;
    const validIndex = value => Number.isInteger(value) && value >= 0 && value < 5;
    const stage = name => order && order.stage === name;
    if(action==='tutorial-skip'){
      if(!['first-order','hold'].includes(arg)&&!deliveries.some(d=>'goods-'+d.kind===arg))return state;
      if(next.learned[arg])return state;
      next.learned[arg]=true;next.revision++;return next;
    }
    if(order?.mode==='scoop' && ['scoop','pour'].includes(action)){
      if(!scoopAction(next,action,random))return state;
      next.revision++;return next;
    }
    if(order?.gifts && !['intro','setting','tear','shelf','drawer','browse','undo','discard'].includes(action)){
      if(!batchAction(next,action,arg)) return state;
      next.revision++;
      return next;
    }
    switch (action) {
      case 'start-scoop-level': {
        const level=levels[arg-1];
        if(order||!level||!Number.isInteger(arg)||arg>unlockedLevel(state))return state;
        beginScoop(next,level,level.theme,scoopsFor(arg));break;
      }
      case 'start-scoop-free':
        if(order||!validColor(arg?.theme)||![1,2,3].includes(arg?.scoops))return state;
        beginScoop(next,null,arg.theme,arg.scoops);break;
      case 'start-level': {
        const level=levels[arg-1];
        if(order || !Number.isInteger(arg) || !level || arg>unlockedLevel(state)) return state;
        beginBatch(next,level,level.theme,random); break;
      }
      case 'start-free':
        if(order || !Object.hasOwn(themes,arg)) return state;
        beginBatch(next,null,arg,random); break;
      case 'intro': next.seenIntro = true; break;
      case 'setting':
        if (!arg || !Object.hasOwn(next.settings,arg.key)) return state;
        if (arg.key === 'motion' ? !['system','on','off'].includes(arg.value) : typeof arg.value !== 'boolean') return state;
        next.settings[arg.key] = arg.value; break;
      case 'start':
        if (order || !Object.hasOwn(themes,arg)) return state;
        next.active = { id: next.nextId++, theme: arg, stage: 'tray', current: null,
          customer:customers[(next.nextId-2)%customers.length],
          bags: shuffled(random,[0,1,2,3,4,5]).map((kind,i) => ({kind,wrapper:Object.keys(themes)[(next.nextId+i)%6],goods:null})), slots: Array(5).fill(null),
          tear: 0, drawer: null, choice: null, history:[] };
        break;
      case 'pick':
        if (!stage('tray') || !validIndex(arg) || order.slots.includes(arg)) return state;
        Object.assign(order,{current:arg,stage:'tear',tear:0,choice:null,drawer:null});
        next.learned.tray = true; break;
      case 'tear':
        if (!stage('tear') || !Number.isFinite(arg) || arg <= order.tear) return state;
        order.tear = Math.min(1,arg);
        if (order.tear === 1) { order.stage = 'reveal'; next.learned.tear = true;
          if(order.gifts) order.bags[order.current].opened=true;
        }
        break;
      case 'shelf':
        if (!stage('reveal')) return state;
        order.stage = 'shelf'; break;
      case 'drawer':
        if (!(stage('shelf') || (order?.gifts && stage('reveal'))) || !kinds.some(k=>k.drawer===arg)) return state;
        order.stage='shelf';
        order.drawer = arg; order.shelfKind=kinds.findIndex(k=>k.drawer===arg); order.shelfVariant=0; order.choice=null; next.learned.shelf = true; break;
      case 'browse':
        if (!stage('shelf') || !Number.isInteger(arg?.kind) || !isStocked(order,arg.kind) || kinds[arg.kind]?.drawer!==order.drawer ||
            !Number.isInteger(arg.variant) || kinds[arg.kind].styles[arg.variant]===undefined) return state;
        order.shelfKind=arg.kind; order.shelfVariant=arg.variant; order.choice=null; break;
      case 'choose':
        if (!stage('shelf') || !validGoods(arg) || kinds[arg.kind].drawer!==order.drawer) return state;
        order.choice = {...arg}; break;
      case 'clear-choice':
        if (!stage('shelf') || !order.choice) return state;
        order.choice = null; break;
      case 'take':
        if (!stage('shelf') || !validGoods(order.choice)) return state;
        saveUndo(order);order.bags[order.current].goods = {...order.choice}; order.stage = 'pack'; break;
      case 'place':
        if (!stage('pack') || !validIndex(arg) || order.slots[arg] !== null || order.slots.includes(order.current)) return state;
        saveUndo(order);order.slots[arg] = order.current; next.learned.pack = true; break;
      case 'repick':
        if(!stage('pack') || order.slots.includes(order.current)) return state;
        order.bags[order.current].goods=null;order.stage='shelf';break;
      case 'move':
        if (!stage('pack') || !arg || !validIndex(arg.from) || !validIndex(arg.to) || arg.from === arg.to || order.slots[arg.from] === null) return state;
        saveUndo(order);[order.slots[arg.from],order.slots[arg.to]] = [order.slots[arg.to],order.slots[arg.from]]; break;
      case 'replace':
        if (!stage('pack') || !arg || !validIndex(arg.slot) || order.slots[arg.slot] === null || !validGoods(arg.goods)) return state;
        saveUndo(order);order.bags[order.slots[arg.slot]].goods = {...arg.goods}; break;
      case 'undo': {
        if (!canUndo(order)) return state;
        const history=order.history.slice(), restored=history.pop();
        // Draws are fixed for the life of an order, including after an undo.
        next.active={...restored,history}; break;
      }
      case 'next':
        if (!stage('pack') || !order.slots.includes(order.current) || count(order) >= 5) return state;
        Object.assign(order,{stage:'tray',current:null,tear:0,choice:null,drawer:null,history:[]}); break;
      case 'photo':
        if (!stage('pack') || count(order) !== 5) return state;
        order.stage='seal'; break;
      case 'rearrange':
        if (!stage('seal')) return state;
        order.stage='pack'; break;
      case 'seal': {
        if (!stage('seal') || count(order) !== 5 || next.orders.some(x=>x.id===order.id)) return state;
        const known = collection(state);
        const items = packedItems(order);
        const fresh = [...new Set(items.map(it=>itemKey(it.color,it.kind,it.variant)).filter(key=>!known.has(key)))];
        const {satisfaction,earnings}=score(order.theme,items);
        next.orders=next.orders.concat({id:order.id,theme:order.theme,customer:order.customer,completed:arg || new Date().toISOString(),art:1,items,fresh,satisfaction,earnings});
        next.active=null; break;
      }
      case 'discard': if (!order) return state; next.active=null; break;
      default: return state;
    }
    next.revision++;
    return next;
  }
  function canUndo(order) {
    const previous=order?.history.at(-1);
    return !!previous && order.stage!=='seal' && previous.current===order.current &&
      (previous.stage===order.stage || (!order.gifts && order.stage==='pack' && previous.stage==='shelf'));
  }
  const validKind = kind => Number.isInteger(kind) && !!kinds[kind];
  const validColor = color => Object.hasOwn(themes,color);
  const validId = id => Number.isSafeInteger(id) && id>0;
  const validCard = card => card && validKind(card.kind) && validColor(card.color) &&
    [null,0,1].includes(card.variant) && Number.isSafeInteger(card.quantity) && card.quantity>0 &&
    Array.isArray(card.pieces) && card.pieces.length<=card.quantity && card.pieces.every(validGoods);
  function validOrderBase(order) {
    return order && validId(order.id) && validColor(order.theme) &&
      (customers.includes(order.customer) || levels.some(l=>l.customer===order.customer));
  }
  function validScoop(a,cards,active=false) {
    const bead=b=>b && validKind(b.kind) && validColor(b.color) && b.variant===null;
    if(!Number.isInteger(a.scoopsTaken)||a.scoopsTaken<0||a.scoopsTaken>3)return false;
    const sizes=a.scoopSizes===undefined?Array.from({length:a.scoopsTaken},()=>legacyBeadsPerScoop):a.scoopSizes;
    const validSize=n=>Number.isInteger(n)&&(a.scoopSizes===undefined?n===legacyBeadsPerScoop:n>=scoopSize.min&&n<=scoopSize.max);
    if(![1,2,3].includes(a.scoopTarget)||!Number.isInteger(a.scoopsTaken)||
      a.scoopsTaken<0||a.scoopsTaken>a.scoopTarget||
      !Array.isArray(sizes)||sizes.length!==a.scoopsTaken||!sizes.every(validSize)||
      !Array.isArray(a.beads)||a.beads.length!==sizes.reduce((sum,n)=>sum+n,0)||!a.beads.every(bead))return false;
    if(!Array.isArray(cards)||!cards.every(validCard)||
      new Set(cards.map(b=>b.kind+'|'+b.color)).size!==cards.length||
      cards.reduce((sum,b)=>sum+b.quantity,0)!==a.beads.length||
      !cards.every(b=>b.variant===null&&b.quantity===a.beads.filter(t=>t.kind===b.kind&&t.color===b.color).length))return false;
    if(!active)return a.scoopsTaken===a.scoopTarget;
    const collecting=['scoop','drawn'].includes(a.stage);
    return Array.isArray(a.stockKinds)&&a.stockKinds.length>0&&a.stockKinds.every(validKind)&&
      a.beads.concat(a.pendingBeads||[]).every(b=>a.stockKinds.includes(b.kind))&&
      Array.isArray(a.pendingBeads)&&a.pendingBeads.every(bead)&&
      (a.stage==='drawn'?validSize(a.pendingBeads.length):a.pendingBeads.length===0)&&
      (collecting ? a.scoopsTaken<a.scoopTarget && a.current===null :
        a.scoopsTaken===a.scoopTarget && ['shelf','pack','gifts','seal'].includes(a.stage))&&
      Array.isArray(a.gifts)&&a.gifts.length<=2&&a.gifts.every(validGoods)&&
      (a.level===null||validId(a.level)&&!!levels[a.level-1])&&cards.every(b=>b.opened===true);
  }
  function validActive(a) {
    if(a?.mode==='scoop'){
      const current=a.current===null||Number.isInteger(a.current)&&a.current>=0&&a.current<a.bags?.length;
      return validOrderBase(a)&&current&&(a.stage!=='shelf'||a.current!==null)&&
        Number.isFinite(a.tear)&&validScoop(a,a.bags,true);
    }
    if (!validOrderBase(a) || !Array.isArray(a.bags) || a.bags.length!==5 ||
        !a.bags.every(b=>b && validColor(b.wrapper)) || !Number.isFinite(a.tear)) return false;
    const hasCurrent=Number.isInteger(a.current) && a.current>=0 && a.current<5;
    if ((a.current!==null && !hasCurrent) || (['tear','reveal','shelf'].includes(a.stage) && !hasCurrent)) return false;
    if (a.gifts) return (a.stockKinds===undefined || Array.isArray(a.stockKinds) && a.stockKinds.every(validKind) && a.bags.every(b=>a.stockKinds.includes(b.kind))) &&
      ['tray','tear','reveal','shelf','pack','gifts','seal'].includes(a.stage) &&
      (a.level===null || validId(a.level) && !!levels[a.level-1]) &&
      Array.isArray(a.gifts) && a.gifts.every(validGoods) && a.bags.every(validCard);
    return ['tray','tear','reveal','shelf','pack','seal'].includes(a.stage) &&
      a.bags.every(b=>validKind(b.kind) && (b.goods===null || validGoods(b.goods))) &&
      (a.choice===null || validGoods(a.choice)) && Array.isArray(a.slots) && a.slots.length===5 &&
      a.slots.every(i=>i===null || Number.isInteger(i) && validGoods(a.bags[i]?.goods)) &&
      (a.stage!=='pack' || hasCurrent && validGoods(a.bags[a.current].goods));
  }
  function validReceipt(o) {
    if (!validOrderBase(o) || !Array.isArray(o.items) || !o.items.every(validGoods) ||
        !Array.isArray(o.fresh) || !Number.isFinite(o.satisfaction) || !Number.isFinite(o.earnings)) return false;
    if(o.mode==='scoop')return validScoop(o,o.cards)&&Array.isArray(o.gifts)&&o.gifts.length<=2&&
      o.gifts.every(validGoods)&&(o.level===null||!!levels[o.level-1]);
    if (!o.cards) return o.items.every(g=>validKind(g.wish));
    return Array.isArray(o.cards) && o.cards.length===5 && o.cards.every(validCard) &&
      Array.isArray(o.gifts) && o.gifts.every(validGoods) && (o.level===null || !!levels[o.level-1]);
  }
  function validate(value) {
    if (value?.format!==1 || !Number.isSafeInteger(value.revision) || value.revision<0 ||
        !validId(value.nextId) || !Array.isArray(value.orders) || !value.orders.every(validReceipt) ||
        !value.settings || typeof value.settings.sound!=='boolean' || typeof value.settings.haptic!=='boolean' ||
        !['system','on','off'].includes(value.settings.motion) || !value.learned ||
        (value.active!==null && !(validActive(value.active) && Array.isArray(value.active.history) &&
          value.active.history.every(validActive)))) throw new Error('存档格式无法读取');
    if(value.settings.music===undefined) value.settings.music=true;
    if(typeof value.settings.music!=='boolean') throw new Error('存档音乐设置无法读取');
    if(value.display===undefined)value.display=basicDisplay();
    const {purchases,equipped}=value.display||{};
    if(!purchases || typeof purchases!=='object' || Array.isArray(purchases) || !equipped ||
      !Object.entries(purchases).every(([id,p])=>finishCatalog.some(f=>f.id===id&&f.price>0) && Number.isSafeInteger(p)&&p>=0) ||
      !Object.entries(finishes).every(([part,options])=>options.some(f=>f.id===equipped[part]&&(!f.price||Object.hasOwn(purchases,f.id)))) ||
      balance(value)<0)throw new Error('柜台装扮存档无法读取');
    return value;
  }
  function decode(raw) {
    return raw==null ? initial() : validate(JSON.parse(raw));
  }
  const api={themes,kinds,customers,copy,initial,count,itemName,itemKey,canUndo,validate,collection,score,packedItems,step,decode,
    levels,chapters,chapterFor,cardsFor,rateCards,pieceCount,stockCapacity,remaining,giftKinds,unlockedLevel,
    deliveries,stockKinds,isStocked,finishCatalog,finishes,ownsFinish,finishAvailable,completedLevels,balance,
    scoopsFor,levelName,levelStars,fits,perfectChapters,chapterBonus,freeLevels};
  root.LuckyCore=api;
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
})(globalThis);
