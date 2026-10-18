# Majsoul WebSocket Cosmetics

通过原生 WebSocket 修改雀魂网页端的本地装扮显示。当前版本 **0.4.10**。

## 安装

用 Tampermonkey 安装根目录的 [majsoul-websocket-hook.user.js](majsoul-websocket-hook.user.js)，
停用之前的 prod、Lua 和 WebSocket 脚本，保存后刷新游戏。
完整保留脚本头，特别是 `@run-at document-start`、`@sandbox raw`、`@grant none` 和 `@require`。

脚本约 45 KB，唯一外部运行依赖是固定版本 protobuf.js light 8.8.1，由油猴加载。
cfg 和必要的消息定义内置；无需 Python、Node.js、Long 或 Lua 浏览器运行时。
保留旧 `vip.*` 本地设置，修改不改变服务器库存和其他玩家看到的装扮。

支持角色、皮肤、表情、称号、加载图、展示方案，以及房间、牌谱、对局和相关通知。
换肤会派发本地账号更新；在房间中还会派发玩家更新，刷新本人立绘和头像。
默认打印消息修改和请求拦截提示，可切换为全部消息日志或关闭操作日志。
`majsoulWS.debug = 'FastTest.broadcastInGame'` 可直接在 console 查看后续匹配消息的内容，无消息历史队列。
日志与具体行为见 [使用说明](docs/usage.md)。

## 目录

| 路径 | 内容 |
| --- | --- |
| `majsoul-websocket-hook.user.js` | 已生成、可直接安装的最终产物 |
| `src/` | WebSocket 传输、装扮逻辑、cfg 适配 |
| `scripts/` | 构建、资源更新、cfg 和协议导出 |
| `data/` | 脚本生成的协议、配置快照和资源来源，不纳入 Git |
| `tests/` | 消息修改、原生传输和游戏 Lua 解码器回归 |
| `docs/` | 使用、维护与验证说明 |
| `.cache/` | 下载的资源包和本机依赖，不纳入 Git |

## 构建与测试

首次构建需要 Node.js 20+、Python 3.10+，先从游戏资源生成配置、协议和测试夹具：

```powershell
npm ci
python -m pip install -r requirements.txt
npm run resources:prepare
npm run build
npm test
npm run test:lua
```

生成过资源后，日常修改只需 `npm run build` 和 `npm test`。只更新 cfg：

```powershell
npm run cfg:update
```

更新后重新安装生成的用户脚本。离线更新：

```powershell
python scripts/update-cfg.py --offline
```

依赖安装在当前 Python 环境，也兼容本机已有的 `.cache/python-libs/`。
可重建的 JSON 和 Lua 提取结果不纳入 Git；最终安装脚本继续保留。
资源与协议的维护流程见 [维护说明](docs/maintenance.md)，已验证范围见 [验证记录](docs/validation.md)。
