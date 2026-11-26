const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const C = require('../Game/core.js');

function front() {
  const platform = {read:async () => C.initial(), write:async () => {}};
  const window = {LuckyPlatform:platform};
  const context = {
    window, LuckyCore:C,
    LuckyView:{
      icon:key => '<img alt="" data-icon="' + key + '">',
      button:(act,text,cls='',value='',extra='') =>
        `<button data-act="${act}" data-val="${value}" class="${cls}" ${extra}>${text}</button>`
    }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../Game/front.js'),'utf8'), context);
  assert.equal(window.LuckyPlatform, platform);
  return window.LuckyFront;
}

test('home uses supplied saved progress for first order, resume and the completed campaign', () => {
  const view = front();
  assert.match(view.home(C.initial()), /data-act="level-ticket" data-val="1"/);
  const active = C.step(C.initial(),'start-scoop-free',{theme:'green',scoops:2});
  const before = JSON.stringify(active);
  assert.match(view.home(active), /data-act="resume"/);
  assert.equal(JSON.stringify(active), before);
  const finished = {...C.initial(),orders:[{level:100,earnings:100}]};
  assert.match(view.home(finished), /data-act="new-order"/);
});

test('street tickets show real unlocks and active-order controls across all ten chapters', () => {
  const view = front();
  const state = {...C.initial(),orders:Array.from({length:80},(_,i)=>({level:i+1}))};
  for (let chapter = 0; chapter < 10; chapter++) {
    const selectedLevel = chapter * 10 + 1;
    const html = view.book(state, {chapter,selectedLevel});
    assert.equal((html.match(/data-act="map-select"/g)||[]).length, 10);
    assert.match(html, new RegExp(C.levelName(selectedLevel)));
    if (chapter <= 8) assert.match(html, /data-act="accept-level"/);
    else assert.match(html, /第九十关后解锁/);
  }
  const active = C.step(C.initial(),'start-scoop-level',1);
  assert.match(view.book(active,{chapter:0,selectedLevel:1}), /data-act="resume"/);
  assert.match(view.book(active,{chapter:0,selectedLevel:2}), /第一关后解锁/);
});

test('the formal entry and front-page artwork are packaged inside the Game directory', () => {
  const root = path.resolve(__dirname,'../Game');
  const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const resolved = path.resolve(root,match[1]);
    assert.ok(resolved.startsWith(root + path.sep));
    assert.ok(fs.existsSync(resolved), match[1]);
  }
  for (const file of ['front.js','front.css']) {
    const source = fs.readFileSync(path.join(root,file),'utf8');
    assert.doesNotMatch(source, /设计文档/);
    for (const match of source.matchAll(/(?:src="|url\(")(assets\/front\/[^")]+)/g)) {
      if (match[1].includes('${')) continue;
      assert.ok(fs.existsSync(path.resolve(root,match[1])), match[1]);
    }
  }
});

test('each chapter uses a distinct packaged scene and its own ten route stops', () => {
  const root = path.resolve(__dirname,'../Game');
  const source = fs.readFileSync(path.join(root,'front.js'),'utf8');
  const scenes = [...source.matchAll(/file:'([^']+)'/g)].map(match => match[1]);
  assert.equal(scenes.length, C.chapters.length);
  assert.equal(new Set(scenes).size, scenes.length);
  const fingerprints = scenes.map(scene =>
    crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/front',scene))).digest('hex'));
  assert.equal(new Set(fingerprints).size, scenes.length);
  const view = front();
  for (let chapter = 0; chapter < C.chapters.length; chapter++) {
    const html = view.book(C.initial(), {chapter,selectedLevel:chapter*10+1});
    assert.ok(html.includes('src="assets/front/' + scenes[chapter] + '"'));
    assert.equal((html.match(/data-act="map-select"/g)||[]).length,10);
  }
});

test('level stars use inclusive thresholds and the map keeps the best replay', () => {
  assert.deepEqual([0,59,60,79,80,94,95,99,100].map(C.levelStars),[0,0,1,1,2,2,2,2,3]);
  const state = {...C.initial(), orders:[{level:1,satisfaction:100},{level:1,satisfaction:59},{level:2,satisfaction:50}]};
  const map = front().book(state,{chapter:0,selectedLevel:1});
  assert.ok(map.includes(C.levelName(1)+'，最高 3 星'));
  assert.ok(map.includes(C.levelName(2)+'，最高 0 星'));
});
