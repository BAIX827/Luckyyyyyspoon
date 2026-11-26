'use strict';
(function iconsModule(){
  const shapes={
    pink:['....gg.g....','...ggggg....','..rgggggr...','.rrrrrprrr..','rryrrrrryrr.','rrrryrrrrrr.','.rrrrrryrr..','..ryrrrrr...','...rrrrr....','....rrr.....','.....r......'],
    blue:['.....dd.....','...ddccdd...','..dccwwccd..','.dcwcwwcwcd.','dcwccwwccwcd','dwwcwwwwcwwd','dcwwcwwcwwcd','.dcwcwwcwcd.','..ddccccdd..','....dddd....'],
    purple:['.....ggg....','....ggg.....','..dd.ddd....','.dppdpppd...','dpwpdpwpd...','.dpdddppd...','..ddppdd....','..dpwpdd....','...ddpd.....','....dd......'],
    yellow:['........gg..','......ggg...','....yyyyyg..','..yyyywwyyd.','.yyywwyyyyd.','.yyyyyyyyyd.','..yyyyyyyd..','..dyyyyyd...','.dyyyyd.....','..ddd.......'],
    green:['..gg..gg....','.gwggggwg...','.gggggggg...','..gggggg....','..gggggg....','.gggggggg...','.gggggggg...','..gg..gg....','......g.....','.......g....'],
    orange:['.....gggg...','....gg......','...oooooo...','..owwooooo..','.owoooooooo.','.oooooooooo.','.ooooooooyo.','..oooooooy..','...oooooo...'],
    gear:['....dd.....','..d.dd.d...','.dddddddd..','..ddccdd...','.ddc..cdd..','.ddc..cdd..','..ddccdd...','.dddddddd..','..d.dd.d...','....dd.....'],
    album:['..dddddddd..','.dyyyyyyyyd.','.dddddyyyyd.','.ddywdyddyd.','.ddwwdyyyyd.','.dddddyyyyd.','.dyyyyyyyyd.','.dddddddddd.'],
    catalog:['..ddd..ddd..','.dwwwddwwwd.','.dwywddwywd.','.dwwwddwwwd.','.dwywddwywd.','.dwwwddwwwd.','.dddddddddd.','.....dd.....'],
    bag:['..dddddddd..','..dypypyyd..','...dddddd...','..dppppppd..','.dpppwwpppd.','.dppwwwwppd.','.dpppwwpppd.','.dppppppppd.','..dddddddd..'],
    back:['.....dd.....','....dd......','...dd.......','..ddddddddd.','..ddddddddd.','...dd.......','....dd......','.....dd.....'],
    pause:['..ddd..ddd..','..ddd..ddd..','..ddd..ddd..','..ddd..ddd..','..ddd..ddd..','..ddd..ddd..','..ddd..ddd..','..ddd..ddd..'],
    close:['..dd....dd..','...dd..dd...','....dddd....','.....dd.....','....dddd....','...dd..dd...','..dd....dd..'],
    star:['.....y......','....yyy.....','....yyy.....','.yyyyyyyyy..','..yyyyyyy...','...yyyyy....','...yy.yy....','..yy...yy...'],
    shell:['....ddd.....','..ddcccdd...','.dcccccccd..','dccccwccccd.','dccwcwcwccd.','dcccwwwcccd.','.dcccccccd..','..dddccdd...','....ddd.....']
  };
  shapes.spoon=['.........dd.','........dwd.','.......dwd..','......dwd...','...ddddd....','..dwwwddd...','.dwpywpwd...','.dpywypwd...','.dwypwpwd...','..dwwwdd....','...dddd.....'];
  const inks={d:'#452335',g:'#4e774d',r:'#db4257',p:'#f782ac',y:'#ffd47c',w:'#fff5db',c:'#82c8d1',o:'#ec8944'};
  const icons={};
  for(const [key,rows] of Object.entries(shapes)){
    const canvas=document.createElement('canvas');canvas.width=12;canvas.height=12;
    const ctx=canvas.getContext('2d');
    const top=Math.floor((12-rows.length)/2);
    rows.forEach((line,y)=>Array.from(line).forEach((s,x)=>{if(inks[s]){ctx.fillStyle=key==='purple'&&s==='p'?'#a777ce':inks[s];ctx.fillRect(x,y+top,1,1);}}));
    icons[key]=canvas.toDataURL();
  }
  window.LuckyIcons=icons;
})();
