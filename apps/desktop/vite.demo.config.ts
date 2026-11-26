import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const demo = (file: string) => fileURLToPath(new URL(`./src/demo/tauri/${file}`, import.meta.url));

// Demo mode (only for development, never in the installer): the interface in a browser, with Tauri
// replaced by sample data, to take the pictures of the README (pnpm docs:shots).
export default defineConfig({
  plugins : [react(), tailwindcss()],
  resolve : {
    alias: [
      { find: '@tauri-apps/api/core', replacement: demo('core.ts') },
      { find: '@tauri-apps/api/event', replacement: demo('event.ts') },
      { find: '@tauri-apps/api/window', replacement: demo('window.ts') },
      { find: '@tauri-apps/api/webview', replacement: demo('webview.ts') },
      { find: '@tauri-apps/api/app', replacement: demo('app.ts') },
      { find: '@tauri-apps/plugin-dialog', replacement: demo('dialog.ts') },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
  server: {
    port       : 1430,
    strictPort : true,
    open       : false,
    watch      : { ignored: ['**/src-tauri/**'] },
  },
});
