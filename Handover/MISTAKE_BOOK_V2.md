# GeminiMate 错题本 V2（RCA + 功能对齐）

更新时间：2026-03-05  
参考基线：`C:\Users\zhang\Desktop\GeminiHelper\_reference\gemini-voyager`

## A. 这次 MathML 能成功转换的原理（必须记住）

### 1. 问题本质
- 不是“提取不到 LaTeX”，而是“剪贴板载荷被目标应用按什么通道消费”。
- `copy-success` 只代表写剪贴板 API 成功，不代表 Word 会变成公式对象。

### 2. 成功链路（本次验证通过）
1. 从页面 Math DOM 提取公式源（优先 DOM MathML，次选 TeX 转换）。
2. 清洗并重建 Word 兼容 MathML：
- 去掉 `annotation/annotation-xml`。
- 规范为 `mml:math` 根。
- `display="block"` 时，顶层 `mrow` 首元素强制包裹 `<mml:mpadded lspace="0">`。
3. 复制时主路径走富文本可被 Word 消费的 HTML 形态，保证结构不是被降成纯文本。
4. 结果验收以“Word 内可编辑公式块”为准，而不是控制台 `copy-success`。

### 3. 这次实测的关键判定日志
- `hasWordBlockCompat: true`
- `word-mathml-final-snapshot` 中存在 `mpadded lspace="0"`
- `word-mathml-html-snapshot` 可见 `<math ...>` 结构

### 4. 经验规则
- 复制类问题必须同时检查三层：
1. `text/plain` 内容
2. `text/html` 内容
3. 目标应用粘贴后的对象类型（文本 vs 公式对象）

---

## B. NanoBanana 水印移除：实现与交互（参考项目）

## 1) 功能入口与开关
- Popup 开关键：`geminiWatermarkRemoverEnabled`
- UI 位置：`Popup.tsx` 中 NanoBanana 区块（Safari 隐藏）
- Content 启动：`src/pages/content/index.tsx` 调用 `startWatermarkRemover()`

## 2) 运行机制（双世界协作）
1. **MAIN world**（注入脚本）：
- 文件：`public/fetchInterceptor.js`
- 拦截 Gemini 下载请求（`rd-gg-dl`），改写到原图尺寸 `=s0`。
- 通过隐藏桥元素 `#gv-watermark-bridge` 与 content world 通信。
2. **Content world**：
- 文件：`src/pages/content/watermarkRemover/index.ts`
- `WatermarkEngine.create()` 载入算法资源并处理图片。
- 处理两条路径：
  - 预览图替换（页面上直接显示去水印图）
  - 下载拦截处理（下载前去水印）

## 3) 交互表现
- 下载按钮角标（🍌）提示该图下载会去水印。
- 下载过程 Toast：下载中 / 处理中 / 成功 / 错误。
- 新图片出现时由 `MutationObserver` 自动处理。

## 4) 工程约束
- Safari 因拦截限制隐藏该功能（参考项目已有分支判断）。

---

## C. 引用回复：实现与交互（参考项目）

## 1) 功能入口与开关
- Popup 开关键：`gvQuoteReplyEnabled`
- Content 启动：`src/pages/content/index.tsx` 读取开关后条件启动 `startQuoteReply()`

## 2) 运行机制
- 文件：`src/pages/content/quoteReply/index.ts`
- 监听文本选择（`mouseup` + `keyup` + debounce）。
- 选中正文后显示浮动按钮 `gv-quote-btn`，位置跟随选区首行。
- 点击按钮后：
1. 自动展开输入框（与 inputCollapse 协同）
2. 按行加前缀 `> ` 生成引用块
3. 适配 `textarea` 与 `contenteditable` 两套插入路径
4. 派发 `input` 事件，确保框架状态同步

## 3) 交互细节
- 仅在主内容区显示，不在侧边栏/导航区误触发。
- 选择为空或折叠时自动隐藏。
- 语言切换后按钮文案动态更新。

---

## D. GeminiMate 当前真实状态（对照后确认）

## 1) 已有
- Popup 中已存在两个开关：
  - `geminiWatermarkRemoverEnabled`
  - `gvQuoteReplyEnabled`
- 读写存储逻辑存在。

## 2) 缺失（核心）
- `GeminiMate/src/pages/content` 仅有 `index.tsx` 一个文件。
- 未发现 `quoteReply/` 与 `watermarkRemover/` 目录及实现。
- 当前 content 初始化仅启动了：
  - RepairEngine
  - FormulaCopy
  - Timeline
- 结论：现在是“有 UI 开关、无功能实现”的状态（且 Popup 中这两个项为 `disabled`）。

---

## E. 防止“只移植逻辑不移植 UI / 只移植 UI 不移植逻辑”的强制清单

每个功能移植必须 6 项全部打勾：

1. `UI层`：Popup 有开关 + 文案 + 可操作状态（非假开关）。
2. `存储层`：默认值、读写域（local/sync）和键名统一。
3. `启动层`：content 入口按开关条件启动/销毁功能。
4. `行为层`：核心服务可运行且有最小错误处理。
5. `反馈层`：用户可见状态（按钮/角标/Toast/禁用提示）。
6. `验收层`：给出“结果态”日志和可见验收步骤。

---

## F. 后续执行建议（本项目专用）

1. 先对齐 `quoteReply` 与 `watermarkRemover` 的**完整链路**，再开放 Popup 的 `disabled`。  
2. 先迁移功能，再迁移样式，最后做主题融合；避免“看着有按钮，实际不工作”。  
3. 每个功能单独写一页“交互验收脚本”（手测步骤 + 预期结果 + 失败日志点）。  
