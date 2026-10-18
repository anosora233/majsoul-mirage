// Local cosmetic state, compatible with prod.js storage keys.
function installCosmeticHook(scope, api, cfg) {
  const storage = scope.localStorage;
  const keys = {skin:'vip.skin', title:'vip.title', loading:'vip.loading', account:'vip.account',
    main:'vip.char.main', sort:'vip.char.sort', hidden:'vip.char.hidden', use:'vip.views.use', views:'vip.views'};
  function key(name, id) { return keys[name] + (id === undefined ? '' : '.' + id); }
  function get(name, fallback, id) {
    const value = storage.getItem(key(name, id));
    try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
  }
  function set(name, value, id) { storage.setItem(key(name, id), JSON.stringify(value)); }
  const definitions = cfg.item_definition;
  const ids = table => Object.keys(table.map_).map(Number);
  const mainId = () => get('main', 200007);
  const selectedViews = () => get('views', {}, get('use', 0)).values || [];
  function character(charid) {
    return {charid:Number(charid), level:5, exp:1, is_upgraded:true, rewarded_level:[1,2,3,4,5], views:[],
      skin:get('skin', definitions.character.map_[charid]?.init_skin || 0, charid),
      extra_emoji:(cfg.character.emoji.groups_[charid] || []).map(row => row.sub_id)};
  }
  function views() {
    return selectedViews().map(view => ({slot:view.slot, type:0, item_id_list:[],
      item_id:view.type ? view.item_id_list[Math.floor(Math.random() * view.item_id_list.length)] : view.item_id}));
  }
  function override(players) {
    let changed = false;
    for (const player of players || []) {
      if (!player) continue;
      if (player.account_id === get('account', null)) {
        const main = character(mainId());
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
  const localRequests = {
    useTitle: message => set('title', message.title),
    setLoadingImage: message => set('loading', message.images),
    changeMainCharacter: message => set('main', message.character_id),
    changeCharacterSkin: message => set('skin', message.skin, message.character_id),
    updateCharacterSort: message => set('sort', message.sort),
    setHiddenCharacter(message) { set('hidden', message.chara_list); return {hidden_characters:message.chara_list}; },
    useCommonView: message => set('use', message.index),
    saveCommonViews: message => set('views', {values:message.views, index:message.save_index}, message.save_index),
    addFinishedEnding() {}
  };
  api.onRequest = ({service, method, message}) => {
    if (service === 'Lobby' && Object.hasOwn(localRequests, method)) {
      const response = localRequests[method](message);
      return {respond:response || {}};
    }
    if (service === 'FastTest' && method === 'broadcastInGame') {
      let content;
      try { content = JSON.parse(message.content); } catch { return; }
      if (content?.emo > 9) return {respond:{}};
    }
  };
  api.onResponse = ({service, method, message}) => {
    if (message.error?.code) return;
    if (service === 'FastTest') return method === 'authGame' && override(message.players);
    if (service !== 'Lobby') return;
    switch (method) {
      case 'login': case 'emailLogin': case 'oauth2Login':
        if (message.account_id) set('account', message.account_id);
        return override([message.account]);
      case 'fetchInfo': {
        message.character_info = Object.assign(message.character_info || {}, {send_gift_count:0, send_gift_limit:2,
          skins:ids(definitions.skin), finished_endings:ids(cfg.spot.rewards), rewarded_endings:ids(cfg.spot.rewards),
          main_character_id:mainId(), character_sort:get('sort', []), hidden_characters:get('hidden', []),
          characters:ids(definitions.character).map(character)});
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
      case 'joinRoom': case 'fetchRoom': case 'createRoom': return override(message.room?.persons);
      case 'fetchGameRecord': return override(message.head?.accounts);
      case 'fetchAccountInfo': return override([message.account]);
    }
  };
  api.onNotify = ({name, message}) => {
    switch (name) {
      case 'NotifyAccountUpdate':
        if (!message.update) return;
        delete message.update.character;
        delete message.update.main_character;
        return true;
      case 'NotifyRoomPlayerUpdate': return override(message.player_list);
      case 'NotifyGameFinishRewardV2':
        if (!message.main_character) return;
        Object.assign(message.main_character, {exp:1, add:0, level:5});
        return true;
    }
  };
  api.cfg = cfg;
  scope.console.info('[MajsoulWS] cosmetics.ready');
}
module.exports = {installCosmeticHook};
