# WebSocket Cosmetics 0.4.2

安装根目录 `majsoul-websocket-hook.user.js`，停用旧 prod、Lua 和 WebSocket 脚本，
保存后刷新 `https://game.maj-soul.com/1/`。保留脚本头中的
`@run-at document-start`、`@sandbox raw` 和 `@grant none`。

这是 prod.js 修改逻辑的 WebSocket 版本。无需手动执行控制台命令，
保留旧 `vip.*` localStorage 设置，原有页面中的装扮操作会直接使用本地选择。

- 登录、账号信息：替换本人的头像、头像框、称号、加载图等已有字段。
- fetchInfo：提供角色、皮肤、表情、称号、结局奖励、装扮物品和保存的展示方案。
- 选择角色、皮肤、称号、加载图、角色排序、隐藏角色、展示方案：保存到本地并返回本地成功响应。
- 房间、牌谱、对局：应用本人装扮，将其他玩家的已有角色对象显示为满羁绊。
- 账号更新通知：移除服务器角色和主角色更新；房间和对局奖励通知按原逻辑修改。
- emo > 9 的对局广播在本地返回成功，其余广播正常发送。

服务器返回错误时保持错误响应；不重复添加背包已有物品；角色没有额外表情时使用空数组。
本地响应通过 microtask 延迟投递，让游戏先登记等待回调。装扮选择留在本地，
不会改变服务器库存或其他玩家看到的装扮。

## 状态与日志

安装后出现英语日志 `[MajsoulWS] hook.ready 0.4.2` 和 `[MajsoulWS] cosmetics.ready`。
默认不打印每条消息，也不记录 token 或解码后的账号对象。

```js
majsoulWS.stats
majsoulWS.recent
majsoulWS.recent.filter(record => record.method === 'fetchInfo')
majsoulWS.log = true // 打开消息名称日志
majsoulWS.uninstall() // 停止 Hook；刷新后重新启用
```

`stats.modified` 是被修改的消息数，`synthetic` 是本地响应数。
`recent` 保留 100 条 `{connection, direction, service, method, id}` 元信息。
响应按每条连接自己的请求编号匹配；每条连接最多保留 4096 个等待项，
两分钟后在下一次处理协议帧时清除。

脚本约 39 KB，内置裁剪后的业务定义和 cfg；通过油猴 `@require` 加载固定版本
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
