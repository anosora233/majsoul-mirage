// Local cosmetic state, preserving existing vip.* storage keys.
function installCosmeticHook(scope, api, cfg) {
  const storage = scope.localStorage;
  const keys = {skin:'vip.skin', title:'vip.title', loading:'vip.loading', account:'vip.account',
    main:'vip.char.main', sort:'vip.char.sort', hidden:'vip.char.hidden', use:'vip.views.use', views:'vip.views', random:'vip.char.random'};
  function key(name, id) { return keys[name] + (id === undefined ? '' : '.' + id); }
  function get(name, fallback, id) {
    const value = storage.getItem(key(name, id));
    try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
  }
  function set(name, value, id) { storage.setItem(key(name, id), JSON.stringify(value)); }
  const definitions = cfg.item_definition;
  const games = new WeakMap();
  let roomUpdate = null, roomSeq = 0, randomChoice = null, currentGame = null;
  const ids = table => Object.keys(table.map_).map(Number);
  const mainId = () => randomChoice?.character_id || get('main', 200007);
  const randomSettings = () => get('random', {enabled:false, pool:[]});
  function selectRandom() {
    const {enabled, pool} = randomSettings();
    randomChoice = enabled && pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }
  const selectedViews = () => get('views', {}, get('use', 0)).values || [];
  function character(charid, choice = randomChoice) {
    return {charid:Number(charid), level:5, exp:1, is_upgraded:true, rewarded_level:[1,2,3,4,5], views:[],
      skin:choice?.character_id === Number(charid) ? choice.skin_id
        : get('skin', definitions.character.map_[charid]?.init_skin || 0, charid),
      extra_emoji:(cfg.character.emoji.groups_[charid] || []).map(row => row.sub_id)};
  }
  function views() {
    return selectedViews().map(view => ({slot:view.slot, type:0, item_id_list:[],
      item_id:view.type ? view.item_id_list[Math.floor(Math.random() * view.item_id_list.length)] : view.item_id}));
  }
  function override(players, choice = randomChoice) {
    let changed = false;
    for (const player of players || []) {
      if (!player) continue;
      if (player.account_id === get('account', null)) {
        const main = character(choice?.character_id || get('main', 200007), choice);
        if (choice) main.skin = choice.skin_id;
        const updates = {views:views(), avatar_id:main.skin, character:main,
          avatar_frame:selectedViews().find(view => view.slot === 5)?.item_id || 0,
          title:get('title', 0), loading_image:get('loading', [])};
        for (const [name, value] of Object.entries(updates)) if (name in player) player[name] = value;
        changed = true;
      } else if (player.character) {
        Object.assign(player.character, {level:5, exp:1, is_upgraded:true});
        changed = true;
      }
    }
    return changed;
  }
  function nextRoomSeq(message) { message.seq = roomSeq = Math.max(message.seq || 0, roomSeq + 1); }
  function clearRoom() { roomUpdate = null; roomSeq = 0; randomChoice = null; }
  function updateRoom(message) {
    const changed = override(message?.player_list);
    roomUpdate = message?.player_list?.some(player => player.account_id === get('account', null)) ? message : null;
    if (!roomUpdate) roomSeq = 0;
    return changed;
  }
  const localRequests = {
    fetchRandomCharacter: randomSettings,
    fetchTitleList: () => ({title_list:ids(definitions.title)}),
    setRandomCharacter(message) {
      const pool = message.pool.map(({character_id, skin_id}) => ({character_id, skin_id}));
      if (message.enabled && !pool.length || pool.some(entry => !definitions.character.map_[entry.character_id] || !definitions.skin.map_[entry.skin_id])) {
        throw new Error('Invalid random character pool');
      }
      set('random', {enabled:message.enabled, pool});
    },
    useTitle: message => set('title', message.title),
    setLoadingImage: message => set('loading', message.images),
    changeMainCharacter(message) { set('main', message.character_id); randomChoice = null; },
    changeCharacterSkin(message) {
      set('skin', message.skin, message.character_id);
      if (randomChoice?.character_id === message.character_id) randomChoice.skin_id = message.skin;
    },
    updateCharacterSort: message => set('sort', message.sort),
    setHiddenCharacter(message) { set('hidden', message.chara_list); return {hidden_characters:message.chara_list}; },
    useCommonView: message => set('use', message.index),
    saveCommonViews: message => set('views', {values:message.views, index:message.save_index}, message.save_index),
    addFinishedEnding() {}
  };
  api.localMethods = new Set(Object.keys(localRequests).map(method => 'Lobby.'+method));
  api.onRequest = context => {
    const {socket, service, method, message} = context;
    if (service === 'Lobby' && Object.hasOwn(localRequests, method)) {
      const response = localRequests[method](message);
      if (method === 'changeCharacterSkin' || method === 'changeMainCharacter') {
        const notify = method === 'changeCharacterSkin' ? [{name:'NotifyAccountUpdate',
          message:{update:{character:{characters:[character(message.character_id)]}}}}] : [];
        if (roomUpdate) {
          override(roomUpdate.player_list);
          nextRoomSeq(roomUpdate);
          notify.push({name:'NotifyRoomPlayerUpdate', message:roomUpdate});
        }
        return {respond:{}, notify};
      }
      return {respond:response || {}};
    }
    if (service === 'FastTest' && method === 'authGame') {
      const account = message.account_id || get('account', 0);
      const choice = message.game_uuid && currentGame?.uuid === message.game_uuid && currentGame.account === account
        ? currentGame.choice : null;
      games.set(socket, {account, seat:-1, choice});
    }
    if (service === 'FastTest' && method === 'broadcastInGame') {
      let content;
      try { content = JSON.parse(message.content); } catch { return; }
      if (!Number.isInteger(content?.emo_id)) return;
      context.local = true;
      const seat = games.get(socket)?.seat ?? -1;
      if (seat < 0) {
        scope.console.warn('[MajsoulMirage] emoji.skipped — seat unavailable');
        return {respond:{}};
      }
      return {respond:{}, notify:{name:'NotifyGameBroadcast', message:{seat, content:message.content}}};
    }
  };
  function randomNotice(choice) {
    const selected=character(choice.character_id); selected.skin=choice.skin_id;
    return {name:'NotifyAccountUpdate', message:{update:{character:{characters:[selected]},
      main_character:{character_id:choice.character_id, skin_id:choice.skin_id}}}};
  }
  api.onResponse = context => {
    const {socket, service, method, message}=context;
    if (message.error?.code) return;
    if (service === 'FastTest') {
      if (method !== 'authGame') return;
      const account = games.get(socket)?.account || get('account', 0);
      const choice = games.has(socket) ? games.get(socket).choice : randomChoice;
      games.set(socket, {account, seat:account ? message.seat_list.indexOf(account) : -1, choice});
      return override(message.players, choice);
    }
    if (service !== 'Lobby') return;
    switch (method) {
      case 'login': case 'emailLogin': case 'oauth2Login':
        if (message.account_id) {
          if (message.account_id !== get('account', null)) { clearRoom(); currentGame = null; }
          set('account', message.account_id);
        }
        return override([message.account]);
      case 'fetchInfo': {
        if (get('random', null) === null && message.random_character) {
          set('random', {enabled:message.random_character.enabled, pool:message.random_character.pool.map(({character_id, skin_id}) => ({character_id, skin_id}))});
        }
        message.random_character = randomSettings();
        message.character_info = Object.assign(message.character_info || {}, {send_gift_count:0, send_gift_limit:2,
          skins:ids(definitions.skin), finished_endings:ids(cfg.spot.rewards), rewarded_endings:ids(cfg.spot.rewards),
          main_character_id:mainId(), character_sort:get('sort', []), hidden_characters:get('hidden', []),
          characters:ids(definitions.character).map(id => character(id))});
        message.all_common_views = {use:get('use', 0), views:Array.from({length:10}, (_, i) => get('views', {}, i))};
        message.title_list ??= {};
        message.title_list.title_list = ids(definitions.title);
        message.bag_info ??= {};
        message.bag_info.bag ??= {};
        const bag = message.bag_info.bag;
        const existing = new Set((bag.items || []).map(item => item.item_id));
        bag.items = [...definitions.item.rows_.filter(item => (item.category === 5 || item.category === 8) && !existing.has(item.id))
          .map(item => ({item_id:item.id, stack:1})), ...(bag.items || [])];
        return true;
      }
      case 'joinRoom': case 'fetchRoom': case 'createRoom': {
        const room = message.room;
        if (!room) { clearRoom(); return; }
        const entering=method !== 'fetchRoom' || !roomUpdate;
        if (entering) { roomSeq = room.seq || 0; selectRandom(); }
        room.seq = roomSeq = Math.max(room.seq || 0, roomSeq);
        const changed=updateRoom(api.lookupType('NotifyRoomPlayerUpdate').fromObject({player_list:room.persons,
          owner_id:room.owner_id, robot_count:room.robot_count, seq:room.seq, robots:room.robots, positions:room.positions}));
        if(entering && roomUpdate && randomChoice)context.notify=randomNotice(randomChoice);
        return changed;
      }
      case 'leaveRoom': clearRoom(); return;
      case 'fetchGameRecord': return override(message.head?.accounts);
      case 'fetchAccountInfo': return override([message.account]);
    }
  };
  api.onNotify = context => {
    const {name, message}=context;
    switch (name) {
      case 'NotifyRoomGameStart':
      case 'NotifyMatchGameStart': {
        const account=get('account', 0);
        if (!message.game_uuid || currentGame?.uuid === message.game_uuid && currentGame.account === account) return;
        if(name === 'NotifyMatchGameStart')selectRandom();
        currentGame={uuid:message.game_uuid, account, choice:randomChoice};
        if(name === 'NotifyMatchGameStart' && randomChoice)context.notify=randomNotice(randomChoice);
        return;
      }
      case 'NotifyAccountUpdate':
        if (!message.update) return;
        delete message.update.character;
        if (randomChoice && message.update.main_character) {
          message.update.main_character = {character_id:randomChoice.character_id, skin_id:randomChoice.skin_id};
        } else delete message.update.main_character;
        return true;
      case 'NotifyRoomPlayerUpdate':
        nextRoomSeq(message); updateRoom(message); return true;
      case 'NotifyRoomPlayerReady': case 'NotifyRoomPlayerDressing':
        nextRoomSeq(message); return true;
      case 'NotifyRoomKickOut': clearRoom(); return;
      case 'NotifyGameFinishRewardV2':
        if (!message.main_character) return;
        Object.assign(message.main_character, {exp:1, add:0, level:5});
        return true;
    }
  };
  api.cfg = cfg;
  scope.console.info('[MajsoulMirage] cosmetics.ready');
}
module.exports = {installCosmeticHook};
