# WorkWith

A modern, elegant task management application built with Electron, Vite, and vanilla JavaScript. WorkWith features a Kanban-style board system with support for multiple task boards, drag-and-drop functionality, and subtask management.

## ✨ Features

### 🎯 Task Management
- **Multiple Task Boards**: Create and manage multiple independent task boards
- **Kanban-style Layout**: Three-column layout with "In Process", "Today", and "Done" columns
- **Drag & Drop**: Intuitive drag-and-drop task movement between columns
- **Subtasks**: Add, complete, and manage subtasks within each main task
- **Time Estimation**: Optional time estimates for tasks (HH:MM format)

### 🎨 Modern UI/UX
- **Dark Theme**: Beautiful gradient-based dark interface
- **Glassmorphism Design**: Modern glass-like effects with backdrop blur
- **Responsive Layout**: Adapts to different screen sizes
- **Smooth Animations**: Fluid transitions and hover effects
- **Custom Window Controls**: Frameless window with custom controls

### 💾 Data Persistence
- **Local Storage**: All data persists locally using browser localStorage
- **Real-time Saving**: Automatic saving of all changes
- **Board Management**: Create, rename, and delete task boards
- **Last Accessed Tracking**: Shows when each board was last used

### 🖥️ Desktop Experience
- **Electron Framework**: Native desktop application
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Hot Module Replacement**: Fast development with Vite
- **Production Ready**: Optimized build process with electron-builder

## 🚀 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Workwith
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   npm run dist
   ```

## 🎮 Usage

### Creating Task Boards
1. Click the "+" button on the home screen
2. Enter a name for your task board
3. Click "Create" to start using your new board

### Managing Tasks
1. **Add Tasks**: Click the "+ Add Task" area at the bottom of any column
2. **Move Tasks**: Drag and drop tasks between columns or reorder within columns
3. **Mark Complete**: Click the "Done" button on any task
4. **Delete Tasks**: Click the delete (trash) icon on any task

### Working with Subtasks
1. **Add Subtasks**: Hover over a task and click "+ Add subtask"
2. **Complete Subtasks**: Check the checkbox next to any subtask
3. **Delete Subtasks**: Click the delete icon next to any subtask
4. **Progress Tracking**: View completion progress (e.g., "2/5 subtasks completed")

### Board Management
1. **Open Boards**: Click on any task board card to open it
2. **Rename Boards**: Click the three-dot menu → "Rename"
3. **Delete Boards**: Click the three-dot menu → "Delete"
4. **Board Stats**: View task count and last accessed time

## 🏗️ Architecture

### Project Structure
```
Workwith/
├── electron/                 # Electron main process files
│   ├── main.js              # Main Electron process
│   ├── preload.js           # Preload script (ESM)
│   └── preload.cjs          # Preload script (CommonJS)
├── src/                     # Source code
│   ├── components/          # UI components
│   │   ├── TaskCard.js      # Individual task card component
│   │   ├── TaskCard.css     # Task card styles
│   │   ├── task-board-modal.js  # Task board modal component
│   │   └── TaskBoardModal.css   # Task board modal styles
│   └── home.js              # Main application logic
├── index.html               # Main HTML file
├── vite.config.js          # Vite configuration
├── package.json            # Dependencies and scripts
└── database.db             # SQLite database (if used)
```

### Technology Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Build Tool**: Vite
- **Desktop Framework**: Electron
- **Styling**: Custom CSS with glassmorphism effects
- **Data Storage**: localStorage API

### Key Components

#### TaskCard Component
- Renders individual task cards with drag-and-drop support
- Handles subtask management and completion tracking
- Provides task actions (complete, delete)

#### TaskBoardModal Component
- Main task board interface with three-column layout
- Manages task creation, movement, and deletion
- Handles drag-and-drop functionality between columns

#### Home Module
- Manages multiple task board instances
- Provides board creation, renaming, and deletion
- Handles data persistence and board navigation

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run electron` - Run Electron in development mode
- `npm run electron:prod` - Run Electron in production mode
- `npm run dist` - Build and package the application

### Development Features
- **Hot Module Replacement**: Instant updates during development
- **DevTools**: Integrated Chrome DevTools in development
- **Source Maps**: Enabled for debugging
- **Live Reload**: Automatic refresh on file changes

## 🎨 Customization

### Theme Customization
The application includes multiple theme options in the CSS:
1. **Deep Space** (Current): Professional dark theme
2. **Cyber Glow**: Energetic gaming-inspired theme
3. **Subtle Aurora**: Minimal elegant theme

To change themes, modify the CSS variables in `index.html`.

### Extending Functionality
- Add new task statuses by modifying the column structure
- Implement additional task metadata (priority, labels, etc.)
- Add export/import functionality for task data
- Integrate with external APIs or databases

## 📝 Data Format

### Task Structure
```javascript
{
  id: 1234567890,           // Unique timestamp ID
  title: "Task Title",      // Task title
  status: "in-process",     // Column status
  createdAt: "2024-01-01T00:00:00.000Z",
  estimateTime: "02:30",    // Optional time estimate
  subtasks: [
    {
      id: 1234567891,       // Unique subtask ID
      text: "Subtask text", // Subtask description
      completed: false,     // Completion status
      createdAt: "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Board Structure
```javascript
{
  id: "board_1234567890_abc123",  // Unique board ID
  name: "My Task Board",          // Board name
  createdAt: "2024-01-01T00:00:00.000Z",
  lastAccessed: "2024-01-01T00:00:00.000Z",
  tasks: {
    "in-process": [],             // Array of tasks
    "today": [],                  // Array of tasks
    "done": []                    // Array of tasks
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Electron team for the desktop framework
- Vite team for the blazing fast build tool
- Design inspiration from modern task management applications

---

# WorkWith (繁體中文)

一個使用 Electron、Vite 和原生 JavaScript 建構的現代、優雅的任務管理應用程式。WorkWith 具有看板風格的面板系統，支援多個任務面板、拖放功能和子任務管理。

## ✨ 功能特色

### 🎯 任務管理
- **多個任務面板**：建立和管理多個獨立的任務面板
- **看板式布局**：三欄布局，包含「進行中」、「今日」和「已完成」欄位
- **拖放功能**：直觀的拖放任務在欄位間移動
- **子任務**：在每個主要任務中新增、完成和管理子任務
- **時間估算**：任務的可選時間估算（HH:MM 格式）

### 🎨 現代化用戶介面
- **深色主題**：美麗的基於漸層的深色介面
- **玻璃態設計**：具有背景模糊效果的現代玻璃樣式
- **響應式布局**：適應不同螢幕尺寸
- **流暢動畫**：流暢的過渡和懸停效果
- **自訂視窗控制項**：具有自訂控制項的無邊框視窗

### 💾 資料持久化
- **本地儲存**：所有資料使用瀏覽器 localStorage 在本地持久化
- **即時儲存**：自動儲存所有變更
- **面板管理**：建立、重新命名和刪除任務面板
- **最後存取追蹤**：顯示每個面板最後使用的時間

### 🖥️ 桌面體驗
- **Electron 框架**：原生桌面應用程式
- **跨平台**：在 Windows、macOS 和 Linux 上運行
- **熱模組替換**：使用 Vite 快速開發
- **生產就緒**：使用 electron-builder 優化的建構流程

## 🚀 安裝

### 先決條件
- Node.js（v14 或更高版本）
- npm 或 yarn

### 設定
1. **複製儲存庫**
   ```bash
   git clone <repository-url>
   cd Workwith
   ```

2. **安裝相依套件**
   ```bash
   npm install
   ```

3. **在開發模式下運行**
   ```bash
   npm run dev
   ```

4. **建構生產版本**
   ```bash
   npm run build
   npm run dist
   ```

## 🎮 使用方法

### 建立任務面板
1. 在首頁畫面點擊「+」按鈕
2. 輸入任務面板的名稱
3. 點擊「建立」開始使用您的新面板

### 管理任務
1. **新增任務**：點擊任何欄位底部的「+ 新增任務」區域
2. **移動任務**：在欄位間拖放任務或在欄位內重新排序
3. **標記完成**：點擊任何任務上的「完成」按鈕
4. **刪除任務**：點擊任何任務上的刪除（垃圾桶）圖示

### 使用子任務
1. **新增子任務**：將滑鼠懸停在任務上並點擊「+ 新增子任務」
2. **完成子任務**：勾選任何子任務旁邊的核取方塊
3. **刪除子任務**：點擊任何子任務旁邊的刪除圖示
4. **進度追蹤**：查看完成進度（例如「2/5 個子任務已完成」）

### 面板管理
1. **開啟面板**：點擊任何任務面板卡片來開啟它
2. **重新命名面板**：點擊三點選單 → 「重新命名」
3. **刪除面板**：點擊三點選單 → 「刪除」
4. **面板統計**：查看任務數量和最後存取時間

## 🏗️ 架構

### 專案結構
```
Workwith/
├── electron/                 # Electron 主要程序檔案
│   ├── main.js              # Electron 主要程序
│   ├── preload.js           # 預載腳本（ESM）
│   └── preload.cjs          # 預載腳本（CommonJS）
├── src/                     # 原始碼
│   ├── components/          # UI 元件
│   │   ├── TaskCard.js      # 個別任務卡片元件
│   │   ├── TaskCard.css     # 任務卡片樣式
│   │   ├── task-board-modal.js  # 任務面板模態元件
│   │   └── TaskBoardModal.css   # 任務面板模態樣式
│   └── home.js              # 主要應用程式邏輯
├── index.html               # 主要 HTML 檔案
├── vite.config.js          # Vite 配置
├── package.json            # 相依套件和腳本
└── database.db             # SQLite 資料庫（如果使用）
```

### 技術堆疊
- **前端**：原生 JavaScript、HTML5、CSS3
- **建構工具**：Vite
- **桌面框架**：Electron
- **樣式**：具有玻璃態效果的自訂 CSS
- **資料儲存**：localStorage API

## 📄 授權

此專案採用 MIT 授權 - 詳情請參閱 LICENSE 檔案。