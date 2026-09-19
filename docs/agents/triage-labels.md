# Triage 状态词汇

技能内部使用五个固定的三分类角色。本文件把这些角色映射到本仓库实际写入的状态字符串。

| 技能中的角色 | 本仓库实际写入 | 含义 |
| --- | --- | --- |
| `needs-triage` | `待评估` | 需要维护者评估 |
| `needs-info` | `缺信息` | 等提交者补充信息 |
| `ready-for-agent` | `可交给agent` | 描述完整,agent 可无人工介入直接做 |
| `ready-for-human` | `需人工` | 需要人来实现 |
| `wontfix` | `不处理` | 不打算做 |

当技能提到某个角色(例如 "apply the AFK-ready triage label")时,使用本表右列对应的字符串。

写入位置:`Status:` 行,见 `issue-tracker.md`。
