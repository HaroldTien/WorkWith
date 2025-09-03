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
});

console.log('🔧 Preload (CJS) loaded');

