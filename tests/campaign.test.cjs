const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../Game/core.js');

function run(initial=C.initial()) {
  let state=initial;
  return {
    get state(){return state;},
    get order(){return state.active;},
    do(action,arg){
      const next=C.step(state,action,arg,()=>.39);
      assert.notEqual(next,state,action+' should change state');
      state=next;
    },
    blocked(action,arg){assert.equal(C.step(state,action,arg),state,action+' should be rejected');}
  };
}
function pickCard(game,index) {
  game.do('pick',index);game.do('tear',1);game.do('shelf');
}
function fillCards(game,adjust=(goods)=>goods) {
  for(let i=0;i<5;i++){
    pickCard(game,i);
    const card=game.order.bags[i];
    for(let n=0;n<card.quantity;n++){
      const g=adjust({kind:card.kind,color:card.color,variant:card.variant??0},card,n);
      if(!g) continue;
      game.do('drawer',C.kinds[g.kind].drawer);
      game.do('add-piece',g);
    }
    game.do('finish-card');
  }
}
function ship(game,gifts=[]) {
  game.do('wrap');
  for(const g of gifts)game.do('add-gift',g);
  game.do('photo');game.do('seal');
}
test('all 100 documented tickets are playable in order, with balanced requirements and the anniversary box',()=>{
  const game=run();
  assert.deepEqual([C.levels.length,C.chapters.length],[100,10]);
  assert.deepEqual([C.levels.filter(l=>l.accent).length,C.levels.filter(l=>l.style).length],[26,7]);
  game.blocked('start-level',2);
  for(const [i,level] of C.levels.entries()){
    assert.equal(C.unlockedLevel(game.state),i+1);
    game.do('start-level',level.id);
    assert.equal(game.order.customer,level.customer);
    assert.equal(new Set(game.order.bags.map(b=>b.kind)).size,5);
    assert.deepEqual(game.order.bags.map(b=>level.quantities[b.kind]),game.order.bags.map(b=>b.quantity));
    fillCards(game);
    game.do('wrap');game.do('photo');
    if(level.id%10===0)game.do('stamp');
    game.do('seal');
    game.blocked('seal');
    const o=game.state.orders.at(-1);
    assert.equal(o.satisfaction,100);
    assert.equal(o.earnings,100);
    assert.equal(o.items.length,level.quantities.reduce((a,b)=>a+b,0));
    assert.equal(o.stamp,level.id%10===0);
  }
  const anniversary=game.state.orders.at(-1);
  assert.equal(anniversary.customer,'阿梨');
  assert.deepEqual(C.levels.at(-1).quantities,[1,1,1,2,3,0]);
  assert.equal(anniversary.theme,'pink');
  game.do('start-level',1);game.do('discard');
  assert.equal(game.state.orders.length,100);
  game.do('start-free','blue');
  assert.ok(game.order.bags.some(b=>b.quantity>1));
});
test('per-SKU supply, arbitrary returns, saved undo and positions, zero to two gifts',()=>{
  const game=run();game.do('start-level',1);
  // An in-progress order made before counter reserves keeps its original supply.
  delete game.order.reserve;
  const i=0;pickCard(game,i);
  const g={kind:3,color:'orange',variant:1};
  game.do('drawer','发饰');game.do('add-piece',g);game.blocked('add-piece',g);
  assert.equal(C.remaining(game.order,g),0);assert.equal(C.remaining(game.order,g,true),2);
  game.do('finish-card');pickCard(game,1);game.do('drawer','发饰');
  game.blocked('add-piece',g);game.do('return-piece',{bag:0,index:0});
  assert.equal(C.remaining(game.order,g),1);game.do('undo');
  assert.equal(C.remaining(game.order,g),0);game.do('finish-card');
  for(let i=2;i<5;i++){pickCard(game,i);game.do('finish-card');}
  game.do('position',{bag:0,index:0,x:.3,y:.85});
  const saved=run(C.decode(JSON.stringify(game.state)));
  saved.do('wrap');saved.do('add-gift',g);saved.do('add-gift',g);
  saved.blocked('add-gift',g);saved.do('return-gift',1);saved.do('undo');
  saved.do('photo');saved.do('rearrange');saved.do('return-gift',0);
  saved.do('review');saved.do('refill',0);saved.do('finish-card');
  saved.do('wrap');saved.do('photo');saved.do('seal');
  const o=saved.state.orders[0];
  assert.equal(o.gifts.length,1);assert.equal(o.items.length,1);
  assert.deepEqual(o.items[0].position,{x:.3,y:.85});
  assert.ok(o.satisfaction<100);assert.equal(C.unlockedLevel(saved.state),2);
  assert.equal(C.collection(saved.state).size,1);
  saved.do('start-level',2);assert.equal(C.remaining(saved.order,g,true),2);
});
test('score averages each card before rounding, distinguishes style and accent, and ignores gifts',()=>{
  const g=(color='pink',kind=3,variant=0)=>({kind,color,variant});
  const card=(pieces,quantity=2,variant=null,color='pink')=>({kind:3,color,quantity,variant,pieces});
  const rest=Array.from({length:4},()=>card([g()],1));
  assert.equal(C.rateCards([card([g(),g('blue')]),...rest]).earnings,96);
  assert.equal(C.rateCards([card([g()]),...rest]).earnings,90);
  assert.equal(C.rateCards([card([g(),g(),g('blue')],3),...rest]).earnings,97);
  assert.equal(C.rateCards([card([g('blue'),g('blue',3,1)],2,1,'blue'),...rest]).earnings,98);
  assert.equal(C.rateCards([card([g('blue',2,1)],1,1,'blue'),...rest]).earnings,88);
});
test('empty boxes, skipped reveals, replay and old saves cannot skip campaign progress',()=>{
  const game=run();game.do('start-level',1);game.blocked('wrap');game.blocked('photo');game.blocked('seal');
  fillCards(game,()=>null);game.blocked('wrap');
  game.do('refill',0);const card=game.order.bags[0];
  game.do('drawer',C.kinds[card.kind].drawer);game.do('add-piece',{kind:card.kind,color:card.color,variant:0});
  game.do('finish-card');ship(game);game.do('start-level',1);fillCards(game);ship(game);
  assert.equal(C.unlockedLevel(game.state),2);
  const old=run();old.do('start','purple');old.do('pick',0);old.do('tear',.42);
  const resumed=run(C.decode(JSON.stringify(old.state)));resumed.do('tear',1);
  assert.equal(resumed.order.stage,'reveal');
  assert.equal(C.unlockedLevel(resumed.state),1);
});
test('shelf selection resumes and undo stays with the current card',()=>{
  const game=run();
  game.do('start-level',1);game.do('pick',0);game.do('tear',1);
  game.do('drawer','纸品');game.do('browse',{kind:4,variant:1});
  const restored=C.decode(JSON.stringify(game.state)).active;
  assert.deepEqual([restored.drawer,restored.shelfKind,restored.shelfVariant],['纸品',4,1]);
  game.do('add-piece',{kind:4,color:'pink',variant:1});game.do('finish-card');
  game.do('pick',1);game.do('tear',1);game.do('drawer','书写');game.blocked('undo');
  assert.equal(game.order.bags[0].pieces.length,1);
});
