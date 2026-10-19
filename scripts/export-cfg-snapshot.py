"""Build-time only: project the configuration fields required by local cosmetic overrides."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.cache/python-libs'))
import UnityPy
from lupa.lua51 import LuaRuntime

UnityPy.config.FALLBACK_UNITY_VERSION = '2022.3.62f2'
manifest_path = ROOT / 'data/cfg-resources.json'
manifest = json.loads(manifest_path.read_text(encoding='utf8'))
assets = {asset.lower() for asset in manifest['assets']}
modules = {}
key = b'wrelupqezdfrqdsd'
for bundle in manifest['bundles']:
    for path, pointer in UnityPy.load(str(ROOT / '.cache/bundles' / bundle)).container.items():
        if path.lower() not in assets:
            continue
        asset = pointer.read()
        raw = asset.m_Script
        if isinstance(raw, str):
            raw = raw.encode('utf8', 'surrogateescape')
        source = bytes(value ^ key[index % len(key)] for index, value in enumerate(raw)).decode('utf8')
        name = path.removeprefix('luabyte/lua/').removesuffix('.lua.bytes').replace('/', '.')
        modules[name.lower()] = source

lua = LuaRuntime(unpack_returned_tuples=True, register_eval=False, register_builtins=False)
lua.globals().load_source = lambda name: modules[name.lower()]
lua.execute('''
-- Configuration chunks only need the standard table/string/math functions.
io, os, package, debug, python, dofile, loadfile = nil, nil, nil, nil, nil, nil, nil
local cache = {}
function require(name)
    if cache[name] ~= nil then return cache[name] end
    local chunk = assert(loadstring(load_source(name), name))
    cache[name] = chunk()
    return cache[name]
end
require('CONST')
function sheet(group, name)
    local module = require('Excels.Data.' .. group .. '.' .. name)
    require('ExcelTool').TryLoadBlock(module, group, name)
    return module.tb
end
''')

def rows(group, name):
    return sorted(lua.globals().sheet(group, name).items())

items = rows('item_definition', 'item')
characters = rows('item_definition', 'character')
emojis = rows('character', 'emoji')
snapshot = {
    'items': {str(category): [int(id) for id, row in items if row.category == category]
              for category in (5, 8)},
    'characters': [[int(id), int(row.init_skin)] for id, row in characters],
    'titles': [int(id) for id, _ in rows('item_definition', 'title')],
    'skins': [int(id) for id, _ in rows('item_definition', 'skin')],
    'rewards': [int(id) for id, _ in rows('spot', 'rewards')],
    'emojis': {},
}
for character, group in emojis:
    entries = [row for _, row in sorted(group.items())]
    assert all(row.charid == character for row in entries)
    snapshot['emojis'][str(int(character))] = [int(row.sub_id) for row in entries]

output = ROOT / 'data/cfg-snapshot.json'
assert all(snapshot.values()), 'Refusing to write empty configuration tables'
assert all(row.init_skin > 0 for _, row in characters), 'Missing character initial skin'
temporary = output.with_suffix('.tmp')
temporary.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
temporary.replace(output)
print('Exported:', {name: sum(map(len, value.values())) if name == 'items' else len(value)
                    for name, value in snapshot.items()})
