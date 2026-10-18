# 维护

## 修改与发布

业务逻辑在 `src/cosmetic-hook.cjs`，传输层在 `src/websocket-core.cjs`，
配置适配在 `src/cfg-snapshot.cjs`。修改源码后运行 `npm run build`，不要直接编辑生成文件。
发布时修改 `package.json` 的版本，再构建、测试并保留最终产物；脚本元数据和 API 版本由构建统一注入。

`scripts/build-websocket-userscript.cjs` 生成正式用户脚本。
cfg 数字列表以差值和 base36 存储；应用代码保留变量名、注释和缩进。
协议字段以 `[名称, 编号, 标量类型或消息索引, repeated 编码]` 存储，方法映射仅保存消息索引。
`src/protocol.cjs` 在启动时还原 protobuf.js 定义；测试逐项比较还原前后的协议及方法映射。
protobuf.js 通过固定版本 `@require` 加载；更换依赖版本时同步修改元数据、开发依赖和测试中的 URL 断言。

请求 Hook 返回 `{respond:{}}` 时阻止原请求，并派发空的本地响应结束等待。
可附带 `notify:{name, message}` 或通知数组，在响应后向同一连接依次派发本地通知，不再次经过修改 Hook。
表情按 `content.emo_id` 识别，不换算 ID，不使用旧的 emo 阈值。账号和座位仅在按连接隔离的 WeakMap 中保存。
换肤按顺序派发账号角色更新及当前房间玩家更新。房间响应初始化当前状态，玩家变化通知替换它；
离房、本人不在玩家列表或账号切换时清除。复用已解码的房间消息保留未知字段，不复制 Room 的未知字段到另一种消息类型。

## 更新 cfg

```powershell
npm ci
python -m pip install -r requirements.txt
python scripts/update-cfg.py
```

更新器下载最新资源索引，按逻辑路径发现配置包，缓存到 `.cache/bundles/`，
使用当前资源中的 ExcelTool、CONST、Params 离线解析，更新 `data/cfg-resources.json`
和 `data/cfg-snapshot.json`，重建脚本并测试。
默认资源目录是 `https://game.maj-soul.com/assetbundles/DXT/`，可用 `--base-url URL` 替换。
`--offline` 使用本地缓存，缺少资源时明确报错。

只需重导出已有资源时运行 `python scripts/export-cfg-snapshot.py`。
Python、UnityPy 和 Lua 仅用于离线构建，不进入用户脚本。

## 更新消息定义

`data/game-protocol.json` 是从原始 Lua 描述符导出的完整构建输入；
`data/proto-config.json` 是服务方法与消息类型的映射。
构建时，`scripts/cosmetic-protocol.cjs` 仅选择 prod.js 逻辑需要的类型和字段。

已有 Lua 描述符可重新导出：

```powershell
python scripts/export-game-protocol.py
npm run build
npm test
npm run test:lua
```

该命令读取 `.cache/lua/*_pb.lua`，只导出已有缓存。需要从当前游戏资源完整更新时运行：

```powershell
npm run resources:prepare
```

它会按资源索引定位协议描述、Lua 解码器和方法映射，下载并提取，再生成协议与 cfg。
`python scripts/update-cfg.py --offline --protocol` 可使用本地包完整重建。
更新 cfg 本身不会自动更新消息协议。

重复数字字段必须以 packed 方式输出。当前游戏 Lua 解码器会拒绝某些合法的 unpacked
编码；不要将导出器恢复为统一的 `packed:false`。不能只用 protobuf.js 回读验证兼容性，
需要运行原始 Lua 解码器回归。

## 中间数据

`data/*.json` 和 `.cache/lua/` 均由脚本生成，不受版本管理；首次构建运行
`npm run resources:prepare`。最终安装脚本保留在 Git 中。
资源包是可重新下载的缓存，依赖通过 `package-lock.json` 和 `requirements.txt` 安装。
新日志或真实消息样本应留在 `.cache/`，不要写入受跟踪的测试夹具。
