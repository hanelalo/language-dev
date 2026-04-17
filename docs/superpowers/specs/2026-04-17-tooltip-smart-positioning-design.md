# Tooltip 智能定位设计

## 问题

选词翻译场景下，tooltip 固定出现在选区右下方（`rect.left + 10px, rect.top + 10px`），直接遮挡了选中的文字，用户无法看到自己选了什么。

## 方案

先隐藏渲染 tooltip，获取其实际尺寸后，在选区的上/下/左/右四个候选位置中，选择距离最近且不超出视口的位置。

## 改动范围

仅修改 `src/content/index.ts`，无新增文件、无依赖变更。

## 详细设计

### 新增 `computeTooltipPosition(tooltip, selectionRect)`

输入：已插入 DOM 的 tooltip 元素、选区的 DOMRect。
输出：`{ left: number, top: number }`。

算法：

1. 获取 tooltip 实际宽高（`offsetWidth`/`offsetHeight`）、视口宽高（`innerWidth`/`innerHeight`）、选区中心点。
2. 计算 4 个候选位置，间距 8px：
   - **上方**：tooltip 水平居中于选词，底部对齐选词顶部上方
   - **下方**：tooltip 水平居中于选词，顶部对齐选词底部下方
   - **左侧**：tooltip 垂直居中于选词，右侧对齐选词左侧左方
   - **右侧**：tooltip 垂直居中于选词，左侧对齐选词右侧右方
3. 水平/垂直方向做视口边界夹紧（clamping），保证 tooltip 不会完全溢出。
4. 过滤完全在视口内的候选位置。
5. 在有效候选中按距离排序，选最近的；若无有效候选则退化为选距离最近的原始候选（宁可部分溢出也不遮挡选词）。

### 修改 `showSelectionTooltip`

- 签名从 `(x: number, y: number, source: string, ...)` 改为 `(selectionRect: DOMRect, source: string, ...)`。
- tooltip 初始 `visibility: hidden; left: 0; top: 0` 插入 DOM。
- 调用 `computeTooltipPosition` 获取最终坐标。
- 设置 `tooltip.style.left/top`，然后设为 `visibility: visible`。

### 修改 `handleSelectionTranslate`

- 调用从 `showSelectionTooltip(rect.left, rect.top, selectedText)` 改为 `showSelectionTooltip(rect, selectedText)`。

### 修改 `doTranslate`

- 移除未使用的 `x, y` 参数，简化签名为 `doTranslate(source, tooltip, sourceDiv, translatedDiv, btn)`。
- 更新所有调用点（包括重试时的递归调用）。
