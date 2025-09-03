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