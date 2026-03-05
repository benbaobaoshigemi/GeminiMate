# 避坑指南与陷阱总结 (Pitfalls & Lessons Learned)

亲爱的 codex 开发者，欢迎接手 GeminiMate。在 V1.0 的开发过程中，我们踩过一些隐蔽但致命的坑，请务必留意：

## 1. 致命的网络拦截冲突 (InvalidStateError)
- **陷阱描述**: 用户曾反馈回复按钮失效、页面功能瘫痪。
- **病因**: 并行开发的旧工作区 (`GeminiHelper`) 中残留的 `XMLHttpRequest` 拦截脚本污染了页面。由于未判断响应类型 (`responseType='json'`) 就尝试读取 `responseText`，导致 JS 执行环境崩溃。
- **教训**: 
  - 开发阶段务必隔离工作区。当前已将 `GeminiHelper` 下的冲突脚本重命名为 `.bak`，请勿恢复。
  - 拦截 XHR 时必须严格校验 `readyState` 和 `responseType`。

## 2. 存储同步的延迟陷阱 (Storage Sync vs Local)
- **陷阱描述**: Popup 修改配置后，Gemini 页面没有任何反应，看起来像配置没生效。
- **病因**: 早期代码部分引用了 `chrome.storage.sync`，而 Popup 写入的是 `chrome.storage.local`。此外，异步加载时未提供合理的初始化 Default。
- **教训**: 
  - 插件内部**全量统一使用 `chrome.storage.local`**。
  - 在 `TimelineManager` 或 `RepairEngine` 初始化时，务必加上 `onChanged` 监听器，实现无需刷新的配置热响应。

## 3. UI 动态缩放的映射逻辑
- **陷阱描述**: 宽度滑块只调节了边框，里面的节点球体和点击热区没有变化。
- **病因**: 仅映射了单一 CSS 变量，未考虑子元素的布局联动。
- **教训**: 
  - 通过 CSS 变量 (`--timeline-dot-size`, `--timeline-hit-size`) 进行联动。
  - 调节滑块时，需要动态设置 `timelineBar.style.width`。

## 4. 参考项目 (GeminiVoyager) 的深度学习价值
- **项目地位**: 此项目不仅仅是“参考”，它是一个**高度成熟、经过生产环境验证**的标杆。它包含了大量针对极端边缘 Case 的处理（如 RTL 支持、i18n 动态平铺、高频 DOM 突变的性能节流处理）。
- **建议**:
  - **核心学习点**: 不要仅停留于逻辑实现，要深入研读它如何处理 **MutationObserver** 的性能负担，以及它如何实现“无侵入式”的 UI 挂载。
  - **样式哲学**: 它的样式隔离 (`timeline.css`) 采用了极其精湛的变量化架构，是深入学习 CSS 架构设计的顶级素材。
  - **移交建议**: 代码中已保留了与其互操作的接口，供后续开发者进行“教科书式”的对比参考。

## 5. 移交现状
- **Word 导出**: UI 已备好，逻辑点已预留，由于时间关系尚未接入具体的 docx 序列化。
- **代码整洁度**: 存在少量 TS 警告（未使用变量等），建议在下一阶段开发前进行一次微型重构。

祝后续开发顺利！
