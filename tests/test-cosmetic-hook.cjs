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
  const saved = new Map(), warnings = [], logs = [];
  const browser = {WebSocket:Socket, MessageEvent, queueMicrotask, setTimeout,
    localStorage:{getItem:key => saved.get(key) ?? null, setItem:(key, value) => saved.set(key, value)},
    console:{info(...args) { logs.push(args.join(' ')); }, warn(...args) { warnings.push(args); }}};
  const generated = fs.readFileSync('majsoul-mirage.user.js', 'utf8');
  assert.deepEqual(Array.from(generated.matchAll(/^\/\/ @match\s+(\S+)$/gm), match => match[1]), [
    'https://mahjongsoul.game.yo-star.com/*',
    'https://majsoul.union-game.com/*',
    'https://game.mahjongsoul.com/*',
    'https://game.maj-soul.com/1/*'
  ]);
  assert(Buffer.byteLength(generated) < 47000, 'Keep compact protocol data and external protobuf.js');
  assert(generated.includes('// @require      https://cdn.jsdelivr.net/npm/protobufjs@8.8.1/dist/light/protobuf.min.js'));
  const context = vm.createContext({window:browser, TextDecoder, TextEncoder, URL, setTimeout, clearTimeout});
  vm.runInContext(fs.readFileSync(require.resolve('protobufjs/dist/light/protobuf.min.js'), 'utf8'), context);
  vm.runInContext(generated, context);
  const api = browser.majsoulMirage, cfg = browser.cfg;
  assert.equal(api.log, true);
  assert.equal(api.debug, false);
  assert(!('recent' in api));
  const socket = new browser.WebSocket('wss://example.invalid/game');
  const notifications = [];
  let received, id = 0;
  function listen(target) {
    target.addEventListener('message', event => {
      const bytes = Buffer.from(event.data);
      if (bytes[0] === 3) received = event.data;
      else {
        const wrapper = type('Wrapper').decode(bytes.subarray(1));
        notifications.push({socket:target, name:wrapper.name, data:event.data});
        if (process.argv[2] && ['NotifyGameBroadcast','NotifyAccountUpdate','NotifyRoomPlayerUpdate'].includes(wrapper.name.slice(4))) {
          fixtures.push({type:wrapper.name.slice(4), data:bytes.toString('base64')});
        }
      }
    });
  }
  listen(socket);
  async function request(service, method, value = {}, response, target = socket) {
    const pair = protocol[service][method], current = ++id;
    received = null;
    target.send(frame(2, current, '.lq.' + service + '.' + method, encode(pair.request, value)));
    if (response !== undefined) target.receive(frame(3, current, '', encode(pair.response, response)));
    await new Promise(resolve => setTimeout(resolve,0));
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
    if (method === 'changeCharacterSkin') {
      assert.equal(notifications.length, 1, 'Outside a room, only the account update is injected');
      const updated = decode(notifications.at(-1).data, 'NotifyAccountUpdate').update.character.characters[0];
      assert.equal(updated.charid, 200001); assert.equal(updated.skin, 400101);
    }
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
    const result = await request('Lobby', method, {}, {room:{room_id:777,persons:players,owner_id:42,seq:7,positions:[42,43]}});
    assert.equal(result.room.room_id, 777);
    assert.equal(result.room.persons[0].avatar_id, 400101);
    assert.equal(result.room.persons[1].avatar_id, 2);
    assert.equal(result.room.persons[1].character.level, 5);
  }
  async function changeSkin(charid, skin, inRoom) {
    const sent = socket.sent.length, start = notifications.length;
    assert(await request('Lobby', 'changeCharacterSkin', {character_id:charid, skin}));
    assert.equal(socket.sent.length, sent);
    const notices = notifications.slice(start);
    assert.deepEqual(notices.map(notice => notice.name), inRoom
      ? ['.lq.NotifyAccountUpdate','.lq.NotifyRoomPlayerUpdate'] : ['.lq.NotifyAccountUpdate']);
    const updated = decode(notices[0].data, 'NotifyAccountUpdate').update.character.characters[0];
    assert.equal(updated.charid, charid); assert.equal(updated.skin, skin);
    return notices[1];
  }
  // Room responses initialize the cache before the first player update arrives.
  let roomNotice = await changeSkin(200001, 400102, true);
  let room = decode(roomNotice.data, 'NotifyRoomPlayerUpdate');
  assert.equal(room.owner_id, 42); assert.equal(room.seq, 8);
  assert.equal(room.player_list[0].avatar_id, 400102);
  assert.equal(room.player_list[0].character.skin, 400102);
  const nextPlayers = [players[0], {account_id:44,nickname:'new-player',avatar_id:4,
    character:{charid:200007,skin:400201,level:1}}];
  const extra = protobuf.Writer.create().uint32(900 << 3).uint32(111).finish();
  const roomBody = Buffer.concat([Buffer.from(encode('NotifyRoomPlayerUpdate',
    {owner_id:44,seq:9,positions:[42,44],player_list:nextPlayers})),Buffer.from(extra)]);
  socket.receive(frame(1,0,'.lq.NotifyRoomPlayerUpdate',roomBody));
  roomNotice = await changeSkin(200001, 400103, true);
  room = decode(roomNotice.data, 'NotifyRoomPlayerUpdate');
  assert.deepEqual(room.player_list.map(player => player.account_id), [42,44]);
  assert.equal(room.owner_id, 44); assert.equal(room.seq, 10);
  assert.equal(room.player_list[0].character.skin, 400103);
  assert.equal(room.player_list[1].nickname, 'new-player');
  assert.deepEqual(Array.from(room.positions), [42,44]);
  const roomWrapper = type('Wrapper').decode(Buffer.from(roomNotice.data).subarray(1));
  const reader = protobuf.Reader.create(roomWrapper.data); reader.discardUnknown = false;
  assert.deepEqual(Buffer.from(type('NotifyRoomPlayerUpdate').decode(reader).$unknowns[0]), Buffer.from(extra));
  room = decode((await changeSkin(200007,400202,true)).data, 'NotifyRoomPlayerUpdate');
  assert.equal(room.player_list[0].character.charid, 200001);
  assert.equal(room.player_list[0].character.skin, 400103, 'Changing another character must not replace the main skin');
  assert.equal(room.player_list[1].character.skin, 400201, 'Other players retain their skins');
  assert.equal(room.seq, 11);
  // Server sequence numbers may lag after local skin changes; all room notices stay monotonic.
  assert.equal(notify('NotifyRoomPlayerReady', {account_id:44,ready:true,seq:10}).seq, 12);
  const dressing = notify('NotifyRoomPlayerDressing', {account_id:44,dressing:true,seq:10});
  assert.equal(dressing.seq, 13); assert.equal(dressing.account_id, 44); assert.equal(dressing.dressing, true);
  assert.equal(notify('NotifyRoomPlayerUpdate', {player_list:nextPlayers,seq:10}).seq, 14);
  assert.equal(decode((await changeSkin(200001,400103,true)).data,'NotifyRoomPlayerUpdate').seq, 15);
  const refreshed = await request('Lobby','fetchRoom',{}, {room:{persons:nextPlayers,seq:10}});
  assert.equal(refreshed.room.seq, 15, 'Fetching the current room must not roll back the local sequence');
  notify('NotifyRoomPlayerUpdate', {player_list:[nextPlayers[1]]});
  await changeSkin(200001,400104,false);
  await request('Lobby','fetchRoom',{}, {room:{owner_id:42,persons:nextPlayers}});
  assert.equal(decode((await changeSkin(200001,400104,true)).data,'NotifyRoomPlayerUpdate').seq, 1,
    'Removing self resets the room sequence');
  await request('Lobby','leaveRoom',{},{});
  await changeSkin(200001,400101,false);
  const record = await request('Lobby', 'fetchGameRecord', {}, {head:{uuid:'keep-record',accounts:players},data_url:'keep-url'});
  assert.equal(record.head.accounts[0].title, 1001);
  assert.equal(record.head.uuid, 'keep-record'); assert.equal(record.data_url, 'keep-url');
  const account = await request('Lobby', 'fetchAccountInfo', {}, {account:{account_id:42,nickname:'self'}});
  assert.equal(account.account.avatar_id, 400101);
  const game = await request('FastTest', 'authGame', {account_id:42}, {players,seat_list:[43,99,42]});
  assert.equal(game.players[0].avatar_frame, 305001);
  assert.deepEqual(Array.from(game.seat_list), [43,99,42]);

  const failed = await request('Lobby', 'fetchInfo', {}, {error:{code:123}});
  assert.equal(failed.error.code, 123); assert.equal(failed.character_info, null);
  const beforeEmoji = socket.sent.length;
  const beforeEmojiNotices = notifications.length, beforeLocalNotifications = api.stats.localNotifications;
  for (const emo_id of [8,9,70004]) {
    const content = JSON.stringify({emo_id});
    assert(await request('FastTest', 'broadcastInGame', {content, except_self:false}));
    const notice = notifications.at(-1);
    assert.equal(notice.name, '.lq.NotifyGameBroadcast');
    assert.equal(notice.socket, socket);
    assert.equal(decode(notice.data, 'NotifyGameBroadcast').seat, 2);
    assert.equal(decode(notice.data, 'NotifyGameBroadcast').content, content);
  }
  assert.equal(socket.sent.length, beforeEmoji, 'emo_id requests must stay local at every numeric ID');
  assert.equal(notifications.length, beforeEmojiNotices + 3);
  for (const content of ['{"emo":9}', '{"other":1}', 'invalid']) {
    await request('FastTest', 'broadcastInGame', {content}, {});
    assert.equal(decode(socket.sent.at(-1), 'ReqBroadcastInGame').content, content);
  }
  assert.equal(socket.sent.length, beforeEmoji + 3);
  assert.equal(notifications.length, beforeEmojiNotices + 3, 'Non-emo_id broadcasts must not create local notifications');
  const otherGame = new browser.WebSocket('wss://example.invalid/other-game'); listen(otherGame);
  await request('FastTest', 'authGame', {account_id:43}, {players,seat_list:[42,43]}, otherGame);
  const content = ' { "emo_id":70004, "extra":"preserved" } ';
  api.debug = 'NotifyGameBroadcast';
  await request('FastTest', 'broadcastInGame', {content}, undefined, otherGame);
  api.debug = false;
  assert.equal(otherGame.sent.length, 1, 'Only authGame should reach the server');
  assert.equal(notifications.at(-1).socket, otherGame);
  assert.equal(decode(notifications.at(-1).data, 'NotifyGameBroadcast').seat, 1);
  assert.equal(decode(notifications.at(-1).data, 'NotifyGameBroadcast').content, content);
  await request('FastTest', 'authGame', {account_id:43}, {error:{code:123}}, otherGame);
  const beforeMissingSeat = notifications.length, beforeWarnings = warnings.length;
  await request('FastTest', 'broadcastInGame', {content:'{"emo_id":70004}'}, undefined, otherGame);
  assert.equal(notifications.length, beforeMissingSeat);
  assert.equal(otherGame.sent.length, 2);
  assert.equal(warnings.length, beforeWarnings + 1);
  assert(warnings.at(-1)[0].includes('seat unavailable'));

  function notify(name, value) {
    const event = socket.receive(frame(1, 0, '.lq.' + name, encode(name, value)));
    return decode(event.data, name);
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
  assert.equal(api.stats.blocked, api.stats.synthetic);
  assert(logs.some(line => line.includes('modified response Lobby.fetchInfo')));
  assert(logs.some(line => line.includes('intercepted request Lobby.useTitle') && line.includes('local response queued')));
  assert(logs.some(line => line.includes('intercepted request FastTest.broadcastInGame')));
  assert.equal(api.stats.localNotifications, beforeLocalNotifications + 4);
  assert(logs.some(line => line.includes('local notify NotifyGameBroadcast')));
  assert(logs.some(line => line.includes('modified notify NotifyAccountUpdate')));
  assert(!logs.some(line => line.includes('pass ') || line.includes('keep-token') || line.includes('keep-name')));
  // Random settings stay local; room refreshes and same-game reconnects keep the selection.
  await request('Lobby','leaveRoom',{},{});
  const pool=[{character_id:200001,skin_id:400101},{character_id:200002,skin_id:400201}];
  const initial = await request('Lobby','fetchInfo',{}, {random_character:{enabled:true,pool}});
  assert.equal(initial.random_character.enabled,true);
  assert.equal(JSON.parse(saved.get('vip.char.random')).pool.length,2);
  vm.runInContext('Math.random = () => 0;',context);
  let sentRandom=socket.sent.length;
  let randomNotices=notifications.length;
  assert(await request('Lobby','setRandomCharacter',{enabled:true,pool}));
  assert.equal(notifications.length,randomNotices,'Saving random settings must not notify or refresh the room');
  const randomState=await request('Lobby','fetchRandomCharacter');
  assert.equal(randomState.enabled,true);assert.equal(randomState.pool[1].skin_id,400201);
  assert.equal(socket.sent.length,sentRandom,'Random settings and reads never reach the server');
  vm.runInContext('Math.random = () => 0.99;',context);
  let randomRoom=await request('Lobby','joinRoom',{}, {room:{persons:players,seq:1}});
  assert.equal(randomRoom.room.persons[0].character.charid,200002);
  assert.equal(randomRoom.room.persons[0].character.skin,400201);
  assert.equal(randomRoom.room.persons[0].avatar_id,400201);
  assert.equal(notifications.length,randomNotices+1,'Entering a room emits the selected character update');
  const roomSelection=decode(notifications.at(-1).data,'NotifyAccountUpdate').update;
  assert.equal(roomSelection.main_character.character_id,200002);
  assert.equal(roomSelection.character.characters[0].skin,400201);
  const changedRandomSkin=decode((await changeSkin(200002,400202,true)).data,'NotifyRoomPlayerUpdate');
  assert.equal(saved.get('vip.skin.200002'),'400202');
  assert.equal(changedRandomSkin.player_list[0].character.charid,200002);
  assert.equal(changedRandomSkin.player_list[0].character.skin,400202);
  assert.equal(changedRandomSkin.player_list[0].avatar_id,400202);
  const unchangedRandomSkin=decode((await changeSkin(200001,400101,true)).data,'NotifyRoomPlayerUpdate');
  assert.equal(unchangedRandomSkin.player_list[0].character.skin,400202,'Changing another character preserves the selected skin');
  assert.equal((await request('Lobby','fetchRandomCharacter')).pool[1].skin_id,400201,'Manual skin changes do not rewrite the saved random pool');
  randomNotices=notifications.length;
  vm.runInContext('Math.random = () => 0;',context);
  randomRoom=await request('Lobby','fetchRoom',{}, {room:{persons:players,seq:1}});
  assert.equal(randomRoom.room.persons[0].character.charid,200002,'Fetching a room does not reroll');
  assert.equal(randomRoom.room.persons[0].character.skin,400202);
  assert.equal(notifications.length,randomNotices,'Refreshing a room emits no new random update');
  const chosen=notify('NotifyAccountUpdate',{update:{main_character:{character_id:200007,skin_id:400701}}});
  assert.equal(chosen.update.main_character.character_id,200002);
  const beforeRoomStart=notifications.length;
  notify('NotifyRoomGameStart',{game_uuid:'random-game'});await new Promise(resolve => setTimeout(resolve,0));
  assert.equal(notifications.length,beforeRoomStart+1,'Room game start only binds the existing selection');
  const selectedGame=await request('FastTest','authGame',{account_id:42,game_uuid:'random-game'}, {players,seat_list:[42,43]});
  assert.equal(selectedGame.players[0].character.charid,200002);
  assert.equal(selectedGame.players[0].character.skin,400202);
  assert.equal(notifications.length,beforeRoomStart+1,'Starting from a room emits no duplicate synthetic account update');
  await request('Lobby','leaveRoom',{},{});
  const reconnected=await request('FastTest','authGame',{account_id:42,game_uuid:'random-game'}, {players,seat_list:[42,43]});
  assert.equal(reconnected.players[0].character.charid,200002,'Same-game reconnect retains its selected character');
  assert.equal(reconnected.players[0].character.skin,400202);
  randomNotices=notifications.length;
  const matchFrame=frame(1,0,'.lq.NotifyMatchGameStart',encode('NotifyMatchGameStart',{
    game_uuid:'next-game', game_url:'example.invalid:4011', connect_token:'test-only-token', match_mode_id:17
  }));
  const matchEvent=socket.receive(matchFrame);
  assert.deepEqual(Buffer.from(matchEvent.data),matchFrame,'Match-start notification remains byte-for-byte unchanged');
  await new Promise(resolve => setTimeout(resolve,0));
  assert.equal(notifications.length,randomNotices+2,'Match start is followed by a local account update');
  const matchAccountNotice=notifications.at(-1);
  assert.equal(matchAccountNotice.name,'.lq.NotifyAccountUpdate');
  assert.equal(matchAccountNotice.socket,socket);
  const matchSelection=decode(matchAccountNotice.data,'NotifyAccountUpdate').update;
  assert.equal(matchSelection.main_character.character_id,200001);
  assert.equal(matchSelection.main_character.skin_id,400101);
  assert.equal(matchSelection.character.characters.length,1);
  assert.equal(matchSelection.character.characters[0].charid,200001);
  assert.equal(matchSelection.character.characters[0].skin,400101);
  vm.runInContext('Math.random = () => 0.99;',context);
  randomNotices=notifications.length;
  socket.receive(matchFrame);await new Promise(resolve => setTimeout(resolve,0));
  assert.equal(notifications.length,randomNotices+1,'Duplicate match start neither rerolls nor emits another account update');
  randomNotices=notifications.length;
  const nextGame=await request('FastTest','authGame',{account_id:42,game_uuid:'next-game'}, {players,seat_list:[42,43]});
  assert.equal(nextGame.players[0].character.charid,200001,'Authentication reuses the selection from match start');
  assert.equal(nextGame.players[0].character.skin,matchSelection.main_character.skin_id);
  assert.equal(nextGame.players[0].avatar_id,matchSelection.main_character.skin_id);
  assert.equal(notifications.length,randomNotices,'Authentication after match start emits no duplicate account update');
  randomNotices=notifications.length;
  await request('Lobby','joinRoom',{}, {error:{code:123}});
  await request('FastTest','authGame',{account_id:42,game_uuid:'failed-game'}, {error:{code:123}});
  assert.equal(notifications.length,randomNotices,'Failed entry emits no account update');
  const unannounced=await request('FastTest','authGame',{account_id:42,game_uuid:'unannounced-game'}, {players,seat_list:[42,43]});
  assert.equal(unannounced.players[0].character.charid,200001,'Missing a start notification does not trigger random selection');
  assert.equal(notifications.length,randomNotices,'Authentication never generates a random account update');
  sentRandom=socket.sent.length;
  assert.equal((await request('Lobby','setRandomCharacter',{enabled:true,pool:[]})).error.code,1);
  assert.equal(socket.sent.length,sentRandom);
  assert.equal((await request('Lobby','fetchRandomCharacter')).pool.length,2,'Rejected settings do not overwrite the pool');
  await request('Lobby','setRandomCharacter',{enabled:false,pool});
  assert.equal(notifications.length,randomNotices,'Disabling random is a settings-only operation');
  const disabled=await request('Lobby','fetchInfo',{}, {random_character:{enabled:true,pool:[]}});
  assert.equal(disabled.random_character.enabled,false,'Local settings override server initialization');
  assert.equal(disabled.character_info.main_character_id,200001,'Disabling restores the fixed main character');
  const fixed=await request('Lobby','createRoom',{}, {room:{persons:players,seq:1}});
  assert.equal(fixed.room.persons[0].character.charid,200001);
  await request('Lobby','leaveRoom',{},{});
  await request('Lobby','setRandomCharacter',{enabled:true,pool});
  const beforeManual=await request('Lobby','joinRoom',{}, {room:{persons:players,seq:1}});
  assert.equal(beforeManual.room.persons[0].character.charid,200002);
  const manualSent=socket.sent.length, manualNotices=notifications.length;
  await request('Lobby','changeMainCharacter',{character_id:200001});
  assert.equal(socket.sent.length,manualSent);
  assert.equal(notifications.length,manualNotices+1);
  assert.equal(notifications.at(-1).name,'.lq.NotifyRoomPlayerUpdate');
  const manualRoom=decode(notifications.at(-1).data,'NotifyRoomPlayerUpdate');
  assert.equal(manualRoom.player_list[0].character.charid,200001);
  assert.equal(manualRoom.player_list[0].avatar_id,400101);
  assert.equal(manualRoom.seq,2);
  assert.equal((await request('Lobby','fetchRandomCharacter')).enabled,true,'Manual selection keeps random enabled');
  const manualRefresh=await request('Lobby','fetchRoom',{}, {room:{persons:players,seq:1}});
  assert.equal(manualRefresh.room.persons[0].character.charid,200001,'Room refresh preserves the manual choice');
  notify('NotifyRoomGameStart',{game_uuid:'manual-room-game'});await new Promise(resolve => setTimeout(resolve,0));
  const manualGame=await request('FastTest','authGame',{account_id:42,game_uuid:'manual-room-game'}, {players,seat_list:[42,43]});
  assert.equal(manualGame.players[0].character.charid,200001);
  await request('Lobby','leaveRoom',{},{});
  const rerolled=await request('Lobby','joinRoom',{}, {room:{persons:players,seq:1}});
  assert.equal(rerolled.room.persons[0].character.charid,200002,'Next room entry resumes random selection');
  await request('Lobby','leaveRoom',{},{});
  // Local failures never escape to the server, and still complete the waiting callback.
  const nativeCount=socket.sent.length, noticeCount=notifications.length;
  const write=browser.localStorage.setItem;
  browser.localStorage.setItem=()=>{throw Error('private storage failure');};
  assert.equal((await request('Lobby','useTitle',{title:9999})).error.code,1);
  browser.localStorage.setItem=write;
  const noticeType=api.lookupType('NotifyAccountUpdate'), noticeEncoder=noticeType.encode;
  noticeType.encode=()=>{throw Error('private notification failure');};
  assert.equal((await request('Lobby','changeCharacterSkin',{character_id:200001,skin:400102})).error.code,1);
  noticeType.encode=noticeEncoder;
  assert.equal(socket.sent.length,nativeCount);assert.equal(notifications.length,noticeCount);
  assert(warnings.slice(-2).every(args=>args[0].includes('original blocked')));
  assert(!JSON.stringify(warnings).includes('private'));
  api.readOnly=true;
  await request('Lobby','useTitle',{title:9999},{},socket);
  assert.equal(socket.sent.length,nativeCount+1,'Read-only mode still forwards local methods');
  api.uninstall(); assert.equal(browser.WebSocket, Socket);
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(fixtures));
  console.log('PASS: generated cosmetic script, all cosmetic branches, local storage and responses, unknown fields, errors, native passthrough');
}
test().catch(error => { console.error(error); process.exitCode = 1; });
