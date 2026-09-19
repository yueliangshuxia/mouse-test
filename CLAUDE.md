# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目

在线鼠标测试工具站。面向中国大陆用户,纯浏览器实现,无需安装驱动。目标正式上线做流量,所以要 SEO,也要把"测不准"如实说出来。

全站规划 10 个工具,现已全部实现。`src/lib/tools.ts` 里的 `ready` 字段仍然保留:**`ready: false` 的项只出现在首页,不生成链接**——以后加新页面时先占位、写好再翻成 `true`,免得上线一个空链接。

## 技术栈

Astro(静态输出)+ 原生 TypeScript。**热点路径不引入任何框架**——鼠标事件采样、统计计算、Canvas 绘制全部是原生 TS。

## 开发

启动开发服务器时使用后台模式:

```
astro dev --background
```

用 `astro dev stop`、`astro dev status`、`astro dev logs` 管理后台服务器。

```bash
npm run dev        # 开发服务器
npm run build      # 构建静态产物到 dist/
npm run typecheck  # astro check,应保持 0 error / 0 warning / 0 hint
npm test           # Vitest 单次运行
npm run test:watch # Vitest 监视模式
```

跑单个用例:

```bash
npx vitest run -t "1000Hz"           # 按用例名匹配
npx vitest run tests/analysis.test.ts
```

改动后的验证顺序:`npm run typecheck` → `npm test` → `npm run build` → **真浏览器截图**。

最后一步不是可选项,构建通过**不说明看起来对**。曾有一版:报头在每一页都塌成三行;`.rate-chart` 没数据时渲染成一块像坏掉的灰槽;`--border` 对比度低到等于没画,于是 3000px 的长页读成一整片灰。三条全是截图看出来的——而在此之前逐行读过好几轮 CSS,一条都没发现,每次都判成"应该没问题"。

原因是 CSS 是声明式的,读起来天然像对的;而对比度、折行、空状态是**渲染之后才有的事实**,推理不出来。**要尺寸就去量,别算**(中文的字宽尤其难估),拿不准的地方 `Runtime.evaluate` 读 `getBoundingClientRect()`。

截图:headless Chrome 开 `--remote-debugging-port=9222`,配合 `astro dev` 的 4321;整页用 `Page.captureScreenshot` 的 `captureBeyondViewport`,深色用 `Emulation.setEmulatedMedia` 模拟 `prefers-color-scheme`。每轮至少覆盖**桌面 1440 / 窄屏 420 × 浅色 / 深色**——**深色必须单独看**,漏一个令牌在浅色下完全看不出来。

`astro.config.mjs` 里的 `devToolbar: { enabled: false }` 关掉了 Astro 自带的开发工具栏:它和站点自己的底部悬浮条(`.site-dock`)会叠在视口底部正中央的同一个位置,开着的话开发时分不清哪个是哪个。**只影响 `astro dev`,对 `dist/` 无影响。** 改这条要**重启**才生效,它不热重载。

npm 已配置国内镜像(`.npmrc` → `registry.npmmirror.com`)。

## 架构

分层**按"能不能测"切,不按页面切**:

| 模块 | 职责 | 验证方式 |
| --- | --- | --- |
| `src/lib/sampler.ts` | 采样。回调和 `push()` 里**只往预分配的 TypedArray 写数**,不碰 DOM、不绘制、不统计 | 真机手测 |
| `src/lib/analysis.ts` | 全部统计与判据,**纯函数** | `tests/analysis.test.ts` |
| `src/lib/renderer.ts` | Canvas 轨迹,rAF 循环读缓冲区 | 真机手测 |
| `src/lib/capabilities.ts` | 启动时能力探测,产出面向用户的告警 | 真机手测 |
| `src/lib/side-buttons.ts` | 拦截侧键触发的前进/后退 | 真机手测 |
| `src/lib/ruler.ts` | **"沿尺子推一段固定距离"的手势流程**,DPI 测试与加速度测试共用 | 真机手测 |
| `src/lib/keyboard-layout.ts` | 键位布局数据,键盘页的 frontmatter(画键帽)和 `<script>`(`code` → 标签)共用 | — |
| `src/lib/theme.ts` | 主题常量。同上,**被两个世界同时消费**:`<head>` 里那个阻塞脚本(不能 `import`)和 `ui.ts` 的开关 | — |
| `src/lib/ui.ts` | 页面脚本共用的 DOM 工具。`setText` 那条"写入前比较"的约定就靠它统一 | — |
| `src/lib/tools.ts` | 工具注册表 —— 导航、首页索引、结构化数据的唯一事实来源 | — |
| `src/styles/global.css` | **全站样式与两寄存器设计系统**。改界面之前必须先读懂它的机制,见下面「样式」两节 | 真机手测 |

`ruler.ts` 和 `sampler.ts` 一样是**薄的**:它只界定一次手势的起止,不做任何换算。像素换算成 DPI 是 `estimateDpi` 的活,那边有单测。

采样层必须这么薄的原因:1000Hz 下回调每秒跑 1000 次,里面放任何 DOM 操作都会直接拖垮测量精度——**我们要测的东西会被自己的代码污染**。缓冲区用 TypedArray 而非对象数组同理:后者产生的短命对象会引发 GC 停顿,而那几毫秒会被如实记录成"丢帧"。

**贯穿全站的原则:测不准就明说,不要给一个看起来精确的假数字。** 这是这类工具站的信誉所在。

### 样式:两个寄存器

`src/styles/global.css` 不只是"一堆类名",它有一套**机制**。改界面之前先读它的文件头。要点:

- **纸面**(`:root`)放文档:正文、表格、FAQ、日志、判定横幅、统计面板。**仪器窗**(`.well`)放"正在出数的那个面":深底、磷光绿。归类只有一句话:**它是"波形/脉冲/亮度"的实时呈现,还是文字与结论?** 深色因此不是"整页的底色",而是一个**有含义的记号**——扫一眼就知道哪里是活的。
- **纸面走无彩色,是这套系统成立的前提。** 全站只有三处有颜色:仪器窗的磷光绿 `#5ed69b`、警告赭黄、故障朱砂。纸面自己(底、字、线、强调)一律无色相。这样"哪里是活的"不需要靠对比去判断——**有颜色的地方就是在出数**,一眼可见。所以**不要给纸面加任何带色相的东西**(曾有一个墨蓝强调色和一个墨蓝轨迹遮罩,都因此去掉了:一个有色相的轨迹会喧宾夺主,盖过真正的读数)。
- `.well` 在子树里把**通用令牌名**(`--bg` / `--text` / `--accent` …)**整套**重指到 `--well-*`。所以页面 `<style>` 里带 `data-astro-cid` 的高优先级规则(`.cps-live__count { color: var(--accent) }`)落进仪器窗会**自动**变绿,不需要写第二套。**代价是重映射必须完整**:漏掉任何一个名字,它在井里就还是纸面的值,而 `var()` 解析失败是**静默**的——继承类属性会变成 inherit(颜色不对但看得见),简写属性会整体回落到初始值(`border: 1px dashed var(--border)` 直接变成没有边框)。**加新令牌时记得同步加进 `.well`。**
- 语义色在纸面和仪器窗里是**两个色值**,所以图例文字和它指的那块**必须在同一个寄存器里**。`.rate-chart` / `.strip` 看着像仪器却留在纸面,就是为了这个(它们的图例文字是纸面的)。判断标准不是"像不像仪器"。
- 纸面只有**一个**强调色,而它就是**墨色本身**(浅色 `#16181a` / 深色等于 `--text`),正常态、选中态、焦点环、链接共用它;语义位是墨色(正常)/ 赭黄(警告)/ 朱砂(故障)。**"正常"不另开一个绿色**——绿色是仪器窗的,不是纸面的。改这个值要**同时**看深色:深色里它指向 `--text`,因此 `color: var(--accent)` 一类的规则在深色下等于没写,`hover` 只能用底色或下划线来表达(见 `.brand`)。
- **结构全靠 1px 细线**,没有卡片、没有阴影、没有渐变。所以 `--border` 的对比度不是审美问题:它掉了整个版面就没有骨架(浅色 `#bcc7ce` / 深色 `#24282d`,别再调浅)。深色下这条更吃紧——`#24282d` 压在 `#0b0c0e` 上只有约 1.3:1,细线是**唯一**的结构记号。
- **深色里仪器窗的边界只能靠边框,不能靠填充色。** 这是量出来的:井 `#050506` 压在纸面 `#0b0c0e` 上只有 **1.03:1**,往深挖和往上抬(试过 `#101214`)都是 1.03:1——近黑区间里两个平面靠填充**根本分不开**。所以 `--well-border`(`#2e3034`)必须比别处的线重,它得独自把"这里有一口井"说出来。别因为"线看着有点亮"就调回去。
- 没数据时**不画空槽**。110px 的灰槽会被读成"组件没加载出来",而不是"还没测"——见 `.rate-chart:empty` 收成一条基线。

### 样式:主题

三档(**跟随系统 / 浅色 / 深色**),默认跟随系统。机制在 `theme.ts` 的文件头,一句话概括:**`localStorage` 存的是偏好(`auto|light|dark`),写到 `<html data-theme>` 上的永远是解析后的结果(`light|dark`)**。

所以 CSS 里只有**一个**深色选择器 `:root[data-theme='dark']`(0,2,0,直接压过 `:root`,不依赖源码顺序),**刻意没有** `@media (prefers-color-scheme: dark)` 的令牌块——写两份迟早漂移,而且会让 `auto` 变成 CSS 里一个**不存在的状态**,以后加令牌必然漏一份。系统偏好只在**一个地方**被读取:那个阻塞脚本。

- 首帧不能闪白,所以定主题的脚本是 `is:inline` 的**阻塞**脚本(`BaseLayout.astro` 的 `<head>`)。Astro 默认的 `<script>` 是延迟执行的 module,等它跑起来首帧已经画完了。
- `<meta name="theme-color">` 由同一个脚本一并改(手机状态栏)。它的色值在 `theme.ts` 里,**必须和 `global.css` 的 `--bg` 保持一致**。
- `theme.ts` 是「页面约定」里那条"frontmatter 变量在 `<script>` 里不存在"的**第二个实例**:一个值要在"能 import 的世界"和"不能 import 的世界"两边一致,就抽模块,别手抄。

## 回报率测量的硬约束

以下几条都是实测逼出来的,**不要凭直觉"优化"回去**:

1. **只用计数类结论。** 浏览器会拖延事件的**派发**,但**不会丢报文**,所以"样本数 ÷ 时长"是无偏的。间隔则不可信:浏览器时间戳是它**处理到这条消息的时刻**,不是硬件上报的时刻,实测有 **0.3–0.6ms** 的批处理涂抹(原生 Raw Input 只有 ±2µs),而 1000Hz 的周期只有 1ms——一个完全正常的间隔,光靠这点延迟就能越过任何"偏长"的门槛。
2. **因此抖动、掉包比例、长尾、核心离散度、上报周期这几类指标是被刻意删掉的**,不是没来得及做。它们会让一只好鼠标稳定报出百分之几的掉包率;把门槛往上调只是把假象藏起来,治不了根。要加新指标前先问一句:它的输入是**计数**还是**间隔**?
3. **中途停顿必须切段。** 用户松手换方向时不产生任何事件,缓冲区里留下一个几百毫秒的空档。不切段直接平均,一个 500ms 的停顿混进 2000 个 1ms 的间隔里就能把 1000Hz 拖到 800Hz,而跌多少完全取决于用户什么时候松手——这正是"每次测都不一样"的成因。见 `analyzeSegments()`。
4. **绝不能同时监听 `pointerrawupdate` 和 `pointermove`。** 规范保证两者在任一时段的合并列表等价,同时挂会让每个采样被数两遍,Hz 直接翻倍。采样层用"谁先到谁赢"选通道,`start()` 按**已敲定的结果**挂监听——改这段要格外小心。
5. **峰值取互不重叠窗口的最大值,不用滑窗。** 滑窗让相邻窗口高度相关,等于对同一段数据反复抽样取最大,峰值会被系统性抬高。峰值天生略高于真值,这是概念性质不是 bug,页面上也照实说明。

## 其余测量项的硬约束

回报率那五条是"间隔不可信"的推论。其他测量项各有各的坑,同样是刻意设计,不要凭直觉改回去:

- **CPS 峰值反过来必须用滑窗**(`computeCps`)。和回报率峰值看似矛盾,其实是两回事:回报率峰值是对**稳态**的估计,滑窗会系统性抬高它;而"CPS 峰值"是一个定义在数据上的确定量——"任意 1 秒内最多点击几次"——滑窗算出来的就是它的定义值。
- **CPS 平均值的尾部空闲必须由计时器显式提供。** 点击后停手不产生任何事件,"那一段空了多久"在时间戳里根本不存在。从时间戳推出来的 duration 会让"突发 20 次然后停 5 秒"平均出 20 CPS。所以 `computeCps` 收一个 `durationMs`,由页面上的计时器给。
- **CPS 页"点一下就开局"必须配一道结算冷却**(`RESTART_LOCK_MS`)。测试面不再需要先按开始,代价是结算那一刻手还在惯性连点——实测一台 20 CPS 的机器从结算起不停按,会在 **872ms** 后把刚出的成绩直接抹掉、原地开第二轮。而人自己收手只多出 1–3 下(约 50–150ms),所以 900ms 锁对人是六倍余量。改小这个数之前先想清楚:它保护的不是"好看",是**成绩还读不读得到**。`重置` 会清掉锁,按了就得立刻能开局。
- **滚轮只有方向可靠。** `deltaMode` 只说"像素/行/页",从不说"一格是多少"。`normalizeWheelDelta` 的换算是**启发式**,页面上给的格数是估算值;`typicalDelta`(原始 deltaY 的众数)比任何换算后的数都诚实。
- **轨迹跳变 ≠ 丢帧。** 传感器漏点和你手甩快了在数据上是同一个样子,浏览器拿不到报文序列号,区分不了。判读看**形态**:一串均匀小间距里冒出的**孤立尖峰**才是丢帧,连续一串变大是手快。所以 `detectTrailJumps` 同时给两个数——`jumps`(超线间隔总数,含连着出现的)和 `isolated`(自己超线、左右**两个**邻居都没超,首尾不参与)。**标题栏必须是 `isolated`**:`jumps` 里混着"手甩快了"的连续隆起,把它当结论端出去,就等于一边讲"跳变不等于丢帧"一边给一个分不清两者的数。
- **拖拽瞬断只能叫"疑似"。** 中途断一下就是一次 `pointerup` 加一次 `pointerdown`,和真的松开再按完全一样。只能用行为特征反推(见 `REPRESS_WINDOW_MS` / `REPRESS_RADIUS_PX`),而行为特征不是铁证。
- **键盘一律用 `KeyboardEvent.code`** 定位,不用 `key`——后者随修饰键和输入法变。另外失焦时要**补发合成的松开事件**(`keyboard-test.astro` 的 `clearHeld()`),只清 DOM 高亮的话统计量会一直挂着一个不存在的故障。
- **静止漂移测试里"采样数为 0"是最好的结果,不是"没有数据"。** `measureDrift` 对空区间返回 `null`(表示样本不足),照搬会把结论说反,所以 `trail-test.astro` 对 `n === 0` 单独处理。
- **但"0 个采样"必须先被证明是有意义的。** 指针不在窗口里、鼠标没接上,页面同样一个事件都收不到——和"鼠标很安静"在数据上完全一样,结论却相反。所以漂移测试分三段(`DriftPhase`):`arming` 先等**第一个**采样到来,证明这个装置是活的;`settling` 等采样数不再增长,确认用户停手;`measuring` 才 `reset()` 开真正的 5 秒窗口。`arming` 超时(`ARM_TIMEOUT_MS`)就如实报"没收到信号",**不能**悄悄判成静止。同理,漂移的采样面必须是**整个文档**而不是测试区:用户把手从鼠标上拿开时,指针正停在"开始"按钮上,而那个按钮在测试区外面——采样面只取测试区的话,缓冲区永远是空的,一只坏鼠标也会拿满分。

## 浏览器 API 的坑

- **组合按键(chorded buttons)。** `pointerdown` 只在指针从"无键按下"进入"有键按下"时派发一次,`pointerup` 只在**最后一个键**松开时派发。中间的每次按下/松开都走 `pointermove`。所以按键状态只能从 `event.buttons` 位掩码逐位 diff 得出,**用 `event.button` 会漏掉组合键的第二次按下和第一次松开**。实现见 `src/pages/button-test.astro`。
- `MouseEvent.button` 的编号与 `MouseEvent.buttons` 的位序**不一样**:中键和右键是反的。翻译表见 `button-test.astro` 的 `BIT_FOR_CODE`。
- **两次输入事件之间的间隔必须取 `event.timeStamp`,不能取处理函数里的 `performance.now()`。** 浏览器会把攒在一起的事件放进**同一个任务**里派发,那一刻两个处理函数几乎是同时跑的,`performance.now()` 的差会塌到 0。对本站这直接等于造假:一次正常的人手双击会被算成 0 毫秒报成"连击",一次正常的松手再按会落进 30ms 窗口报成"瞬断"。`event.timeStamp` 是事件自己带的时刻,不吃这份派发延迟(剩下的批处理涂抹在 0.6ms 量级,对本站几十毫秒起的门槛可以忽略)。
  反过来,**"一段按住/经过了多久"用 `performance.now()`**——按住不动不产生任何事件,只有墙钟知道过了多久(`hold-drag-test.astro` 的实时秒数、`keyboard-test.astro` 的按住时长)。两者同源,可以直接相减。
  判断标准就一句:**量的是"两个事件之间"还是"一段墙钟时间"**。
- **指针捕获会把 `click` 一并重定向到捕获元素。** 所以当采样面是整个文档时,`capture` 必须关掉,否则页面上的按钮会全部失效。
- `pointerrawupdate` 与 `getCoalescedEvents()` 需要安全上下文(Chrome 142+ 强制)。非 HTTPS 页面上回报率测试直接失效,能力探测会告警。
- 部分 Firefox 把合并事件的 timestamp 设为 0(采样层的 `aggregate` 模式)。此时只能给平均回报率,分窗口的峰值和波动都做不了,页面必须如实降级而不是硬算。

## 页面约定

- Astro 的 `<script>` 默认就是 TypeScript,不需要 `lang="ts"`,会被打包成外链 module。
- `<style>` 默认作用域化。要选 `html` / `body` 得用 `:global(...)`(见 `polling-rate-test.astro` 的 `html.is-testing`)。
- Canvas 配色从 CSS 变量读(`--trail-color`),不要在 TS 里硬编码颜色,否则主题切换后画布和界面会脱节。`renderer.ts` 里那个兜底常量是唯一的例外(`--trail-color` 读不到时用),它**必须和 `global.css` 的 `--trail-color` 同值**——两处都是绿色,改了一处忘了另一处,只有画布会错,界面上看不出来。同理 `theme.ts` 的 `THEME_COLORS.dark` 必须等于深色的 `--bg`。
- 回报率页的轨迹画布是 `position: fixed; z-index: -1`,铺满视口压在正文下面。**这依赖 body 的底色被传播到根元素去画**(`html` 自己没有 background)。给 `html` 加背景会让轨迹被整片盖住。
- 频繁刷新的 DOM 文本写入前先比较再赋值。每轮无条件写 `textContent` 会触发样式重算,而**这份开销本身会被如实测成丢帧**。这条约定由 `src/lib/ui.ts` 的 `setText` / `setStat` / `setBadge` 统一提供,**页面脚本一律用它们,不要各写一份**——散成十份副本的话,迟早有一份被"优化"掉。
- `.ref-table` 的**第一列**是各表共同的"短等宽值"位(档位、区间、指标名),全局按等宽 + `white-space: nowrap` 排版。**第二列默认是普通文字**;只有第二列确实是数值的那两张表(DPI、回报率)自己在 `<table>` 上加 `.ref-table--kv` 才是等宽。早先的写法是全局把第二列当等宽值,逼得另外四张中文表在页面里各写一份 `<style>` 覆盖——**已经改掉了,别再退回去**。
- Astro 的 frontmatter 变量在 `<script>` 里**不存在**(脚本被单独打包成外链模块)。两边都要用的常量要么从一个模块导入(`keyboard-layout.ts`、`theme.ts` 就是这么来的),要么在脚本里重算一遍并写明原因。
- **FAQ 答案里的 `**强调**` 必须走 `faq.ts` 的两个函数**,不能直接 `{item.a}`。答案在 frontmatter 里是普通字符串,而 `{...}` 是**转义输出**、不是 markdown——直接插值的话 `**` 会原样显示成星号(六个页面都中过招,装了才发现)。渲染用 `faqHtml`(配 `set:html`),JSON-LD 用 `faqText`(去掉标记),两处都从同一份原文出发,不会漂。
- 页面 `<style>` 的规则会被加上 `data-astro-cid-*` —— **是选择器带 cid,元素不带**。所以 `global.css` 里写 `.cps-live { … }` 照样命中那些元素,四页共用的实时读数定位才能收在一处。反过来,**没有 `<style>` 块的页面**(如 `button-test.astro`)**一条本页规则都没有**,它全部长相都只能在 `global.css` 里改;而 `ui.ts` 在运行期拼出来的节点(`.notice`)连页面 `<style>` 都够不着。

## 部署(尚未开始)

- `astro.config.mjs` 的 `site` 还是 `https://example.com`,上线前要换成备案域名。另外两处占位:`public/robots.txt` 的 Sitemap 行、`src/pages/index.astro` 的 JSON-LD。
- `astro.config.mjs` 里的 `server.headers` **只作用于 `astro dev` / `astro preview`,对 `dist/` 完全无效**。它的存在只是为了让本地开发就能拿到跨域隔离,好验证高精度那条路径。
- 上线时 COOP/COEP 必须由托管方发出。国内平台不认 `public/_headers`(那是 Cloudflare/Netlify 的格式,会被当普通文件发布),需要用 Nginx `add_header ... always;`(必须带 `always`,否则 404 等响应不带)或平台自己的响应头配置。

## 文档

完整文档:https://docs.astro.build

动手前先查阅相关指南:

- [添加页面、动态路由或中间件](https://docs.astro.build/en/guides/routing/)
- [使用 Astro 组件](https://docs.astro.build/en/basics/astro-components/)
- [添加样式](https://docs.astro.build/en/guides/styling/)
- [站点地图与 SEO](https://docs.astro.build/en/guides/integrations-guide/sitemap/)

## Agent skills

### Issue tracker

Issue 和 PRD 以 markdown 文件存放在 `.scratch/<feature-slug>/`。详见 `docs/agents/issue-tracker.md`。

### Triage labels

五个三分类角色,映射为中文状态字符串,写在 `Status:` 行。详见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文布局:约定 `CONTEXT.md` + `docs/adr/` 位于仓库根目录 —— **注意这两个目前都还不存在**,配的是位置不是既有文件。详见 `docs/agents/domain.md`。
