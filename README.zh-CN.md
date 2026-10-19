# 🀄 雀幻 · Majsoul Mirage

![Version](https://img.shields.io/badge/version-0.5.1-6366f1?style=flat-square)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Tampermonkey](https://img.shields.io/badge/Tampermonkey-00485B?style=flat-square&logo=tampermonkey&logoColor=white)

[English](README.md) | [日本語](README.ja.md) | **简体中文**

用于雀魂网页端本地装扮修改的 Tampermonkey 用户脚本，当前版本 **0.5.1**。

脚本拦截原生 WebSocket 消息，解析必要的 protobuf 字段并修改本地展示，不改变服务器上的所持状态或其他玩家看到的装扮。支持以下站点匹配规则：

- `https://mahjongsoul.game.yo-star.com/*`
- `https://majsoul.union-game.com/*`
- `https://game.mahjongsoul.com/*`
- `https://game.maj-soul.com/1/*`

## ⚠️ 免责声明

**使用风险由使用者自行承担。使用本脚本可能导致账号功能受限、临时封禁或永久封禁。**

- 仅修改本地展示，不代表符合游戏规则、无法被检测或不会受到账号处罚。
- 使用前请自行确认并遵守适用的游戏规则及服务条款；如果无法接受账号无法继续使用的风险，请勿使用本脚本。
- 本项目按现状提供，不保证安全性、可用性或兼容性。在适用法律允许的范围内，作者及贡献者不对使用本脚本造成的账号处罚、数据或已购内容损失及其他损失承担责任，也不提供账号恢复或赔偿。
- 本项目为非官方项目，与游戏运营方无关联，未获其授权或背书。

## ✨ 功能

- 本地角色、皮肤、表情、称号、加载图及装扮展示方案。
- 房间、对局、账号和牌谱中的装扮显示修改。
- 本地随机角色与皮肤候选池：成功进房或收到 `NotifyMatchGameStart` 时抽选，房间选择通过 `NotifyRoomGameStart` 绑定到对局。
- 手动换角、换肤覆盖本次选择，不改写随机候选池；对局认证不重新抽选。
- 简洁英语日志，可选输出便于复制的消息对象，不保存消息历史队列。

## 🛠️ 构建

需要 Node.js 20+、Python 3.10+。首次安装依赖和获取游戏资源需要网络连接。

```sh
npm ci
python -m pip install -r requirements.txt
npm run resources:prepare
npm run build
npm test
npm run test:lua
```

构建后在根目录生成 `majsoul-mirage.user.js`。最终产物、生成的 JSON、提取的 Lua 和缓存均不纳入 Git。Python 和 Lua 仅用于构建与测试；浏览器唯一外部运行依赖是固定版本的 protobuf.js light 8.8.1，由 Tampermonkey 的 `@require` 加载。

## 🚀 安装

1. 用 Tampermonkey 安装生成的 `.user.js`。
2. 停用其他装扮 Hook 脚本，保存并刷新游戏。
3. 保留完整脚本头，特别是 `@run-at document-start`、`@sandbox raw`、`@grant none` 和 `@require`。

保留已有的 `vip.*` 本地设置。重新构建后需要重新安装生成文件。

## 🔍 调试

在游戏页面控制台运行：

控制台 API 为 `majsoulMirage`。

```js
majsoulMirage.debug = 'NotifyAccountUpdate'; // 按消息名片段筛选
majsoulMirage.debug = true;                 // 查看所有可识别消息
majsoulMirage.debug = false;                // 默认不输出消息内容
majsoulMirage.log = 'all';                  // 同时显示普通透传日志
majsoulMirage.readOnly = true;              // 解析消息，不执行业务 Hook
majsoulMirage.readOnly = false;             // 恢复修改
```

调试对象包含消息信息和修改前后内容；本地接管请求还包含响应和构造的通知。未定义消息显示原始字节。日志可能包含账号或会话信息，分享前请脱敏。若本地房间序号已被改写，切换只解析模式后建议刷新页面再比较。

## 🔧 维护

```sh
npm run cfg:update
python scripts/update-cfg.py --offline --protocol
```

第一条更新配置；第二条使用已有缓存重新生成资源。导出器会执行游戏资源中的 Lua，只使用可信输入。项目没有开发服务器。

| 路径 | 内容 |
| --- | --- |
| `src/` | WebSocket 传输、装扮 Hook、配置和协议适配 |
| `scripts/` | 资源提取、协议导出和构建工具 |
| `tests/` | JavaScript 回归及游戏原始 Lua 解码器验证 |
| `data/` | 生成的构建输入及目录说明 |
| `docs/` | 英文使用、维护与验证文档 |

详见[使用说明](docs/usage.md)、[维护说明](docs/maintenance.md)、[验证记录](docs/validation.md)和[贡献指南](AGENTS.md)。自动测试通过不代表适配未来所有游戏更新，也不能替代真实游戏界面验证。本项目与雀魂官方无关联。

## 🤝 参考与致谢

本项目主要参考了 [anosora233/majsoul-hook-mitm](https://github.com/anosora233/majsoul-hook-mitm) 的消息 Hook 与本地装扮处理思路，感谢其作者及贡献者。此致谢不代表双方存在关联或获得对方背书。
