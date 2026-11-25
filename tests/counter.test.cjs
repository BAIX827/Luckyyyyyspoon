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
  assert.ok(seen.has(C.kinds.findIndex(k=>k.name==='水杯')));
  assert.ok(seen.has(C.kinds.findIndex(k=>k.name==='长尾夹')));
});
test('counter reserve is per style and color; sold-out items, returns, undo and next order',()=>{
  const g=counter();g.act('start-level',1);
  const mug={kind:23,color:'green',variant:0};
  assert.equal(C.remaining(g.order,mug),3);
  for(let i=0;i<3;i++){
    g.open(i);g.act('station-browse',{kind:23,variant:0});g.act('add-piece',mug);
  }
  assert.equal(C.remaining(g.order,mug),0);
  assert.equal(C.remaining(g.order,{...mug,color:'blue'}),3);
  g.open(3);g.act('station-browse',{kind:23,variant:0});g.blocked('add-piece',mug);
  g.act('return-piece',{bag:0,index:0});assert.equal(C.remaining(g.order,mug),1);
  g.act('undo');assert.equal(C.remaining(g.order,mug),0);
  g.act('discard');g.act('start-level',1);assert.equal(C.remaining(g.order,mug),3);
});
test('100 orders can ship through the landscape counter, including repositioning, gifting and reopening',()=>{
  const g=counter();
  for(let level=1;level<=100;level++){
    g.act('start-level',level);g.blocked('station-pack');
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
  }
  assert.equal(g.state.orders.length,100);
  const old=C.copy(g.state);delete old.settings.music;
  assert.equal(C.decode(JSON.stringify(old)).settings.music,true);
});
