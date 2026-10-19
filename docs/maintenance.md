# Maintenance

## Editing and releases

Business logic lives in `src/cosmetic-hook.cjs`, transport in `src/websocket-core.cjs`, configuration adaptation in `src/cfg-snapshot.cjs`, and compact protocol restoration in `src/protocol.cjs`. Edit sources and run `npm run build`; never patch the generated userscript directly.

Update the version in `package.json` and keep `package-lock.json` consistent. The build injects the version into userscript metadata and the API. Build, test, and retain the final artifact locally; it is not tracked in Git.

`scripts/build-websocket-userscript.cjs` compresses numeric configuration using deltas and base36. Application names, comments, and indentation remain readable. Protocol fields use `[name, id, scalar type or message index, repeated packing]` tuples; service mappings contain message indices. Tests compare restored definitions and method mappings against their original sparse forms.

protobuf.js is loaded through a pinned `@require`. When updating it, synchronize the userscript metadata, development dependency, lockfile, and URL assertions.

## Hook behavior

A request hook returning `{respond:{}}` intercepts the original request and queues an empty local response. It may attach `notify:{name, message}` or a notification array, delivered in order after the response on the same socket. Synthetic events bypass incoming business hooks.

Emoji requests are identified by integer `content.emo_id`, without ID conversion or legacy numeric thresholds. Account and seat state are isolated per socket in a WeakMap.

Random settings and `{character_id, skin_id}` pools are stored in `vip.char.random`; reads and writes receive local responses. Successful room entry draws once. `NotifyMatchGameStart` draws and emits an account update; `NotifyRoomGameStart` only binds the existing choice to the game UUID. Match starts are deduplicated by account and UUID. Authentication applies bound choices or the fixed character, never drawing or notifying.

Manual character changes override the current random choice. Manual skin changes update the selected skin without changing the saved pool. Room responses initialize the cache; membership changes replace it. Leaving, self removal, or account changes clear it. Reuse typed room messages to preserve unknown fields; do not copy unknown Room fields into a different notification type.

Incoming hooks may attach `context.notify`. Their notifications run in the next task (`setTimeout(..., 0)`), after native event listeners. Local request responses and notifications retain microtask delivery. Preserve known-local failure blocking; ordinary failures pass the original frame through.

## Updating configuration

```sh
npm ci
python -m pip install -r requirements.txt
python scripts/update-cfg.py
```

The updater downloads the resource index, locates assets by logical path, caches bundles in `.cache/bundles/`, and executes the current ExcelTool, CONST, and Params helpers offline. It updates `data/cfg-resources.json` and `data/cfg-snapshot.json`, rebuilds, and tests.

The default source is `https://game.maj-soul.com/assetbundles/DXT/`; use `--base-url URL` to override it. `--offline` uses existing caches and fails if required resources are missing. Treat resource Lua as executable code and only use trusted inputs.

To re-export configuration from cached assets only:

```sh
python scripts/export-cfg-snapshot.py
```

Python, UnityPy, and Lua are offline tooling, not browser dependencies.

## Updating protocol definitions

`data/game-protocol.json` is the full build input exported from original Lua descriptors; `data/proto-config.json` maps service methods to request/response types. `scripts/cosmetic-protocol.cjs` selects only runtime-required types and fields.

To export existing descriptor fixtures:

```sh
python scripts/export-game-protocol.py
npm run build
npm test
npm run test:lua
```

To download and extract all required configuration, protocol, and Lua decoder fixtures:

```sh
npm run resources:prepare
```

Use `python scripts/update-cfg.py --offline --protocol` to regenerate from cached bundles. A configuration-only update does not refresh protocol definitions.

Numeric repeated fields must use packed encoding: the game Lua decoder rejects some otherwise valid unpacked payloads. Do not restore uniform `packed:false`. protobuf.js roundtrips alone are insufficient; run the original Lua decoder regression after encoding changes.

## Generated files and privacy

`data/*.json`, `.cache/lua/`, and the root `.user.js` artifact are generated and untracked. Prepare resources before the first build. Install dependencies from `package-lock.json` and `requirements.txt`.

Keep local diagnostics in `.cache/`. Never commit credentials, raw account/session traffic, or real capture files as test fixtures. Use synthetic tokens and IDs in tests, and redact debug output before sharing it.
