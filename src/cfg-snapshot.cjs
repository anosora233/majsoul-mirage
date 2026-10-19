// Only fields required by local cosmetic overrides. Static snapshot; regenerate when game content changes.
const configData = require('../data/cfg-snapshot.json');

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
module.exports = {installConfigSnapshot};
