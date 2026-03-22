# Code Exporter for Gemini

is a Chrome/Edge browser extension (Manifest V3) designed to enhance the Google Gemini experience by adding one-click export functionality for code snippets, canvas content, and Deep Research reports.

## Features

- **Download code blocks** — Every inline code snippet in Gemini's chat gets a dedicated download button. Language is auto-detected.
- **Canvas / Monaco editor export** — Exports from the full-screen code canvas with format selection (Python, TypeScript, SQL, and many more, or auto-detect).
- **Deep Research & extended response export** — Downloads the full Markdown of Deep Research reports and long-form immersive responses as `.md` files.
- **Copy Markdown to clipboard** — One-click copy of the entire Markdown content to your clipboard, ready to paste into any editor.
- **Smart filename** — Uses the conversation title as the filename and sanitizes any illegal characters automatically.
- **Keyboard shortcut** — `Alt+Shift+D` (Windows / Linux) · `Ctrl+Shift+D` (macOS) to trigger the active download button.
- **Format selector** — Choose the output format manually, or let the extension detect it automatically.

---

## Installation (development)

```bash
pnpm install
pnpm run build
```

Then load the `dist/` folder as an **unpacked extension** in `chrome://extensions` (Developer mode on).

---

## Tech stack

- Chrome MV3 content script
- TypeScript + Vite + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)
- No external runtime dependencies

---

## Disclaimer

_"Google Gemini" is a trademark of Google LLC. This extension is not affiliated with, endorsed by, or sponsored by Google LLC._
