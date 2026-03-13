# GeminiMate Project Handover Document (V1.0 Stable)

## 1. 项目基础信息
- **项目名称**: GeminiMate
- **核心定位**: 高性能 Gemini Web 端增强件（LaTeX 修复、Markdown 补丁、可视化时间线）。
- **当前状态**: 已完成核心功能移植与深度定制，UI 采用 Glassmorphism 风格。

## 2. 工作区目录结构 (Directory Structure)
当前工作区已按以下层级整理至母文件夹 **GeminiHelper** (`c:\Users\zhang\Desktop\GeminiHelper`)：

- **母文件夹**: `GeminiHelper`
  - **我的项目**: `GeminiMate/` (核心功能代码实现区)
  - **参考项目**: `_reference/` (GeminiVoyager 成熟工程参考)
  - **移交文档**: `Handover/` (包含本说明在内的所有移交资产)
  - **其它文件**: 包含旧版备份 (`.bak`)、规划蓝图等。

> [!IMPORTANT]
> 之前的 `GeminiHelper/src` 及 `manifest.json` 已物理更名为 `.bak`，以彻底屏蔽其 XHR 拦截逻辑对项目的干扰。后期开发请仅在 `GeminiMate/` 目录下进行。

## 3. 已完成的关键修复 (针对 codex)
- **存储机制**: 全量使用 `chrome.storage.local`。消除了 Popup 与 Content Script 的同步延迟。
- **时间线自适应**: 支持 8px-32px 无级滑块，整轨 UI 宽度联动缩放。
- **XHR 稳健性**: 修复了由于拦截器未判断 `responseType='json'` 导致的页面崩溃问题。

## 4. 后续规划
- **Word 一键导出**: 已预留 UI 入口，需接入后续的 docx 处理逻辑。
- **布局微调**: 侧边栏与聊天区域的宽度动态调整功能处于 WIP 状态。

## 5. 环境要求
- **构建工具**: Vite 7 + CRXJS。
- **命令**: `npm run build` 生成 `dist` 目录进行加载。
