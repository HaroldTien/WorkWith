import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// basic system information without exposing the entire ipcRenderer
contextBridge.exposeInMainWorld('electronAPI', {
    // System information
    platform: process.platform,
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
    },
    
    // App information
    isElectron: true,
    
    // Window controls exposed to renderer
    windowControls: {
        minimize: () => ipcRenderer.send('window-minimize'),
        maximize: () => ipcRenderer.send('window-maximize'),
        close: () => ipcRenderer.send('window-close')
    }
});

// Log when preload script is loaded
console.log('🔧 Preload script loaded');
console.log('Node version:', process.versions.node);
console.log('Electron version:', process.versions.electron);

// Optional: Add any initialization code here
window.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM content loaded in preload context');
});