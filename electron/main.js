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
        icon: null, // Add your app icon path here
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
});

ipcMain.on('focus-mode-restore', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win || !__focusOriginalBounds) return;

    win.setBounds(__focusOriginalBounds);
    win.setResizable(true);
    win.setMaximizable(true);
    win.setFullScreenable(true);
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

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event) => {
        event.preventDefault();
    });
});