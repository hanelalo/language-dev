# Web Page Translator

A Chrome Extension (Manifest V3) for translating web pages with support for multiple translation engines and LLM domain optimization.

## Features

- **整页翻译 (Full Page Translation)**: Translate all visible text nodes on a page
- **划选翻译 (Selection Translation)**: Translate selected text via tooltip
- **多引擎支持 (Multi-Engine)**: DeepL, OpenAI, and custom API endpoints
- **LLM 领域优化 (Domain Optimization)**: Apply domain-specific prompts for better translation quality
- **状态追踪 (Status Tracking)**: Visual progress with color-coded status (gray/green/purple/red)
- **失败重试 (Retry)**: Retry failed segments without re-translating successful ones

## Installation

### Prerequisites

- Node.js 18+
- pnpm

### Steps

```bash
# Clone the repository
git clone <repository-url>
cd language-dev

# Install dependencies
pnpm install

# Build the extension
pnpm build
```

### Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder from this project
5. The extension icon appears in your toolbar

## Usage

### Basic Translation

1. Navigate to any web page you want to translate
2. Click the extension icon in the Chrome toolbar
3. Click **翻译当前页** (Translate Current Page)
4. The page displays original text with translated text directly below each paragraph
5. Watch the status colors change as translation progresses

### Status Colors

| Color | Status | Meaning |
|-------|--------|---------|
| Gray | Pending | Waiting in queue |
| Green | Running | Currently translating |
| Purple | Done | Successfully translated |
| Red | Failed | Translation failed (see retry) |

### Configuring Engines

1. Right-click the extension icon → **Options**, or click the gear icon in the popup
2. Under **翻译引擎** (Translation Engines), enter your API credentials:
   - **DeepL**: Requires DeepL API key
   - **OpenAI**: Requires OpenAI API key and model selection
3. Click **Save**

### Domain-Specific Prompts

For better translation quality, configure domain prompts:

1. Open Options page
2. Under **领域 Prompt** (Domain Prompts):
   - Choose a built-in domain (IT/技术, 法律, 医学, 金融, 游戏, 文学)
   - Or create a custom domain with your own prompt
3. The selected domain prompt is injected when using LLM engines

### Retry Failed Translations

When translation fails (shown in red):

1. The extension retains failed segments
2. Fix the underlying issue (API key, network, quota)
3. Click **重试** (Retry) on the failed segment
4. Only failed segments are re-translated

## Architecture

```
src/
├── background/           # Service Worker
│   ├── index.ts         # Message listener, engine registration
│   ├── messages.ts      # Message handlers
│   ├── engine-registry.ts
│   ├── prompt-builder.ts
│   ├── translation-orchestrator.ts
│   └── engines/
│       ├── deepl-engine.ts
│       └── openai-engine.ts
├── content/             # Content Script
│   ├── index.ts         # Main flow entry
│   ├── dom-extractor.ts # Visible text node extraction
│   ├── translation-renderer.ts
│   └── selection-translate.ts
├── popup/               # Extension Popup UI
│   ├── App.tsx
│   └── main.tsx
├── options/             # Options Page
│   ├── App.tsx
│   └── main.tsx
└── shared/              # Shared Types
    ├── types.ts
    ├── storage-schema.ts
    └── constants.ts
```

## Development

```bash
pnpm dev        # Start Vite dev server with hot reload
pnpm build      # Production build to dist/
pnpm test       # Run all tests (vitest)
```

## Testing

```bash
pnpm test       # Run all tests
pnpm test:watch # Run tests in watch mode
```

## Manual Validation Checklist

See [docs/testing/manual-v1-checklist.md](docs/testing/manual-v1-checklist.md) for V1 acceptance testing.

## Troubleshooting

### Extension not loading

- Ensure you're loading the `dist/` folder, not the source
- Check `chrome://extensions/` for any error messages
- Reload the extension after rebuilding

### Translations not appearing

- Check the browser console (F12 → Console) for errors
- Verify your API keys are correctly configured in Options
- Ensure you have network connectivity

### Test failures

- Some tests may fail due to ESM compatibility issues with dependencies
- Run tests individually: `pnpm vitest run tests/unit/<test-name>`
