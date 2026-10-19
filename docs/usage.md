# WebSocket Cosmetics 0.5.1

安装根目录 `majsoul-websocket-hook.user.js`，停用旧 prod、Lua 和 WebSocket 脚本，
保存后刷新 `https://game.maj-soul.com/1/`。保留脚本头中的
`@run-at document-start`、`@sandbox raw` 和 `@grant none`。

这是 prod.js 修改逻辑的 WebSocket 版本。无需手动执行控制台命令，
保留旧 `vip.*` localStorage 设置，原有页面中的装扮操作会直接使用本地选择。

- 登录、账号信息：替换本人的头像、头像框、称号、加载图等已有字段。
- fetchInfo：提供角色、皮肤、表情、称号、结局奖励、装扮物品和保存的展示方案。
- 选择角色、皮肤、称号、加载图、角色排序、隐藏角色、展示方案：保存到本地并返回本地成功响应。
- `setRandomCharacter` 和 `fetchRandomCharacter` 在本地保存、读取启用状态及角色/皮肤候选池，设置不发往服务器。
- 首次初始化沿用服务器随机设置，此后 `fetchInfo.random_character` 使用 `vip.char.random` 本地设置。
- 启用随机后，进房或收到 `NotifyMatchGameStart` 时抽选；刷新房间不重抽，同一局按 `game_uuid` 重连保留选择。
- 修改随机设置只保存开关和候选池，不抽选、不构造账号或房间通知，下次进入时应用。
- 房间中手动换角色会清除本次随机结果并刷新本机房间展示；保留随机开关和候选池，下次进入时重新抽选。
- 手动修改本次随机角色的皮肤会同步本次选择、账号和房间展示，不改写随机候选池；下次抽选仍使用候选池配置的皮肤。
- 成功进房后构造 `NotifyAccountUpdate`，包含选中的角色和主角色皮肤；匹配对局在 `NotifyMatchGameStart` 后构造，认证时沿用选择。
- 房间开局通知 `NotifyRoomGameStart` 只把已有选择绑定到 `game_uuid`，不抽选、不重复通知。
- `authGame` 只应用该局已绑定的选择，不补选、不生成账号通知；页面刷新丢失选择且未收到开局通知时使用固定主角色。
- 从房间进局、房间刷新和同局重连不重复构造随机账号通知；进入失败也不构造。关闭随机后，下次进入使用固定主角色。随机结果仅本机可见。
- 修改角色皮肤后派发 `NotifyAccountUpdate`；在房间中同时派发 `NotifyRoomPlayerUpdate`，刷新本机房间界面。
- 房间、牌谱、对局：应用本人装扮，将其他玩家的已有角色对象显示为满羁绊。
- 账号更新通知：移除服务器角色和主角色更新；房间和对局奖励通知按原逻辑修改。
- `.lq.FastTest.broadcastInGame`：包含整数 `emo_id` 的表情请求在本地假返回，并注入 `NotifyGameBroadcast`，保留原始 content，不发往服务器；其他广播原样发送。

服务器返回错误时保持错误响应；不重复添加背包已有物品；角色没有额外表情时使用空数组。
本地响应通过 microtask 延迟投递，让游戏先登记等待回调。装扮选择留在本地，
不会改变服务器库存或其他玩家看到的装扮。

## 状态与日志

安装后出现英语日志 `[MajsoulWS] hook.ready 0.5.1` 和 `[MajsoulWS] cosmetics.ready`。
默认只打印修改和拦截操作，每个操作一行，包含方向、消息名称、连接和请求编号：

```text
[MajsoulWS] modified response Lobby.fetchInfo [ws:1 #8]
[MajsoulWS] intercepted request Lobby.useTitle [ws:1 #9] — local response queued
[MajsoulWS] modified notify NotifyAccountUpdate [ws:1]
[MajsoulWS] local notify NotifyGameBroadcast [ws:1] — synthetic notification
```

`modified` 表示请求、响应或通知已重新编码并交给游戏或原生发送；
`intercepted` 表示请求已由本地接管，未发往服务器，已安排本地响应。
表情通知使用该连接 authGame 的本人座位号，先派发本地响应，再派发通知，仅自己可见。
若座位未知，只返回本地响应并提示 `emoji.skipped — seat unavailable`；重新进入对局后会重新记录座位。
解析或修改失败显示 `error`，标明消息、失败阶段和异常类型。普通消息保留原包透传；
已确定由本地处理的请求失败时阻断原包，返回 `error.code = 1` 的本地错误响应，不派发通知。
该错误码仅表示本地处理失败；已写入的本地设置不会自动回滚。只解析模式仍原样透传。
默认日志只显示消息元信息；开启内容调试后，匹配消息的解码内容会直接输出到 console。

```js
majsoulWS.stats
majsoulWS.readOnly = true // 只解析，跳过修改、阻断和本地响应/通知
majsoulWS.readOnly = false // 恢复修改（默认）
majsoulWS.active = false // 完全暂停，包括解析与日志
majsoulWS.active = true  // 恢复 Hook
majsoulWS.log = true  // 默认：只打印修改和拦截操作
majsoulWS.log = 'all' // 同时打印普通透传消息，标记为 pass
majsoulWS.log = false // 关闭操作与透传日志；错误警告保留
majsoulWS.debug = 'FastTest.broadcastInGame' // 按名称片段筛选内容
majsoulWS.debug = '.lq.Lobby.fetchInfo'     // 也可使用完整消息名称
majsoulWS.debug = true                    // 输出全部可识别消息的内容
majsoulWS.debug = false                   // 停止内容输出（默认）
majsoulWS.uninstall() // 停止 Hook；刷新后重新启用
```

只解析模式保留请求匹配、统计和内容调试，不调用业务 Hook，也不更新装扮、座位或房间缓存。
它不会撤销已应用的装扮。若跨过登录、换房或进局后恢复修改，建议刷新页面以重新建立状态。
切换前已拦截请求排队中的本地回复仍会完成，避免游戏等待回调悬空。

`stats.modified` 是被修改的消息数，`blocked` 是拦截的请求数，`synthetic` 是生成的本地响应数。
`localNotifications` 是实际派发的本地通知数；`debug = 'NotifyGameBroadcast'` 可以查看构造的通知内容。
`debug = 'NotifyRoomPlayerUpdate'` 可查看房间更新内容，`debug = 'NotifyAccountUpdate'` 可查看换肤的角色更新。
内容调试独立于 `log`，每条输出是一个可直接复制的普通对象，包含 `action`、`direction`、
`name`、`connection` 和 `id`。修改消息包含 `before` 和 `after`；透传或本地通知包含 `message`。
阻断请求包含 `request`、`response`，以及构造通知的 `notifications` 数组（名称和消息内容）。
这些内容都是独立快照，不随后续修改变化。已知消息直接显示裁剪定义中的字段，不附带原始字节；
无法识别或解码的消息保留 `bytes` 普通数组供检查。可右键对象选择“Copy object”复制。

不保存消息历史或内容队列，也不提供 `recent`；所有内容直接交给 console。
仅为换肤刷新保留当前房间状态；房间响应与玩家变化通知都会更新它，离房或本人被移出后清除。
房间玩家更新、准备和换装通知统一使用本地递增的 `seq`，本地换肤通知也递增；
真实通知使用 `max(服务器 seq, 本地 seq + 1)`，避免被游戏当作旧通知忽略。
房间响应初始化计数，查询当前房间不回退计数；重新进房、离房、被踢或切换账号时重置。
只解析模式不改写 `seq`；从修改模式切换到只解析模式时建议刷新，避免此前抬高的序号影响真实通知。
关闭内容调试后不再生成快照。请求编号匹配仍需保留少量元信息，不包含消息正文。
响应按每条连接自己的请求编号匹配；每条连接最多保留 4096 个等待项，
两分钟后在下一次处理协议帧时清除。

脚本约 40 KB，内置裁剪后的业务定义和 cfg；通过油猴 `@require` 加载固定版本
protobuf.js light 8.8.1，这是唯一外部运行依赖。不需要单独加载 Long，
当前选择的字段不含 64 位整数，其他字段保留原始字节。
没有完整协议表、Unity 解析器或 Lua 运行时。protobuf.js 负责编解码，未选中的字段作为原始未知字段保留。
不相关消息直接透传；修改或解析失败时交还原消息。
支持 ArrayBuffer、TypedArray、DataView，跳过文本和 Blob。

## cfg 与更新

`cfg` 和 `majsoulWS.cfg` 指向同一个裁剪配置对象，已有配置表不会被覆盖。
内置 699 个 category 为 5 或 8 的物品、124 个角色、510 个皮肤、162 个称号、
123 组表情和 160 个结局奖励，只保留 prod.js 使用的字段。
数据以相邻差值和 base36 压缩，原始数值保存在 `data/cfg-snapshot.json`。

```js
cfg.item_definition.character.map_[200001].init_skin
cfg.character.emoji.groups_[200001].map(row => row.sub_id)
```

更新资源并重建脚本，在项目根目录运行：

```powershell
python -m pip install -r requirements.txt
npm ci
python scripts/update-cfg.py
```

已有依赖时只需最后一行。需要 Python 3.10+ 和 Node.js。
更新器读取最新资源索引，发现并下载配置包，使用当前资源中的解析辅助代码离线导出，
重建用户脚本并运行配置和修改逻辑测试。完成后重新安装生成的用户脚本。
Python、UnityPy 和 Lua 仅用于构建；不会进入浏览器脚本。

`--offline` 使用已保存的资源；`--base-url URL` 指定资源目录。
`data/cfg-resources.json` 记录资源来源、包名和路径。快照不自动更新；
资源格式或消息协议变化时，需要调整对应导出或协议代码。

## 源码与测试

正式代码位于 `src/`，工具位于 `scripts/`，构建输入位于 `data/`。
修改与验证命令见 [维护说明](maintenance.md) 和 [验证记录](validation.md)。

```powershell
npm run build
npm test
npm run test:lua
```

0.4.2 修复了重复数字字段的 packed 编码兼容性，用户已确认可以进入游戏。
