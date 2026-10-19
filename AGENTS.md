# Repository Guidelines

## Project Structure & Module Organization

- `src/websocket-core.cjs`: native WebSocket interception, protobuf handling, logging, and local responses.
- `src/cosmetic-hook.cjs`: cosmetic overrides, local storage, room state, and emoji behavior.
- `src/cfg-snapshot.cjs` and `src/protocol.cjs`: configuration adaptation and compact protocol restoration.
- `scripts/`: build tooling, resource downloads, and configuration/protocol exporters.
- `tests/`: JavaScript regressions and original game Lua decoder validation.
- `docs/`: usage, maintenance, and validation notes.
- `majsoul-mirage.user.js`: untracked, installable build output. Generate with `npm run build`; never patch it directly.

Generated `data/*.json`, extracted Lua, `.cache/`, and dependencies stay untracked.

## Build, Test, and Development Commands

Use Node.js 20+ and Python 3.10+:

```powershell
npm ci
python -m pip install -r requirements.txt
npm run resources:prepare
npm run build
npm test
npm run test:lua
```

`resources:prepare` downloads and exports build inputs and Lua fixtures. Daily development normally requires only build and tests. `npm run cfg:update` refreshes configuration; `npm run protocol:export` exports cached descriptors. Use `python scripts/update-cfg.py --offline --protocol` to regenerate from cached bundles.

Install the generated script in Tampermonkey and refresh the game for manual checks; there is no development server.

## Coding Style & Naming Conventions

Write documentation under `docs/` and the data directory guide in English. Only the root README has English (`README.md`), Japanese (`README.ja.md`), and Simplified Chinese (`README.zh-CN.md`) editions; keep their content and links synchronized.

Use CommonJS `.cjs`, two-space JavaScript indentation, semicolons, and descriptive camelCase names. Follow surrounding Python style with four-space indentation. Keep runtime code readable and logs concise and English. Preserve protobuf field names and existing `vip.*` storage keys.

No formatter or linter is configured. Check syntax with `node --check majsoul-mirage.user.js` and whitespace with `git diff --check`. Release versions come from `package.json`; rebuild after changing them.

## Testing Guidelines

JavaScript tests use Node's strict assertions and VM/browser stubs; Python tests use Lupa and the game's Lua decoder. Name tests `test-*.cjs` or `test-*.py`. No percentage coverage threshold exists. Add regressions for changed behavior, especially unknown-field preservation, packed numeric lists, local failures, and room sequences. Run Lua validation for protocol or encoding changes. Report manual UI verification separately from automated results.

## Commit & Pull Request Guidelines

Use imperative English subjects, matching history: `Block known-local requests when processing fails`. Include behavior, validation, and limitations in substantial commit bodies. PRs should explain the problem, behavior, tests, and artifact size changes; link relevant issues and include screenshots for UI changes.

## Security & Configuration

Keep local requests blocked on failure; ordinary traffic retains passthrough. Never commit credentials or real message dumps. Debug bytes may contain sensitive data. Exporters execute downloaded Lua: use trusted inputs; execution is not securely sandboxed.
