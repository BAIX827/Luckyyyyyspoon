'use strict';

window.LuckyPlatform = (() => {
  const key='lucky.bags.save.v1';
  const bridge=window.webkit?.messageHandlers?.lucky;
  let audio;
  let archiveSlot=null, savedOrders=null, recovered=false;
  const storageKey=slot=>slot==='current' ? key : key+'.'+slot;
  const readSlot=slot=>bridge ? bridge.postMessage({op:'read',slot}) : localStorage.getItem(storageKey(slot));
  function parse(raw){
    try { return JSON.parse(raw); } catch { throw new Error('invalid-save'); }
  }
  async function unpack(raw){
    if(raw===null)return {state:LuckyCore.initial(),slot:null};
    const head=parse(raw);
    const slot=head?.archive;
    if(slot!==undefined){
      if(!['orders-a','orders-b'].includes(slot))throw new Error('invalid-save');
      head.orders=parse(await readSlot(slot));
      if(!Array.isArray(head.orders)||head.orders.length!==head.orderCount)throw new Error('invalid-save');
      delete head.archive; delete head.orderCount;
    }
    try {return {state:LuckyCore.validate(head),slot:slot??null};}
    catch {throw new Error('invalid-save');}
  }
  async function transaction(body){
    if(bridge){
      if(await bridge.postMessage(body)==='conflict') throw new Error('conflict');
      return;
    }
    const commit=()=>{
      const before=localStorage.getItem(key);
      if(body.op==='restore'){
        if(before!==body.observed || localStorage.getItem(storageKey('backup'))!==body.raw)throw new Error('conflict');
      }else{
        if((before===null ? 0 : parse(before).revision)!==body.expected)throw new Error('conflict');
        localStorage.setItem(storageKey('backup'),before??JSON.stringify(LuckyCore.initial()));
        if(body.archive) localStorage.setItem(storageKey(body.slot),body.archive);
      }
      localStorage.setItem(key,body.raw);
    };
    if(navigator.locks) await navigator.locks.request(key,commit);
    else commit();
  }
  async function read(){
    const raw=await readSlot('current');
    let loaded;
    try{
      if(raw===null && await readSlot('backup')!==null)throw new Error('invalid-save');
      loaded=await unpack(raw);
    }catch(error){
      if(error.message!=='invalid-save')throw error;
      const backup=await readSlot('backup');
      if(backup===null)throw error;
      loaded=await unpack(backup);
      await transaction({op:'restore',raw:backup,observed:raw});
      recovered=true;
    }
    archiveSlot=loaded.slot;savedOrders=loaded.state.orders;
    return loaded.state;
  }
  async function write(expected,next){
    const {orders,...head}=next;
    const update=!archiveSlot || orders!==savedOrders;
    const slot=update ? (archiveSlot==='orders-a'?'orders-b':'orders-a') : archiveSlot;
    const body={op:'write',expected,raw:JSON.stringify({...head,archive:slot,orderCount:orders.length})};
    if(update){body.slot=slot;body.archive=JSON.stringify(orders);}
    await transaction(body);
    savedOrders=orders;archiveSlot=slot;
  }
  function didRecover(){const result=recovered;recovered=false;return result;}
  function unlock() {
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); if(audio.state==='suspended') audio.resume().catch(()=>{}); } catch {}
  }
  function tone(hz,duration,start,type='sine',volume=.045,ending=hz) {
    if(!audio || audio.state!=='running') return;
    const t=audio.currentTime+start,osc=audio.createOscillator(),gain=audio.createGain();
    osc.type=type;osc.frequency.setValueAtTime(hz,t);osc.frequency.exponentialRampToValueAtTime(ending,t+duration);
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(gain);gain.connect(audio.destination);
    osc.start(t);osc.stop(t+duration+.01);
  }
  function play(which,settings) {
    if(settings.sound) {
      if(which==='tear') {
        if(audio?.state==='running'){
          const samples=Math.floor(audio.sampleRate*.14), buf=audio.createBuffer(1,samples,audio.sampleRate), ch=buf.getChannelData(0);
          for(let i=0;i<samples;i++) ch[i]=(Math.random()*2-1)*.115*(1-i/samples)*(i%300<185?1:.25);
          const src=audio.createBufferSource();src.buffer=buf;src.connect(audio.destination);src.start();
        }
      } else if(which==='paper') {
        tone(320,.065,0,'triangle',.035,140);
        tone(780,.04,.025,'sine',.018,420);
      } else if(which==='clip') {
        tone(1240,.038,0,'triangle',.055,710);
        tone(910,.046,.052,'sine',.037,480);
      } else if(which==='seal'||which==='bell') {
        [523,659,784].forEach((n,i)=>tone(n,.21,i*.075,'sine',.048));
      } else if(which==='reveal') {tone(523,.12,0,'triangle');tone(784,.2,.09,'sine');}
      else if(which==='book') tone(135,.095,0,'triangle',.13,65);
      else if(which==='place') tone(640,.075,0,'triangle',.08,280);
      else tone(440,.065,0,'sine',.033,510);
    }
    if(settings.haptic && ['reveal','seal'].includes(which)) {
      if(bridge) bridge.postMessage({op:'haptic'}).catch(()=>{});
      else navigator.vibrate?.(14);
    }
  }
  return {read,write,didRecover,unlock,play,key};
})();
