# 🀄 雀幻 · Majsoul Mirage

![Version](https://img.shields.io/badge/version-0.5.1-6366f1?style=flat-square)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Tampermonkey](https://img.shields.io/badge/Tampermonkey-00485B?style=flat-square&logo=tampermonkey&logoColor=white)

**English** | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

A Tampermonkey userscript for local cosmetic customization in the Majsoul web client. Current version: **0.5.1**.

The script intercepts native WebSocket messages, decodes selected protobuf fields, and applies local appearance overrides. Changes do not grant server-side ownership or change what other players see.

## ⚠️ Disclaimer

**Use at your own risk. Using this script may result in account restrictions, temporary suspension, or permanent bans.**

- Local-only visual changes do not guarantee that the script is permitted, undetectable, or safe from account penalties.
- You are responsible for checking and complying with the game’s applicable rules and terms before use. Do not use the script if you cannot accept the risk of losing access to your account.
- The project is provided as-is, without guarantees of safety, availability, or compatibility. To the extent permitted by applicable law, its authors and contributors accept no liability for account penalties, loss of data or purchased content, or other losses arising from use. Account recovery and compensation are not provided.
- This is an unofficial project with no affiliation, authorization, or endorsement from the game operator.

## ✨ Features

- Local characters, skins, emoji, titles, loading images, and cosmetic view presets.
- Appearance overrides for rooms, matches, account information, and replays.
- Random character and skin selection from a local pool.
- Manual character and skin changes override the current selection without rewriting the random pool. Authentication never draws a new selection.
- Concise English logs and optional copyable message objects, with no message history queue.

## 🛠️ Build

Install the [latest release asset](https://github.com/anosora233/majsoul-mirage/releases/latest/download/majsoul-mirage.user.js), or build locally below. See [maintenance](docs/maintenance.md) for resource updates and automated releases.

Requirements: Node.js 20+, Python 3.10+, and network access for initial dependencies and game resources.

```sh
npm ci
python -m pip install -r requirements.txt
npm run resources:prepare
npm run build
npm test
npm run test:lua
```

The build produces `majsoul-mirage.user.js` in the repository root. This final artifact, generated JSON, extracted Lua, and caches are intentionally untracked. Python and Lua are build/test dependencies only. The browser's sole external runtime dependency is pinned protobuf.js light 8.8.1, loaded through Tampermonkey `@require`.

## 🚀 Install

1. Install the generated `.user.js` file in Tampermonkey.
2. Disable other cosmetic hook scripts, save, and refresh the game.
3. Preserve the complete header, especially `@run-at document-start`, `@sandbox raw`, `@grant none`, and `@require`.

## 🔍 Debugging

Use the `majsoulMirage` API in the game page console:

```js
majsoulMirage.debug = 'NotifyAccountUpdate'; // Filter by message-name fragment
majsoulMirage.debug = true;                 // Inspect all recognized messages
majsoulMirage.debug = false;                // Default: no payload output
majsoulMirage.log = 'all';                  // Include ordinary passthrough logs
majsoulMirage.readOnly = true;              // Decode without applying business hooks
majsoulMirage.readOnly = false;             // Resume modifications
```

Debug objects include message metadata and before/after contents; intercepted requests include local responses and notifications. Unknown messages expose raw bytes. Logs may contain sensitive account or session data: redact them before sharing. Refresh when switching to read-only mode after local room sequence changes.

## 🔧 Maintenance

```sh
npm run cfg:update
python scripts/update-cfg.py --offline --protocol
```

The first command updates configuration; the second regenerates resources from existing caches. Exporters execute Lua from game resources; only use trusted inputs. There is no development server.

| Path | Purpose |
| --- | --- |
| `src/` | WebSocket transport, cosmetic hooks, configuration and protocol adapters |
| `scripts/` | Resource extraction, protocol export, and build tools |
| `tests/` | JavaScript regressions and original game Lua decoder checks |
| `data/` | Generated build inputs and a directory guide |
| `docs/` | Detailed usage, maintenance, and validation notes in English |

See [usage](docs/usage.md), [maintenance](docs/maintenance.md), [validation](docs/validation.md), and [contributor guidelines](AGENTS.md). Automated validation does not establish compatibility with every future game update or replace actual game UI testing. This project is not affiliated with Majsoul.

## 🤝 Acknowledgments

This project primarily references [anosora233/majsoul-hook-mitm](https://github.com/anosora233/majsoul-hook-mitm), particularly its approach to message hooks and local cosmetic behavior. Thanks to its author and contributors.
