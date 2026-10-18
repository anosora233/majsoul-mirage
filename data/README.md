# 生成数据

- `cfg-snapshot.json`：只包含正式逻辑需要的资源 ID、分类、初始皮肤和表情编号。
- `cfg-resources.json`：当前 cfg 的资源地址、包名和逻辑路径，由更新器写入。
- `game-protocol.json`：从游戏原始 Lua 描述符离线导出的协议数据；浏览器不加载整表。
- `proto-config.json`：游戏的服务方法到请求、响应类型的映射。

这些文件来自公开游戏资源，不是账号或网络消息抓包。不要手动压缩 cfg 快照；构建脚本负责压缩输出。
原始下载包在 `.cache/bundles/`，不纳入 Git。

本目录的 JSON 均不纳入 Git。运行 `npm run resources:prepare` 可完整生成，
也可运行 `python scripts/update-cfg.py --offline --protocol` 从缓存重建。
