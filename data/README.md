# Generated Data

- `cfg-snapshot.json`: resource IDs, categories, initial skins, and emoji IDs required by runtime behavior.
- `cfg-resources.json`: configuration resource URLs, bundle names, and logical asset paths written by the updater.
- `game-protocol.json`: protocol definitions exported offline from the original game Lua descriptors; the browser does not load the full table.
- `proto-config.json`: service-method mappings to request and response types.

These files come from public game resources, not account traffic or packet captures. Do not manually compress the configuration snapshot; the build handles compression. Downloaded bundles are cached in `.cache/bundles/` and are not tracked.

All JSON files in this directory are untracked. Run `npm run resources:prepare` to generate them, or `python scripts/update-cfg.py --offline --protocol` to rebuild from existing caches.
