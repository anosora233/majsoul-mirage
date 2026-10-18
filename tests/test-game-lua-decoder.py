"""Decode actual userscript output using the game's unmodified Lua protobuf decoder.

Only the native pb byte primitives are replaced for this offline test.
"""
import base64
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
(ROOT / '.cache').mkdir(exist_ok=True)
sys.path.insert(0, str(ROOT / '.cache/python-libs'))
from lupa.lua51 import LuaRuntime, LuaError

lua = LuaRuntime(encoding=None, unpack_returned_tuples=True)
lua.execute(b'''
package.preload.pb = function()
    local function read(data, position)
        local value, factor = 0, 1
        for i = 1, 10 do
            local byte = assert(string.byte(data, position + 1), 'Truncated varint')
            position = position + 1
            value = value + (byte % 128) * factor
            if byte < 128 then return value, position end
            factor = factor * 128
        end
        error('Invalid varint')
    end
    local function write(sink, value)
        repeat
            local byte = value % 128
            value = math.floor(value / 128)
            sink(string.char(byte + (value > 0 and 128 or 0)))
        until value == 0
    end
    local function size(value)
        local count = 1
        while value >= 128 do value = math.floor(value / 128); count = count + 1 end
        return count
    end
    return {
        varint_decoder=read, signed_varint_decoder=read,
        varint_decoder64=read, signed_varint_decoder64=read,
        varint_encoder=write, signed_varint_encoder=write,
        varint_encoder64=write, signed_varint_encoder64=write,
        varint_size=size, signed_varint_size=size,
        read_tag=function(data, position)
            local _, last = read(data, position)
            return string.sub(data, position + 1, last), last
        end,
        zig_zag_decode32=function(value) return value % 2 == 0 and value / 2 or -(value + 1) / 2 end,
        zig_zag_decode64=function(value) return value % 2 == 0 and value / 2 or -(value + 1) / 2 end,
        zig_zag_encode32=function(value) return value >= 0 and value * 2 or -value * 2 - 1 end,
        zig_zag_encode64=function(value) return value >= 0 and value * 2 or -value * 2 - 1 end
    }
end
True, False = true, false
function register(name, source) package.preload[name] = assert(loadstring(source, name)) end
''')
register = lua.globals().register
for name in ['protobuf', 'encoder', 'decoder', 'wire_format', 'type_checkers',
             'containers', 'listener', 'descriptor', 'text_format']:
    register(('protobuf.' + name).encode(), (ROOT / '.cache/lua' / (name + '.lua')).read_bytes())
for file in (ROOT / '.cache/lua').glob('*_pb.lua'):
    register(('Protol.' + file.stem).encode(), file.read_bytes())
lua.execute(b'''
require('Protol.com_struct_pb')
require('Protol.cli_lobby_pb')
require('Protol.cli_game_pb')
function decode(name, data)
    local constructor = Protol.com_struct_pb[name] or Protol.cli_lobby_pb[name] or Protol.cli_game_pb[name]
    local message = assert(constructor, name)()
    message:ParseFromString(data)
    return message
end
''')
# Regression: protobuf.js accepts both, but this client decoder rejects unpacked numbers.
try:
    lua.globals().decode(b'ResSetHiddenCharacter', b'\x10\xc7\x9a\x0c')
except LuaError as error:
    assert 'Truncated message' in str(error)
else:
    raise AssertionError('The old unpacked response should reproduce the client decoder failure')
assert lua.globals().decode(b'ResSetHiddenCharacter', b'\x12\x03\xc7\x9a\x0c').hidden_characters[1] == 200007
with tempfile.TemporaryDirectory(dir=ROOT / '.cache') as directory:
    assert Path(directory).resolve().is_relative_to(ROOT)
    destination = Path(directory) / 'messages.json'
    subprocess.run(['node', str(ROOT / 'tests/test-cosmetic-hook.cjs'), str(destination)], cwd=ROOT, check=True)
    messages = json.loads(destination.read_text())
    for fixture in messages:
        frame = base64.b64decode(fixture['data'])
        wrapper = lua.globals().decode(b'Wrapper', frame[3:])
        if fixture.get('unpackedData'):
            try:
                lua.globals().decode(b'ResFetchInfo', base64.b64decode(fixture['unpackedData']))
            except LuaError as error:
                assert 'Truncated' in str(error), str(error)
            else:
                raise AssertionError('Old fetchInfo encoding should fail in the game decoder')
        decoded = lua.globals().decode(fixture['type'].encode(), wrapper.data)
        if fixture['type'] == 'ResFetchInfo' and decoded.character_info.characters[1]:
            assert len(decoded.character_info.characters) == 124
            assert decoded.character_info.main_character_id == 200001
            assert decoded.server_time.server_time == 123456
print(f'PASS: game Lua decoder accepted {len(messages)} userscript responses')
