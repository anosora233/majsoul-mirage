// Field numbers and types come from the extracted client schema, never hand-maintained.
function cosmeticProtocol(protobuf, schema, config) {
  const source = protobuf.Root.fromJSON(schema).resolveAll();
  const fields = {
    NotifyRoomPlayerReady:'seq', NotifyRoomPlayerDressing:'seq',
    ResLogin:'error account_id account',
    ResFetchInfo:'error character_info all_common_views title_list bag_info',
    Account:'account_id avatar_id avatar_frame title loading_image',
    PlayerGameView:'account_id avatar_id avatar_frame title character views',
    'RecordGame.AccountInfo':'account_id avatar_id avatar_frame title character views',
    Room:'persons owner_id robot_count seq robots positions', RecordGame:'accounts', Bag:'items',
    ResGameRecord:'error head', ResAccountInfo:'error account',
    ResAuthGame:'error players seat_list',
    NotifyGameFinishRewardV2:'main_character',
    AccountUpdate:'character main_character',
    'AccountUpdate.CharacterUpdate':'characters', 'AccountUpdate.MainCharacterUpdate':'',
    ReqAuthGame:'account_id', ReqFinishedEnding:''
  };
  const lobby = 'login emailLogin oauth2Login fetchInfo joinRoom fetchRoom createRoom fetchGameRecord fetchAccountInfo '
    + 'useTitle setLoadingImage changeMainCharacter changeCharacterSkin updateCharacterSort setHiddenCharacter '
    + 'useCommonView saveCommonViews addFinishedEnding leaveRoom';
  const methods = {Lobby:lobby.split(' '), FastTest:['authGame', 'broadcastInGame']};
  const result = new protobuf.Root(), methodMap = {service:{}};
  function include(name, selection) {
    const type = source.lookupType(name);
    if (result.lookup(type.fullName)) return;
    const output = new protobuf.Type(type.name);
    result.define(type.parent.fullName.slice(1)).add(output);
    const selected = selection ?? fields[type.fullName.slice(4)];
    for (const field of type.fieldsArray) {
      if (selected !== undefined && !selected.split(' ').includes(field.name)) continue;
      const copy = field.toJSON();
      if (field.resolvedType) {
        if (!(field.resolvedType instanceof protobuf.Type)) throw Error('Unexpected enum in cosmetic schema');
        copy.type = field.resolvedType.fullName;
        include(copy.type);
      }
      output.add(protobuf.Field.fromJSON(field.name, copy));
    }
  }
  include('lq.Wrapper');
  for (const [service, names] of Object.entries(methods)) {
    methodMap.service[service] = {};
    for (const method of names) {
      const pair = config.service[service][method];
      // Only locally handled requests need their business fields decoded.
      include('lq.' + pair.request, service === 'Lobby' && names.indexOf(method) < 9 ? '' : undefined);
      include('lq.' + pair.response);
      methodMap.service[service][method] = pair;
    }
  }
  for (const name of ['NotifyAccountUpdate', 'NotifyRoomPlayerUpdate', 'NotifyRoomPlayerReady', 'NotifyRoomPlayerDressing', 'NotifyRoomKickOut', 'NotifyGameFinishRewardV2', 'NotifyGameBroadcast']) include('lq.' + name);
  return {schema:result.resolveAll().toJSON(), methodMap};
}

function packProtocol(schema, methodMap) {
  const definitions = [];
  function visit(namespace, prefix = '') {
    for (const [name, type] of Object.entries(namespace.nested || {})) {
      const path = prefix + name;
      if (type.edition && type.edition !== 'proto2') throw Error('Unsupported protocol edition: ' + path);
      if (type.fields) definitions.push([path, type.fields]);
      visit(type, path + '.');
    }
  }
  visit(schema.nested.lq);
  const index = name => {
    const value = definitions.findIndex(([path]) => path === name.replace(/^\.?lq\./, ''));
    if (value < 0) throw Error('Missing protocol type: ' + name);
    return value;
  };
  return {
    definitions:definitions.map(([name, fields]) => [name, Object.entries(fields).map(([name, field]) => {
      if (Object.keys(field).some(key => !['id','type','rule','options'].includes(key))
        || field.rule && field.rule !== 'repeated'
        || field.options && Object.keys(field.options).some(key => key !== 'packed')) {
        throw Error('Unsupported protocol field: ' + name);
      }
      const result = [name, field.id, field.type.startsWith('.') ? index(field.type) : field.type];
      if (field.rule) result.push(field.options?.packed === false ? 2 : 1);
      return result;
    })]),
    services:Object.fromEntries(Object.entries(methodMap.service).map(([service, methods]) => [service,
      Object.fromEntries(Object.entries(methods).map(([name, pair]) => [name, [index(pair.request), index(pair.response)]]))
    ]))
  };
}

module.exports = {cosmeticProtocol, packProtocol};
