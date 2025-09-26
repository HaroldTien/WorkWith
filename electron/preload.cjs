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
    // Search Notion databases by passing API key to main process
    // 通過將 API 密鑰傳遞給主進程來搜尋 Notion 資料庫
    searchDatabases: (apiKey) => ipcRenderer.invoke('notion-search-databases', apiKey),
    // Get Notion database schema by passing API key and database ID to main process
    // 通過將 API 密鑰和資料庫 ID 傳遞給主進程來獲取 Notion 資料庫架構
    getDatabaseSchema: (apiKey, databaseId) => ipcRenderer.invoke('notion-get-database-schema', apiKey, databaseId),
    // Create missing columns in Notion database by passing API key, database ID, and missing properties to main process
    // 通過將 API 密鑰、資料庫 ID 和缺失屬性傳遞給主進程來在 Notion 資料庫中創建缺失的欄位
    createMissingColumns: (apiKey, databaseId, missingProperties) => ipcRenderer.invoke('notion-create-missing-columns', apiKey, databaseId, missingProperties),
    // Search statuses in Notion database by passing API key and database ID to main process
    // 通過將 API 密鑰和資料庫 ID 傳遞給主進程來在 Notion 資料庫中搜尋狀態
    searchStatuses: (apiKey, databaseId) => ipcRenderer.invoke('notion-search-statuses', apiKey, databaseId),
    // Get existing pages from Notion database by passing API key and database ID to main process
    // 通過將 API 密鑰和資料庫 ID 傳遞給主進程來從 Notion 資料庫獲取現有頁面
    getExistingPages: (apiKey, databaseId) => ipcRenderer.invoke('notion-get-existing-pages', apiKey, databaseId),
    // Sync task board to Notion database by passing API key, database ID, tasks, and status mappings to main process
    // 通過將 API 密鑰、資料庫 ID、任務和狀態映射傳遞給主進程來將任務板同步到 Notion 資料庫
    syncTaskBoardToNotion: (apiKey, databaseId, tasks, statusMappings) => ipcRenderer.invoke('notion-sync-to-notion', apiKey, databaseId, tasks, statusMappings),
    // Sync Notion database to task board by passing API key, database ID, and status mappings to main process
    // 通過將 API 密鑰、資料庫 ID 和狀態映射傳遞給主進程來將 Notion 資料庫同步到任務板
    syncNotionToTaskBoard: (apiKey, databaseId, statusMappings) => ipcRenderer.invoke('notion-sync-from-notion', apiKey, databaseId, statusMappings),
    // Auto-sync specific tasks to Notion database by passing API key, database ID, tasks, and status mappings to main process
    // 通過將 API 密鑰、資料庫 ID、任務和狀態映射傳遞給主進程來自動同步特定任務到 Notion 資料庫
    autoSyncTasks: (apiKey, databaseId, tasks, statusMappings) => ipcRenderer.invoke('notion-auto-sync-tasks', apiKey, databaseId, tasks, statusMappings),
    // Auto-sync deleted tasks to Notion database by passing API key, database ID, deleted task IDs, and pending task info to main process
    // 通過將 API 密鑰、資料庫 ID、已刪除任務 ID 和待處理任務信息傳遞給主進程來自動同步已刪除任務到 Notion 資料庫
    autoSyncDeletedTasks: (apiKey, databaseId, deletedTaskIds, pendingTaskInfo) => ipcRenderer.invoke('notion-auto-sync-deleted-tasks', apiKey, databaseId, deletedTaskIds, pendingTaskInfo),
  },
});

console.log('🔧 Preload (CJS) loaded');

