'use strict';
window.LuckySound = (() => {
  const beat=.76, steps=128;
  const musicLevel=.45, effectsLevel=.66;
  const chords=[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,69],[60,64,67,69],[52,55,59,62],[53,57,62,65],[55,59,62,67]];
  const melody=[7,null,4,null,null,2,4,null,0,null,2,null,4,null,null,null,5,null,null,4,2,null,0,null,2,null,4,null,null,7,null,null];
  const hz=m=>440*Math.pow(2,(m-69)/12);
  function instrument(ctx,out,t,f,length,vol,type='sine',end=f,body=0) {
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(15,end),t+length);
    g.gain.setValueAtTime(.00001,t);g.gain.exponentialRampToValueAtTime(vol,t+.008);
    if(body)g.gain.exponentialRampToValueAtTime(vol*.55,t+body);
    g.gain.exponentialRampToValueAtTime(.00001,t+length);
    o.connect(g);g.connect(out);o.start(t);o.stop(t+length+.01);
  }
  const noiseBuffers=new WeakMap();
  function brush(ctx,out,t,length,vol,freq,q=.8) {
    let buf=noiseBuffers.get(ctx);
    if(!buf){
      buf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=buf.getChannelData(0);
      let seed=125;for(let i=0;i<d.length;i++){seed=(seed*16807)%2147483647;d[i]=2*seed/2147483647-1;}
      noiseBuffers.set(ctx,buf);
    }
    const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    f.type='bandpass';f.frequency.value=freq;f.Q.value=q;src.buffer=buf;
    g.gain.setValueAtTime(.00001,t);g.gain.exponentialRampToValueAtTime(vol,t+.007);g.gain.exponentialRampToValueAtTime(.00001,t+length);
    src.connect(f);f.connect(g);g.connect(out);src.start(t);src.stop(t+length);
  }
  function musicStep(ctx,out,t,step) {
    const i=step%steps,pos=i%8,chord=chords[Math.floor(i/8)%chords.length];
    if(pos===0){const bass=hz(chord[0]-12);instrument(ctx,out,t,bass,.92,.11,'sine',bass,.12);}
    if([0,3,4,7].includes(pos)){
      const root=hz(chord[[0,0,0,1,2,0,0,3][pos]]);
      instrument(ctx,out,t,root,.72,.065,'sine',root,.14);instrument(ctx,out,t,root*2,.10,.012,'triangle');
    }
    const m=melody[i%32];
    if(m!==null && !(i>=64 && i%4===2)){
      const f=hz((i>=64?60:72)+m);
      instrument(ctx,out,t+.02,f,.61,.038,'sine',f,.08);instrument(ctx,out,t+.02,f*3,.08,.005);
    }
  }
  function effect(ctx,out,name,t) {
    const play=(f,d,delay,v=.13,type='sine',end=f)=>instrument(ctx,out,t+delay,f,d,v,type,end);
    const rub=(d,v,f,delay=0)=>brush(ctx,out,t+delay,d,v,f);
    if(name==='scoop'){
      rub(.22,.14,1050);rub(.12,.08,2300,.06);
      [970,1420,1160].forEach((f,i)=>play(f,.04,.11+i*.043,.045,'triangle',f*.82));
    }
    else if(name.startsWith('bead-hit')){
      const i=Number(name.slice(8))||0,f=[1120,1740,1360,2080,1510,940][i%6];
      play(f,.043,0,.065,'sine',f*.9);play(f*1.49,.025,.006,.018,'triangle');
      play(f*.84,.025,.055,.027);rub(.035,.035,2100);
    }
    else if(name==='land-soft'){rub(.075,.12,650);play(155,.06,0,.06,'sine',90);}
    else if(name==='land-hard'){play(340,.04,0,.075,'sine',170);rub(.045,.07,1200);}
    else if(name==='beads') {for(let i=0;i<6;i++)play([830,1160,740,1310,940,690][i],.06,i*.036,.07,'triangle');rub(.23,.10,1700);}
    else if(name==='tear'){for(let i=0;i<5;i++)rub(.065,.32,2200+i*170,i*.028);}
    else if(name==='ceramic'){play(1180,.20,0,.12);play(1810,.12,.008,.055);play(241,.07,0,.10);}
    else if(name==='pen'){play(1450,.037,0,.17,'triangle',740);play(1030,.055,.046,.10);}
    else if(name==='restock'){play(850,.04,0,.028,'triangle',510);}
    else if(name==='soft-restock'){rub(.06,.06,840);}
    else if(name==='cloth'){rub(.16,.31,850);play(280,.044,.075,.06);}
    else if(name==='tape'){rub(.17,.25,1900);for(let i=0;i<4;i++)play(550,.022,i*.04,.06,'triangle');}
    else if(name==='book'||name==='paper'){rub(.14,.27,name==='book'?720:2600);play(165,.10,.035,.17,'sine',82);}
    else if(name==='clip'){play(1330,.032,0,.15,'triangle',730);play(1060,.047,.048,.12,'sine',640);}
    else if(name==='zip'){for(let i=0;i<6;i++)rub(.029,.23,940+160*i,i*.016);}
    else if(name==='seal'){rub(.18,.3,1650);[65,69,72,77].forEach((m,i)=>play(hz(m),.47,.13+i*.078,.11));}
    else if(name==='gift'||name==='reveal'||name==='bell'){[72,76,79].slice(0,name==='gift'?3:2).forEach((m,i)=>play(hz(m),.25,i*.077,.11));}
    else if(name.startsWith('match')){const i=Number(name.slice(5))||0;play(hz([72,76,79,84][i%4]),.27,.065,.095);}
    else play(540,.06,0,.11,'triangle',255);
  }
  function engine(ctx) {
    const music=ctx.createGain(),fx=ctx.createGain(),output=ctx.createGain();
    output.gain.value=2;music.connect(output);fx.connect(output);output.connect(ctx.destination);
    const level=musicLevel;music.gain.value=level;fx.gain.value=effectsLevel;
    let timer=null,next=0,step=0;
    function schedule(){
      if(next<ctx.currentTime)next=ctx.currentTime+.01;
      while(next<ctx.currentTime+.27){musicStep(ctx,music,next,step++);next+=beat/2;}
    }
    function sync(on){
      if(on&&timer===null){
        music.gain.cancelScheduledValues(ctx.currentTime);music.gain.setTargetAtTime(level,ctx.currentTime,.12);
        next=ctx.currentTime+.03;schedule();timer=setInterval(schedule,90);
      }else if(!on&&timer!==null){
        clearInterval(timer);timer=null;music.gain.cancelScheduledValues(ctx.currentTime);music.gain.setTargetAtTime(.00001,ctx.currentTime,.10);
      }
    }
    function play(name,delay=0){
      const t=ctx.currentTime+delay;
      if(timer!==null && (name.startsWith('bead-hit') || ['scoop','beads','tear','gift','seal'].includes(name))){
        music.gain.cancelScheduledValues(t);music.gain.setTargetAtTime(level*.63,t,.025);
        music.gain.setTargetAtTime(level,t+.20,.11);
      }
      effect(ctx,fx,name,t);
    }
    return {sync,play};
  }
  function demo(ctx,withEffects){
    const music=ctx.createGain(),fx=ctx.createGain(),output=ctx.createGain();
    music.gain.value=musicLevel;fx.gain.value=effectsLevel;output.gain.value=2;
    music.connect(output);fx.connect(output);output.connect(ctx.destination);
    for(let i=0;i<steps;i++)musicStep(ctx,music,.08+i*beat/2,i);
    if(withEffects)for(const [when,name] of [[1,'scoop'],[2.1,'bead-hit0'],[2.18,'bead-hit3'],[2.26,'bead-hit1'],[2.34,'bead-hit4'],[2.42,'bead-hit2'],[2.5,'bead-hit5'],[5.1,'pen'],[5.46,'land-hard'],[5.5,'match0'],[7.2,'cloth'],[7.56,'land-soft'],[7.6,'match1'],[9.1,'book'],[9.46,'land-soft'],[9.5,'match2'],[11.2,'tape'],[11.56,'land-soft'],[11.6,'match3'],[14,'gift'],[17.2,'seal']]){
      effect(ctx,fx,name,when);music.gain.setTargetAtTime(musicLevel*.63,when,.015);music.gain.setTargetAtTime(musicLevel,when+.20,.09);
    }
  }
  return {engine,demo};
})();
