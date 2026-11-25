'use strict';

(function (root) {
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
  const count = order => order.slots.filter(index => index !== null).length;
  const itemName = (theme, kind, variant) =>
    kind === 1 && variant === 0 ? themes[theme].mark + '笔帽按动笔' : kinds[kind].styles[variant];
  const itemKey = (theme, kind, variant) => [theme, kind, variant].join('-');
  function collection(state) {
    const found = new Map();
    for (const order of state.orders) {
      for (const item of order.items) {
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
    const next = copy(state);
    const order = next.active;
    const validIndex = value => Number.isInteger(value) && value >= 0 && value < 5;
    const stage = name => order && order.stage === name;
    switch (action) {
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
        if (order.tear === 1) { order.stage = 'reveal'; next.learned.tear = true; }
        break;
      case 'shelf':
        if (!stage('reveal')) return state;
        order.stage = 'shelf'; break;
      case 'drawer':
        if (!stage('shelf') || !kinds.some(k=>k.drawer===arg)) return state;
        order.drawer = arg; order.choice=null; next.learned.shelf = true; break;
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
        if (!order || !order.history.length || order.stage==='seal') return state;
        const history=order.history.slice(), restored=history.pop();
        // Draws are fixed for the life of an order, including after an undo.
        next.active={...restored,history}; break;
      }
      case 'next':
        if (!stage('pack') || !order.slots.includes(order.current) || count(order) >= 5) return state;
        Object.assign(order,{stage:'tray',current:null,tear:0,choice:null,drawer:null}); break;
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
        next.orders.push({id:order.id,theme:order.theme,customer:order.customer,completed:arg || new Date().toISOString(),art:1,items,fresh,satisfaction,earnings});
        next.active=null; break;
      }
      case 'discard': if (!order) return state; next.active=null; break;
      default: return state;
    }
    next.revision++;
    return next;
  }
  function decode(raw) {
    if (raw == null || raw === '') return initial();
    const value=JSON.parse(raw);
    if (value.format !== 1 || !Number.isSafeInteger(value.revision) || !Array.isArray(value.orders) ||
        !value.settings || !value.learned || !Number.isSafeInteger(value.nextId)) throw new Error('存档格式无法读取');
    return value;
  }
  const api={themes,kinds,customers,copy,initial,count,itemName,itemKey,collection,score,packedItems,step,decode};
  root.LuckyCore=api;
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
})(globalThis);
