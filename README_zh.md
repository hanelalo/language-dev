# 网页翻译器

基于 Chrome Extension (Manifest V3) 的网页翻译扩展，支持多种翻译引擎和 LLM 领域优化。

## 功能特性

- **整页翻译**: 翻译页面所有可见文本节点
- **划选翻译**: 选中文字后通过气泡提示翻译
- **多引擎支持**: DeepL、OpenAI 及自定义 API 端点
- **LLM 领域优化**: 应用领域特定 Prompt，提升翻译质量
- **状态追踪**: 颜色编码的状态显示（灰/绿/紫/红）
- **失败重试**: 仅重试失败段落，无需重新翻译成功部分

## 安装

### 前置要求

- Node.js 18+
- pnpm

### 安装步骤

```bash
# 克隆仓库
git clone <仓库地址>
cd language-dev

# 安装依赖
pnpm install

# 构建扩展
pnpm build
```

### 加载到 Chrome

1. 打开 Chrome，进入 `chrome://extensions/`
2. 开启右上角 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择本项目的 `dist/` 文件夹
5. 扩展图标会出现在工具栏

## 使用方法

### 基础翻译

1. 打开任意需要翻译的网页
2. 点击 Chrome 工具栏中的扩展图标
3. 点击 **翻译当前页**
4. 页面原文下方会显示译文
5. 状态颜色会随翻译进度变化

### 状态颜色说明

| 颜色 | 状态 | 含义 |
|------|------|------|
| 灰色 | Pending | 等待中 |
| 绿色 | Running | 翻译中 |
| 紫色 | Done | 翻译完成 |
| 红色 | Failed | 翻译失败（可重试） |

### 配置翻译引擎

1. 右键扩展图标 → **选项**，或点击弹窗中的设置图标
2. 在 **翻译引擎** 部分填写您的 API 凭证：
   - **DeepL**: 需要 DeepL API Key
   - **OpenAI**: 需要 OpenAI API Key 和模型选择
3. 点击 **保存**

### 领域特定 Prompt

为获得更好的翻译质量，可配置领域 Prompt：

1. 打开选项页面
2. 在 **领域 Prompt** 部分：
   - 选择内置领域（IT/技术、法律、医学、金融、游戏、文学）
   - 或创建自定义领域，编写您自己的 Prompt
3. 使用 LLM 引擎时，所选领域的 Prompt 会被自动注入

### 重试失败的翻译

当翻译失败时（显示为红色）：

1. 失败的段落会被保留
2. 修复底层问题（API Key、网络、配额）
3. 点击失败段落的 **重试** 按钮
4. 仅会重新翻译失败的段落

## 项目架构

```
src/
├── background/           # Service Worker
│   ├── index.ts         # 消息监听、引擎注册
│   ├── messages.ts      # 消息处理器
│   ├── engine-registry.ts
│   ├── prompt-builder.ts
│   ├── translation-orchestrator.ts
│   └── engines/
│       ├── deepl-engine.ts
│       └── openai-engine.ts
├── content/             # Content Script
│   ├── index.ts         # 主流程入口
│   ├── dom-extractor.ts # 可见文本节点抽取
│   ├── translation-renderer.ts
│   └── selection-translate.ts
├── popup/               # 扩展弹窗
│   ├── App.tsx
│   └── main.tsx
├── options/             # 选项页面
│   ├── App.tsx
│   └── main.tsx
└── shared/              # 共享类型
    ├── types.ts
    ├── storage-schema.ts
    └── constants.ts
```

## 开发

```bash
pnpm dev        # 启动 Vite 开发服务器（热重载）
pnpm build      # 生产构建，输出到 dist/
pnpm test       # 运行所有测试（vitest）
```

## 测试

```bash
pnpm test       # 运行所有测试
pnpm test:watch # 监听模式运行测试
```

## 手工验收清单

详见 [docs/testing/manual-v1-checklist.md](docs/testing/manual-v1-checklist.md) 中的 V1 手工验收清单。

## 常见问题

### 扩展无法加载

- 确保加载的是 `dist/` 文件夹，而非源代码
- 检查 `chrome://extensions/` 中的错误信息
- 重新构建后需重新加载扩展

### 翻译结果不显示

- 按 F12 打开开发者工具 → Console 查看错误信息
- 确认选项页面中 API Key 配置正确
- 确保网络连接正常

### 测试失败

- 部分测试可能因 ESM 兼容性问

题失败
- 可单独运行测试：`pnpm vitest run tests/unit/<测试文件名>`
