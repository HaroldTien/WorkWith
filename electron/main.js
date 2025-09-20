import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import NotionAPIService from '../service/notionAPIService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Main window creation
const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            // Use CommonJS preload to avoid ESM import error in sandbox
            preload: join(__dirname, 'preload.cjs')
        },
        icon: join(__dirname, '..', 'assets', 'notion-icon.png'), // App icon
        frame: false, // Use a frameless window so we can draw our own header
        show: false, // Don't show until ready
        autoHideMenuBar: true // Hide menu bar (can be toggled with Alt)
    });

    // Load the app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'));
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    return mainWindow;
};

// IPC handlers for custom window controls
ipcMain.on('window-minimize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
});

ipcMain.on('window-maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
    if (win.isMaximized()) {
        win.unmaximize();
    } else {
        win.maximize();
    }
});

ipcMain.on('window-close', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
});

// Focus Mode window sizing (10% width, 50% height) and restore
let __focusOriginalBounds = null;

ipcMain.on('focus-mode-resize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;

    if (!__focusOriginalBounds) {
        __focusOriginalBounds = win.getBounds();
    }

    // Position on the LEFT side of the SAME display as the current window
    const currentBounds = win.getBounds();
    const display = screen.getDisplayMatching(currentBounds) || screen.getPrimaryDisplay();
    const { workArea } = display;

   // Ensure focus mode has a minimum usable width regardless of monitor orientation
   const MIN_FOCUS_WIDTH = 232; // Minimum width in pixels
   const focusWidth = Math.max(Math.round(workArea.width * 0.10), MIN_FOCUS_WIDTH);
    const focusHeight = Math.round(workArea.height * 0.50);
    const focusX = workArea.x; // left aligned on the same screen
    const focusY = workArea.y; // top aligned

    win.setBounds({ x: focusX, y: focusY, width: focusWidth, height: focusHeight });
    win.setResizable(false);
    win.setMaximizable(false);
    win.setFullScreenable(false);
    win.setAlwaysOnTop(true); // Make focus mode full view window always stay on top
    win.focus(); // Ensure window has focus
    // Double-check always on top after a brief delay to ensure it sticks
    setTimeout(() => {
        if (win && !win.isDestroyed()) {
            win.setAlwaysOnTop(true);
            win.focus();
        }
    }, 100);
});

ipcMain.on('focus-mode-restore', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win || !__focusOriginalBounds) return;

    win.setBounds(__focusOriginalBounds);
    win.setResizable(true);
    win.setMaximizable(true);
    win.setFullScreenable(true);
    win.setAlwaysOnTop(false); // Remove always-on-top when exiting focus mode
    __focusOriginalBounds = null;
});

// Minimal mode - shrink window to timer block size only
let __minimalOriginalBounds = null;
let __timerBlockPosition = null; // Store timer block position for accurate restoration

ipcMain.on('minimal-mode-resize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;

    if (!__minimalOriginalBounds) {
        __minimalOriginalBounds = win.getBounds();
    }

    // Timer block size: exact dimensions of the timer block
    const timerWidth = 232;
    const timerHeight = 152;
    
    // Center the window on screen
    const { workArea } = screen.getPrimaryDisplay();
    const minimalX = Math.round(workArea.x + (workArea.width - timerWidth) / 2);
    const minimalY = Math.round(workArea.y + (workArea.height - timerHeight) / 2);

    win.setBounds({ x: minimalX, y: minimalY, width: timerWidth, height: timerHeight });
    win.setResizable(false);
    win.setMaximizable(false);
    win.setFullScreenable(false);
    win.setAlwaysOnTop(true); // Keep always-on-top in minimal mode
});

ipcMain.on('minimal-mode-resize-at-position', (event, x, y) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;

    if (!__minimalOriginalBounds) {
        __minimalOriginalBounds = win.getBounds();
    }

    // Timer block size: exact dimensions of the timer block
    const timerWidth = 232;
    const timerHeight = 152;
    
    // Get current window position and add the timer block's relative position
    const currentBounds = win.getBounds();
    const newX = Math.round(currentBounds.x + x);
    const newY = Math.round(currentBounds.y + y);

    // Store timer block position for accurate restoration
    __timerBlockPosition = {
        x: newX,
        y: newY
    };

    win.setBounds({ x: newX, y: newY, width: timerWidth, height: timerHeight });
    win.setResizable(false);
    win.setMaximizable(false);
    win.setFullScreenable(false);
    win.setAlwaysOnTop(true); // Keep always-on-top in minimal mode at position

    // Listen for window move events to update timer block position
    const updateTimerPosition = () => {
        if (__timerBlockPosition) {
            const bounds = win.getBounds();
            __timerBlockPosition = {
                x: bounds.x,
                y: bounds.y
            };
        }
    };

    // Remove existing listeners to avoid duplicates
    win.removeListener('move', updateTimerPosition);
    win.on('move', updateTimerPosition);
});

ipcMain.on('minimal-mode-restore', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win || !__minimalOriginalBounds) return;

    // Remove move listener(s) added during minimal mode
    win.removeAllListeners('move');

    // Restore EXACT original bounds without applying extra offsets
    win.setBounds({
        x: __minimalOriginalBounds.x,
        y: __minimalOriginalBounds.y,
        width: __minimalOriginalBounds.width,
        height: __minimalOriginalBounds.height
    });
    win.setResizable(true);
    win.setMaximizable(true);
    win.setFullScreenable(true);
    win.setAlwaysOnTop(false); // Remove always-on-top when restoring from minimal mode

    __minimalOriginalBounds = null;
    __timerBlockPosition = null;
});

// App event handlers
app.whenReady().then(() => {
    console.log('🚀 Electron app is ready');
    
    // Create main window
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Notion API IPC handlers
// 處理 Notion API 的 IPC 處理器

// Test Notion API connection
// 測試 Notion API 連接
ipcMain.handle('notion-test-connection', async (event, apiKey) => {
    console.log('🔧 Notion test connection handler called with API key:', apiKey ? '***' + apiKey.slice(-4) : 'none');
    try {
        // Validate that API key is provided
        // 驗證是否提供了 API 密鑰
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            return {
                success: false,
                error: 'API key is required'
            };
        }

        // Create a new instance of NotionAPIService
        // 創建 NotionAPIService 的新實例
        const notionService = new NotionAPIService();
        
        // Set the API key for authentication
        // 設置用於身份驗證的 API 密鑰
        notionService.setApiKey(apiKey.trim());

        // Test the connection by searching for databases
        // 通過搜尋資料庫來測試連接
        const databases = await notionService.searchDatabases();

        // Connection successful - return success result with database count
        // 連接成功 - 返回帶有資料庫數量的成功結果
        return {
            success: true,
            databaseCount: databases.length,
            message: `Successfully connected to Notion API. Found ${databases.length} accessible database(s).`
        };

    } catch (error) {
        // Connection failed - return error result
        // 連接失敗 - 返回錯誤結果
        console.error('Notion connection test failed:', error);
        
        // Parse the error message to provide user-friendly feedback
        // 解析錯誤消息以提供用戶友好的反饋
        let errorMessage = 'Connection failed';
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Invalid API key. Please check your integration token.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorMessage = 'API key doesn\'t have required permissions.';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorMessage = 'Notion API endpoint not found.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
});

// Search Notion databases
// 搜尋 Notion 資料庫
ipcMain.handle('notion-search-databases', async (event, apiKey) => {
    console.log('🔧 Notion search databases handler called with API key:', apiKey ? '***' + apiKey.slice(-4) : 'none');
    try {
        // Validate that API key is provided
        // 驗證是否提供了 API 密鑰
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            return {
                success: false,
                error: 'API key is required'
            };
        }

        // Create a new instance of NotionAPIService
        // 創建 NotionAPIService 的新實例
        const notionService = new NotionAPIService();
        
        // Set the API key for authentication
        // 設置用於身份驗證的 API 密鑰
        notionService.setApiKey(apiKey.trim());

        // Search for databases
        // 搜尋資料庫
        const databases = await notionService.searchDatabases();

        console.log('🔧 Found databases:', databases.length, databases);

        // Return success result with database list
        // 返回帶有資料庫列表的成功結果
        return {
            success: true,
            databases: databases
        };

    } catch (error) {
        // Search failed - return error result
        // 搜尋失敗 - 返回錯誤結果
        console.error('Notion database search failed:', error);
        
        // Parse the error message to provide user-friendly feedback
        // 解析錯誤消息以提供用戶友好的反饋
        let errorMessage = 'Failed to search databases';
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Invalid API key. Please check your integration token.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorMessage = 'API key doesn\'t have required permissions.';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorMessage = 'Notion API endpoint not found.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
});

// Get Notion database schema
// 獲取 Notion 資料庫架構
ipcMain.handle('notion-get-database-schema', async (event, apiKey, databaseId) => {
    console.log('🔧 Notion get database schema handler called with API key:', apiKey ? '***' + apiKey.slice(-4) : 'none', 'databaseId:', databaseId);
    try {
        // Validate that API key and database ID are provided
        // 驗證是否提供了 API 密鑰和資料庫 ID
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            return {
                success: false,
                error: 'API key is required'
            };
        }

        if (!databaseId || typeof databaseId !== 'string' || databaseId.trim() === '') {
            return {
                success: false,
                error: 'Database ID is required'
            };
        }

        // Create a new instance of NotionAPIService
        // 創建 NotionAPIService 的新實例
        const notionService = new NotionAPIService();
        
        // Set the API key for authentication
        // 設置用於身份驗證的 API 密鑰
        notionService.setApiKey(apiKey.trim());

        // Get database schema
        // 獲取資料庫架構
        const schema = await notionService.getDatabaseSchema(databaseId);

        console.log('🔧 Database schema:', schema);

        // Return success result with schema information
        // 返回帶有架構信息的成功結果
        return {
            success: true,
            schema: schema
        };

    } catch (error) {
        // Schema fetch failed - return error result
        // 架構獲取失敗 - 返回錯誤結果
        console.error('Notion database schema fetch failed:', error);
        
        // Parse the error message to provide user-friendly feedback
        // 解析錯誤消息以提供用戶友好的反饋
        let errorMessage = 'Failed to fetch database schema';
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Invalid API key. Please check your integration token.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorMessage = 'API key doesn\'t have required permissions.';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorMessage = 'Database not found or access denied.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
});

// Create missing columns in Notion database
// 在 Notion 資料庫中創建缺失的欄位
ipcMain.handle('notion-create-missing-columns', async (event, apiKey, databaseId, missingProperties) => {
    console.log('🔧 Notion create missing columns handler called with API key:', apiKey ? '***' + apiKey.slice(-4) : 'none', 'databaseId:', databaseId, 'missingProperties:', missingProperties);
    try {
        // Validate that API key, database ID, and missing properties are provided
        // 驗證是否提供了 API 密鑰、資料庫 ID 和缺失屬性
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            return {
                success: false,
                error: 'API key is required'
            };
        }

        if (!databaseId || typeof databaseId !== 'string' || databaseId.trim() === '') {
            return {
                success: false,
                error: 'Database ID is required'
            };
        }

        if (!missingProperties || !Array.isArray(missingProperties) || missingProperties.length === 0) {
            return {
                success: false,
                error: 'Missing properties array is required'
            };
        }

        // Create a new instance of NotionAPIService
        // 創建 NotionAPIService 的新實例
        const notionService = new NotionAPIService();
        
        // Set the API key for authentication
        // 設置用於身份驗證的 API 密鑰
        notionService.setApiKey(apiKey.trim());

        // Create missing columns
        // 創建缺失的欄位
        const result = await notionService.createMissingColumns(databaseId, missingProperties);

        console.log('🔧 Created missing columns result:', result);

        // Return success result
        // 返回成功結果
        return {
            success: true,
            result: result
        };

    } catch (error) {
        // Column creation failed - return error result
        // 欄位創建失敗 - 返回錯誤結果
        console.error('Notion create missing columns failed:', error);
        
        // Parse the error message to provide user-friendly feedback
        // 解析錯誤消息以提供用戶友好的反饋
        let errorMessage = 'Failed to create missing columns';
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Invalid API key. Please check your integration token.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorMessage = 'API key doesn\'t have required permissions to modify database.';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorMessage = 'Database not found or access denied.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
});

// Search statuses in Notion database
// 在 Notion 資料庫中搜尋狀態
ipcMain.handle('notion-search-statuses', async (event, apiKey, databaseId) => {
    console.log('🔧 Notion search statuses handler called with API key:', apiKey ? '***' + apiKey.slice(-4) : 'none', 'databaseId:', databaseId);
    try {
        // Validate that API key and database ID are provided
        // 驗證是否提供了 API 密鑰和資料庫 ID
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            return {
                success: false,
                error: 'API key is required'
            };
        }

        if (!databaseId || typeof databaseId !== 'string' || databaseId.trim() === '') {
            return {
                success: false,
                error: 'Database ID is required'
            };
        }

        // Create a new instance of NotionAPIService
        // 創建 NotionAPIService 的新實例
        const notionService = new NotionAPIService();
        
        // Set the API key for authentication
        // 設置用於身份驗證的 API 密鑰
        notionService.setApiKey(apiKey.trim());

        // Search statuses
        // 搜尋狀態
        const statuses = await notionService.searchStatuses(databaseId);

        console.log('🔧 Found statuses:', statuses);

        // Return success result with statuses
        // 返回帶有狀態的成功結果
        return {
            success: true,
            statuses: statuses
        };

    } catch (error) {
        // Status search failed - return error result
        // 狀態搜尋失敗 - 返回錯誤結果
        console.error('Notion search statuses failed:', error);
        
        // Parse the error message to provide user-friendly feedback
        // 解析錯誤消息以提供用戶友好的反饋
        let errorMessage = 'Failed to search statuses';
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Invalid API key. Please check your integration token.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorMessage = 'API key doesn\'t have required permissions.';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorMessage = 'Database not found or access denied.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
});

// Get existing pages from Notion database
// 從 Notion 資料庫獲取現有頁面
ipcMain.handle('notion-get-existing-pages', async (event, apiKey, databaseId) => {
    console.log('🔧 Notion get existing pages handler called with API key:', apiKey ? '***' + apiKey.slice(-4) : 'none', 'databaseId:', databaseId);
    try {
        // Validate that API key and database ID are provided
        // 驗證是否提供了 API 密鑰和資料庫 ID
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            return {
                success: false,
                error: 'API key is required'
            };
        }

        if (!databaseId || typeof databaseId !== 'string' || databaseId.trim() === '') {
            return {
                success: false,
                error: 'Database ID is required'
            };
        }

        // Create a new instance of NotionAPIService
        // 創建 NotionAPIService 的新實例
        const notionService = new NotionAPIService();
        
        // Set the API key for authentication
        // 設置用於身份驗證的 API 密鑰
        notionService.setApiKey(apiKey.trim());
        notionService.currentDatabaseId = databaseId;

        // Get existing pages
        // 獲取現有頁面
        const pages = await notionService.getExistingPages();

        console.log('🔧 Found existing pages:', pages.length);

        // Return success result with pages
        // 返回帶有頁面的成功結果
        return {
            success: true,
            pages: pages
        };

    } catch (error) {
        // Get pages failed - return error result
        // 獲取頁面失敗 - 返回錯誤結果
        console.error('Notion get existing pages failed:', error);
        
        // Parse the error message to provide user-friendly feedback
        // 解析錯誤消息以提供用戶友好的反饋
        let errorMessage = 'Failed to get existing pages';
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Invalid API key. Please check your integration token.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorMessage = 'API key doesn\'t have required permissions.';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorMessage = 'Database not found or access denied.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
});

// Sync task board to Notion database
// 將任務板同步到 Notion 資料庫
ipcMain.handle('notion-sync-to-notion', async (event, apiKey, databaseId, tasks, statusMappings) => {
    console.log('🔧 Notion sync to notion handler called with API key:', apiKey ? '***' + apiKey.slice(-4) : 'none', 'databaseId:', databaseId, 'tasks count:', tasks?.length || 0);
    try {
        // Validate that API key and database ID are provided
        // 驗證是否提供了 API 密鑰和資料庫 ID
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            return {
                success: false,
                error: 'API key is required'
            };
        }

        if (!databaseId || typeof databaseId !== 'string' || databaseId.trim() === '') {
            return {
                success: false,
                error: 'Database ID is required'
            };
        }

        if (!tasks || !Array.isArray(tasks)) {
            return {
                success: false,
                error: 'Tasks array is required'
            };
        }

        // Create a new instance of NotionAPIService
        // 創建 NotionAPIService 的新實例
        const notionService = new NotionAPIService();
        
        // Set the API key for authentication
        // 設置用於身份驗證的 API 密鑰
        notionService.setApiKey(apiKey.trim());
        notionService.currentDatabaseId = databaseId;

        // Sync tasks to Notion
        // 將任務同步到 Notion
        const result = await notionService.syncTaskBoardToNotion(tasks, statusMappings);

        console.log('🔧 Sync to Notion result:', result);

        // Return success result
        // 返回成功結果
        return {
            success: true,
            result: result
        };

    } catch (error) {
        // Sync to Notion failed - return error result
        // 同步到 Notion 失敗 - 返回錯誤結果
        console.error('Notion sync to notion failed:', error);
        
        // Parse the error message to provide user-friendly feedback
        // 解析錯誤消息以提供用戶友好的反饋
        let errorMessage = 'Failed to sync to Notion';
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Invalid API key. Please check your integration token.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorMessage = 'API key doesn\'t have required permissions.';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorMessage = 'Database not found or access denied.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
});

// Auto-sync specific tasks to Notion database
// 自動同步特定任務到 Notion 資料庫
ipcMain.handle('notion-auto-sync-tasks', async (event, apiKey, databaseId, tasks, statusMappings) => {
    console.log('🔧 Notion auto-sync tasks handler called with API key:', apiKey ? '***' + apiKey.slice(-4) : 'none', 'databaseId:', databaseId, 'tasks count:', tasks?.length || 0);
    try {
        // Validate that API key and database ID are provided
        // 驗證是否提供了 API 密鑰和資料庫 ID
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            return {
                success: false,
                error: 'API key is required'
            };
        }

        if (!databaseId || typeof databaseId !== 'string' || databaseId.trim() === '') {
            return {
                success: false,
                error: 'Database ID is required'
            };
        }

        if (!tasks || !Array.isArray(tasks)) {
            return {
                success: false,
                error: 'Tasks array is required'
            };
        }

        // Create a new instance of NotionAPIService
        // 創建 NotionAPIService 的新實例
        const notionService = new NotionAPIService();
        
        // Set the API key for authentication
        // 設置用於身份驗證的 API 密鑰
        notionService.setApiKey(apiKey.trim());
        notionService.currentDatabaseId = databaseId;

        // Auto-sync tasks to Notion (only update existing tasks, don't create new ones)
        // 自動同步任務到 Notion（只更新現有任務，不創建新任務）
        const result = await notionService.autoSyncTasksToNotion(tasks, statusMappings);

        console.log('🔧 Auto-sync to Notion result:', result);

        // Return success result
        // 返回成功結果
        return {
            success: true,
            result: result
        };

    } catch (error) {
        // Auto-sync to Notion failed - return error result
        // 自動同步到 Notion 失敗 - 返回錯誤結果
        console.error('Notion auto-sync tasks failed:', error);
        
        // Parse the error message to provide user-friendly feedback
        // 解析錯誤消息以提供用戶友好的反饋
        let errorMessage = 'Failed to auto-sync tasks to Notion';
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Invalid API key. Please check your integration token.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorMessage = 'API key doesn\'t have required permissions.';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorMessage = 'Database not found or access denied.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
});

// Auto-sync deleted tasks to Notion database
// 自動同步已刪除的任務到 Notion 資料庫
ipcMain.handle('notion-auto-sync-deleted-tasks', async (event, apiKey, databaseId, deletedTaskIds, pendingTaskInfo) => {
    console.log('🔧 Notion auto-sync deleted tasks handler called with API key:', apiKey ? '***' + apiKey.slice(-4) : 'none', 'databaseId:', databaseId, 'deleted tasks count:', deletedTaskIds?.length || 0);
    try {
        // Validate that API key and database ID are provided
        // 驗證是否提供了 API 密鑰和資料庫 ID
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            return {
                success: false,
                error: 'API key is required'
            };
        }

        if (!databaseId || typeof databaseId !== 'string' || databaseId.trim() === '') {
            return {
                success: false,
                error: 'Database ID is required'
            };
        }

        if (!deletedTaskIds || !Array.isArray(deletedTaskIds)) {
            return {
                success: false,
                error: 'Deleted task IDs array is required'
            };
        }

        // Create a new instance of NotionAPIService
        // 創建 NotionAPIService 的新實例
        const notionService = new NotionAPIService();
        
        // Set the API key for authentication
        // 設置用於身份驗證的 API 密鑰
        notionService.setApiKey(apiKey.trim());
        notionService.currentDatabaseId = databaseId;

        // Auto-sync deleted tasks to Notion (archive pages)
        // 自動同步已刪除的任務到 Notion（歸檔頁面）
        const result = await notionService.autoSyncDeletedTasks(deletedTaskIds, pendingTaskInfo);

        console.log('🔧 Auto-sync deleted tasks result:', result);

        // Return success result
        // 返回成功結果
        return {
            success: true,
            result: result
        };

    } catch (error) {
        // Auto-sync deleted tasks failed - return error result
        // 自動同步已刪除任務失敗 - 返回錯誤結果
        console.error('Notion auto-sync deleted tasks failed:', error);
        
        // Parse the error message to provide user-friendly feedback
        // 解析錯誤消息以提供用戶友好的反饋
        let errorMessage = 'Failed to auto-sync deleted tasks to Notion';
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Invalid API key. Please check your integration token.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorMessage = 'API key doesn\'t have required permissions.';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorMessage = 'Database not found or access denied.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
});

// Sync Notion database to task board
// 將 Notion 資料庫同步到任務板
ipcMain.handle('notion-sync-from-notion', async (event, apiKey, databaseId, statusMappings) => {
    console.log('🔧 Notion sync from notion handler called with API key:', apiKey ? '***' + apiKey.slice(-4) : 'none', 'databaseId:', databaseId);
    try {
        // Validate that API key and database ID are provided
        // 驗證是否提供了 API 密鑰和資料庫 ID
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
            return {
                success: false,
                error: 'API key is required'
            };
        }

        if (!databaseId || typeof databaseId !== 'string' || databaseId.trim() === '') {
            return {
                success: false,
                error: 'Database ID is required'
            };
        }

        // Create a new instance of NotionAPIService
        // 創建 NotionAPIService 的新實例
        const notionService = new NotionAPIService();
        
        // Set the API key for authentication
        // 設置用於身份驗證的 API 密鑰
        notionService.setApiKey(apiKey.trim());
        notionService.currentDatabaseId = databaseId;

        // Sync from Notion
        // 從 Notion 同步
        const tasks = await notionService.syncNotionToTaskBoard(statusMappings);

        console.log('🔧 Sync from Notion result:', tasks.length, 'tasks');

        // Return success result with tasks
        // 返回帶有任務的成功結果
        return {
            success: true,
            tasks: tasks
        };

    } catch (error) {
        // Sync from Notion failed - return error result
        // 從 Notion 同步失敗 - 返回錯誤結果
        console.error('Notion sync from notion failed:', error);
        
        // Parse the error message to provide user-friendly feedback
        // 解析錯誤消息以提供用戶友好的反饋
        let errorMessage = 'Failed to sync from Notion';
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = 'Invalid API key. Please check your integration token.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorMessage = 'API key doesn\'t have required permissions.';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
            errorMessage = 'Database not found or access denied.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else {
            errorMessage = error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event) => {
        event.preventDefault();
    });
});