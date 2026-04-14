# Web Page Translator

A Chrome extension for translating web pages via multiple translation engines.

## Features

- Translate entire pages or selected text
- Support for multiple translation engines
- Domain-specific prompt optimization
- Visual progress tracking (pending/running/done/failed)
- Retry failed translations

## Usage

1. Load the extension in Chrome (see [Installation](#installation))
2. Click the extension icon in the toolbar to open the Popup
3. Click "翻译当前页" (Translate Current Page) to translate
4. Monitor translation status via the status bar colors
5. Configure engines and domain prompts via the Options page

## Manual Validation Checklist

See [docs/testing/manual-v1-checklist.md](docs/testing/manual-v1-checklist.md) for the V1 validation checklist.

## Installation

```bash
pnpm install
pnpm build
```

Then load the `dist` folder as an unpacked Chrome extension.

## Development

```bash
pnpm dev      # Start dev server
pnpm build    # Production build
pnpm test     # Run tests
```

## Project Structure

```
src/
  background/   - Service worker (engine registration, message routing)
  content/      - Content script (DOM extraction, rendering)
  popup/        - Extension popup UI
  options/      - Options page (engine config, domain prompts)
  shared/       - Shared types and schemas
```
