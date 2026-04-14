# 网页翻译浏览器插件 — 设计文档（Brainstorming 结论版）

## 1. 目标与范围

### 1.1 产品目标

构建一个 Chrome Manifest V3 扩展，提供稳定的网页翻译体验。首版以“整页翻译优先”为核心，兼顾可扩展的多引擎能力与 LLM 领域 Prompt 能力。

### 1.2 已确认的关键决策

- MVP 优先级：整页翻译优先（划选翻译降级到次要能力）
- 整页呈现样式：原文保留，译文直接插在原文下方（紧凑样式）
- 默认翻译范围：当前页面全部可见文本节点
- LLM 领域 Prompt：首版即支持
- 失败策略：不自动切换引擎，仅提示失败并保留可重试能力

## 2. 方案对比与选型

### 2.1 方案 A：Background 中心编排（推荐）

- Content Script 仅负责 DOM 抽取与渲染
- Background 统一处理队列、重试、限流、缓存、Prompt 组装

优点：
- 架构边界清晰，易扩展多引擎/多模型
- 故障处理和可观测性集中

代价：
- 消息链路较长，首版实现量中等

### 2.2 方案 B：Content Script 主导

优点：
- 实现路径短，开发快

缺点：
- 队列、重试、缓存与配置耦合严重，后续扩展成本高

### 2.3 方案 C：整页与划选双通道并行

优点：
- 可兼顾不同交互延迟诉求

缺点：
- 两套链路并存，首版复杂度偏高

### 2.4 最终选型

选择方案 A（Background 中心编排），与“整页优先 + 全量节点 + LLM Prompt 首版支持 + 可控失败策略”最一致。

## 3. 总体架构

三层通过 Chrome Message API 通信：

- UI 层（Popup / Options）
- Background 层（Service Worker，翻译编排核心）
- Content Script 层（DOM 抽取 + 页面渲染）

### 3.1 主流程（整页翻译）

1. Popup 触发“翻译当前页”
2. Content Script 扫描页面全部可见文本节点并分段
3. Content 按批提交到 Background
4. Background 调度当前引擎执行翻译；LLM 分支注入领域 Prompt
5. Background 回传批次结果
6. Content 按段落状态渐进渲染（灰 -> 绿 -> 紫 / 红）

### 3.2 翻译状态视觉规范

- 灰色：等待中
- 绿色：翻译中
- 紫色：已完成
- 红色：失败

## 4. 组件与职责

### 4.1 `content/dom-extractor`

- 扫描可见文本节点并过滤非翻译节点
- 生成稳定 `segmentId`
- 输出：`[{ segmentId, text, xpath, order }]`

### 4.2 `background/translation-orchestrator`

- 批次切分、并发控制、超时、重试退避、结果聚合
- 统一上报进度与失败原因

### 4.3 `background/engine-registry`

- 管理 `TranslateEngine` 实现注册与调用
- 对外提供统一 `translateBatch()`

```typescript
interface TranslateEngine {
  name: string;
  type: "api" | "llm";
  translate(
    text: string,
    sourceLang: string,
    targetLang: string,
    options?: TranslateOptions
  ): Promise<string>;
  batchTranslate(
    texts: string[],
    sourceLang: string,
    targetLang: string,
    options?: TranslateOptions
  ): Promise<string[]>;
  isConfigured(): boolean;
}
```

### 4.4 `background/prompt-builder`（LLM 专用）

- Prompt 组装顺序：
  - 基础系统 Prompt
  - 领域 Prompt（可选）
  - 用户自定义指令（可选）
- 输出单一 system message，保证可追踪

### 4.5 `background/config-store`

- 统一读写 `chrome.storage.local`
- 敏感信息（API Key）仅 local，不走 sync

### 4.6 `content/translation-renderer`

- 按“原文下方直出译文”样式渲染
- 保证幂等更新：同一 `segmentId` 不重复插入

## 5. 消息协议

- `START_PAGE_TRANSLATION`：Popup -> Content
- `SUBMIT_SEGMENTS_BATCH`：Content -> Background
- `BATCH_RESULT`：Background -> Content
- `TRANSLATION_PROGRESS`：Background -> Popup
- `TRANSLATION_ERROR`：Background -> Popup / Content

## 6. 翻译范围与过滤规则

### 6.1 默认翻译节点

- `<p>`, `<div>`, `<span>`, `<li>`, `<td>`, `<h1>`~`<h6>`, `<a>` 的可见文本

### 6.2 默认跳过节点

- `<code>`, `<pre>`, `<input>`, `<textarea>`, `<script>`, `<style>`
- 带 `translate="no"` 的节点
- 已翻译且带内部标记的节点

## 7. 错误处理与重试策略

| 错误类型 | 处理策略 |
| --- | --- |
| API Key 无效 | 当前任务终止并提示用户检查配置 |
| 网络超时/临时失败 | 单段自动重试 2 次（指数退避） |
| 配额耗尽 | 不自动切引擎，提示用户更换引擎或稍后重试 |
| DOM 解析异常 | 当前段标红失败，不阻断其他段落 |

补充策略：
- 提供“仅重试失败段落”入口（首版建议纳入）
- 局部失败不阻断整体任务

## 8. 数据存储结构（`chrome.storage.local`）

```json
{
  "settings": {
    "sourceLang": "auto",
    "targetLang": "zh-CN",
    "defaultEngine": "deepl",
    "selectionTranslate": true,
    "currentDomain": "it"
  },
  "engines": {
    "google": { "apiKey": "google-example-key" },
    "deepl": { "apiKey": "deepl-example-key", "plan": "free" },
    "baidu": { "appId": "baidu-example-appid", "secretKey": "baidu-example-secret" },
    "custom": { "endpoint": "https://api.example.com/translate", "headers": { "Authorization": "Bearer example-token" } }
  },
  "llmProviders": {
    "openai": { "apiKey": "openai-example-key", "model": "gpt-4o", "baseUrl": "https://api.openai.com/v1" },
    "anthropic": { "apiKey": "anthropic-example-key", "model": "claude-3-5-sonnet-latest" },
    "gemini": { "apiKey": "gemini-example-key", "model": "gemini-2.5-pro" },
    "custom": { "apiKey": "custom-example-key", "model": "custom-llm-model", "baseUrl": "https://llm.example.com/v1" }
  },
  "domains": [
    {
      "id": "it",
      "name": "IT/技术",
      "builtin": true,
      "prompt": "你是专业 IT 技术文档翻译专家，保持术语一致并保留缩写。"
    },
    { "id": "legal", "name": "法律", "builtin": true, "prompt": "使用正式法律语言，保持条款与术语精确对应。" },
    { "id": "medical", "name": "医学", "builtin": true, "prompt": "使用规范医学术语，避免口语化表达。" },
    { "id": "finance", "name": "金融", "builtin": true, "prompt": "保留金融专有名词，强调数值与单位准确性。" },
    { "id": "gaming", "name": "游戏", "builtin": true, "prompt": "保留游戏语境和术语，语气自然且可读。" },
    { "id": "literature", "name": "文学", "builtin": true, "prompt": "优先保留文风和修辞，同时确保语义忠实。" },
    { "id": "user-custom-1", "name": "我的领域", "builtin": false, "prompt": "按用户指定术语表翻译，优先保证一致性。" }
  ]
}
```

## 9. 测试策略

### 9.1 单元测试

- `prompt-builder` 组装正确性
- 批次切分与重试退避算法
- 状态流转（等待/进行中/完成/失败）

### 9.2 集成测试

- Popup -> Content -> Background 消息链路
- 多引擎调用与异常回传

### 9.3 手工验收

- 长文页面（性能与渐进渲染）
- 含代码块页面（过滤规则）
- 网络波动/API 配额场景（重试与失败提示）

## 10. MVP 边界与里程碑

### 10.1 MVP（V1）必须包含

- 整页翻译主链路（全可见节点）
- 译文紧跟原文下方渲染
- 单引擎运行 + Popup 快速切换
- LLM 领域 Prompt（含内置领域）
- 失败重试 + 明确失败提示（不自动切引擎）

### 10.2 V1 可降级项

- 划选翻译仅保留基础弹窗能力
- IndexedDB 持久缓存可后置（先内存 LRU）

### 10.3 V2 候选

- 自动备用引擎切换
- 动态页面增量自动翻译
- 更细粒度术语表与领域模板市场

## 11. 技术栈

- 构建工具：Vite + CRXJS
- UI：React 18 + TypeScript
- 样式：Tailwind CSS
- 状态管理：Zustand
- 缓存：Map + LRU（V1），IndexedDB（可选）
- 平台：Chrome Extension Manifest V3
