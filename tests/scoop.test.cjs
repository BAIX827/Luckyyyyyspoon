const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../Game/core.js');

function change(state, action, arg, random = () => .39) {
  const next = C.step(state, action, arg, random);
  assert.notEqual(next, state, action);
  return C.decode(JSON.stringify(next));
}

function fillAndShip(state) {
  for (let index = 0; index < state.active.bags.length; index++) {
    if (state.active.stage === 'shelf' && state.active.current === index)
      assert.equal(C.step(state, 'station-card', index), state);
    else state = change(state, 'station-card', index);
    const card = state.active.bags[index];
    state = change(state, 'station-browse', {kind:card.kind, variant:0});
    for (let n = 0; n < card.quantity; n++) {
      state = change(state, 'add-piece', {kind:card.kind, color:card.color, variant:0});
      assert.equal(C.step(state, 'station-card', index), state, 'reselecting keeps the pick and undo history');
    }
  }
  state = change(state, 'station-pack');
  state = change(state, 'wrap');
  state = change(state, 'photo');
  return change(state, 'seal');
}

test('scoop results are drawn on demand and survive restart before pouring', () => {
  let calls = 0;
  let state = change(C.initial(), 'start-scoop-level', 1, () => { calls++; return .1; });
  assert.equal(calls, 0);
  assert.deepEqual(state.active.bags, []);
  assert.equal(C.step(state, 'station-pack'), state);
  state = change(state, 'scoop', null, () => { calls++; return .1; });
  assert.equal(calls, 11);
  assert.equal(state.active.pendingBeads.length, 10);
  assert.equal(state.active.beads.length, 0);
  assert.equal(C.step(state, 'scoop'), state);
  const restored = C.decode(JSON.stringify(state));
  state = change(restored, 'pour');
  assert.equal(state.active.pendingBeads.length, 0);
  assert.equal(state.active.beads.length, 10);
  assert.equal(state.active.bags.length, 1);
  assert.equal(state.active.bags[0].quantity, 10);
  assert.equal(C.step(state, 'pour'), state);
  assert.equal(C.step(state, 'scoop'), state);
  state = fillAndShip(state);
  assert.equal(state.orders[0].items.length, 10);
  assert.equal(state.orders[0].satisfaction, 100);
  assert.equal(state.learned['first-order'], true);
});

test('three scoops accumulate repeated beads, total demand drives stock, all beads must be drawn before picking', () => {
  let state = change(C.initial(), 'start-scoop-free', {theme:'blue', scoops:3});
  for (let n = 0; n < 3; n++) {
    state = change(state, 'scoop', null, () => 0);
    state = change(state, 'pour');
    assert.equal(state.active.beads.length, (n + 1) * 20);
    if (n < 2) {
      assert.equal(state.active.stage, 'scoop');
      assert.equal(C.step(state, 'station-card', 0), state);
      assert.equal(C.step(state, 'station-pack'), state);
    }
  }
  assert.equal(C.stockCapacity(state.active, 0), 62);
  state = fillAndShip(state);
  assert.equal(state.orders[0].items.length, 60);
  assert.equal(state.orders[0].earnings, 100);
  const corrupt = C.copy(state);
  corrupt.orders[0].cards[0].quantity--;
  assert.throws(() => C.decode(JSON.stringify(corrupt)));
  assert.equal(C.step(C.initial(), 'start-scoop-free', {theme:'pink', scoops:4}).active, null);
});

test('100 scoop orders unlock stock and layouts through the supported campaign', () => {
  let state = C.initial();
  for (let level = 1; level <= 100; level++) {
    assert.equal(C.unlockedLevel(state), level);
    state = change(state, 'start-scoop-level', level);
    const debut = C.deliveries.find(d => d.after === level - 1);
    for (let n = 0; n < state.active.scoopTarget; n++) {
      let draw = 0;
      state = change(state, 'scoop', null, () => (draw++ % 6) / 6);
      if (n === 0 && debut) assert.equal(state.active.pendingBeads[0].kind, debut.kind);
      state = change(state, 'pour');
    }
    state = fillAndShip(state);
    assert.equal(state.orders.at(-1).satisfaction, 100);
    const receipt = state.orders.at(-1);
    assert.equal(receipt.items.length, receipt.scoopSizes.reduce((sum,n)=>sum+n,0));
    assert.ok(receipt.scoopSizes.every(n=>level===1?n>=10&&n<=12:n>=20&&n<=28));
  }
  assert.equal(C.stockKinds(state).length, 24);
});

test('full spoons vary in size while unfinished six-bead saves remain playable', () => {
  let state = change(C.initial(), 'start-scoop-free', {theme:'pink', scoops:1});
  state = change(state, 'scoop', null, () => .99);
  assert.equal(state.active.pendingBeads.length, 28);
  const old = C.copy(state);
  delete old.active.scoopSizes;
  old.active.pendingBeads = old.active.pendingBeads.slice(0,6);
  state = C.decode(JSON.stringify(old));
  state = change(state, 'pour');
  state = fillAndShip(state);
  assert.equal(state.orders[0].items.length, 6);
  assert.equal(state.orders[0].satisfaction, 100);
  assert.equal(C.decode(JSON.stringify(state)).orders[0].items.length, 6);
  const damaged = C.copy(state);
  damaged.orders[0].scoopsTaken = Infinity;
  assert.throws(() => C.validate(damaged));
});
