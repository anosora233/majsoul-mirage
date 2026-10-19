"""Download current cfg assets, export the projected snapshot and rebuild the userscript.

Usage: python scripts/update-cfg.py [--offline] [--base-url URL]
Dependencies: python -m pip install UnityPy lupa; Node.js on PATH.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.cache/python-libs'))
import UnityPy

UnityPy.config.FALLBACK_UNITY_VERSION = '2022.3.62f2'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-url', default='https://game.maj-soul.com/assetbundles/DXT/',
                    help='Asset bundle directory, including trailing slash')
parser.add_argument('--offline', action='store_true', help='Use the saved resource index and bundles')
parser.add_argument('--protocol', action='store_true', help='Also extract protocol definitions and Lua decoder fixtures')
args = parser.parse_args()
base_url = args.base_url.rstrip('/') + '/'


def download(name, refresh=False):
    if Path(name).name != name or not name.endswith('.majset'):
        raise ValueError(f'Invalid resource name: {name}')
    destination = ROOT / '.cache/bundles' / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    if args.offline:
        if not destination.is_file():
            raise FileNotFoundError(f'Offline resource missing: {destination}')
    elif refresh or not destination.exists():
        print(f'Download: {name}', flush=True)
        request = Request(base_url + quote(name), headers={'Cache-Control': 'no-cache'})
        with urlopen(request, timeout=60) as response:
            content = response.read()
        temporary = destination.with_suffix('.download')
        temporary.write_bytes(content)
        temporary.replace(destination)
    return destination


index = download('bundle_info_so.majset', refresh=True)
trees = [obj.read_typetree() for obj in UnityPy.load(str(index)).objects if obj.type.name == 'MonoBehaviour']
tree, = [value for value in trees if 'assetInfos' in value and 'bundleInfos' in value]
pattern = re.compile(
    r'^luabyte/lua/(?:exceltool|const|excels/params|excels/data/'
    r'(?:item_definition/(?:item|character|skin|title)|character/emoji|spot/rewards)(?:_b\d+)?)\.lua\.bytes$'
)
cfg_assets = [asset for asset in tree['assetInfos'] if pattern.fullmatch(asset['assetPath'].lower())]
protocol_pattern = re.compile(r'^luabyte/lua/(?:protol/[^/]+_pb|protobuf/[^/]+)\.lua\.bytes$')
protocol_assets = [asset for asset in tree['assetInfos'] if protocol_pattern.fullmatch(asset['assetPath'].lower())
                   or asset['assetPath'].lower() == 'myassets/docs/proto_config.bytes'] if args.protocol else []
assets = cfg_assets + protocol_assets
required = ['exceltool', 'const', 'excels/params', 'excels/data/item_definition/item',
            'excels/data/item_definition/character', 'excels/data/item_definition/skin',
            'excels/data/item_definition/title', 'excels/data/character/emoji', 'excels/data/spot/rewards']
paths = {asset['assetPath'].lower() for asset in assets}
for module in required:
    if f'luabyte/lua/{module}.lua.bytes' not in paths:
        raise ValueError(f'Resource index is missing {module}')
bundles = sorted({tree['bundleInfos'][asset['ownerBundleIndex']]['name'] for asset in assets})
for bundle in bundles:
    download(bundle)

manifest = {'baseUrl': base_url,
            'bundles': sorted({tree['bundleInfos'][asset['ownerBundleIndex']]['name'] for asset in cfg_assets}),
            'assets': [asset['assetPath'] for asset in cfg_assets]}
(ROOT / 'data/cfg-resources.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf8')
if args.protocol:
    fixture_dir = ROOT / '.cache/lua'
    fixture_dir.mkdir(parents=True, exist_ok=True)
    wanted = {asset['assetPath'].lower() for asset in protocol_assets}
    key = b'wrelupqezdfrqdsd'
    extracted = set()
    for bundle in sorted({tree['bundleInfos'][asset['ownerBundleIndex']]['name'] for asset in protocol_assets}):
        for asset_path, pointer in UnityPy.load(str(ROOT / '.cache/bundles' / bundle)).container.items():
            if asset_path.lower() not in wanted:
                continue
            raw = pointer.read().m_Script
            if isinstance(raw, str):
                raw = raw.encode('utf8', 'surrogateescape')
            if asset_path.lower().endswith('/proto_config.bytes'):
                config = json.loads(raw)
                assert 'service' in config and 'message' in config
                (ROOT / 'data/proto-config.json').write_text(json.dumps(config, indent=2) + '\n', encoding='utf8')
            else:
                # Some schema modules are already plaintext; others use the client's XOR key.
                source = raw if raw.lstrip().startswith((b'local ', b'--', b'module', b'require')) else bytes(
                    value ^ key[index % len(key)] for index, value in enumerate(raw))
                source.decode('utf8')
                name = asset_path.rsplit('/', 1)[1].removesuffix('.bytes')
                (fixture_dir / name).write_bytes(source)
            extracted.add(asset_path.lower())
    if extracted != wanted or not any(path.endswith('/proto_config.bytes') for path in extracted):
        raise ValueError('Protocol resources are missing from the current bundles')
    subprocess.run([sys.executable, str(ROOT / 'scripts/export-game-protocol.py')], cwd=ROOT, check=True)
for command in [
    [sys.executable, str(ROOT / 'scripts/export-cfg-snapshot.py')],
    ['node', str(ROOT / 'scripts/build-websocket-userscript.cjs')],
    ['node', str(ROOT / 'tests/test-cfg-snapshot.cjs')],
    ['node', str(ROOT / 'tests/test-cosmetic-hook.cjs')],
]:
    subprocess.run(command, cwd=ROOT, check=True)
print('Updated: majsoul-mirage.user.js')
