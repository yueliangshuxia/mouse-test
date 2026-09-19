# Issue Tracker: 本地 Markdown

本仓库的 issue 和 PRD 以 markdown 文件形式存放在 `.scratch/` 下。

## 约定

- 一个功能一个目录:`.scratch/<feature-slug>/`
- PRD 位于 `.scratch/<feature-slug>/PRD.md`
- 实现类 issue 位于 `.scratch/<feature-slug>/issues/<NN>-<slug>.md`,从 `01` 开始编号
- 三分类状态记录在每个 issue 文件靠顶部的一行 `Status:` 上(角色字符串见 `triage-labels.md`)
- 评论和讨论历史追加到文件底部,放在 `## Comments` 标题下

## 当技能说 "publish to the issue tracker"

在 `.scratch/<feature-slug>/` 下新建文件(目录不存在就创建)。

## 当技能说 "fetch the relevant ticket"

读取该路径的文件。用户通常会直接给出路径或 issue 编号。
