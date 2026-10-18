const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const protobuf = require('protobufjs');
const protocol = require('../data/proto-config.json').service;
const root = protobuf.Root.fromJSON(require('../data/game-protocol.json')).resolveAll();
const type = name => root.lookupType('lq.' + name);
const encode = (name, value) => type(name).encode(type(name).fromObject(value)).finish();
function frame(kind, id, name, body) {
  const wrapper = encode('Wrapper', {name, data:body});
  const bytes = Buffer.alloc((kind === 1 ? 1 : 3) + wrapper.length);
  bytes[0] = kind;
  if (kind !== 1) bytes.writeUInt16LE(id, 1);
  bytes.set(wrapper, kind === 1 ? 1 : 3);
  return bytes;
}
function decode(data, name) {
  const bytes = Buffer.from(data);
  const wrapper = type('Wrapper').decode(bytes.subarray(bytes[0] === 1 ? 1 : 3));
  return type(name).decode(wrapper.data);
}
class Socket extends EventTarget {
  static OPEN = 1;
  constructor(url) { super(); this.url = url; this.readyState = 1; this.sent = []; this.events = []; }
  send(data) { if (this.readyState !== 1) throw Error('Socket not open'); this.sent.push(data); }
  receive(data) {
    const bytes = Uint8Array.from(data);
    const event = new MessageEvent('message', {data:bytes.buffer});
    this.dispatchEvent(event);
    return event;
  }
}
async function test() {
  const fixtures = [];
  const saved = new Map(), warnings = [];
  const browser = {WebSocket:Socket, MessageEvent, queueMicrotask,
    localStorage:{getItem:key => saved.get(key) ?? null, setItem:(key, value) => saved.set(key, value)},
    console:{info() {}, warn(...args) { warnings.push(args); }}};
  const generated = fs.readFileSync('majsoul-websocket-hook.user.js', 'utf8');
  assert(Buffer.byteLength(generated) < 45000, 'protobuf.js must stay external');
  assert(generated.includes('// @require      https://cdn.jsdelivr.net/npm/protobufjs@8.8.1/dist/light/protobuf.min.js'));
  const context = vm.createContext({window:browser, TextDecoder, TextEncoder, URL, setTimeout, clearTimeout});
  vm.runInContext(fs.readFileSync(require.resolve('protobufjs/dist/light/protobuf.min.js'), 'utf8'), context);
  vm.runInContext(generated, context);
  const api = browser.majsoulWS, cfg = browser.cfg;
  const socket = new browser.WebSocket('wss://example.invalid/game');
  let received, id = 0;
  socket.addEventListener('message', event => { received = event.data; });
  async function request(service, method, value = {}, response) {
    const pair = protocol[service][method], current = ++id;
    received = null;
    socket.send(frame(2, current, '.lq.' + service + '.' + method, encode(pair.request, value)));
    if (response !== undefined) socket.receive(frame(3, current, '', encode(pair.response, response)));
    await Promise.resolve();
    if (received) {
      const fixture = {type:pair.response, data:Buffer.from(received).toString('base64')};
      if (process.argv[2] && method === 'fetchInfo' && response?.character_info) {
        const oldSchema = structuredClone(require('../data/game-protocol.json'));
        function unpacked(node) {
          for (const field of Object.values(node.fields || {})) {
            if (field.rule === 'repeated') field.options = {...field.options, packed:false};
          }
          for (const child of Object.values(node.nested || {})) unpacked(child);
        }
        unpacked(oldSchema);
        const oldType = protobuf.Root.fromJSON(oldSchema).resolveAll().lookupType('lq.ResFetchInfo');
        fixture.unpackedData = Buffer.from(oldType.encode(decode(received, pair.response)).finish()).toString('base64');
      }
      fixtures.push(fixture);
    }
    return received ? decode(received, pair.response) : null;
  }
  const login = await request('Lobby', 'login', {}, {account_id:42, access_token:'keep-token',
    account:{account_id:42, nickname:'keep-name', avatar_id:1, gold:123}});
  assert.equal(login.account.avatar_id, cfg.item_definition.character.map_[200007].init_skin);
  assert.equal(login.account.nickname, 'keep-name');
  assert.equal(login.account.gold, 123);
  assert.equal(login.access_token, 'keep-token');
  assert.equal(saved.get('vip.account'), '42');

  const commands = [
    ['useTitle', {title:1001}, 'vip.title', 1001],
    ['setLoadingImage', {images:[300001]}, 'vip.loading', [300001]],
    ['changeMainCharacter', {character_id:200001}, 'vip.char.main', 200001],
    ['changeCharacterSkin', {character_id:200001, skin:400101}, 'vip.skin.200001', 400101],
    ['updateCharacterSort', {sort:[200001,200007]}, 'vip.char.sort', [200001,200007]],
    ['setHiddenCharacter', {chara_list:[200007]}, 'vip.char.hidden', [200007]],
    ['saveCommonViews', {save_index:2, views:[{slot:5,item_id:305001}]}, 'vip.views.2',
      {values:[{slot:5,item_id:305001,type:0,item_id_list:[]}],index:2}],
    ['useCommonView', {index:2}, 'vip.views.use', 2],
    ['addFinishedEnding', {}, null, null]
  ];
  for (const [method, value, key, expected] of commands) {
    const before = socket.sent.length;
    const response = await request('Lobby', method, value);
    assert(response, method + ' must get a deferred local response');
    assert.equal(socket.sent.length, before, method + ' must stay local');
    if (key) {
      const actual = JSON.parse(saved.get(key));
      if (method === 'saveCommonViews') {
        assert.equal(actual.index, 2); assert.equal(actual.values[0].item_id, 305001);
      } else assert.deepEqual(actual, expected);
    }
    if (method === 'setHiddenCharacter') assert.deepEqual(Array.from(response.hidden_characters), [200007]);
  }
  const owned = cfg.item_definition.item.rows_[0].id;
  const info = await request('Lobby', 'fetchInfo', {}, {
    character_info:{other_character_sort:[200007]},
    bag_info:{bag:{items:[{item_id:owned, stack:8}, {item_id:999999,stack:9}]}},
    server_time:{server_time:123456}
  });
  assert.equal(info.character_info.characters.length, 124);
  assert.equal(info.character_info.main_character_id, 200001);
  assert.equal(info.character_info.characters.find(row => row.charid === 200001).skin, 400101);
  assert.deepEqual(Array.from(info.character_info.other_character_sort), [200007]);
  assert.equal(info.title_list.title_list.length, 162);
  assert.equal(info.bag_info.bag.items.filter(item => item.item_id === owned).length, 1);
  assert.equal(info.bag_info.bag.items.find(item => item.item_id === owned).stack, 8);
  assert.equal(info.bag_info.bag.items.find(item => item.item_id === 999999).stack, 9);
  assert.equal(info.server_time.server_time, 123456);
  assert.equal(info.all_common_views.use, 2);

  const players = [{account_id:42,nickname:'self',avatar_id:1,character:{charid:200007,level:1}},
    {account_id:43,nickname:'other',avatar_id:2,character:{charid:200007,level:1}}];
  for (const method of ['joinRoom','fetchRoom','createRoom']) {
    const result = await request('Lobby', method, {}, {room:{room_id:777,persons:players}});
    assert.equal(result.room.room_id, 777);
    assert.equal(result.room.persons[0].avatar_id, 400101);
    assert.equal(result.room.persons[1].avatar_id, 2);
    assert.equal(result.room.persons[1].character.level, 5);
  }
  const record = await request('Lobby', 'fetchGameRecord', {}, {head:{uuid:'keep-record',accounts:players},data_url:'keep-url'});
  assert.equal(record.head.accounts[0].title, 1001);
  assert.equal(record.head.uuid, 'keep-record'); assert.equal(record.data_url, 'keep-url');
  const account = await request('Lobby', 'fetchAccountInfo', {}, {account:{account_id:42,nickname:'self'}});
  assert.equal(account.account.avatar_id, 400101);
  const game = await request('FastTest', 'authGame', {}, {players,seat_list:[42,43]});
  assert.equal(game.players[0].avatar_frame, 305001);
  assert.deepEqual(Array.from(game.seat_list), [42,43]);

  const failed = await request('Lobby', 'fetchInfo', {}, {error:{code:123}});
  assert.equal(failed.error.code, 123); assert.equal(failed.character_info, null);
  const beforeEmoji = socket.sent.length;
  assert(await request('FastTest', 'broadcastInGame', {content:'{"emo":10}'}));
  assert.equal(socket.sent.length, beforeEmoji);
  await request('FastTest', 'broadcastInGame', {content:'{"emo":9}'}, {});
  assert.equal(socket.sent.length, beforeEmoji + 1);
  await request('FastTest', 'broadcastInGame', {content:'invalid'}, {});
  assert.equal(socket.sent.length, beforeEmoji + 2);

  function notify(name, value) {
    socket.receive(frame(1, 0, '.lq.' + name, encode(name, value)));
    return decode(received, name);
  }
  const update = notify('NotifyAccountUpdate', {update:{character:{skins:[1]}, main_character:{skin_id:1},
    numerical:[{id:7,final:999}]}});
  assert.equal(update.update.character, null); assert.equal(update.update.main_character, null);
  assert.equal(update.update.numerical[0].final, 999);
  assert.equal(notify('NotifyRoomPlayerUpdate', {player_list:players}).player_list[0].character.skin, 400101);
  const reward = notify('NotifyGameFinishRewardV2', {mode_id:7,main_character:{level:1,exp:99,add:15}});
  assert.equal(reward.mode_id, 7); assert.equal(reward.main_character.exp, 1); assert.equal(reward.main_character.add, 0);

  // Unsupported methods/notifications and malformed frames retain their exact bytes.
  const unknown = frame(1, 0, '.lq.NotifyUnrecognized', Buffer.from([255]));
  const event = socket.receive(unknown);
  assert.deepEqual(Buffer.from(event.data), unknown);
  const raw = Uint8Array.from([255,0,1]); socket.send(raw); assert.equal(socket.sent.at(-1), raw);
  const connecting = new browser.WebSocket('wss://example.invalid/connecting'); connecting.readyState = 0;
  assert.throws(() => connecting.send(frame(2, 300, '.lq.Lobby.useTitle', encode('ReqUseTitle', {title:9999}))));
  assert.equal(saved.get('vip.title'), '1001');
  assert.equal(api.stats.errors, 0, JSON.stringify(warnings));
  assert(api.stats.modified > 0 && api.stats.synthetic >= 10);
  api.uninstall(); assert.equal(browser.WebSocket, Socket);
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(fixtures));
  console.log('PASS: generated cosmetic script, all prod.js branches, local storage and responses, unknown fields, errors, native passthrough');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
