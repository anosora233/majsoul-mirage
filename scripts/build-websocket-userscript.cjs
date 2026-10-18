const fs = require('node:fs');
const path = require('node:path');
const protobuf = require('protobufjs');
const {cosmeticProtocol, packProtocol} = require('./cosmetic-protocol.cjs');
const root = path.resolve(__dirname, '..');
const data = require('../data/cfg-snapshot.json');

// Delta + base36 packs numeric data; application code stays readable.
function pack(values) {
  let previous = 0;
  return values.map(value => {
    const delta = value - previous;
    previous = value;
    return delta.toString(36);
  }).join(',');
}
const lists = object => Object.fromEntries(Object.entries(object).map(([key, values]) => [key, pack(values)]));
const packed = {items:lists(data.items), characters:pack(data.characters.flat()),
  titles:pack(data.titles), skins:pack(data.skins), rewards:pack(data.rewards), emojis:lists(data.emojis)};
const decoder = `// Configuration data only: comma-separated base36 deltas, decoded synchronously.
const packedConfig = ${JSON.stringify(packed, null, 2)};
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
};`;
function source(name) {
  return fs.readFileSync(path.join(root, 'src', name), 'utf8').replace(/\r\n?/g, '\n')
    .replace(/^module\.exports\s*=.*;\s*$/m, '');
}
const config = source('cfg-snapshot.cjs').replace("const configData = require('../data/cfg-snapshot.json');", decoder);
const protocol = cosmeticProtocol(protobuf, require('../data/game-protocol.json'), require('../data/proto-config.json'));
const compactProtocol = packProtocol(protocol.schema, protocol.methodMap);
const version = require('../package.json').version;
const metadata = `// ==UserScript==
// @name         Majsoul WebSocket Cosmetics
// @namespace    majsoul-local-hook
// @version      ${version}
// @description  Local cosmetic customization with a bundled cfg snapshot.
// @match        https://game.maj-soul.com/1/*
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/protobufjs@8.8.1/dist/light/protobuf.min.js
// @sandbox      raw
// @grant        none
// @noframes
// ==/UserScript==`;
const body = [config, source('protocol.cjs'), source('websocket-core.cjs'), source('cosmetic-hook.cjs'),
  'const cfg = installConfigSnapshot(window);',
  `const protocol = unpackProtocol(${JSON.stringify(compactProtocol.definitions)}, ${JSON.stringify(compactProtocol.services)});`,
  `const api = installWebSocketHook(window, window.protobuf, protocol.schema, protocol.methodMap, ${JSON.stringify(version)});`,
  'installCosmeticHook(window, api, cfg);'].join('\n');
const output = path.join(root, 'majsoul-websocket-hook.user.js');
fs.writeFileSync(output, metadata + '\n(function () {\n'
  + body.trim().split('\n').map(line => line ? '  ' + line : '').join('\n') + '\n})();\n');
console.log('Built', output, fs.statSync(output).size, 'bytes');
