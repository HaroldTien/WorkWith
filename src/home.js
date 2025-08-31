// Renderer process script
console.log('Renderer process started');
import { TaskBoardModal } from './components/task-board-modal.js';

// Multiple task board instances management
const taskBoardInstances = [];
let currentTaskBoard = null;


function createNewTaskBoard() {
    // Clean up any orphaned modals first
    cleanupOrphanedModals();
    
    // Ask user for board name
    showBoardNameDialog((name) => {
        try {
            if (name && name.trim() !== '') {
                createTaskBoardWithName(name.trim());
            } else {
                console.log('❌ Task board creation cancelled - no name provided');
            }
        } catch (error) {
            console.error('Error creating task board:', error);
        }
    });
}

function openTaskBoard(boardId) {
    const instance = taskBoardInstances.find(board => board.id === boardId);
    if (instance) {
        currentTaskBoard = instance;
        instance.lastAccessed = new Date().toISOString();
        
        // Override the task board's saveToLocalStorage to also save our instance data
        const originalSave = instance.taskBoard.saveToLocalStorage;
        instance.taskBoard.saveToLocalStorage = function() {
            saveAllTaskBoards();
        };
        
        instance.taskBoard.show();
        saveAllTaskBoards();
        renderTaskBoardsList();
    }
}

function createTaskBoardWithName(boardName) {
    const boardId = `board_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const taskBoard = new TaskBoardModal(boardName);
    
    const boardInstance = {
        id: boardId,
        name: boardName,
        taskBoard: taskBoard,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
    };
    
    // Override the task board's saveToLocalStorage to also save our instance data
    taskBoard.saveToLocalStorage = function() {
        saveAllTaskBoards();
    };
    
    taskBoardInstances.push(boardInstance);
    currentTaskBoard = boardInstance;
    
    // Save to localStorage
    saveAllTaskBoards();
    
    // Update display
    renderTaskBoardsList();
    
    console.log(`✅ TaskBoard instance created: "${boardName}"`);
    taskBoard.show();
}

function showBoardNameDialog(callback, defaultValue = '', title = 'Create Task Board') {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'name-dialog-overlay';
    overlay.innerHTML = `
        <div class="name-dialog">
            <div class="dialog-header">
                <h3>${title}</h3>
            </div>
            <div class="dialog-content">
                <label for="boardNameInput">Enter a name for your task board:</label>
                <input type="text" id="boardNameInput" placeholder="My Task Board" maxlength="50" autofocus value="${defaultValue}">
                <div class="dialog-actions">
                    <button type="button" class="btn-cancel">Cancel</button>
                    <button type="button" class="btn-create">${title.includes('Rename') ? 'Rename' : 'Create'}</button>
                </div>
            </div>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .name-dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
            backdrop-filter: blur(4px);
        }

        .name-dialog {
            background: #1F2937;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 16px;
            width: 90vw;
            max-width: 400px;
            box-shadow: 0 25px 70px rgba(0, 0, 0, 0.6);
        }

        .dialog-header {
            padding: 20px 24px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        }

        .dialog-header h3 {
            margin: 0;
            color: #E5E7EB;
            font-size: 20px;
            font-weight: 600;
        }

        .dialog-content {
            padding: 24px;
        }

        .dialog-content label {
            display: block;
            color: #E5E7EB;
            font-size: 14px;
            margin-bottom: 12px;
        }

        #boardNameInput {
            width: 100%;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            color: #E5E7EB;
            font-size: 14px;
            box-sizing: border-box;
            margin-bottom: 24px;
        }

        #boardNameInput:focus {
            outline: none;
            border-color: rgba(67, 56, 202, 0.5);
            box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1);
        }

        .dialog-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        }

        .btn-cancel, .btn-create {
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-cancel {
            background: none;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #9CA3AF;
        }

        .btn-cancel:hover {
            background: rgba(255, 255, 255, 0.05);
            color: #E5E7EB;
        }

        .btn-create {
            background: linear-gradient(135deg, #4338CA, #6D28D9);
            color: white;
            border: none;
        }

        .btn-create:hover {
            background: linear-gradient(135deg, #5B21B6, #7C3AED);
            transform: translateY(-1px);
        }
    `;
    document.head.appendChild(style);

    // Event handlers
    const input = overlay.querySelector('#boardNameInput');
    const cancelBtn = overlay.querySelector('.btn-cancel');
    const createBtn = overlay.querySelector('.btn-create');

    const closeDialog = () => {
        overlay.remove();
        style.remove();
    };

    const handleCreate = () => {
        const name = input.value.trim();
        closeDialog();
        callback(name);
    };

    const handleCancel = () => {
        closeDialog();
        callback(null);
    };

    // Event listeners
    createBtn.addEventListener('click', handleCreate);
    cancelBtn.addEventListener('click', handleCancel);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleCreate();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    });

    // Show dialog
    document.body.appendChild(overlay);
    input.focus();
    input.select();
}

function cleanupOrphanedModals() {
    // Remove any existing task-board-overlay elements that might be stuck
    const existingOverlays = document.querySelectorAll('.task-board-overlay');
    existingOverlays.forEach((overlay, index) => {
        console.log(`🧹 Cleaning up orphaned modal ${index + 1}`);
        overlay.remove();
    });
    
    // Remove any existing name-dialog-overlay elements that might be stuck
    const existingDialogs = document.querySelectorAll('.name-dialog-overlay');
    existingDialogs.forEach((dialog, index) => {
        console.log(`🧹 Cleaning up orphaned dialog ${index + 1}`);
        dialog.remove();
    });
    
    // Restore body scroll in case it was disabled
    document.body.style.overflow = '';
}

function saveAllTaskBoards() {
    try {
        const boardsData = taskBoardInstances.map(instance => ({
            id: instance.id,
            name: instance.name,
            createdAt: instance.createdAt,
            lastAccessed: instance.lastAccessed,
            tasks: instance.taskBoard.tasks
        }));
        
        localStorage.setItem('workwith-taskboards-list', JSON.stringify(boardsData));
        console.log(`💾 Saved ${boardsData.length} task boards`);
    } catch (error) {
        console.error('Failed to save task boards:', error);
    }
}

function loadAllTaskBoards() {
    try {
        const savedBoards = localStorage.getItem('workwith-taskboards-list');
        if (savedBoards) {
            const boardsData = JSON.parse(savedBoards);
            
            boardsData.forEach(boardData => {
                const taskBoard = new TaskBoardModal(boardData.name);
                taskBoard.tasks = boardData.tasks || {
                    'not-started': [],
                    'in-process': [],
                    'done': []
                };
                
                // Override the task board's saveToLocalStorage to also save our instance data
                taskBoard.saveToLocalStorage = function() {
                    saveAllTaskBoards();
                };
                
                const boardInstance = {
                    id: boardData.id,
                    name: boardData.name,
                    taskBoard: taskBoard,
                    createdAt: boardData.createdAt,
                    lastAccessed: boardData.lastAccessed
                };
                
                taskBoardInstances.push(boardInstance);
            });
            
            console.log(`📁 Loaded ${boardsData.length} task boards`);
        }
    } catch (error) {
        console.error('Failed to load task boards:', error);
    }
}

function renderTaskBoardsList() {
    const mainContainer = document.getElementById('mainContainer');
    if (!mainContainer) return;
    
    // Remove existing task board instances (keep only the creation block)
    const existingInstances = mainContainer.querySelectorAll('.task-board-block:not(.creation-block)');
    existingInstances.forEach(instance => instance.remove());
    
    // Add task board instances as horizontal blocks
    taskBoardInstances.forEach(instance => {
        const taskBoardBlock = document.createElement('div');
        taskBoardBlock.className = 'task-board-block';
        taskBoardBlock.dataset.boardId = instance.id;
        
        taskBoardBlock.innerHTML = `
            <div class="task-board-instance">
                <div class="board-menu-btn" data-board-id="${instance.id}" title="More options">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                </div>
                <div class="board-dropdown-menu" data-board-id="${instance.id}" style="display: none;">
                    <div class="dropdown-item rename-board-item" data-board-id="${instance.id}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                        Rename
                    </div>
                    <div class="dropdown-divider"></div>
                    <div class="dropdown-item delete-board-item" data-board-id="${instance.id}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                        </svg>
                        Delete
                    </div>
                </div>
                <div class="board-header">
                    <h3 class="board-name">${instance.name}</h3>
                    <div class="board-stats">
                        <div class="task-count">
                            ${Object.values(instance.taskBoard.tasks).flat().length} tasks
                        </div>
                        <div class="last-accessed">
                            ${formatDate(instance.lastAccessed)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        mainContainer.appendChild(taskBoardBlock);
    });
    
    // Add event listeners
    addTaskBoardListeners();
}

function addTaskBoardListeners() {
    const mainContainer = document.getElementById('mainContainer');
    if (!mainContainer) return;
    
    // Three-dot menu buttons
    mainContainer.querySelectorAll('.board-menu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdownMenu(btn.dataset.boardId);
        });
    });
    
    // Dropdown menu items
    mainContainer.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const boardId = item.dataset.boardId;
            
            if (item.classList.contains('rename-board-item')) {
                renameBoardDialog(boardId);
            } else if (item.classList.contains('delete-board-item')) {
                deleteTaskBoard(boardId);
            }
            
            // Close all dropdowns after action
            closeAllDropdowns();
        });
    });
    
    // Click on board block to open (excluding creation block)
    mainContainer.querySelectorAll('.task-board-block:not(.creation-block)').forEach(block => {
        block.addEventListener('click', (e) => {
            // Don't trigger if clicking on menu
            if (e.target.closest('.board-menu-btn') || e.target.closest('.board-dropdown-menu')) return;
            
            const boardId = block.dataset.boardId;
            openTaskBoard(boardId);
        });
    });
}

// Close all dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.board-dropdown-menu') && !e.target.closest('.board-menu-btn')) {
        closeAllDropdowns();
    }
});

function toggleDropdownMenu(boardId) {
    const dropdown = document.querySelector(`.board-dropdown-menu[data-board-id="${boardId}"]`);
    const menuBtn = document.querySelector(`.board-menu-btn[data-board-id="${boardId}"]`);
    
    if (!dropdown || !menuBtn) return;
    
    // Close all other dropdowns first
    closeAllDropdowns();
    
    // Toggle current dropdown
    const isVisible = dropdown.style.display === 'block';
    if (isVisible) {
        dropdown.style.display = 'none';
        menuBtn.classList.remove('active');
    } else {
        dropdown.style.display = 'block';
        menuBtn.classList.add('active');
    }
}

function closeAllDropdowns() {
    document.querySelectorAll('.board-dropdown-menu').forEach(dropdown => {
        dropdown.style.display = 'none';
    });
    document.querySelectorAll('.board-menu-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

function renameBoardDialog(boardId) {
    const instance = taskBoardInstances.find(board => board.id === boardId);
    if (!instance) return;
    
    showBoardNameDialog((newName) => {
        if (newName && newName.trim() !== '' && newName.trim() !== instance.name) {
            instance.name = newName.trim();
            saveAllTaskBoards();
            renderTaskBoardsList();
            console.log(`✏️ Renamed task board to: "${newName}"`);
        }
    }, instance.name, 'Rename Task Board');
}

function deleteTaskBoard(boardId) {
    const instance = taskBoardInstances.find(board => board.id === boardId);
    if (!instance) return;
    
    // Remove from instances array immediately
    const index = taskBoardInstances.findIndex(board => board.id === boardId);
    if (index > -1) {
        taskBoardInstances.splice(index, 1);
    }
    
    // Save to localStorage
    saveAllTaskBoards();
    
    // Update display
    renderTaskBoardsList();
    
    console.log(`🗑️ Deleted task board: "${instance.name}"`);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// Task board button
const taskBoardBtn = document.getElementById('taskBoardBtn');
if (taskBoardBtn) taskBoardBtn.addEventListener('click', createNewTaskBoard);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, WorkWith ready');
    console.log('✅ Task Board component loaded');
    
    // Load existing task boards
    loadAllTaskBoards();
    renderTaskBoardsList();
});
// Hot reload support for development
if (import.meta.hot) {
    import.meta.hot.accept();
}
