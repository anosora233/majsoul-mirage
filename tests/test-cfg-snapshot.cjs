const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const data = require('../data/cfg-snapshot.json');
const {installConfigSnapshot} = require('../src/cfg-snapshot.cjs');
const scope = {};
const cfg = installConfigSnapshot(scope);
assert.equal(scope.cfg, cfg);
const definitions = cfg.item_definition;
for (const [category, values] of Object.entries(data.items)) {
  assert.deepEqual(definitions.item.rows_.filter(row => row.category === Number(category)).map(row => row.id), values);
}
for (const [id, skin] of data.characters) assert.equal(definitions.character.map_[id].init_skin, skin);
for (const [name, values] of [['skin', data.skins], ['title', data.titles]]) {
  assert.deepEqual(Object.keys(definitions[name].map_).map(Number), values);
}
assert.deepEqual(Object.keys(cfg.spot.rewards.map_).map(Number), data.rewards);
for (const [id, values] of Object.entries(data.emojis)) {
  assert.deepEqual(cfg.character.emoji.groups_[id].map(row => row.sub_id), values);
}
const existing = {cfg: {item_definition: {item: {full: true}}}};
const original = existing.cfg.item_definition.item;
installConfigSnapshot(existing);
assert.equal(existing.cfg.item_definition.item, original);
assert(existing.cfg.item_definition.skin.map_);

// Run the exact generated browser artifact with only native WebSocket stubs.
class WebSocket { send() {} }
const browser = {WebSocket, console: {info() {}}};
const context = vm.createContext({window: browser, TextDecoder});
vm.runInContext(fs.readFileSync(require.resolve('protobufjs/dist/light/protobuf.min.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync('majsoul-websocket-hook.user.js', 'utf8'), context);
assert.equal(browser.majsoulWS.cfg, browser.cfg);
assert.equal(JSON.stringify(browser.cfg), JSON.stringify(cfg));
console.log('PASS: projected cfg fields, old access patterns, existing tables preserved, generated userscript');
