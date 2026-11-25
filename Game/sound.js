'use strict';
window.LuckySound = (() => {
  const beat=.64, steps=64;
  const chords=[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,69],[60,64,67,69],[52,55,59,62],[53,57,62,65],[55,59,62,67]];
  const melody=[7,null,4,null,null,2,4,null,0,null,2,null,4,null,null,null,5,null,null,4,2,null,0,null,2,null,4,null,null,7,null,null];
  const hz=m=>440*Math.pow(2,(m-69)/12);
  function instrument(ctx,out,t,f,length,vol,type='sine',end=f) {
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(15,end),t+length);
    g.gain.setValueAtTime(.00001,t);g.gain.exponentialRampToValueAtTime(vol,t+.008);
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
    const i=step%steps,pos=i%8,chord=chords[Math.floor(i/8)];
    if(pos===0||pos===5)instrument(ctx,out,t,hz(chord[pos===0?0:2]-12),.76,.15,'sine');
    if([0,3,4,7].includes(pos)){
      const root=hz(chord[[0,0,0,1,2,0,0,3][pos]]);
      instrument(ctx,out,t,root,.58,.089,'sine');instrument(ctx,out,t,root*2,.12,.022,'triangle');
    }
    const m=melody[i%32];
    if(m!==null){const f=hz(72+m+(i>=32&&i%8===2?2:0));instrument(ctx,out,t+.02,f,.47,.06);instrument(ctx,out,t+.02,f*3,.10,.012);}
    if(pos===2||pos===6)brush(ctx,out,t,.085,.055,3800);
  }
  function effect(ctx,out,name,t) {
    const play=(f,d,delay,v=.13,type='sine',end=f)=>instrument(ctx,out,t+delay,f,d,v,type,end);
    const rub=(d,v,f,delay=0)=>brush(ctx,out,t+delay,d,v,f);
    if(name==='beads') {for(let i=0;i<6;i++)play([830,1160,740,1310,940,690][i],.08,i*.036,.13,'triangle');rub(.26,.15,1700);}
    else if(name==='tear'){for(let i=0;i<5;i++)rub(.065,.32,2200+i*170,i*.028);}
    else if(name==='ceramic'){play(1180,.20,0,.12);play(1810,.12,.008,.055);play(241,.07,0,.10);}
    else if(name==='pen'){play(1450,.037,0,.17,'triangle',740);play(1030,.055,.046,.10);}
    else if(name==='restock'){play(850,.052,0,.062,'triangle',510);}
    else if(name==='soft-restock'){rub(.08,.12,840);}
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
    const music=ctx.createGain(),fx=ctx.createGain();music.connect(ctx.destination);fx.connect(ctx.destination);
    const level=.47;music.gain.value=level;fx.gain.value=.7;
    let timer=null,next=0,step=0;
    function schedule(){
      if(next<ctx.currentTime)next=ctx.currentTime+.01;
      while(next<ctx.currentTime+.27){musicStep(ctx,music,next,step++);next+=beat/2;}
    }
    function sync(on){
      if(on&&timer===null){
        music.gain.cancelScheduledValues(ctx.currentTime);music.gain.setTargetAtTime(level,ctx.currentTime,.04);
        next=ctx.currentTime+.03;schedule();timer=setInterval(schedule,90);
      }else if(!on&&timer!==null){
        clearInterval(timer);timer=null;music.gain.cancelScheduledValues(ctx.currentTime);music.gain.setTargetAtTime(.00001,ctx.currentTime,.035);
      }
    }
    function play(name,delay=0){
      const t=ctx.currentTime+delay;
      if(timer!==null && ['beads','tear','gift','seal'].includes(name)){
        music.gain.cancelScheduledValues(t);music.gain.setTargetAtTime(level*.63,t,.025);
        music.gain.setTargetAtTime(level,t+.20,.11);
      }
      effect(ctx,fx,name,t);
    }
    return {sync,play};
  }
  function demo(ctx,withEffects){
    const music=ctx.createGain(),fx=ctx.createGain();music.gain.value=.47;fx.gain.value=.7;music.connect(ctx.destination);fx.connect(ctx.destination);
    for(let i=0;i<steps;i++)musicStep(ctx,music,.08+i*beat/2,i);
    if(withEffects)for(const [when,name] of [[1,'beads'],[2.9,'tear'],[3.15,'reveal'],[5.1,'pen'],[5.31,'restock'],[5.2,'match0'],[7.2,'cloth'],[7.3,'match1'],[9.1,'book'],[9.2,'match2'],[11.2,'tape'],[11.3,'match3'],[14,'gift'],[17.2,'seal']]){
      effect(ctx,fx,name,when);music.gain.setTargetAtTime(.24,when,.015);music.gain.setTargetAtTime(.47,when+.20,.09);
    }
  }
  return {engine,demo};
})();
