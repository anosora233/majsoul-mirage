// ==UserScript==
// @name         Majsoul WebSocket Cosmetics
// @namespace    majsoul-local-hook
// @version      0.4.11
// @description  Local cosmetic customization with a bundled cfg snapshot.
// @match        https://game.maj-soul.com/1/*
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/protobufjs@8.8.1/dist/light/protobuf.min.js
// @sandbox      raw
// @grant        none
// @noframes
// ==/UserScript==
(function () {
  // Only fields used by prod.js. Static snapshot; regenerate when game content changes.
  // Configuration data only: comma-separated base36 deltas, decoded synchronously.
  const packedConfig = {
    "items": {
      "5": "6jc9,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,40,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,22,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4u,1,9,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,19,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,22,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,24,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,29,1,2r,1,1,1,1,1,2n,1,1,1,1,1,1,2m,m8,1,1,2,1,1,1,1,1,1,1,1,1,rf,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,q3,1,1,1,dx,dn,1,1,1,1,1,1,1,1,hz6m2,1,1,1,1,1,1,bki,1,1,1,1,1,1,1,1,1,1,1,1,1,1,7pe,1,1,1,1,1,1,1,1,1,1,1,1,1,1,ff6,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,7oh,1,1,1,1,1,1,1,1,1,1,1,7ph,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,7p8,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,2,7ox,1,7pr,1,1,7pq,1,1,1,1,1,1xfv,1,1,1,1,1,1,1,1,7pk,601s,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1",
      "8": "6l21,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,2y,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,i49ve,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1"
    },
    "characters": "4abl,4aec,-4aeb,4ah3,-4ah2,4aju,-4ajt,4aml,-4amk,4apc,-4apb,4as3,-4as2,4auu,-4aut,4axl,-4axk,4b0c,-4b0b,4b33,-4b32,4b5u,-4b5t,4b8l,-4b8k,4bbc,-4bbb,4be3,-4be2,4bgu,-4bgt,4bjl,-4bjk,4bmc,-4bmb,4bp3,-4bp2,4bru,-4brt,4bul,-4buk,4bxc,-4bxb,4c03,-4c02,4c2u,-4c2t,4c5l,-4c5k,4c8c,-4c8b,4cb3,-4cb2,4cdu,-4cdt,4cgl,-4cgk,4cjc,-4cjb,4cm3,-4cm2,4cou,-4cot,4crl,-4crk,4cuc,-4cub,4cx3,-4cx2,4czu,-4czt,4d2l,-4d2k,4d5c,-4d5b,4d83,-4d82,4dau,-4dat,4ddl,-4ddk,4dgc,-4dgb,4dj3,-4dj2,4dlu,-4dlt,4dol,-4dok,4drc,-4drb,4du3,-4du2,4dwu,-4dwt,4dzl,-4dzk,4e2c,-4e2b,4e53,-4e52,4e7u,-4e7t,4eal,-4eak,4edc,-4edb,4eg3,-4eg2,4eiu,-4eit,4ell,-4elk,4eoc,-4eob,4er3,-4er2,4etu,-4ett,4ewl,-4ewk,4ezc,-4ezb,4f23,-4f22,4f4u,-4f4t,4f7l,-4f7k,4fac,-4fab,4fd3,-4fd2,4ffu,-4fft,4fil,-4fik,4flc,-4flb,4fo3,-4fo2,4fqu,-4fqt,4ftl,-4ftk,4fwc,-4fwb,4fz3,-4fz2,4g1u,-4g1t,4g4l,-4g4k,4g7c,-4g7b,4ga3,-4ga2,4gcu,-4gct,4gfl,-4gfk,4gic,-4gib,4gl3,-4gl2,4gnu,-4gnt,4gql,-4gqk,4gtc,-4gtb,4gw3,-4gw2,4gyu,-4gyt,4h1l,-4h1k,4h4c,-4h4b,4h73,-4h72,4h9u,-4h9t,4hcl,-4hck,4hfc,-4hfb,4hi3,-4hi2,4hku,-4hkt,4hnl,-4hnk,4hqc,-4hqb,4ht3,-4ht2,4hvu,bnvw7,bwvql,-bwvqk,bwvtc,-bwvtb,bwvw3,-bwvw2,bwvyu,-bwvyr,bww73,-bww72,bww9u,-bww9t,bwwcl,-bwwck,bwwfc,-bwwfb,bwwi3,-bwwi2,bwwku,-bwwkt,bwwnl,-bwwnk,bwwqc,-bwwqb,bwwt3,-bwwt2,bwwvu,-bwwvt,bwwyl,-bwwyk,bwx1c,-bwx1b,bwx43,-bwx42,bwx6u,-bwx6t,bwx9l,-bwx9k,bwxcc,-bwxcb,bwxf3,-bwxf2,bwxhu,-bwxht,bwxkl,-bwxkk,bwxnc,-bwxnb,bwxq3",
    "titles": "cuyp,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,8,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1",
    "skins": "8kn4,1,2s,1,1,1,1,1,1,2m,1,1,3,1,1,2l,1,1,1,1,1,1,2m,1,1,1,1,1,1,2m,1,1,1,1,1,1,1,1,2k,1,1,1,1,1,2n,1,1,1,1,1,1,1,1,2k,1,1,1,1,1,1,2m,1,1,1,1,1,1,1,2l,1,1,1,2p,1,1,1,1,2o,1,1,1,1,2o,1,1,1,1,1,2n,1,1,1,1,1,2n,1,1,2q,1,1,1,1,1,1,2m,1,4,1,1,1,1,2j,1,1,1,1,1,2n,1,1,1,1,1,1,2m,1,1,1,1,1,2n,1,1,1,1,1,1,2m,1,1,2q,1,1,1,2p,1,1,1,1,1,1,2m,1,1,1,1,2o,1,1,1,1,1,1,2m,1,1,1,1,2o,1,1,1,1,1,2n,1,1,1,1,1,1,2m,1,1,1,2p,1,1,1,1,2o,1,1,1,1,1,1,2m,1,1,1,1,2o,1,1,1,2p,1,1,1,2p,1,1,1,2p,1,1,1,2p,1,1,1,1,1,1,2m,1,1,1,1,2o,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,1,1,1,2n,1,1,1,1,2o,1,1,1,2p,1,1,1,1,2o,1,1,1,1,1,2n,1,1,1,1,2o,1,1,1,2p,1,1,1,2p,1,2r,1,1,1,2p,1,1,1,1,2o,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,1,1,1,2n,1,1,1,2p,1,2r,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,1,1,1,2n,1,1,1,2p,1,1,1,1,2o,1,1,1,2p,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,1,2p,1,1,1,2p,1,2r,1,1,2q,1,2r,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,1,2p,1,1,1,2p,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,1,2p,1,1,2q,1,2r,1,2r,1,1,2q,1,1,2q,1,1,nkrmq,1,1,2q,1,1,2q,1,1,2q,1,1,8a,1,1,2q,1,1,1,2p,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,2r,1,2r,1,2r,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1,1,2q,1",
    "rewards": "6fih,1,9,1,9,1,2557,1,9,1,1,8,1,2557,1,9,1,1,8,1,1,2556,1,9,1,1,8,1,1,254c,1,9,1,9,1,1,2560,1,1,8,1,1,8,1,1,254c,1,1,8,1,9,1,2561,1,1,8,1,9,1,254d,1,9,1,1,8,1,4abt,1,1,8,1,9,1,2557,1,9,1,1,8,1,4aaz,1,9,1,9,1,1,2556,1,9,1,1,8,1,2557,1,9,1,1,8,1,2557,1,9,1,9,1,1,2556,1,9,1,9,1,2557,1,9,1,9,1,1,2556,1,9,1,9,1,6fgr,1,1,8,1,9,1,1,14q16,1,9,1,9,1,2z60b,1,9,1,9,1,ppvx,1,9,1,9,1,5lh3d,1,9,1,1,8,1",
    "emojis": {
      "200001": "a,1,1,1,1,1,1,1,1,o6,31,-1,-c,-1,-h,-t",
      "200002": "a,1,1,1,1,1,1,1,1,o6,32,-3,-17,-4",
      "200003": "a,1,1,1,1,1,1,1,1,o6,33,-k,-k,-g,-g",
      "200004": "a,1,1,1,1,1,1,1,1,o6,33,-5,-8,-t,-e",
      "200005": "a,1,1,1,1,1,1,1,1,o6,31,-8,-l,-g,-5,-f",
      "200006": "a,1,1,1,1,1,1,1,1,o6,31,-k,-g,-c",
      "200007": "d,-3,1,1,2,1,1,1,1,o6,33,-6,-h,-6,-9,-e,-c",
      "200008": "d,-3,1,1,2,1,1,1,1,o6,31,-6,-j,-m,-d",
      "200009": "a,1,1,2,1,1,1,1,o6,32,-4,-s,-j,-a,-8",
      "200010": "a,1,1,2,1,1,1,1,o6,2m,-h",
      "200011": "a,1,1,2,1,1,1,1,o6,32,-l,-7",
      "200012": "a,1,1,2,1,1,1,1,o6,32,-13,-f",
      "200013": "a,1,1,2,1,1,1,1,o6,33,-b,-m,-k",
      "200014": "a,1,1,2,1,1,1,1,o6,2x,-b,-d,-s",
      "200015": "a,1,1,2,1,1,1,1,o6,2y",
      "200016": "a,1,1,2,1,1,1,1,o6,30,-8,-i,-9,-i",
      "200017": "a,1,1,2,1,1,1,1,o6,2z,-d,-k,-i",
      "200018": "a,1,1,2,1,1,1,1,o6,2y,-w,-i,-h",
      "200019": "a,1,1,2,1,1,1,1,o6,2q,-5,-9,-n,-b",
      "200020": "a,1,1,2,oa,2y,-6,-l,-i",
      "200021": "a,1,1,2,oa,2p,-4,-r,-f,-f",
      "200022": "a,1,1,2,oa,2v",
      "200023": "a,1,1,2,oa,2l,-q",
      "200024": "a,1,1,2,oa,2w,-g,-g,-a,-9",
      "200025": "a,1,1,2,oa,2m,-p,-p",
      "200026": "a,1,1,2,oa,2t,-g,-t,-8",
      "200027": "a,1,1,2,oa,2s,-k,-g",
      "200028": "a,1,1,2,oa,2v,-k,-j,-f",
      "200029": "a,1,1,2,oa,2w,-g,-c,-m,-9",
      "200030": "a,1,1,2,oa,2j,-o",
      "200031": "a,1,1,2,oa,2i,-j,-y",
      "200032": "a,1,1,2,oa,2p,-9,-j,-7,-i",
      "200033": "a,1,1,2,oa,29,-l,-j",
      "200034": "a,1,1,2,r4,-l",
      "200035": "a,1,1,2,r4,-l",
      "200036": "a,1,1,2,r4,-l",
      "200037": "a,1,1,2,r4,-l",
      "200038": "a,1,1,2,oa,2e,-7,-8,-c,-h",
      "200039": "a,1,1,2,oa,2a,-9,-t",
      "200040": "a,1,1,2,r1",
      "200041": "a,1,1,2,r1",
      "200042": "a,1,1,2,r1",
      "200043": "a,1,1,2,r1",
      "200044": "a,1,1,2,oa,2i,-i,-g,-j",
      "200045": "a,1,1,2,oa,2l,-8,-r",
      "200046": "a,1,1,2,oa,27,-g",
      "200047": "a,1,1,2,oa,27,-a,-x",
      "200048": "a,1,1,2,oa,2b,-6,-j,-e",
      "200049": "a,1,1,2,oa,24,-a,-l",
      "200050": "a,1,1,2,qu,-1i",
      "200051": "a,1,1,2,qu,-1i",
      "200052": "a,1,1,2,oa",
      "200053": "a,1,1,2,oa,1y,-m",
      "200054": "a,1,1,2,oa,2e,-l,-f",
      "200055": "a,1,1,2,qp",
      "200056": "a,1,1,2,qp",
      "200057": "a,1,1,2,qp",
      "200058": "a,1,1,2,qp",
      "200059": "a,1,1,2,oa,20,-5,-7,-9",
      "200060": "a,1,1,2,oa,1y,-f",
      "200061": "a,1,1,2,oa",
      "200062": "a,1,1,2,qj",
      "200063": "a,1,1,2,qj",
      "200064": "a,1,1,2,qj",
      "200065": "a,1,1,2,qj",
      "200066": "a,1,1,2,oa,22,-7,-4,-o",
      "200067": "a,1,1,2,oa,1u,-i",
      "200068": "a,1,1,2,oa,1v,-b",
      "200069": "a,1,1,2,oa,1t,-e",
      "200070": "a,1,1,2,qd",
      "200071": "a,1,1,2,qd",
      "200072": "a,1,1,2,qd",
      "200073": "a,1,1,2,qd",
      "200074": "a,1,1,2,oa,1m,-d",
      "200075": "a,1,1,2,oa,1o,-d",
      "200076": "a,1,1,2,oa",
      "200077": "a,1,1,2,oa,1t",
      "200078": "a,1,1,2,oa",
      "200079": "a,1,1,2,q6",
      "200080": "a,1,1,2,q6",
      "200081": "a,1,1,2,q6",
      "200082": "a,1,1,2,q6",
      "200083": "a,1,1,2,oa,1e,-8",
      "200084": "a,1,1,2,oa,1r,-j",
      "200085": "a,1,1,2,oa,1b",
      "200086": "a,1,1,2,q2",
      "200087": "a,1,1,2,q2",
      "200088": "a,1,1,2,q2",
      "200089": "a,1,1,2,q2",
      "200090": "a,1,1,2,oa,1c",
      "200091": "a,1,1,2,oa,19",
      "200092": "a,1,1,2,oa,16",
      "200093": "a,1,1,2,oa,1i,-i",
      "200094": "a,1,1,2,oa,1h",
      "200095": "a,1,1,2,oa",
      "200096": "a,1,1,2,oa",
      "200097": "a,1,1,2,oa,17",
      "200098": "a,1,1,2,oa,17",
      "200099": "a,1,1,2,oa,17",
      "20000100": "a,1,1,2,pv",
      "20000101": "a,1,1,2,pv",
      "20000102": "a,1,1,2,pv",
      "20000103": "a,1,1,2,pv",
      "20000106": "a,1,1,2,oa,13",
      "20000107": "a,1,1,2,oa,1b,-b",
      "20000108": "a,1,1,2,pq",
      "20000109": "a,1,1,2,pq",
      "20000110": "a,1,1,2,pq",
      "20000111": "a,1,1,2,pq",
      "20000112": "a,1,1,2,oa,1c",
      "20000113": "a,1,1,2,pk",
      "20000114": "a,1,1,2,pk",
      "20000115": "a,1,1,2,pk",
      "20000116": "a,1,1,2,pk",
      "20000117": "a,1,1,oc,11",
      "20000118": "a,1,1,oc",
      "20000119": "a,1,1,oc",
      "20000120": "a,1,1,oc",
      "20000121": "a,1,1,pc",
      "20000122": "a,1,1,pg",
      "20000123": "a,1,1,pg",
      "20000124": "a,1,1,pg",
      "20000125": "a,1,1,pg"
    }
  };
  function unpackConfigList(text) {
    let value = 0;
    return text ? text.split(',').map(delta => value += parseInt(delta, 36)) : [];
  }
  const unpackConfigLists = object => Object.fromEntries(Object.entries(object)
    .map(([key, text]) => [key, unpackConfigList(text)]));
  const characterValues = unpackConfigList(packedConfig.characters);
  const configData = {
    items: unpackConfigLists(packedConfig.items),
    characters: Array.from({length: characterValues.length / 2}, (_, i) => characterValues.slice(i * 2, i * 2 + 2)),
    titles: unpackConfigList(packedConfig.titles),
    skins: unpackConfigList(packedConfig.skins),
    rewards: unpackConfigList(packedConfig.rewards),
    emojis: unpackConfigLists(packedConfig.emojis)
  };

  function installConfigSnapshot(scope) {
    function table(rows) {
      return {rows_: rows, map_: Object.fromEntries(rows.map(row => [row.id, row]))};
    }
    function ids(values) {
      return table(values.map(id => ({id})));
    }
    const snapshot = {
      item_definition: {
        item: table(Object.entries(configData.items)
          .flatMap(([category, values]) => values.map(id => ({id, category: Number(category)})))
          .sort((a, b) => a.id - b.id)),
        character: table(configData.characters.map(([id, init_skin]) => ({id, init_skin}))),
        title: ids(configData.titles),
        skin: ids(configData.skins)
      },
      character: {
        emoji: {groups_: Object.fromEntries(Object.entries(configData.emojis)
          .map(([charid, values]) => [charid, values.map(sub_id => ({charid: Number(charid), sub_id}))]))}
      },
      spot: {rewards: ids(configData.rewards)}
    };
    const cfg = scope.cfg ??= {};
    for (const [group, sheets] of Object.entries(snapshot)) {
      cfg[group] ??= {};
      for (const [name, sheet] of Object.entries(sheets)) cfg[group][name] ??= sheet;
    }
    return cfg;
  }

  // Fields are [name, id, scalar type or message index, repeated packing: 1=true, 2=false].
  function unpackProtocol(definitions, services) {
    const schema = {nested:{lq:{nested:{}}}}, methodMap = {service:{}};
    for (const [name, fields] of definitions) {
      const parts = name.split('.');
      let namespace = schema.nested.lq;
      for (const part of parts.slice(0, -1)) namespace = (namespace.nested ||= {})[part] ||= {};
      const message = (namespace.nested ||= {})[parts.at(-1)] ||= {};
      if (parts.length === 1) message.edition = 'proto2';
      message.fields = Object.fromEntries(fields.map(([name, id, type, repeated]) => [name, {
        id, type:typeof type === 'number' ? '.lq.' + definitions[type][0] : type,
        ...(repeated ? {rule:'repeated', options:{packed:repeated === 1}} : {})
      }]));
    }
    for (const [service, methods] of Object.entries(services)) {
      methodMap.service[service] = Object.fromEntries(Object.entries(methods)
        .map(([name, [request, response]]) => [name, {
          request:definitions[request][0], response:definitions[response][0]
        }]));
    }
    return {schema, methodMap};
  }

  /* Business-object hooks over the browser's native WebSocket events.
   * The client-supplied schema and method map are injected by the build entry.
   * protobuf.js handles encoding, 64-bit values and unknown-field preservation.
   */
  function installWebSocketHook(scope, protobuf, schema, methodMap, version) {
    if (scope.majsoulWS) return scope.majsoulWS;
    const NativeSocket = scope.WebSocket;
    if (typeof NativeSocket !== 'function') throw new Error('Native WebSocket unavailable');
    const root = schema.lookupType ? schema : protobuf.Root.fromJSON(schema).resolveAll();
    const wrapperType = root.lookupType('lq.Wrapper');
    const sockets = new Map();
    const MAX_PENDING = 4096, TIMEOUT = 120000, MAX_FRAME = 16 * 1024 * 1024;
    const api = {
      version, active: true, readOnly: false, log: true, debug: false,
      onRequest: null, onResponse: null, onNotify: null,
      stats: { sockets: 0, requests: 0, responses: 0, notifications: 0,
        modified: 0, blocked: 0, synthetic: 0, localNotifications: 0, unsupported: 0, errors: 0 },
      lookupType(name) { return root.lookupType(name.startsWith('.') ? name : 'lq.' + name); },
      connections() { return Array.from(sockets.values(), s => ({id:s.id, recognized:s.recognized, pending:s.pending.size})); },
      uninstall() {
        api.active = false;
        if (scope.WebSocket === WrappedSocket) scope.WebSocket = NativeSocket;
        for (const state of Array.from(sockets.values())) cleanup(state);
        if (scope.majsoulWS === api) delete scope.majsoulWS;
      }
    };
    const typeCache = new Map();
    function getTypes(service, method) {
      const key = service + '.' + method;
      if (typeCache.has(key)) return typeCache.get(key);
      const mapping = methodMap.service[service]?.[method];
      let pair = null;
      if (mapping) {
        try { pair = {request:api.lookupType(mapping.request),response:api.lookupType(mapping.response)}; } catch { /* Client map includes unavailable debug types. */ }
      }
      typeCache.set(key,pair); return pair;
    }
    function bytes(data) {
      if (Object.prototype.toString.call(data)==='[object ArrayBuffer]') return new Uint8Array(data);
      if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
      return null; // The inspected Unity bridge uses ArrayBuffer/typed-array messages.
    }
    function decode(type, data) {
      const reader = protobuf.Reader.create(data);
      reader.discardUnknown = false;
      return type.decode(reader);
    }
    function encode(type, message) {
      const error = type.verify(message);
      if (error) throw new Error('Invalid ' + type.fullName + ': ' + error);
      return type.encode(message).finish();
    }
    function packet(kind, id, wrapper) {
      const body = wrapperType.encode(wrapper).finish();
      const header = kind === 1 ? 1 : 3, result = new Uint8Array(header + body.length);
      result[0] = kind;
      if (header === 3) new DataView(result.buffer).setUint16(1,id,true);
      result.set(body,header);return result;
    }
    function parse(data) {
      const b = bytes(data);
      if (!b || b.length < 1 || b.length > MAX_FRAME || ![1,2,3].includes(b[0])) return null;
      const kind = b[0], header = kind === 1 ? 1 : 3;
      if (b.length < header) return null;
      return {kind,id:header===3?new DataView(b.buffer,b.byteOffset,b.byteLength).getUint16(1,true):null,
        wrapper:decode(wrapperType,b.subarray(header))};
    }
    function metadata(state, direction, service, method, id) {
      return {connection:state.id,direction,service,method,id,action:'pass'};
    }
    function capture(record, type, payload, phase = 'before', message) {
      const name = '.lq.'+(record.service ? record.service+'.'+record.method : record.method);
      if (api.debug !== true && !(typeof api.debug === 'string' && api.debug && name.includes(api.debug))) return;
      const snapshot = {bytes:Uint8Array.from(payload)};
      if (type) {
        try { snapshot.message = type.toObject(message ?? decode(type,payload),{longs:String,bytes:String,enums:String}); }
        catch (exception) { snapshot.error = exception.name; }
      }
      (record.content ||= {})[phase] = snapshot;
    }
    function dump(record) {
      if (record.content) scope.console.info(format(record)+' — content',record.content);
    }
    function format(record, detail = '') {
      const name = record.service ? record.service+'.'+record.method : record.method || '<unknown>';
      const id = record.id == null ? '' : ' #'+record.id;
      return '[MajsoulWS] '+record.action+' '+record.direction+' '+name
        +' [ws:'+record.connection+id+']'+(detail ? ' — '+detail : '');
    }
    function report(record, action, detail = '') {
      record.action = action;
      if (api.log && (action !== 'pass' || api.log === 'all')) scope.console.info(format(record, detail));
      dump(record);
    }
    function error(state, stage, exception, record) {
      api.stats.errors++;
      // Exception text stays private; explicitly enabled debugging prints captured message snapshots.
      record ||= {connection:state.id,direction:'frame',method:null,id:null};
      record.action = 'error';
      const detail = stage+' ('+(exception.name || 'Error')+'); original retained';
      scope.console.warn(format(record, detail));
      dump(record);
    }
    function expire(state) {
      const now=Date.now();
      for(const [id,entry] of state.pending)if(now-entry.created>TIMEOUT)state.pending.delete(id);
      while(state.pending.size>=MAX_PENDING)state.pending.delete(state.pending.keys().next().value);
    }
    function call(handler, context) {
      if (typeof handler !== 'function') return undefined;
      const action=handler(context);
      if (action && typeof action.then==='function') throw new TypeError('WebSocket business hooks must be synchronous');
      return action;
    }
    function outgoing(state,data) {
      const parsed=parse(data);
      if (!parsed || parsed.kind!==2) return {data};
      const match=/^\.lq\.([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)$/.exec(parsed.wrapper.name);
      if(!match)return{data};
      state.recognized=true;expire(state);
      const service=match[1],method=match[2],types=getTypes(service,method);
      const pending={service,method,types,created:Date.now()};
      api.stats.requests++;
      const record=metadata(state,'request',service,method,parsed.id);
      const result={data,pending,id:parsed.id,record};
      if(!types){api.stats.unsupported++;capture(record,null,parsed.wrapper.data);return result;}
      let message;
      try { message=decode(types.request,parsed.wrapper.data); }
      catch(exception){capture(record,types.request,parsed.wrapper.data);error(state,'request decode',exception,record);return result;}
      capture(record,types.request,parsed.wrapper.data,'before',message);
      if(api.readOnly)return result;
      const context={socket:state.socket,connection:state.id,service,method,id:parsed.id,message};
      let action;
      try { action=call(api.onRequest,context); } catch(exception){error(state,'request hook',exception,record);return result;}
      try {
        if(action&&Object.prototype.hasOwnProperty.call(action,'respond')){
          if(!action.respond||typeof action.respond!=='object'||Array.isArray(action.respond))throw new TypeError('Local response must be an object');
          const response=types.response.fromObject(action.respond);
          const wrapper=wrapperType.create({name:'',data:encode(types.response,response)});
          capture(record,types.response,wrapper.data,'response',response);
          const notifications=(Array.isArray(action.notify) ? action.notify : action.notify ? [action.notify] : []).map(notice=>{
            const type=api.lookupType(notice.name);
            const payload=encode(type,type.fromObject(notice.message || {}));
            return{type,payload,data:packet(1,null,wrapperType.create({name:type.fullName,data:payload}))};
          });
          return{synthetic:packet(3,parsed.id,wrapper),notifications,record};
        }
        if(action===true){
          parsed.wrapper.data=encode(types.request,message);
          capture(record,types.request,parsed.wrapper.data,'after',message);
          return{data:packet(2,parsed.id,parsed.wrapper),pending,id:parsed.id,modified:true,record};
        }
      } catch(exception) { error(state,'request hook encode',exception,record); }
      return result;
    }
    function incoming(state,event) {
      if(!state.active||!api.active||state.syntheticEvents.has(event))return;
      let parsed;
      try{parsed=parse(event.data);}catch(exception){if(state.recognized)error(state,'frame decode',exception);return;}
      if(!parsed)return;
      expire(state);
      let type,context,handler,record;
      if(parsed.kind===3){
        const entry=state.pending.get(parsed.id);if(!entry)return;
        state.pending.delete(parsed.id);api.stats.responses++;
        record=metadata(state,'response',entry.service,entry.method,parsed.id);
        if(!entry.types){api.stats.unsupported++;capture(record,null,parsed.wrapper.data);report(record,'pass');return;}
        type=entry.types.response;handler=api.onResponse;
        context={socket:state.socket,connection:state.id,service:entry.service,method:entry.method,id:parsed.id};
      }else if(parsed.kind===1){
        if(!/^\.lq\.[A-Za-z_][\w.]*$/.test(parsed.wrapper.name))return;
        const name=parsed.wrapper.name.slice(4);
        record=metadata(state,'notify',null,name,null);
        try{type=root.lookupType('lq.'+name);}catch{
          api.stats.unsupported++;capture(record,null,parsed.wrapper.data);report(record,'pass');return;
        }
        state.recognized=true;api.stats.notifications++;
        handler=api.onNotify;
        context={socket:state.socket,connection:state.id,name};
      }else return;
      try{
        context.message=decode(type,parsed.wrapper.data);
        capture(record,type,parsed.wrapper.data,'before',context.message);
        if(api.readOnly || call(handler,context)!==true){report(record,'pass');return;}
        parsed.wrapper.data=encode(type,context.message);
        capture(record,type,parsed.wrapper.data,'after',context.message);
        const result=packet(parsed.kind,parsed.id,parsed.wrapper);
        // Shadow the native event's data getter: retain target, ordering, isTrusted and listeners.
        Object.defineProperty(event,'data',{configurable:true,value:result.buffer});
        api.stats.modified++;
        report(record,'modified');
      }catch(exception){if(!context.message)capture(record,type,parsed.wrapper.data);error(state,'incoming hook',exception,record);}
    }
    function cleanup(state){
      state.active=false;state.pending.clear();
      state.socket.removeEventListener('message',state.receive,{capture:true});
      state.socket.removeEventListener('close',state.close);
      if(state.socket.send===state.send){
        if(state.sendDescriptor)Object.defineProperty(state.socket,'send',state.sendDescriptor);
        else delete state.socket.send;
      }
      sockets.delete(state.socket);
    }
    function attach(socket){
      const nativeSend=socket.send;
      const state={socket,id:++api.stats.sockets,active:true,recognized:false,pending:new Map(),syntheticEvents:new WeakSet(),sendDescriptor:Object.getOwnPropertyDescriptor(socket,'send')};
      state.receive=event=>incoming(state,event);
      state.close=()=>cleanup(state);
      socket.addEventListener('message',state.receive,true);
      socket.addEventListener('close',state.close);
      state.send=function(data){
        if(this!==socket||!state.active||!api.active||socket.readyState!==NativeSocket.OPEN)return Reflect.apply(nativeSend,this,arguments);
        let result;
        try{result=outgoing(state,data);}catch(exception){error(state,'request decode/encode',exception);return Reflect.apply(nativeSend,this,arguments);}
        if(result.synthetic){
          if(socket.readyState!==NativeSocket.OPEN)return Reflect.apply(nativeSend,this,arguments);
          api.stats.blocked++;api.stats.synthetic++;
          report(result.record,'blocked',result.notifications.length ? 'local response + notifications queued' : 'local response queued');
          // Unity records its waiting callback after send() returns; defer the local response.
          scope.queueMicrotask(()=>{
            for (const item of [{data:result.synthetic},...result.notifications]) {
              if (!state.active || !api.active || socket.readyState!==NativeSocket.OPEN) break;
              const event=new scope.MessageEvent('message',{data:item.data.buffer,origin:new URL(socket.url).origin});
              state.syntheticEvents.add(event);socket.dispatchEvent(event);
              if (item.type) {
                api.stats.localNotifications++;
                const record=metadata(state,'notify',null,item.type.fullName.slice(4),null);
                capture(record,item.type,item.payload);
                report(record,'local','synthetic notification');
              }
            }
          });
          return;
        }
        const returned=Reflect.apply(nativeSend,this,result.modified?[result.data]:arguments);
        if(result.pending)state.pending.set(result.id,result.pending);
        if(result.modified)api.stats.modified++;
        if(result.record && result.record.action!=='error')report(result.record,result.modified?'modified':'pass');
        return returned;
      };
      socket.send=state.send;sockets.set(socket,state);
    }
    const WrappedSocket=new Proxy(NativeSocket,{construct(target,args,newTarget){const socket=Reflect.construct(target,args,newTarget);attach(socket);return socket;}});
    scope.majsoulWS=api;scope.WebSocket=WrappedSocket;
    scope.console.info('[MajsoulWS] hook.ready',api.version);
    return api;
  }

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
    const games = new WeakMap();
    let roomUpdate = null, roomSeq = 0;
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
    function nextRoomSeq(message) { message.seq = roomSeq = Math.max(message.seq || 0, roomSeq + 1); }
    function clearRoom() { roomUpdate = null; roomSeq = 0; }
    function updateRoom(message) {
      const changed = override(message?.player_list);
      roomUpdate = message?.player_list?.some(player => player.account_id === get('account', null)) ? message : null;
      if (!roomUpdate) roomSeq = 0;
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
    api.onRequest = ({socket, service, method, message}) => {
      if (service === 'Lobby' && Object.hasOwn(localRequests, method)) {
        const response = localRequests[method](message);
        if (method === 'changeCharacterSkin') {
          const notify = [{name:'NotifyAccountUpdate',
            message:{update:{character:{characters:[character(message.character_id)]}}}}];
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
        games.set(socket, {account:message.account_id || get('account', 0), seat:-1});
      }
      if (service === 'FastTest' && method === 'broadcastInGame') {
        let content;
        try { content = JSON.parse(message.content); } catch { return; }
        if (!Number.isInteger(content?.emo_id)) return;
        const seat = games.get(socket)?.seat ?? -1;
        if (seat < 0) {
          scope.console.warn('[MajsoulWS] emoji.skipped — seat unavailable');
          return {respond:{}};
        }
        return {respond:{}, notify:{name:'NotifyGameBroadcast', message:{seat, content:message.content}}};
      }
    };
    api.onResponse = ({socket, service, method, message}) => {
      if (message.error?.code) return;
      if (service === 'FastTest') {
        if (method !== 'authGame') return;
        const account = games.get(socket)?.account || get('account', 0);
        games.set(socket, {account, seat:account ? message.seat_list.indexOf(account) : -1});
        return override(message.players);
      }
      if (service !== 'Lobby') return;
      switch (method) {
        case 'login': case 'emailLogin': case 'oauth2Login':
          if (message.account_id) {
            if (message.account_id !== get('account', null)) clearRoom();
            set('account', message.account_id);
          }
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
        case 'joinRoom': case 'fetchRoom': case 'createRoom': {
          const room = message.room;
          if (!room) { clearRoom(); return; }
          if (method !== 'fetchRoom' || !roomUpdate) roomSeq = room.seq || 0;
          room.seq = roomSeq = Math.max(room.seq || 0, roomSeq);
          return updateRoom(api.lookupType('NotifyRoomPlayerUpdate').fromObject({player_list:room.persons,
            owner_id:room.owner_id, robot_count:room.robot_count, seq:room.seq, robots:room.robots, positions:room.positions}));
        }
        case 'leaveRoom': clearRoom(); return;
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
    scope.console.info('[MajsoulWS] cosmetics.ready');
  }

  const cfg = installConfigSnapshot(window);
  const protocol = unpackProtocol([["Wrapper",[["name",1,"string"],["data",2,"bytes"]]],["ReqLogin",[]],["ResLogin",[["error",1,3],["account_id",2,"uint32"],["account",3,4]]],["Error",[["code",1,"uint32"],["u32_params",2,"uint32",1],["str_params",3,"string",2],["json_param",4,"string"],["level",5,"uint32"],["message",6,"string"]]],["Account",[["account_id",1,"uint32"],["title",7,"uint32"],["avatar_id",13,"uint32"],["avatar_frame",23,"uint32"],["loading_image",30,"uint32",1]]],["ReqEmailLogin",[]],["ReqOauth2Login",[]],["ReqCommon",[]],["ResFetchInfo",[["error",1,3],["title_list",10,9],["bag_info",11,10],["character_info",27,13],["all_common_views",28,16]]],["ResTitleList",[["error",1,3],["title_list",2,"uint32",1]]],["ResBagInfo",[["error",1,3],["bag",2,11]]],["Bag",[["items",1,12,1]]],["Item",[["item_id",1,"uint32"],["stack",2,"uint32"]]],["ResCharacterInfo",[["error",1,3],["characters",2,14,1],["skins",3,"uint32",1],["main_character_id",4,"uint32"],["send_gift_count",5,"uint32"],["send_gift_limit",6,"uint32"],["finished_endings",7,"uint32",1],["rewarded_endings",8,"uint32",1],["character_sort",9,"uint32",1],["hidden_characters",10,"uint32",1],["other_character_sort",11,"uint32",1]]],["Character",[["charid",1,"uint32"],["level",2,"uint32"],["exp",3,"uint32"],["views",4,15,1],["skin",5,"uint32"],["is_upgraded",6,"bool"],["extra_emoji",7,"uint32",1],["rewarded_level",8,"uint32",1],["enabled_emoji",9,"uint32",1]]],["ViewSlot",[["slot",1,"uint32"],["item_id",2,"uint32"],["type",3,"uint32"],["item_id_list",4,"uint32",1]]],["ResAllcommonViews",[["views",1,17,1],["use",2,"uint32"],["error",3,3]]],["ResAllcommonViews.Views",[["values",1,15,1],["index",2,"uint32"],["name",3,"string"]]],["ReqJoinRoom",[]],["ResJoinRoom",[["error",1,3],["room",2,20]]],["Room",[["owner_id",2,"uint32"],["persons",5,21,1],["robot_count",9,"uint32"],["seq",11,"uint32"],["robots",13,21,1],["positions",14,"uint32",1]]],["PlayerGameView",[["account_id",1,"uint32"],["avatar_id",2,"uint32"],["title",3,"uint32"],["character",6,14],["avatar_frame",8,"uint32"],["views",10,15,1]]],["ResSelfRoom",[["error",1,3],["room",2,20]]],["ReqCreateRoom",[]],["ResCreateRoom",[["error",1,3],["room",2,20]]],["ReqGameRecord",[]],["ResGameRecord",[["error",1,3],["head",3,27]]],["RecordGame",[["accounts",11,28,1]]],["RecordGame.AccountInfo",[["account_id",1,"uint32"],["avatar_id",4,"uint32"],["character",5,14],["title",6,"uint32"],["avatar_frame",9,"uint32"],["views",11,15,1]]],["ReqAccountInfo",[]],["ResAccountInfo",[["error",1,3],["account",2,4]]],["ReqUseTitle",[["title",1,"uint32"]]],["ResCommon",[["error",1,3]]],["ReqSetLoadingImage",[["images",1,"uint32",1]]],["ReqChangeMainCharacter",[["character_id",1,"uint32"]]],["ReqChangeCharacterSkin",[["character_id",1,"uint32"],["skin",2,"uint32"]]],["ReqUpdateCharacterSort",[["sort",1,"uint32",1],["other_sort",2,"uint32",1],["hidden_characters",3,"uint32",1]]],["ReqSetHiddenCharacter",[["chara_list",1,"uint32",1]]],["ResSetHiddenCharacter",[["error",1,3],["hidden_characters",2,"uint32",1]]],["ReqUseCommonView",[["index",3,"uint32"]]],["ReqSaveCommonViews",[["views",1,15,1],["save_index",2,"uint32"],["is_use",3,"uint32"],["name",4,"string"]]],["ReqFinishedEnding",[]],["ReqAuthGame",[["account_id",1,"uint32"]]],["ResAuthGame",[["error",1,3],["players",2,21,1],["seat_list",3,"uint32",1]]],["ReqBroadcastInGame",[["content",1,"string"],["except_self",2,"bool"]]],["NotifyAccountUpdate",[["update",1,46]]],["AccountUpdate",[["character",2,47],["main_character",18,48]]],["AccountUpdate.CharacterUpdate",[["characters",2,14,1]]],["AccountUpdate.MainCharacterUpdate",[]],["NotifyRoomPlayerUpdate",[["owner_id",3,"uint32"],["robot_count",4,"uint32"],["player_list",5,21,1],["seq",6,"uint32"],["robots",7,21,1],["positions",8,"uint32",1]]],["NotifyRoomPlayerReady",[["seq",4,"uint32"]]],["NotifyRoomPlayerDressing",[["seq",4,"uint32"]]],["NotifyRoomKickOut",[]],["NotifyGameFinishRewardV2",[["main_character",4,54]]],["NotifyGameFinishRewardV2.MainCharacter",[["level",1,"uint32"],["exp",2,"uint32"],["add",3,"uint32"]]],["NotifyGameBroadcast",[["seat",1,"uint32"],["content",2,"string"]]]], {"Lobby":{"login":[1,2],"emailLogin":[5,2],"oauth2Login":[6,2],"fetchInfo":[7,8],"joinRoom":[18,19],"fetchRoom":[7,22],"createRoom":[23,24],"fetchGameRecord":[25,26],"fetchAccountInfo":[29,30],"useTitle":[31,32],"setLoadingImage":[33,32],"changeMainCharacter":[34,32],"changeCharacterSkin":[35,32],"updateCharacterSort":[36,32],"setHiddenCharacter":[37,38],"useCommonView":[39,32],"saveCommonViews":[40,32],"addFinishedEnding":[41,32],"leaveRoom":[7,32]},"FastTest":{"authGame":[42,43],"broadcastInGame":[44,32]}});
  const api = installWebSocketHook(window, window.protobuf, protocol.schema, protocol.methodMap, "0.4.11");
  installCosmeticHook(window, api, cfg);
})();
