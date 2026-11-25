const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../Game/core.js');

function driver() {
  let s=C.initial();
  return {get s(){return s;},go(action,arg){s=C.step(s,action,arg,()=>.37);return s;}};
}
function begin(d,color='blue'){d.go('start',color);}
function prepare(d,bag,goods) {
  d.go('pick',bag);d.go('tear',1);d.go('shelf');
  d.go('drawer',C.kinds[goods.kind].drawer);d.go('choose',goods);d.go('take');
}
function fill(d,theme='blue',adjust=(g)=>g){
  begin(d,theme);
  for(let i=0;i<5;i++) {
    const kind=d.s.active.bags[i].kind;
    prepare(d,i,adjust({kind,color:theme,variant:i%2},i));
    d.go('place',i);
    if(i<4)d.go('next');
  }
}
function seal(d){d.go('photo');d.go('seal','2026-11-25T00:00:00Z');}
test('six colors and the original 72 designs; five distinct legacy bag wishes',()=>{
  assert.equal(Object.keys(C.themes).length*C.kinds.slice(0,6).reduce((n,k)=>n+k.styles.length,0),72);
  for(const color of Object.keys(C.themes)){const d=driver();begin(d,color);assert.equal(new Set(d.s.active.bags.map(b=>b.kind)).size,5);assert.equal(d.s.active.theme,color);}
});
test('color and kind are independently payable; wrong picks remain allowed',()=>{
  const d=driver();fill(d,'blue',(g,i)=>i===0?{...g,color:'yellow'}:i===1?{...g,kind:(g.kind+1)%6}:g);seal(d);
  assert.equal(d.s.orders[0].earnings,80);assert.equal(d.s.orders[0].satisfaction,80);
  const lines=C.score('blue',d.s.orders[0].items).lines;assert.deepEqual(lines.map(x=>x.points),[12,8,20,20,20]);
});
test('both wrong earns zero; wrong color only earns 60; perfect earns 100',()=>{
  for(const [wrongKind,wrongColor,sum] of [[true,true,0],[false,true,60],[true,false,40],[false,false,100]]){
    const d=driver();fill(d,'green',g=>({...g,kind:wrongKind?(g.kind+1)%6:g.kind,color:wrongColor?'purple':g.color}));seal(d);assert.equal(d.s.orders[0].earnings,sum);
  }
});
test('edit/undo/swap before closing preserve bag matching and restore exact previous choices',()=>{
  const d=driver();fill(d);const old=C.copy(C.packedItems(d.s.active));
  d.go('replace',{slot:0,goods:{color:'orange',kind:3,variant:1}});assert.equal(C.packedItems(d.s.active)[0].color,'orange');
  d.go('undo');assert.deepEqual(C.packedItems(d.s.active),old);
  d.go('move',{from:0,to:3});assert.equal(C.packedItems(d.s.active)[3].bag,0);d.go('photo');d.go('rearrange');d.go('photo');d.go('seal');assert.equal(d.s.orders[0].satisfaction,100);assert.equal(d.s.orders[0].items[3].bag,0);
});
test('duplicate tap, aborted order and repeated goods never double-pay or double-unlock',()=>{
  const d=driver();begin(d);d.go('discard');assert.deepEqual(d.s.orders,[]);fill(d,'orange',()=>({kind:1,variant:1,color:'green'}));seal(d);const saved=d.s;
  d.go('seal');assert.equal(d.s,saved);assert.equal(saved.orders[0].id,2);assert.equal(saved.orders[0].fresh.length,1);assert.equal(C.collection(saved).size,1);
});
test('cannot seal incomplete order; tear/selected merchandise survive restart',()=>{
  const d=driver();begin(d);d.go('pick',3);d.go('tear',.42);
  let saved=C.decode(JSON.stringify(d.s));assert.equal(saved.active.tear,.42);
  assert.equal(C.step(saved,'seal'),saved);assert.equal(C.step(saved,'tear',.2),saved);
  d.go('tear',1);d.go('shelf');d.go('drawer','书写');d.go('choose',{kind:1,variant:0,color:'yellow'});d.go('take');
  saved=C.decode(JSON.stringify(d.s));assert.equal(C.count(saved.active),0);assert.equal(saved.active.bags[3].goods.color,'yellow');
  d.go('place',2);d.go('undo');assert.equal(C.count(d.s.active),0);d.go('repick');assert.equal(d.s.active.stage,'shelf');
});
test('free sorting different colors does not change satisfaction; invalid merchandise rejected',()=>{
  const d=driver();fill(d,'purple',g=>({...g,color:'pink'}));const score=C.score('purple',C.packedItems(d.s.active)).satisfaction;d.go('move',{from:0,to:4});assert.equal(C.score('purple',C.packedItems(d.s.active)).satisfaction,score);
  const saved=d.s;d.go('replace',{slot:0,goods:{kind:C.kinds.length,color:'blue',variant:0}});assert.equal(saved,d.s);
});
