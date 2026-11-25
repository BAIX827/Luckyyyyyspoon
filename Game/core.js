'use strict';

(function (root) {
  const {levels,chapters} = root.LuckyLevels || require('./levels.js');
  const giftKinds = [4,3,1];
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
    { name: '零钱包', drawer: '随身', styles: ['半月拉链包', '方形口金包'] }
  ];
  const copy = value => JSON.parse(JSON.stringify(value));
  const initial = () => ({
    format: 1, revision: 0, nextId: 1, seenIntro: false,
    settings: { sound: true, haptic: true, motion: 'system' }, learned: {},
    active: null, orders: []
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
      Object.hasOwn(themes,item.color) && [0,1].includes(item.variant);
  }
  function unlockedLevel(state) {
    const finished = new Set(state.orders.map(order=>order.level));
    return levels.find(level=>!finished.has(level.id))?.id || levels.length;
  }
  const chapterFor = id => chapters[Math.floor((id-1)/10)];
  function cardsFor(level) {
    return level.quantities.flatMap((quantity,kind)=>quantity ? [{
      kind, quantity, color: level.accent?.kind === kind ? level.accent.color : level.theme,
      variant: level.style?.kind === kind ? level.style.variant : null
    }] : []);
  }
  function pieceCount(bags) {
    return bags.reduce((sum,bag)=>sum+bag.pieces.length,0);
  }
  function remaining(order, goods, gift=false) {
    const group = gift ? order.gifts : order.bags.flatMap(b=>b.pieces);
    const used = group.filter(g=>g.kind===goods.kind && g.color===goods.color && g.variant===goods.variant).length;
    const capacity = gift ? 2 : (order.bags.find(b=>b.kind===goods.kind)?.quantity || 1);
    return capacity-used;
  }
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
    const satisfaction=Math.round(lines.reduce((sum,points)=>sum+points,0));
    return {lines,satisfaction,earnings:satisfaction};
  }
  function beginBatch(next, level, theme, random) {
    const id=next.nextId++;
    let cards;
    if (level) {
      cards=cardsFor(level);
      for(let i=cards.length-1;i>0;i--) {
        const j=Math.floor(random()*(i+1));
        [cards[i],cards[j]]=[cards[j],cards[i]];
      }
    } else {
      cards=shuffled(random).map(kind=>({kind,color:theme,variant:null,
        quantity:giftKinds.includes(kind) ? 1+Math.floor(random()*(kind===1 ? 2 : 3)) : 1}));
    }
    next.active={id,level:level?.id || null,theme,customer:level?.customer || customers[(id-1)%customers.length],
      stage:'tray',current:null,tear:0,drawer:null,gifts:[],history:[],stamp:false,
      bags:cards.map((card,i)=>({...card,wrapper:Object.keys(themes)[(id+i)%6],opened:false,pieces:[]}))};
  }
  // The bag owns its pieces throughout picking, corrections, and packing.
  // Shelf counts derive from those pieces so returning or undoing never loses stock.
  function batchAction(next,action,arg) {
    const a=next.active, card=a.bags[a.current];
    switch(action) {
      case 'pick': {
        if(a.stage!=='tray' || !Number.isInteger(arg) || !a.bags[arg]) return false;
        a.current=arg; a.drawer=null; a.tear=0; a.history=[];
        a.stage=a.bags[arg].opened ? 'shelf' : 'tear';
        next.learned.tray=true; break;
      }
      case 'add-piece':
        if(a.stage!=='shelf' || !validGoods(arg) || kinds[arg.kind].drawer!==a.drawer ||
            card.pieces.length>=card.quantity || remaining(a,arg)<=0) return false;
        saveUndo(a); card.pieces.push({...arg}); break;
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
        if(a.stage!=='pack' || !piece || ![arg.x,arg.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1))return false;
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
        next.orders=next.orders.concat({id:a.id,level:a.level,theme:a.theme,customer:a.customer,
          completed:arg || new Date().toISOString(),cards,items,gifts:a.gifts,stamp:a.stamp,
          fresh:[...new Set(keys.filter(key=>!known.has(key)))],satisfaction,earnings});
        next.active=null; break;
      }
      default: return false;
    }
    return true;
  }
  const customers=['阿梨','小满','可可','小岚','团子','阿柚','云朵','南南'];
  function shuffled(random) {
    const values = kinds.map((_, i) => i);
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values.slice(0,5);
  }
  function step(state, action, arg, random = Math.random) {
    const next = {...state,learned:{...state.learned},settings:{...state.settings}};
    if(state.active){
      const {history,...current}=state.active;
      // Completed orders and earlier undo snapshots are immutable.
      next.active={...copy(current),history:history.slice()};
    }
    const order = next.active;
    const validIndex = value => Number.isInteger(value) && value >= 0 && value < 5;
    const stage = name => order && order.stage === name;
    if(order?.gifts && !['intro','setting','tear','shelf','drawer','browse','undo','discard'].includes(action)){
      if(!batchAction(next,action,arg)) return state;
      next.revision++;
      return next;
    }
    switch (action) {
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
          bags: shuffled(random).map((kind,i) => ({kind,wrapper:Object.keys(themes)[(next.nextId+i)%6],goods:null})), slots: Array(5).fill(null),
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
        if (!stage('shelf') || !Number.isInteger(arg?.kind) || kinds[arg.kind]?.drawer!==order.drawer ||
            ![0,1].includes(arg.variant)) return state;
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
  function validActive(a) {
    if (!validOrderBase(a) || !Array.isArray(a.bags) || a.bags.length!==5 ||
        !a.bags.every(b=>b && validColor(b.wrapper)) || !Number.isFinite(a.tear)) return false;
    const hasCurrent=Number.isInteger(a.current) && a.current>=0 && a.current<5;
    if ((a.current!==null && !hasCurrent) || (['tear','reveal','shelf'].includes(a.stage) && !hasCurrent)) return false;
    if (a.gifts) return ['tray','tear','reveal','shelf','pack','gifts','seal'].includes(a.stage) &&
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
    return value;
  }
  function decode(raw) {
    return raw==null ? initial() : validate(JSON.parse(raw));
  }
  const api={themes,kinds,customers,copy,initial,count,itemName,itemKey,canUndo,validate,collection,score,packedItems,step,decode,
    levels,chapters,chapterFor,cardsFor,rateCards,pieceCount,remaining,giftKinds,unlockedLevel};
  root.LuckyCore=api;
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
})(globalThis);
