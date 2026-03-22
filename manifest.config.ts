import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Code Exporter for Gemini',
  version: pkg.version,
  description: 'Export code and Markdown from Gemini to .tsx, .py, .sql, and .md files with one click and automatic detection.',
  icons: {
    16: 'icons/icon16.png',
    32: 'icons/icon32.png',
    48: 'icons/icon48.png',
    128: 'icons/icon128.png',
  },
  action: {
    default_title: 'Code Exporter for Gemini',
    default_icon: {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
    },
  },
  content_scripts: [
    {
      js: ['src/content/main.ts'],
      matches: ['https://gemini.google.com/*'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self';",
  },
})