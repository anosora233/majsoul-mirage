# Validation

## Current baseline

Version **0.5.1** was validated on **2026-10-19** with:

- `npm run build`: generates the userscript from source, configuration, and sparse protocol definitions.
- `npm test`: configuration projection, protocol restoration equality, cosmetic overrides, local storage/responses, native event delivery, per-socket request matching, unknown-field preservation, 64-bit passthrough, failure handling, and uninstall behavior.
- `python tests/test-game-lua-decoder.py`: the original game Lua protobuf decoder accepted **104 responses and notifications**. Only native byte primitives are replaced; a regression checks that the old unpacked `fetchInfo` encoding fails.
- `node --check majsoul-mirage.user.js`: generated JavaScript syntax.
- `git diff --check`: whitespace validation.

Random-selection regressions cover local settings and reads, initialization, successful room entry, match-start selection, duplicate suppression, room/game UUID binding, same-game reconnects, no authentication redraws, manual character overrides, manual skin changes, and preservation of the saved pool.

Debugging regressions cover detached object snapshots, response/notification details, filtering, disabled payload output, and single decoding during read-only inspection. Scheduling tests verify that inbound-event notifications remain pending through the microtask checkpoint and run only in the following task. Local request responses still complete in a microtask.

## Resource baseline

The configuration snapshot contains 699 relevant items, 124 characters, 510 skins, 162 titles, 123 emoji groups, and 160 ending rewards. The last verified resource version was **4.0.47(47)**; generated `data/cfg-resources.json` records exact bundle sources and paths.

The offline update workflow (`python scripts/update-cfg.py --offline`) and dependency installation/build after resource preparation were verified previously. Generated JSON and extracted Lua remain outside version control.

## Earlier compatibility checks

On **2026-10-18**, the user confirmed version **0.4.2** could enter the game. The earlier loading stall at 67% was caused by unpacked numeric repeated fields; packed encoding and regression coverage were added.

Subsequent tests verified operation logging without default payload disclosure, native send failures without false success logs, emoji `emo_id` recognition, preservation of broadcast content, seat isolation, and resetting stale seats after failed authentication.

Room tests cover membership changes, owner/position retention, unknown fields, notification order, skin isolation, and clearing stale data after leaving or self removal.

## Limits and manual checks

These automated results do not replace browser and game UI checks after an update. The latest random-character behavior, room display refresh, emoji playback, and browser-native event ordering have not been fully verified in the actual game.

Before release, check login, lobby loading, room creation/joining, random settings, manual character/skin changes, matchmaking, reconnects, and leaving rooms. Compare read-only traffic on a fresh page when needed, and never share unredacted account or session data.
