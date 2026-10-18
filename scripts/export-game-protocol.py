"""Execute original generated schema modules against descriptor-recording constructors.

Does not run the game, implement protobuf decoding, or guess field definitions.
"""
import json,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'.cache/python-libs'))
from lupa.lua51 import LuaRuntime
lua=LuaRuntime(unpack_returned_tuples=True)
lua.execute('''
CAPTURE_MESSAGES={}
CAPTURE_ENUMS={}
package.preload['protobuf.protobuf']=function()
  return {
    Descriptor=function() return {} end,
    FieldDescriptor=function() return {} end,
    EnumDescriptor=function() local d={};table.insert(CAPTURE_ENUMS,d);return d end,
    EnumValueDescriptor=function() return {} end,
    Message=function(d) CAPTURE_MESSAGES[d.full_name]=d;return {DESCRIPTOR=d} end
  }
end
''')
register=lua.eval('function(name,source) package.preload[name]=assert(loadstring(source,name)) end')
for f in (root/'.cache/lua').glob('*_pb.lua'):
    register('Protol.'+f.stem,f.read_text(encoding='utf8'))
require=lua.eval('require')
for f in (root/'.cache/lua').glob('*_pb.lua'):
    require('Protol.'+f.stem)
result={'nested':{}}
def put(full_name,definition):
    parts=full_name.lstrip('.').split('.')
    parent=result
    for part in parts[:-1]:
        parent=parent.setdefault('nested',{}).setdefault(part,{})
    entry=parent.setdefault('nested',{}).setdefault(parts[-1],{})
    entry.update(definition)
scalars={1:'double',2:'float',3:'int64',4:'uint64',5:'int32',6:'fixed64',7:'fixed32',8:'bool',9:'string',12:'bytes',13:'uint32',15:'sfixed32',16:'sfixed64',17:'sint32',18:'sint64'}
messages=lua.globals().CAPTURE_MESSAGES
assert len(list(messages.items())) > 0, 'Missing Lua descriptors; run scripts/update-cfg.py --protocol first'
for name,d in messages.items():
    fields={}
    for _,field in d.fields.items():
        field_type=field.type
        if field_type==11: typename=field.message_type.full_name
        elif field_type==14: typename=field.enum_type.full_name
        else: typename=scalars[field_type]
        spec={'type':typename,'id':field.number}
        # Numeric lists must use packed encoding for the game's Lua decoder.
        if field.label==3: spec['rule']='repeated';spec['options']={'packed':field_type not in (9,11,12)}
        elif field.label==2: spec['rule']='required'
        if field.has_default_value and field_type not in (11,14) and field.default_value is not None:
            spec['options']=dict(spec.get('options',{}),default=field.default_value)
        fields[field.name]=spec
    put(name,{'fields':fields})
enums=0
for _,d in lua.globals().CAPTURE_ENUMS.items():
    if not d.full_name: continue
    put(d.full_name,{'values':{v.name:v.number for _,v in d['values'].items()}})
    enums+=1
(root/'data/game-protocol.json').write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False),encoding='utf8')
print('Exported',len(list(messages.items())),'message descriptors and',enums,'enums from original client schema modules')
