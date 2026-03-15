# GeminiMate v2.3.1

## 发布摘要

- 修复思维链翻译在“完整回答完成后再显示”链路上的完成态判定错误，恢复翻译显示。
- 修复思维链翻译对响应完成信号监听不足的问题，确保回答完成后能够重新触发注入。
- 纯净模式新增对 Google AI Ultra 升级入口的移除处理，减少界面干扰。

## 核心修复

- 思维链翻译完成态不再错误绑定到 `.presented-response-container`，改为绑定到真正承载 `message-actions` 的外层响应根。
- 思维链翻译的 MutationObserver 现在会同时跟踪思维链树和整条响应树的完成态变化。
- 纯净模式会直接移除指定的 Ultra 升级入口节点，而不只是隐藏。

## 验证

- `npm run typecheck`
- `npm run build`
