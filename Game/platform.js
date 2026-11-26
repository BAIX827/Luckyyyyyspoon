'use strict';

window.LuckyPlatform = (() => {
  const key='lucky.bags.save.v1';
  const bridge=window.webkit?.messageHandlers?.lucky;
  let audio,mixer, musicWanted=false;
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
  // Full-game purchase. In the iOS app StoreKit decides; the web build keeps a local test flag.
  const fullKey=key+'.full-game';
  let fullGame=false;
  async function refreshStore(){
    try{
      fullGame=bridge ? (await bridge.postMessage({op:'store-status'}))==='owned' : localStorage.getItem(fullKey)==='1';
    }catch{}
    return fullGame;
  }
  async function price(){
    if(!bridge)return '';
    try{return (await bridge.postMessage({op:'store-price'}))||'';}catch{return '';}
  }
  async function storeAction(op){
    if(!bridge){localStorage.setItem(fullKey,'1');fullGame=true;return 'owned';}
    let result;
    try{result=await bridge.postMessage({op});}catch{return 'failed';}
    if(result==='owned')fullGame=true;
    return result;
  }
  function didRecover(){const result=recovered;recovered=false;return result;}
  function syncMusic(on) {
    musicWanted=on;
    mixer?.sync(on && !document.hidden && audio.state==='running');
  }
  function unlock() {
    try {
      if(!audio){audio=new (window.AudioContext || window.webkitAudioContext)();mixer=LuckySound.engine(audio);
        audio.onstatechange=()=>syncMusic(musicWanted);}
      if(audio.state==='suspended') audio.resume().catch(()=>{});
      syncMusic(musicWanted);
    }catch{}
  }
  function play(which,settings,delay=0) {
    if(settings.sound && audio?.state==='running' && !document.hidden) mixer.play(which||'tick',delay);
    if(settings.haptic && ['reveal','seal'].includes(which)) {
      if(bridge) bridge.postMessage({op:'haptic'}).catch(()=>{});
      else navigator.vibrate?.(14);
    }
  }
  return {read,write,didRecover,unlock,play,syncMusic,key,refreshStore,price,
    purchase:()=>storeAction('purchase'),restore:()=>storeAction('restore'),fullGame:()=>fullGame};
})();
