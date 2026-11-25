const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const C=require('../Game/core.js');
const platformSource=fs.readFileSync(require.resolve('../Game/platform.js'),'utf8');
function fixture(){
  const db=new Map();
  const window={};
  const localStorage={getItem:key=>db.get(key)??null,setItem:(k,v)=>db.set(k,v)};
  vm.runInNewContext(platformSource,{window,LuckyCore:C,localStorage,navigator:{}});
  return {p:window.LuckyPlatform,db};
}
test('old saves migrate on the first write, keep history separate, and recover a damaged checkpoint',async()=>{
  const {p,db}=fixture();const legacy=C.step(C.initial(),'start-free','blue');
  db.set(p.key,JSON.stringify(legacy));
  const state=await p.read();
  const next=C.step(state,'pick',0);
  await p.write(state.revision,next);
  assert.deepEqual(JSON.parse(db.get(p.key+'.backup')),legacy);
  const head=JSON.parse(db.get(p.key));assert.equal(head.orders,undefined);
  const archiveKey=p.key+'.'+head.archive;
  const archive=db.get(archiveKey);
  await p.write(next.revision,C.step(next,'tear',.4));
  assert.equal(JSON.parse(db.get(p.key)).archive,head.archive);
  assert.equal(db.get(archiveKey),archive);
  const broken=JSON.parse(db.get(p.key));broken.active.theme='invalid';
  db.set(p.key,JSON.stringify(broken));
  assert.deepEqual(JSON.parse(JSON.stringify((await p.read()).active)),next.active);
  assert.equal(p.didRecover(),true);
  await assert.rejects(p.write(state.revision,next),/conflict/);
  assert.equal(JSON.parse(db.get(p.key)).revision,next.revision);
});
test('a damaged archive rolls back to the previous completed order list',async()=>{
  const {p,db}=fixture();let s=await p.read();
  async function act(name,arg){const next=C.step(s,name,arg);await p.write(s.revision,next);s=next;}
  await act('start-level',1);
  for(let i=0;i<5;i++){
    await act('pick',i);await act('tear',1);await act('drawer','纸品');
    if(i===0)await act('add-piece',{kind:4,color:'pink',variant:1});
    await act('finish-card');
  }
  await act('wrap');await act('photo');await act('seal');
  assert.equal((await p.read()).orders.length,1);
  const {archive}=JSON.parse(db.get(p.key));db.set(p.key+'.'+archive,'broken');
  const recovered=await p.read();assert.equal(recovered.orders.length,0);
  assert.equal(recovered.active.stage,'seal');
  const sealed=C.step(recovered,'seal');await p.write(recovered.revision,sealed);
  assert.equal((await p.read()).orders.length,1);
});
