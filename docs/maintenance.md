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

## Automated resource releases

`.github/workflows/resources-release.yml` checks daily at 09:17 UTC (17:17 in Asia/Shanghai and Asia/Singapore) and supports **Actions → Update resources and latest release → Run workflow**. Manual runs must target the default branch; enable `force` to rebuild unchanged inputs. The workflow must be pushed to the default branch and Actions must be enabled. GitHub schedules can be delayed and are not real-time game update events.

The afternoon check is a polling choice, not an official maintenance schedule. Announced updates vary, so the workflow checks every day rather than only on Wednesdays. Updates after the check are detected the next day unless triggered manually.

Pushes to `main` also trigger the workflow when source, scripts, tests, dependency manifests, or the workflow itself change. This starts the initial release without requiring a manual API dispatch. Documentation-only pushes do not trigger an immediate run.

`scripts/release-resources.cjs check` hashes the public `bundle_info_so.majset` resource index using SHA-256 and compares it and the source commit with `resource-version.json` from the rolling release. A changed index signals a resource update, not an official numeric game version or necessarily a relevant configuration change. All four site matches currently share this one resource source; region-specific indices are not polled separately. A missing release triggers the initial build; HTTP errors fail the check instead of being treated as a new version.

Changed inputs trigger a fresh resource/protocol export, build, JavaScript tests, original Lua decoder tests, and syntax validation. Only successful jobs pass the script and provenance metadata to publishing. The resource-processing job has read-only repository permissions, no persisted checkout credentials, and no release token in its environment. A separate publishing job has `contents: write` and never executes resource code. The built-in `GITHUB_TOKEN` is sufficient; no personal access token is needed.

Publishing reuses the **`latest` tag and release**, replaces `majsoul-mirage.user.js` and `resource-version.json`, and updates the notes. The tag moves to the built source commit; no additional releases or version tags accumulate. Other manually created releases are left untouched. Build/test failures preserve the previous release. Repository release immutability must not prevent updates to this rolling release.

The metadata records the source commit, actual built resource-index hash, userscript hash, application version, and build timestamp. Resource-only rebuilds do not increment `package.json` or commit generated data. They also do not configure automatic userscript installation updates; reinstall the latest asset when needed.

Stable download URL:

```text
https://github.com/anosora233/majsoul-mirage/releases/latest/download/majsoul-mirage.user.js
```

The workflow uses a one-day Actions artifact to transfer files between jobs; it is independent of the single public rolling Release. Actual hosted workflow execution must be verified after pushing.
