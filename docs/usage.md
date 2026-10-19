# Majsoul Mirage 0.5.1

## Installation and behavior

Build `majsoul-mirage.user.js`, install it in Tampermonkey, disable other cosmetic hook scripts, and refresh a supported game page. Preserve the complete header, including `@run-at document-start`, `@sandbox raw`, `@grant none`, and `@require`.

The script applies local cosmetic overrides through WebSocket messages and retains existing `vip.*` localStorage settings. No console commands are required for normal use. Local changes do not grant server-side ownership or change other players' displays.

- Login and account responses override existing avatar, frame, title, and loading-image fields for the local account.
- `fetchInfo` supplies characters, skins, emoji, titles, ending rewards, cosmetic items, and saved view presets. Existing inventory stacks are retained without duplicate item IDs.
- Character, skin, title, loading-image, character-order, hidden-character, and view-preset changes are stored locally and receive local responses.
- Skin changes emit `NotifyAccountUpdate`; when in a room, they also emit `NotifyRoomPlayerUpdate` to refresh the local room display.
- Room, replay, and match data use the local account's appearance. Other players retain their skins, while their existing character objects are displayed at maximum bond level.
- Server character updates are removed from `NotifyAccountUpdate`. Main-character updates are removed or replaced with the current random selection. Room and reward notifications receive the corresponding cosmetic overrides.
- `.lq.FastTest.broadcastInGame` requests containing an integer `emo_id` receive a local response and `NotifyGameBroadcast`. Their original `content` text is preserved and never sent to the server. Other broadcasts pass unchanged.

Server error responses remain errors. Characters without additional emoji use empty lists.

## Supported sites

- `https://mahjongsoul.game.yo-star.com/*`
- `https://majsoul.union-game.com/*`
- `https://game.mahjongsoul.com/*`
- `https://game.maj-soul.com/1/*`

## Random characters

`setRandomCharacter` and `fetchRandomCharacter` save and read the enabled flag and `{character_id, skin_id}` pool locally. These requests do not reach the server. Initial setup imports server settings if no local settings exist; subsequent `fetchInfo.random_character` values come from `vip.char.random`.

Selection occurs only on successful room entry or `NotifyMatchGameStart`. Both paths emit `NotifyAccountUpdate` with the selected character and main-character skin. Changing settings only saves the flag and pool; it neither draws a selection nor emits account or room notifications.

`NotifyRoomGameStart` binds the existing room choice to `game_uuid` without another draw or notification. `authGame` only applies a choice already bound to that game. It never draws or emits random account updates. If a page refresh loses the choice and no start notification arrives, the fixed main character is used.

Duplicate match-start notifications, room refreshes, and same-game reconnects do not redraw or emit duplicate random account updates. Failed room entry emits no update. Disabling random selection takes effect on the next entry.

Manually changing character clears the current random choice and refreshes the room, while keeping random settings for the next entry. Manually changing the selected character's skin updates the current choice, account, and room display without rewriting the saved pool; the next draw uses the pool's configured skin.

## Logging and debugging

Use `majsoulMirage` as the console API. Existing `vip.*` storage keys are preserved.

Startup prints `[MajsoulMirage] hook.ready 0.5.1` and `[MajsoulMirage] cosmetics.ready`. Default operation logs contain direction, name, connection, and request ID:

```text
[MajsoulMirage] modified response Lobby.fetchInfo [ws:1 #8]
[MajsoulMirage] intercepted request Lobby.useTitle [ws:1 #9] — local response queued
[MajsoulMirage] local notify NotifyGameBroadcast [ws:1] — synthetic notification
```

| Action | Meaning |
| --- | --- |
| `pass` | Original message forwarded unchanged |
| `modified` | Modified message re-encoded and delivered or sent |
| `intercepted` | Request handled locally, with a local response queued |
| `local` | Synthetic notification delivered locally |
| `error` | Parsing or processing failed |

Ordinary failures retain the original message. Known-local request failures block it and return a local `error.code = 1` response without notifications. This code denotes local processing failure, not a server result. Previously written local settings are not rolled back. Read-only mode forwards original traffic.

Emoji notifications use the account's zero-based seat from that socket's `authGame.seat_list`. If unavailable, the request still receives a local response but no notification; `emoji.skipped — seat unavailable` is logged. Reauthentication resets the seat before finding it again.

```js
majsoulMirage.stats
majsoulMirage.readOnly = true  // Decode without business hooks
majsoulMirage.readOnly = false // Resume modifications; default
majsoulMirage.active = false   // Pause parsing, logging, and modifications
majsoulMirage.active = true    // Resume the hook
majsoulMirage.log = true       // Default: modifications and interceptions
majsoulMirage.log = 'all'      // Include ordinary passthrough logs
majsoulMirage.log = false      // Suppress operation logs; warnings remain
majsoulMirage.debug = 'FastTest.broadcastInGame' // Filter by name fragment
majsoulMirage.debug = '.lq.Lobby.fetchInfo'      // Full names also work
majsoulMirage.debug = true                     // Inspect all recognized traffic
majsoulMirage.debug = false                    // Default: no payload output
majsoulMirage.uninstall() // Remove the hook; refresh to reinstall
```

Debugging is independent of operation logging. Each console entry is a plain, copyable object containing `action`, `direction`, `name`, `connection`, and `id`. Modified messages include detached `before` and `after` snapshots. Passthrough messages and local notifications include `message`. Intercepted requests include `request`, `response`, and any constructed `notifications` with their names and contents.

Known messages show only fields included in the sparse schema; unknown or undecodable messages expose a plain `bytes` array. Right-click an object and choose **Copy object**. Logs may contain sensitive account or session information; redact before sharing.

`stats.modified` counts rewritten messages. For compatibility, `stats.blocked` counts intercepted requests; `synthetic` counts local responses, and `localNotifications` counts delivered synthetic notifications. No `recent` property or message history queue exists.

Read-only mode retains decoding, request matching, counters, and debugging, but skips business hooks and state updates. It does not undo existing cosmetic changes. Already queued local replies still complete. Refresh when changing modes across login, room, or match transitions to rebuild state.

## State and protocol handling

The current room is cached for local display updates. Room responses and membership notifications refresh it; leaving, removal, or account changes clear it. Player-update, ready, and dressing notifications share a local increasing `seq`. Real notifications receive `max(server seq, local seq + 1)`; local room updates also increment it. Current-room fetches do not roll it back. Read-only mode preserves original sequence numbers; refresh before comparing against unmodified traffic.

Responses are matched by request ID separately for each socket. Each connection holds at most 4096 pending metadata entries, without payload bodies. Entries expire after two minutes when another protocol frame is processed.

Local request responses and attached notifications use a microtask so the client can register its callback after `send()` returns. Notifications attached to real inbound events use the next task (`setTimeout(..., 0)`) so native message listeners finish first. Synthetic events bypass incoming business hooks.

The script uses fixed protobuf.js light 8.8.1 through `@require`. No separate Long library is needed for the selected fields. Unknown protobuf fields retain their original bytes during re-encoding. ArrayBuffer, TypedArray, and DataView are supported; text and Blob messages are skipped. No full protocol table, Unity parser, or Lua runtime is shipped to the browser.

## Configuration and updates

`cfg` and `majsoulMirage.cfg` refer to the same projected configuration. Existing configuration tables are not overwritten. The snapshot contains 699 category-5/8 items, 124 characters, 510 skins, 162 titles, 123 emoji groups, and 160 ending rewards. Numeric data uses delta/base36 compression; the generated source snapshot is `data/cfg-snapshot.json`.

```js
cfg.item_definition.character.map_[200001].init_skin
cfg.character.emoji.groups_[200001].map(row => row.sub_id)
```

To update configuration and rebuild:

```sh
npm ci
python -m pip install -r requirements.txt
npm run cfg:update
```

The updater resolves resource bundles from the current index, exports configuration offline, rebuilds the script, and runs configuration and cosmetic tests. Reinstall the generated script afterward. Python, UnityPy, and Lua are build-time dependencies only.

`--offline` uses cached resources; `--base-url URL` changes their source. Exporters execute resource Lua, so only use trusted inputs. `data/cfg-resources.json` records sources and paths. Snapshots do not update automatically, and resource or protocol changes may require code updates.

See [maintenance](maintenance.md) and [validation](validation.md) for build and test details.
