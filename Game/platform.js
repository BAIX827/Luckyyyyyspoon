'use strict';

window.LuckyPlatform = (() => {
  const key='lucky.bags.save.v1';
  const bridge=window.webkit?.messageHandlers?.lucky;
  let audio;
  async function read() {
    const raw=bridge ? await bridge.postMessage({op:'read'}) : localStorage.getItem(key);
    return LuckyCore.decode(raw);
  }
  async function write(expected,next) {
    const raw=JSON.stringify(next);
    if (bridge) {
      const result=await bridge.postMessage({op:'write',expected,raw});
      if (result==='conflict') throw new Error('conflict');
      return;
    }
    function commit() {
      if (LuckyCore.decode(localStorage.getItem(key)).revision!==expected) throw new Error('conflict');
      localStorage.setItem(key,raw);
    }
    if (navigator.locks) await navigator.locks.request(key,commit);
    else commit();
  }
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
  return {read,write,unlock,play,key};
})();
