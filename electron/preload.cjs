const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  isElectron: true,
  windowControls: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
  },
  focusMode: {
    resizeWindow: () => ipcRenderer.send('focus-mode-resize'),
    restoreWindow: () => ipcRenderer.send('focus-mode-restore'),
  },
  minimalMode: {
    resizeWindow: () => ipcRenderer.send('minimal-mode-resize'),
    resizeWindowAtPosition: (x, y) => ipcRenderer.send('minimal-mode-resize-at-position', x, y),
    restoreWindow: () => ipcRenderer.send('minimal-mode-restore'),
  },
  notionAPI: {
    // Test Notion API connection by passing API key to main process
    // 通過將 API 密鑰傳遞給主進程來測試 Notion API 連接
    testNotionConnection: (apiKey) => ipcRenderer.invoke('notion-test-connection', apiKey),
  },
});

console.log('🔧 Preload (CJS) loaded');

