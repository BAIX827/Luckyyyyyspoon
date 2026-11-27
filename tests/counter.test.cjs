const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../Game/core.js');

function counter(){
  let s=C.initial();
  return {
    get state(){return s;}, get order(){return s.active;},
    act(name,arg){
      const next=C.step(s,name,arg);
      assert.notEqual(next,s,name+' should succeed');s=next;
    },
    blocked(name,arg){assert.equal(C.step(s,name,arg),s);},
    open(i){this.act('station-card',i);this.act('tear',1);this.act('station-unpack');}
  };
}
test('each of the four fixtures bays offers six kinds in every color, including clips and mugs',()=>{
  assert.deepEqual(['发饰','书写','纸品','随身'].map(b=>C.kinds.filter(k=>k.drawer===b).length),[6,6,6,6]);
  const assets=path.join(__dirname,'../Game/assets/items');
  let entries=0;
  C.kinds.forEach((k,i)=>k.styles.forEach((_,v)=>Object.keys(C.themes).forEach(color=>{
    assert.ok(fs.existsSync(path.join(assets,`${color}-${i}-${v}.png`)));
    entries++;
  })));
  assert.equal(entries,180);
  const seen=new Set();
  for(let n=0;n<30;n++){
    const s=C.step(C.initial(),'start-free','pink',()=>n/31);
    s.active.bags.forEach(b=>seen.add(b.kind));
  }
  assert.deepEqual([...seen].sort(),[0,1,2,3,4,5]);
});
test('counter reserve is per style and color; sold-out items, returns, undo and next order',()=>{
  const g=counter();g.act('start-level',1);
  const pouch={kind:5,color:'green',variant:0};
  assert.equal(C.remaining(g.order,{kind:23,color:'green',variant:0}),0);
  assert.equal(C.remaining(g.order,pouch),3);
  for(let i=0;i<3;i++){
    g.open(i);g.act('station-browse',{kind:5,variant:0});g.act('add-piece',pouch);
  }
  assert.equal(C.remaining(g.order,pouch),0);
  assert.equal(C.remaining(g.order,{...pouch,color:'blue'}),3);
  g.open(3);g.act('station-browse',{kind:5,variant:0});g.blocked('add-piece',pouch);
  g.act('return-piece',{bag:0,index:0});assert.equal(C.remaining(g.order,pouch),1);
  g.act('undo');assert.equal(C.remaining(g.order,pouch),0);
  g.act('discard');g.act('start-level',1);assert.equal(C.remaining(g.order,pouch),3);
});
test('picking directly from a revealed card uses that rack and leaves a reversible first pick',()=>{
  const g=counter();g.act('start-level',1);
  g.act('station-card',0);g.act('tear',1);
  const card=g.order.bags[0], drawer=C.kinds[card.kind].drawer;
  const goods={kind:card.kind,color:card.color,variant:card.variant??0};
  const other=C.kinds.findIndex(k=>k.drawer!==drawer);
  const restored=C.decode(JSON.stringify(g.state));
  restored.active.drawer=C.kinds[other].drawer;
  restored.active.shelfKind=other;
  assert.equal(C.step(restored,'add-piece',{...goods,kind:other}),restored);
  const picked=C.step(restored,'add-piece',goods);
  assert.equal(picked.active.stage,'shelf');
  assert.equal(picked.active.drawer,drawer);
  assert.equal(picked.active.shelfKind,card.kind);
  assert.deepEqual(picked.active.bags[0].pieces,[goods]);
  const undo=C.step(picked,'undo');
  assert.equal(undo.active.bags[0].opened,true);
  assert.equal(undo.active.bags[0].pieces.length,0);
  assert.equal(C.remaining(undo.active,goods),C.remaining(restored.active,goods));
});
test('reselecting the current card preserves its drawer, stock and undo history',()=>{
  const g=counter();g.act('start-level',1);g.open(0);
  const goods={kind:5,color:'green',variant:0};
  g.act('station-browse',{kind:goods.kind,variant:goods.variant});
  const before=C.remaining(g.order,goods);
  g.act('add-piece',goods);
  g.blocked('station-card',0);
  assert.equal(g.order.drawer,C.kinds[goods.kind].drawer);
  assert.equal(C.remaining(g.order,goods),before-1);
  g.act('undo');
  assert.equal(C.remaining(g.order,goods),before);
});

test('100 orders can ship through the landscape counter, including repositioning, gifting and reopening',()=>{
  const g=counter();
  for(let level=1;level<=100;level++){
    g.act('start-level',level);g.blocked('station-pack');
    const debut=C.deliveries.find(d=>d.after===level-1);
    if(debut)assert.equal(g.order.bags[0].kind,debut.kind);
    assert.ok(g.order.bags.every(b=>C.isStocked(g.order,b.kind)));
    for(let i=0;i<5;i++){
      g.open(i);
      const b=g.order.bags[i], variant=b.variant??0;
      g.act('station-browse',{kind:b.kind,variant});
      for(let j=0;j<b.quantity;j++)g.act('add-piece',{kind:b.kind,color:b.color,variant});
    }
    g.act('station-pack');
    g.act('position',{bag:0,index:0,x:.23,y:.65});g.act('wrap');
    if(level%2)g.act('add-gift',{kind:4,variant:0,color:'blue'});
    if(level===10){g.act('review');g.act('station-card',2);g.act('station-pack');g.act('wrap');}
    g.act('photo');if(level%10===0)g.act('stamp');g.act('seal');g.blocked('seal');
    assert.equal(g.state.orders.at(-1).satisfaction,100);
    assert.equal(g.state.orders.at(-1).gifts.length,level%2);
    assert.equal(g.state.orders.at(-1).arrival,C.deliveries.find(d=>d.after===level)?.kind??null);
  }
  assert.equal(g.state.orders.length,100);
  assert.equal(C.stockKinds(g.state).length,24);
  const orders=g.state.orders;
  const seen=new Set();
  for(let n=0;n<30;n++)C.step(g.state,'start-free','blue',()=>n/31).active.bags.forEach(b=>seen.add(b.kind));
  assert.equal(seen.size,24);
  const replay=C.step(g.state,'start-level',1);
  assert.equal(replay.orders,orders);
  const old=C.copy(g.state);delete old.settings.music;
  assert.equal(C.decode(JSON.stringify(old)).settings.music,true);
});

test('dropping from another bay, repositioning and returning preserve the bag and shelf counts',()=>{
  const g=counter();
  g.act('start-level',1);g.open(0);
  const kind=C.kinds.findIndex((k,i)=>C.isStocked(g.order,i)&&k.drawer!==g.order.drawer);
  const goods={kind,color:'pink',variant:0}, initial=C.remaining(g.order,goods);
  g.blocked('add-piece',goods);
  g.act('rack-drop',{...goods,position:{x:.4,y:.6}});
  g.act('position',{bag:0,index:0,x:.6,y:.3});
  const saved=C.decode(JSON.stringify(g.state));
  assert.deepEqual(saved.active.bags[0].pieces[0].position,{x:.6,y:.3});
  assert.equal(C.remaining(saved.active,goods),initial-1);
  g.act('return-piece',{bag:0,index:0});
  assert.equal(C.remaining(g.order,goods),initial);
  g.blocked('return-piece',{bag:0,index:0});
  g.act('undo');assert.equal(C.remaining(g.order,goods),initial-1);
});
