import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

    const { workArea } = screen.getPrimaryDisplay();
    const focusWidth = Math.round(workArea.width * 0.10);
    const focusHeight = Math.round(workArea.height * 0.50);
    const focusX = Math.round(workArea.x + (workArea.width - focusWidth) / 2);
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
    if (!win || !__minimalOriginalBounds || !__timerBlockPosition) return;

    // Remove move listener
    win.removeAllListeners('move');

    // Calculate where the timer block was in the original window
    // Assuming timer block is positioned at the top-left area of the original window
    const originalTimerX = __minimalOriginalBounds.x + 12; // 12px padding from left
    const originalTimerY = __minimalOriginalBounds.y + 50; // 50px from top (accounting for topbar)
    
    // Calculate the offset between original timer position and current timer position
    const offsetX = __timerBlockPosition.x - originalTimerX;
    const offsetY = __timerBlockPosition.y - originalTimerY;
    
    // Apply the offset to the original window position
    const newX = __minimalOriginalBounds.x + offsetX;
    const newY = __minimalOriginalBounds.y + offsetY;

    win.setBounds({ 
        x: newX, 
        y: newY, 
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

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event) => {
        event.preventDefault();
    });
});