// Floating Task Board Modal Component
import { TaskCardWrapper } from './TaskCardWrapper.js';
import { FocusMode } from './focusMode.js';

export class TaskBoardModal {
    constructor(boardName = 'Task Board') {
        this.isVisible = false;
        this.boardName = boardName;
        this.tasks = {
            'in-process': [],
            'today': [],
            'done': []
        };
        // Note: localStorage loading removed to ensure empty initial state
        this.loadStyles(); // Load external CSS
        this.element = this.createModal();
        this.bindEvents();
        this.focusMode = null;
        
        // Auto-sync configuration
        // 自動同步配置
        this.autoSyncTimeout = null;
        this.autoSyncDelay = 1000; // 10 seconds
        this.pendingChanges = new Map(); // Track which tasks have pending changes: taskId -> {type, timestamp}
    }

    createModal() {
        const modal = document.createElement('div');
        modal.className = 'task-board-overlay';
        
        // Check if Notion sync is enabled
        const settings = this.loadSettings();
        const notionIntegrationHtml = settings.notionSyncEnabled ? `
            <div class="notion-integration">
                <button class="notion-btn" id="notionIntegrationBtn" title="Link to Notion Database">
                    <img src="assets/notion-icon.png" alt="Notion" width="16" height="16">
                </button>
                <div class="notion-dropdown" id="notionDropdown" style="display: none;">
                    <div class="dropdown-header">
                        <span>Notion Sync Configuration</span>
                    </div>
                    <div class="dropdown-content" id="notionDropdownContent">
                        <!-- Sync configuration options will be populated here -->
                    </div>
                </div>
            </div>
        ` : '';
        
        modal.innerHTML = `
            <div class="task-board-modal">
                <header class="task-board-header">
                    <div class="header-left">
                        ${notionIntegrationHtml}
                    </div>
                    <h2>${this.boardName}</h2>
                    <div class="header-actions">
                        <button class="focus-mode-btn" title="Focus">Focus</button>
                        <button class="close-btn" aria-label="Close">×</button>
                    </div>
                </header>
                <div class="task-board-content">
                    <div class="task-column" data-status="in-process">
                        <div class="column-header">
                            <h3>In Process</h3>
                            <span class="task-count">0</span>
                        </div>
                        <div class="task-list" id="in-process-list"></div>
                    </div>
                    <div class="task-column" data-status="today">
                        <div class="column-header">
                            <h3>Today</h3>
                            <span class="task-count">0</span>
                        </div>
                        <div class="task-list" id="today-list"></div>
                    </div>
                    <div class="task-column" data-status="done">
                        <div class="column-header">
                            <h3>Done</h3>
                            <span class="task-count">0</span>
                        </div>
                        <div class="task-list" id="done-list"></div>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }



    loadStyles() {
        // Ensure styles are injected once and work in both dev and production builds
        // Use Vite's asset resolver so URLs are transformed in the bundle
        if (!document.getElementById('task-board-modal-styles')) {
            const link = document.createElement('link');
            link.id = 'task-board-modal-styles';
            link.rel = 'stylesheet';
            link.type = 'text/css';
            try {
                link.href = new URL('./TaskBoardModal.css', import.meta.url).href;
            } catch (e) {
                console.error('Failed to resolve TaskBoardModal.css URL', e);
            }

            link.onerror = () => {
                console.error('Failed to load TaskBoardModal styles');
            };
            document.head.appendChild(link);
        }

        // Also load TaskCard styles used inside the board
        if (!document.getElementById('task-card-styles')) {
            const linkCard = document.createElement('link');
            linkCard.id = 'task-card-styles';
            linkCard.rel = 'stylesheet';
            linkCard.type = 'text/css';
            try {
                linkCard.href = new URL('./TaskCard.css', import.meta.url).href;
            } catch (e) {
                console.error('Failed to resolve TaskCard.css URL', e);
            }

            linkCard.onerror = () => {
                console.error('Failed to load TaskCard styles');
            };
            document.head.appendChild(linkCard);
        }
    }



    bindEvents() {
        // Close modal events
        this.element.querySelector('.close-btn').addEventListener('click', () => this.hide());
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) this.hide();
        });

        // Focus Mode button
        const focusBtn = this.element.querySelector('.focus-mode-btn');
        if (focusBtn) {
            focusBtn.addEventListener('click', () => this.activateFocusMode());
        }

        // Notion Integration button (only if enabled in settings)
        const notionBtn = this.element.querySelector('#notionIntegrationBtn');
        if (notionBtn) {
            notionBtn.addEventListener('click', () => this.toggleNotionDropdown());
        }

        // Close dropdown when clicking outside (only if Notion integration exists)
        document.addEventListener('click', (e) => {
            const notionDropdown = this.element.querySelector('#notionDropdown');
            const notionIntegration = this.element.querySelector('.notion-integration');
            if (notionDropdown && notionIntegration && !notionIntegration.contains(e.target)) {
                notionDropdown.style.display = 'none';
            }
        });

        // Initial binding of hover button events
        this.bindHoverButtonEvents();

        // Setup drag and drop functionality
        this.setupDragAndDrop();

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });

        // Listen for settings changes to update Notion button visibility
        document.addEventListener('settingsChanged', (e) => {
            if (this.isVisible) {
                this.refreshModal();
            }
        });
    }

    bindHoverButtonEvents() {
        // Use event delegation for dynamically created hover areas
        this.element.addEventListener('click', (e) => {
            if (e.target.closest('.add-task-hover-area')) {
                const area = e.target.closest('.add-task-hover-area');
                const status = area.dataset.status;
                this.addTask(status);
            }
        });
    }

    renderTasks() {
        Object.keys(this.tasks).forEach(status => {
            const listId = `${status}-list`;
            const list = this.element.querySelector(`#${listId}`);
            const count = this.element.querySelector(`[data-status="${status}"] .task-count`);
            
            if (!list) {
                console.warn(`Task list not found: ${listId}`);
                return;
            }
            
            list.innerHTML = '';
            this.tasks[status].forEach(task => {
                const taskCard = TaskCardWrapper.createTaskCard(task, status, (taskId, taskStatus) => {
                    this.deleteTask(taskId, taskStatus);
                }, (taskId, fromStatus) => {
                    this.moveTaskToDone(taskId, fromStatus);
                }, (updatedTask) => {
                    this.updateTask(updatedTask, status);
                });
                list.appendChild(taskCard);
            });
            
            // Add hover area right after all tasks
            const hoverArea = document.createElement('div');
            hoverArea.className = 'add-task-hover-area';
            hoverArea.dataset.status = status;
            hoverArea.innerHTML = `
                <div class="hover-indicator"></div>
                <div class="hover-text">+ Add Task</div>
            `;
            list.appendChild(hoverArea);
            
            count.textContent = this.tasks[status].length;
        });
    }

    addTask(status) {
        this.showAddTaskModal(status);
    }

    deleteTask(taskId, status) {
        // Find the task to get its title for success message
        const task = this.tasks[status].find(t => t.id === taskId);
        if (!task) {
            console.error('Task not found');
            return;
        }

        // Store task info for auto-sync before deletion
        // 在刪除前存儲任務信息以供自動同步使用
        this.pendingTaskInfo = this.pendingTaskInfo || new Map();
        this.pendingTaskInfo.set(taskId, {
            ...task,
            status: status,
            deletedAt: Date.now()
        });

        // Remove task from the array immediately
        this.tasks[status] = this.tasks[status].filter(t => t.id !== taskId);
        
        // Re-render tasks to update UI
        this.renderTasks();
        
        // Save updated tasks to localStorage
        this.saveToLocalStorage();
        
        // Dispatch event to notify home page about task count change
        this.dispatchTaskCountUpdate();
        
        // Notify Focus Mode if 'today' task was deleted
        if (this.focusMode && status === 'today') {
            this.focusMode.onTaskBoardUpdate();
        }
        
        // Trigger auto-sync for deleted task
        // 為刪除的任務觸發自動同步
        this.triggerAutoSync(taskId, 'delete');
        
        // Show success message
        this.showSuccessMessage(`Task "${task.title}" deleted successfully!`);
    }

    setupDragAndDrop() {
        // Handle drag start
        this.element.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('task-card')) {
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.outerHTML);
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    taskId: e.target.dataset.taskId,
                    fromStatus: e.target.dataset.status
                }));
            }
        });

        // Handle drag end
        this.element.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('task-card')) {
                e.target.classList.remove('dragging');
            }
        });

        // Handle drag over (allow drop)
        this.element.addEventListener('dragover', (e) => {
            e.preventDefault();
            const taskList = e.target.closest('.task-list');
            if (taskList) {
                e.dataTransfer.dropEffect = 'move';
                taskList.classList.add('drag-over');
                
                // Handle vertical reordering within the same list
                this.handleVerticalDragOver(e, taskList);
            }
        });

        // Handle drag enter
        this.element.addEventListener('dragenter', (e) => {
            e.preventDefault();
            const taskList = e.target.closest('.task-list');
            if (taskList) {
                taskList.classList.add('drag-over');
            }
        });

        // Handle drag leave
        this.element.addEventListener('dragleave', (e) => {
            const taskList = e.target.closest('.task-list');
            if (taskList && !taskList.contains(e.relatedTarget)) {
                taskList.classList.remove('drag-over');
            }
        });

        // Handle drop
        this.element.addEventListener('drop', (e) => {
            e.preventDefault();
            const taskList = e.target.closest('.task-list');
            
            if (taskList) {
                taskList.classList.remove('drag-over');
                this.clearDropIndicators();
                
                // Get drop zone status
                const column = taskList.closest('.task-column');
                const toStatus = column.dataset.status;
                
                // Get dragged task data
                const taskData = JSON.parse(e.dataTransfer.getData('text/plain'));
                const taskId = parseInt(taskData.taskId);
                const fromStatus = taskData.fromStatus;
                
                if (fromStatus === toStatus) {
                    // Handle vertical reordering within the same list
                    this.handleVerticalDrop(e, taskList, taskId, fromStatus);
                } else {
                    // Handle moving between different columns
                    this.moveTask(taskId, fromStatus, toStatus);
                }
            }
        });
    }

    moveTask(taskId, fromStatus, toStatus) {
        // Find the task in the source status
        const taskIndex = this.tasks[fromStatus].findIndex(task => task.id === taskId);
        if (taskIndex === -1) {
            console.error('Task not found in source status');
            return;
        }

        // Get the task object
        const task = this.tasks[fromStatus][taskIndex];
        
        // Remove from source status
        this.tasks[fromStatus].splice(taskIndex, 1);
        
        // Update task status and add to destination status
        task.status = toStatus;
        task.movedAt = new Date().toISOString();
        this.tasks[toStatus].push(task);
        
        // Re-render tasks to update UI
        this.renderTasks();
        
        // Save updated tasks to localStorage
        this.saveToLocalStorage();
        
        // Dispatch event to notify home page about task count change
        this.dispatchTaskCountUpdate();
        
        // Notify Focus Mode if 'today' tasks were affected
        if (this.focusMode && (fromStatus === 'today' || toStatus === 'today')) {
            this.focusMode.onTaskBoardUpdate();
        }
        
        // Trigger auto-sync for moved task
        // 為移動的任務觸發自動同步
        this.triggerAutoSync(taskId, 'move');
        
        // Show success message
        const statusNames = {
            'in-process': 'In Process',
            'today': 'Today',
            'done': 'Done'
        };
        
        this.showSuccessMessage(`Task "${task.title}" moved to ${statusNames[toStatus]}!`);
    }

    moveTaskToDone(taskId, fromStatus) {
        // If already in done status, do nothing
        if (fromStatus === 'done') return;
        
        // Use the existing moveTask method
        this.moveTask(taskId, fromStatus, 'done');
    }

    updateTask(updatedTask, status) {
        // Find and update the task in the tasks array
        const taskIndex = this.tasks[status].findIndex(task => task.id === updatedTask.id);
        if (taskIndex !== -1) {
            this.tasks[status][taskIndex] = updatedTask;
            this.saveToLocalStorage();
            
            // Trigger auto-sync for updated task
            // 為更新的任務觸發自動同步
            this.triggerAutoSync(updatedTask.id, 'update');
        }
    }

    handleVerticalDragOver(e, taskList) {
        // Clear existing drop indicators
        this.clearDropIndicators();
        
        const draggingElement = document.querySelector('.dragging');
        if (!draggingElement) return;
        
        const taskCards = [...taskList.querySelectorAll('.task-card:not(.dragging)')];
        const mouseY = e.clientY;
        
        let insertAfter = null;
        
        for (const taskCard of taskCards) {
            const rect = taskCard.getBoundingClientRect();
            const middle = rect.top + rect.height / 2;
            
            if (mouseY < middle) {
                break;
            }
            insertAfter = taskCard;
        }
        
        // Add drop indicator
        this.showDropIndicator(taskList, insertAfter);
    }

    handleVerticalDrop(e, taskList, taskId, status) {
        const taskCards = [...taskList.querySelectorAll('.task-card:not(.dragging)')];
        const mouseY = e.clientY;
        
        let insertIndex = 0;
        
        for (let i = 0; i < taskCards.length; i++) {
            const rect = taskCards[i].getBoundingClientRect();
            const middle = rect.top + rect.height / 2;
            
            if (mouseY < middle) {
                insertIndex = i;
                break;
            }
            insertIndex = i + 1;
        }
        
        this.reorderTask(taskId, status, insertIndex);
    }

    reorderTask(taskId, status, newIndex) {
        const tasks = this.tasks[status];
        const currentIndex = tasks.findIndex(task => task.id === taskId);
        
        if (currentIndex === -1) return;
        
        // Remove task from current position
        const [task] = tasks.splice(currentIndex, 1);
        
        // Adjust index if moving down in the same list
        if (currentIndex < newIndex) {
            newIndex--;
        }
        
        // Insert at new position
        tasks.splice(newIndex, 0, task);
        
        // Re-render tasks
        this.renderTasks();
        this.saveToLocalStorage();
        
        // Notify Focus Mode of order change
        if (this.focusMode && status === 'today') {
            this.focusMode.onTaskBoardUpdate();
        }
        
        console.log(`✅ Reordered task "${task.title}" in ${status}`);
    }

    showDropIndicator(taskList, insertAfter) {
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        
        if (insertAfter) {
            insertAfter.insertAdjacentElement('afterend', indicator);
        } else {
            taskList.insertBefore(indicator, taskList.firstChild);
        }
    }

    clearDropIndicators() {
        const indicators = document.querySelectorAll('.drop-indicator');
        indicators.forEach(indicator => indicator.remove());
    }

    showAddTaskModal(status) {
        // Create add task modal
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'add-task-modal';
        modalOverlay.innerHTML = `
            <div class="add-task-content">
                <header class="modal-header">
                    <h3 class="modal-title">Add New Task</h3>
                    <button class="close-add-task-btn" aria-label="Close">×</button>
                </header>
                <form class="add-task-form">
                    <div class="form-group">
                        <label for="task-title">Task Title *</label>
                        <input type="text" id="task-title" name="title" required maxlength="100" placeholder="Enter task title..." autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label for="task-estimate">Estimate Time</label>
                        <input type="text" id="task-estimate" name="estimateTime" pattern="^([0-9]|[1-9][0-9]|[1-9][0-9][0-9]):([0-5][0-9])$" placeholder="HH:MM (e.g., 02:30)" autocomplete="off" title="Enter time in HH:MM format">
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Add Task</button>
                    </div>
                </form>
            </div>
        `;

        // Styles are already loaded via external CSS file

        // Add event listeners
        const closeBtn = modalOverlay.querySelector('.close-add-task-btn');
        const cancelBtn = modalOverlay.querySelector('.btn-secondary');
        const form = modalOverlay.querySelector('.add-task-form');
        const titleInput = modalOverlay.querySelector('#task-title');

        // Close modal handlers
        const closeModal = () => {
            modalOverlay.classList.remove('show');
            setTimeout(() => {
                if (modalOverlay.parentNode) {
                    modalOverlay.parentNode.removeChild(modalOverlay);
                }
            }, 300);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });

        // Auto-format time input
        const timeInput = modalOverlay.querySelector('#task-estimate');
        timeInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^\d]/g, ''); // Remove non-digits
            
            if (value.length >= 2) {
                // Add colon after first two digits
                value = value.substring(0, 2) + ':' + value.substring(2, 4);
            }
            
            // Limit to HH:MM format (5 characters max)
            if (value.length > 5) {
                value = value.substring(0, 5);
            }
            
            e.target.value = value;
        });

        // Add dropdown functionality for time input
        const showTimeDropdown = () => {
            // Remove any existing dropdown
            const existingDropdown = modalOverlay.querySelector('.time-dropdown');
            if (existingDropdown) {
                existingDropdown.remove();
            }

            // Create dropdown
            const dropdown = document.createElement('div');
            dropdown.className = 'time-dropdown';
            dropdown.innerHTML = `
                <div class="dropdown-option" data-minutes="10">10m</div>
                <div class="dropdown-option" data-minutes="30">30m</div>
                <div class="dropdown-option" data-minutes="60">1h</div>
                <div class="dropdown-option" data-minutes="90">1h 30m</div>
                <div class="dropdown-option" data-minutes="120">2h</div>
                <div class="dropdown-option" data-minutes="150">2h 30m</div>
                <div class="dropdown-option" data-minutes="180">3h</div>
            `;

            // Position dropdown below the input
            const inputContainer = timeInput.parentNode;
            inputContainer.style.position = 'relative';
            inputContainer.appendChild(dropdown);

            // Add click handlers for options
            const options = dropdown.querySelectorAll('.dropdown-option');
            options.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const minutes = parseInt(option.dataset.minutes);
                    const hours = Math.floor(minutes / 60);
                    const mins = minutes % 60;
                    
                    // Format as HH:MM
                    const formattedTime = hours > 0 ? 
                        `${hours}:${String(mins).padStart(2, '0')}` : 
                        `0:${String(mins).padStart(2, '0')}`;
                    
                    timeInput.value = formattedTime;
                    timeInput.blur(); // Blur the input as requested
                    dropdown.remove();
                });
            });

            // Close dropdown when clicking outside
            const closeDropdown = (e) => {
                if (!dropdown.contains(e.target) && !timeInput.contains(e.target)) {
                    dropdown.remove();
                    document.removeEventListener('mousedown', closeDropdown, true);
                }
            };

            // Use setTimeout to avoid immediate closure
            setTimeout(() => {
                document.addEventListener('mousedown', closeDropdown, true);
            }, 100);
        };

        // Add focus and click event listeners
        timeInput.addEventListener('focus', showTimeDropdown);
        timeInput.addEventListener('click', showTimeDropdown);

        // Handle backspace properly
        timeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                const value = e.target.value;
                const cursorPos = e.target.selectionStart;
                
                // If cursor is right after the colon, remove the colon and the digit before it
                if (cursorPos === 3 && value.charAt(2) === ':') {
                    e.preventDefault();
                    e.target.value = value.substring(0, 1);
                    e.target.setSelectionRange(1, 1);
                }
            }
        });

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            // Validate required field
            const title = formData.get('title').trim();
            const estimateTime = formData.get('estimateTime');
            
            if (!title) {
                this.showValidationError('Please enter a task title.');
                return;
            }

            // Validate time format if provided
            if (estimateTime && estimateTime.trim()) {
                const timePattern = /^([0-9]|[1-9][0-9]|[1-9][0-9][0-9]):([0-5][0-9])$/;
                if (!timePattern.test(estimateTime.trim())) {
                    this.showValidationError('Please enter time in HH:MM format (e.g., 02:30).');
                    return;
                }
            }

            // Create new task
            const newTask = {
                id: Date.now(),
                title: title,
                createdAt: new Date().toISOString(),
                status: status,
                estimateTime: estimateTime && estimateTime.trim() ? estimateTime.trim() : null,
                subtasks: []
            };

            // Add task to the appropriate column
            this.tasks[status].push(newTask);
            this.renderTasks();
            this.saveToLocalStorage();
            
            // Dispatch event to notify home page about task count change
            this.dispatchTaskCountUpdate();
            
            // Notify Focus Mode if task added to 'today'
            if (this.focusMode && status === 'today') {
                this.focusMode.onTaskBoardUpdate();
            }
            
            // Trigger auto-sync for new task
            // 為新任務觸發自動同步
            this.triggerAutoSync(newTask.id, 'create');
            
            // Show success message
            this.showSuccessMessage(`Task "${title}" added successfully!`);
            
            closeModal();
        });

        // Show modal
        document.body.appendChild(modalOverlay);
        requestAnimationFrame(() => {
            modalOverlay.classList.add('show');
        });

        // Focus on title input
        setTimeout(() => titleInput.focus(), 100);
    }

    showValidationError(message) {
        const existingError = document.querySelector('.validation-error');
        if (existingError) existingError.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error';
        errorDiv.textContent = message;
        
        const form = document.querySelector('.add-task-form');
        form.insertBefore(errorDiv, form.querySelector('.modal-actions'));
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 3000);
    }

    showSuccessMessage(message) {
        const existingSuccess = document.querySelector('.success-message');
        if (existingSuccess) existingSuccess.remove();

        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            successDiv.classList.remove('show');
            setTimeout(() => {
                if (successDiv.parentNode) {
                    successDiv.remove();
                }
            }, 300);
        }, 2000);
    }

    saveToLocalStorage() {
        try {
            const boardData = {
                boardName: this.boardName,
                tasks: this.tasks,
                lastUpdated: Date.now()
            };
            localStorage.setItem('workwith-taskboard', JSON.stringify(boardData));
        } catch (error) {
            console.error('Failed to save task board to localStorage:', error);
        }
    }

    dispatchTaskCountUpdate() {
        // Create custom event to notify home page about task count changes
        const event = new CustomEvent('taskCountUpdated', {
            detail: {
                boardName: this.boardName,
                taskCounts: {
                    'in-process': this.tasks['in-process'].length,
                    'today': this.tasks['today'].length,
                    'done': this.tasks['done'].length
                },
                tasks: this.tasks
            }
        });
        
        window.dispatchEvent(event);
        console.log('📊 Task count update event dispatched:', event.detail);
    }

    loadFromLocalStorage() {
        try {
            const savedBoard = localStorage.getItem('workwith-taskboard');
            if (savedBoard) {
                const boardData = JSON.parse(savedBoard);
                this.boardName = boardData.boardName || this.boardName;
                this.tasks = boardData.tasks || this.tasks;
                
                // Update the header with loaded name
                const header = this.element.querySelector('.task-board-header h2');
                if (header) {
                    header.textContent = this.boardName;
                }
                
                console.log(`✅ Loaded task board: "${this.boardName}"`);
            }
        } catch (error) {
            console.error('Failed to load task board from localStorage:', error);
        }
    }

    refreshModal() {
        // Check if Notion sync setting has changed
        const settings = this.loadSettings();
        const currentNotionIntegration = this.element.querySelector('.notion-integration');
        const shouldShowNotion = settings.notionSyncEnabled;
        
        if (shouldShowNotion && !currentNotionIntegration) {
            // Add Notion integration if it should be shown but doesn't exist
            const headerLeft = this.element.querySelector('.header-left');
            if (headerLeft) {
                const notionIntegrationHtml = `
                    <div class="notion-integration">
                        <button class="notion-btn" id="notionIntegrationBtn" title="Link to Notion Database">
                            <img src="assets/notion-icon.png" alt="Notion" width="16" height="16">
                        </button>
                        <div class="notion-dropdown" id="notionDropdown" style="display: none;">
                            <div class="dropdown-header">
                                <span>Notion Sync Configuration</span>
                            </div>
                            <div class="dropdown-content" id="notionDropdownContent">
                                <!-- Sync configuration options will be populated here -->
                            </div>
                        </div>
                    </div>
                `;
                headerLeft.innerHTML = notionIntegrationHtml;
                
                // Re-bind the Notion button event
                const notionBtn = this.element.querySelector('#notionIntegrationBtn');
                if (notionBtn) {
                    notionBtn.addEventListener('click', () => this.toggleNotionDropdown());
                }
            }
        } else if (!shouldShowNotion && currentNotionIntegration) {
            // Remove Notion integration if it shouldn't be shown but exists
            currentNotionIntegration.remove();
        }
    }

    show() {
        if (!this.isVisible) {
            // Modal mode - overlay
            if (!this.element.parentNode) {
                document.body.appendChild(this.element);
            }
            document.body.style.overflow = 'hidden';
            
            // Refresh the modal to check for settings changes
            this.refreshModal();
            this.renderTasks();
            // Trigger animation
            requestAnimationFrame(() => {
                this.element.classList.add('show');
            });
            this.isVisible = true;
            
            console.log(`✅ TaskBoard modal shown`);
        } else {
            console.log(`⚠️ TaskBoard modal already visible`);
        }
    }

    hide() {
        if (this.isVisible) {
            this.element.classList.remove('show');
            
            // Modal mode
            setTimeout(() => {
                if (this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                }
                document.body.style.overflow = ''; // Restore scroll
            }, 300);
            
            this.isVisible = false;
            console.log(`✅ TaskBoard modal hidden`);
        } else {
            console.log(`⚠️ TaskBoard modal already hidden`);
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    // --- Focus Mode integration ---
    activateFocusMode() {
        if (!this.focusMode) {
            this.focusMode = new FocusMode(this);
        }
        // Hide modal first
        this.hide();
        // Activate focus mode
        this.focusMode.activate();

        // When deactivated, re-show the board
        const onDeactivate = () => {
            this.show();
            document.removeEventListener('focusModeDeactivated', onDeactivate);
        };
        document.addEventListener('focusModeDeactivated', onDeactivate);
    }

    // Notion Integration Methods
    // Notion 整合方法
    
    async toggleNotionDropdown() {
        const dropdown = this.element.querySelector('#notionDropdown');
        const isVisible = dropdown.style.display !== 'none';
        
        if (isVisible) {
            dropdown.style.display = 'none';
        } else {
            // Clear any cached sync config to ensure fresh state
            this.clearSyncConfigCache();
            await this.loadNotionSyncConfig();
            dropdown.style.display = 'block';
        }
    }

    async loadNotionSyncConfig() {
        const dropdownContent = this.element.querySelector('#notionDropdownContent');
        
        try {
            // Check if Notion integration is enabled and API key is available
            const settings = this.loadSettings();
            if (!settings.notionSyncEnabled || !settings.notionApiKey) {
                dropdownContent.innerHTML = `
                    <div class="sync-config-error">
                        <div class="error-icon">⚠️</div>
                        <div class="error-message">Notion integration not configured</div>
                        <div class="error-detail">Please configure Notion settings first</div>
                    </div>
                `;
                return;
            }

            // Load current sync configuration for this task board
            const syncConfig = this.loadSyncConfig();
            
            // Create sync configuration UI
            dropdownContent.innerHTML = `
                <div class="sync-config-section">
                    <div class="sync-status">
                        <div class="status-indicator ${syncConfig.connected ? 'connected' : 'disconnected'}"></div>
                        <span class="status-text">${syncConfig.connected ? 'Connected' : 'Not Connected'}</span>
                    </div>
                    
                    ${syncConfig.databaseTitle ? `
                        <div class="linked-database">
                            <span class="database-label">Linked Database:</span>
                            <span class="database-name">${syncConfig.databaseTitle}</span>
                        </div>
                    ` : ''}
                </div>
                
                
                <div class="sync-config-section">
                    <div class="config-item">
                        <label class="config-label">Auto Sync</label>
                        <div class="toggle-container">
                            <input type="checkbox" id="autoSync" class="sync-toggle" ${syncConfig.autoSync ? 'checked' : ''}>
                            <label for="autoSync" class="toggle-label">Enable automatic synchronization</label>
                        </div>
                    </div>
                </div>
                
                
                <div class="sync-actions">
                    <button class="sync-btn primary" id="manualSyncBtn">
                        <span class="sync-icon">🔄</span>
                        Sync Now
                    </button>
                    <button class="sync-btn secondary" id="selectDatabaseBtn">
                        <span class="sync-icon">📋</span>
                        Select Database
                    </button>
                </div>
                
                ${!syncConfig.connected ? `
                    <div class="sync-config-section">
                        <button class="sync-btn connect" id="connectDatabaseBtn">
                            <span class="sync-icon">🔗</span>
                            Connect Database
                        </button>
                    </div>
                ` : ''}
            `;
            
            // Bind event handlers
            this.bindSyncConfigEvents();
            
        } catch (error) {
            console.error('Failed to load sync configuration:', error);
            dropdownContent.innerHTML = '<div class="dropdown-error">Failed to load sync configuration.</div>';
        }
    }

    bindSyncConfigEvents() {
        // Auto sync toggle
        const autoSyncToggle = this.element.querySelector('#autoSync');
        if (autoSyncToggle) {
            autoSyncToggle.addEventListener('change', (e) => {
                this.updateSyncConfig('autoSync', e.target.checked);
            });
        }

        // Manual sync button
        const manualSyncBtn = this.element.querySelector('#manualSyncBtn');
        if (manualSyncBtn) {
            manualSyncBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.triggerManualSync();
            });
        }

        // Select database button
        const selectDatabaseBtn = this.element.querySelector('#selectDatabaseBtn');
        if (selectDatabaseBtn) {
            selectDatabaseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔧 Select Database button clicked');
                this.showDatabaseSelection();
            });
        }

        // Connect database button
        const connectDatabaseBtn = this.element.querySelector('#connectDatabaseBtn');
        if (connectDatabaseBtn) {
            connectDatabaseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔧 Connect Database button clicked');
                this.showDatabaseSelection();
            });
        }
    }

    loadSyncConfig() {
        // Load sync configuration for this specific task board
        const configKey = `workwith-sync-config-${this.boardName}`;
        try {
            const saved = localStorage.getItem(configKey);
            if (saved) {
                const config = JSON.parse(saved);
                // Remove any old 'direction' property if it exists
                if (config.direction) {
                    delete config.direction;
                    this.saveSyncConfig(config);
                }
                return config;
            }
            return {
                connected: false,
                databaseId: null,
                databaseTitle: null,
                autoSync: true,
                lastSync: null,
                statusMappings: {
                    'in-process': '',
                    'done': ''
                }
            };
        } catch (error) {
            console.error('Failed to load sync config:', error);
            return {
                connected: false,
                databaseId: null,
                databaseTitle: null,
                autoSync: true,
                lastSync: null,
                statusMappings: {
                    'in-process': '',
                    'done': ''
                }
            };
        }
    }

    saveSyncConfig(config) {
        const configKey = `workwith-sync-config-${this.boardName}`;
        try {
            localStorage.setItem(configKey, JSON.stringify(config));
        } catch (error) {
            console.error('Failed to save sync config:', error);
        }
    }

    clearSyncConfigCache() {
        // Force reload of sync config to ensure any old data is cleared
        const configKey = `workwith-sync-config-${this.boardName}`;
        try {
            const saved = localStorage.getItem(configKey);
            if (saved) {
                const config = JSON.parse(saved);
                // Remove any old properties that might cause issues
                delete config.direction;
                localStorage.setItem(configKey, JSON.stringify(config));
            }
        } catch (error) {
            console.error('Failed to clear sync config cache:', error);
        }
    }

    updateSyncConfig(key, value) {
        const currentConfig = this.loadSyncConfig();
        currentConfig[key] = value;
        this.saveSyncConfig(currentConfig);
        
        console.log(`Updated sync config: ${key} = ${value}`);
        this.showNotification(`Sync configuration updated`, 'success');
    }

    async triggerManualSync() {
        const syncBtn = this.element.querySelector('#manualSyncBtn');
        const originalText = syncBtn.innerHTML;
        
        try {
            syncBtn.innerHTML = '<span class="sync-icon">⏳</span>Syncing...';
            syncBtn.disabled = true;
            
            // Get current sync configuration
            // 獲取當前同步配置
            const syncConfig = this.loadSyncConfig();
            
            if (!syncConfig.connected || !syncConfig.databaseId) {
                throw new Error('No database connected. Please select a database first.');
            }

            // Get settings for API key
            // 獲取 API 密鑰的設置
            const settings = this.loadSettings();
            if (!settings.notionSyncEnabled || !settings.notionApiKey) {
                throw new Error('Notion sync not configured. Please check your settings.');
            }

            this.showNotification('Starting manual sync...', 'info');

            // Step 1: Get existing pages from Notion
            // 步驟 1：從 Notion 獲取現有頁面
            console.log('🔧 Step 1: Getting existing pages from Notion...');
            const pagesResult = await window.electronAPI.notionAPI.getExistingPages(settings.notionApiKey, syncConfig.databaseId);
            
            if (!pagesResult.success) {
                throw new Error(pagesResult.error);
            }

            const notionPages = pagesResult.pages;
            const appTasks = this.getAllSyncableTasks();
            
            console.log('🔧 App tasks:', appTasks.length);
            console.log('🔧 Notion pages:', notionPages.length);

            // Step 2: Compare tasks to find differences
            // 步驟 2：比較任務以找出差異
            console.log('🔧 Step 2: Comparing tasks...');
            const { tasksToUpload, pagesToDownload } = this.compareTasksForSync(appTasks, notionPages, syncConfig.statusMappings || {});
            
            console.log('🔧 Tasks to upload:', tasksToUpload.length);
            console.log('🔧 Pages to download:', pagesToDownload.length);
            console.log('🔧 Sample task to upload:', tasksToUpload[0]);
            console.log('🔧 Sample notion page:', notionPages[0]);
            
            // Debug: Check if any tasks have subtasks
            // 調試：檢查是否有任務包含子任務
            const tasksWithSubtasks = tasksToUpload.filter(task => task.subtasks && task.subtasks.length > 0);
            console.log(`🔧 Tasks with subtasks to upload: ${tasksWithSubtasks.length}`);
            tasksWithSubtasks.forEach(task => {
                console.log(`🔧 Task "${task.title}" has subtasks:`, task.subtasks);
            });

            let uploadedCount = 0;
            let downloadedCount = 0;

            // Step 3: Upload tasks to Notion (if any)
            // 步驟 3：將任務上傳到 Notion（如果有）
            if (tasksToUpload.length > 0) {
                console.log('🔧 Step 3: Uploading tasks to Notion...');
                console.log('🔧 Tasks to upload:', tasksToUpload.map(t => ({ title: t.title, status: t.status })));
                const uploadResult = await window.electronAPI.notionAPI.syncTaskBoardToNotion(
                    settings.notionApiKey, 
                    syncConfig.databaseId, 
                    tasksToUpload, 
                    syncConfig.statusMappings || {}
                );
                
                if (!uploadResult.success) {
                    throw new Error(`Upload failed: ${uploadResult.error}`);
                }

                uploadedCount = uploadResult.result.created.length + uploadResult.result.updated.length;
                console.log('🔧 Uploaded:', uploadedCount, 'tasks');
                
                // Store ID mappings for created and updated tasks
                // 為創建和更新的任務存儲 ID 映射
                uploadResult.result.created.forEach(item => {
                    if (item.appTaskId && item.notionPageId) {
                        this.storeIdMapping(item.appTaskId, item.notionPageId, syncConfig.databaseId);
                    }
                });
                uploadResult.result.updated.forEach(item => {
                    if (item.appTaskId && item.notionPageId) {
                        this.storeIdMapping(item.appTaskId, item.notionPageId, syncConfig.databaseId);
                    }
                });
            }

            // Step 4: Download tasks from Notion (if any)
            // 步驟 4：從 Notion 下載任務（如果有）
            if (pagesToDownload.length > 0) {
                console.log('🔧 Step 4: Downloading tasks from Notion...');
                
                // Convert Notion pages to task format and apply status mappings
                // 將 Notion 頁面轉換為任務格式並應用狀態映射
                for (const notionPage of pagesToDownload) {
                    try {
                        // Convert Notion page to task format
                        // 將 Notion 頁面轉換為任務格式
                        const notionTask = {
                            id: Date.now() + Math.floor(Math.random() * 100000), // Generate new app ID
                            title: notionPage.properties?.Name?.title?.[0]?.text?.content || 'Untitled Task',
                            status: notionPage.properties?.['Status Update']?.status?.name || 'Not started',
                            estimatedTime: notionPage.properties?.['Est Time']?.number || 0,
                            timeSpent: notionPage.properties?.['Time Spent']?.number || 0,
                            notionPageId: notionPage.id,
                            createdAt: new Date().toISOString()
                        };

                        // Apply reverse status mappings
                        // 應用反向狀態映射
                        if (syncConfig.statusMappings) {
                            const appStatus = Object.keys(syncConfig.statusMappings).find(appStatus => 
                                syncConfig.statusMappings[appStatus] === notionTask.status
                            );
                            if (appStatus) {
                                notionTask.status = appStatus;
                            } else {
                                // If no mapping found, default to 'in-process'
                                // 如果沒有找到映射，默認為 'in-process'
                                notionTask.status = 'in-process';
                            }
                        }

                        // Add task to app
                        // 將任務添加到應用
                        this.addTaskFromSync(notionTask);
                        downloadedCount++;
                        
                    } catch (error) {
                        console.error('Error processing Notion page:', error);
                    }
                }
                
                console.log('🔧 Downloaded:', downloadedCount, 'tasks');
            }

            // Update sync timestamp
            // 更新同步時間戳
            syncConfig.lastSync = new Date().toISOString();
            this.saveSyncConfig(syncConfig);

            // Show success message
            // 顯示成功消息
            if (uploadedCount > 0 || downloadedCount > 0) {
                this.showNotification(
                    `Manual sync completed! Uploaded ${uploadedCount} tasks, downloaded ${downloadedCount} tasks.`, 
                    'success'
                );
            } else {
                this.showNotification('Manual sync completed! All tasks are already synchronized.', 'success');
            }
            
        } catch (error) {
            console.error('Manual sync failed:', error);
            this.showNotification(`Manual sync failed: ${error.message}`, 'error');
        } finally {
            syncBtn.innerHTML = originalText;
            syncBtn.disabled = false;
        }
    }

    /**
     * Trigger auto-sync for time spent changes (called from focus mode)
     * 為時間花費更改觸發自動同步（從專注模式調用）
     * @param {string|number} taskId - Task ID
     */
    triggerTimeSpentSync(taskId) {
        console.log(`🔧 Time spent sync triggered for task: ${taskId}`);
        this.triggerAutoSync(taskId, 'timeSpent');
    }

    /**
     * Trigger auto-sync for a specific task change
     * 為特定任務更改觸發自動同步
     * @param {string|number} taskId - Task ID
     * @param {string} changeType - Type of change (create, update, delete, move, timeSpent)
     */
    triggerAutoSync(taskId, changeType) {
        const syncConfig = this.loadSyncConfig();
        
        // Only proceed if auto-sync is enabled and database is connected
        // 只有在自動同步啟用且資料庫已連接時才繼續
        if (!syncConfig.autoSync || !syncConfig.connected || !syncConfig.databaseId) {
            console.log('🔧 Auto-sync skipped: not enabled or database not connected');
            return;
        }

        console.log(`🔧 Auto-sync triggered for task ${taskId}, change type: ${changeType}`);
        console.log(`🔧 Auto-sync config - enabled: ${syncConfig.autoSync}, connected: ${syncConfig.connected}, databaseId: ${syncConfig.databaseId}`);
        console.log(`🔧 Sync config details:`, syncConfig);
        
        // Record the pending change
        // 記錄待處理的更改
        this.pendingChanges.set(taskId, {
            type: changeType,
            timestamp: Date.now()
        });

        // Clear existing timeout
        // 清除現有超時
        if (this.autoSyncTimeout) {
            clearTimeout(this.autoSyncTimeout);
        }

        // Set new timeout for auto-sync
        // 設置自動同步的新超時
        this.autoSyncTimeout = setTimeout(() => {
            this.executeAutoSync();
        }, this.autoSyncDelay);

        console.log(`🔧 Auto-sync scheduled in ${this.autoSyncDelay}ms`);
    }

    /**
     * Execute the actual auto-sync operation
     * 執行實際的自動同步操作
     */
    async executeAutoSync() {
        if (this.pendingChanges.size === 0) {
            console.log('🔧 No pending changes for auto-sync');
            return;
        }

        console.log(`🔧 Executing auto-sync for ${this.pendingChanges.size} pending changes`);
        
        try {
            // Get current sync configuration
            // 獲取當前同步配置
            const syncConfig = this.loadSyncConfig();
            
            if (!syncConfig.connected || !syncConfig.databaseId) {
                console.log('🔧 Auto-sync skipped: database not connected');
                this.pendingChanges.clear();
                return;
            }

            // Get settings for API key
            // 獲取 API 密鑰的設置
            const settings = this.loadSettings();
            if (!settings.notionSyncEnabled || !settings.notionApiKey) {
                console.log('🔧 Auto-sync skipped: Notion sync not configured');
                this.pendingChanges.clear();
                return;
            }

            // Get tasks that have pending changes
            // 獲取有待處理更改的任務
            const changedTaskIds = Array.from(this.pendingChanges.keys());
            console.log(`🔧 Auto-syncing tasks with IDs:`, changedTaskIds);

            // Get all syncable tasks (this includes the changed tasks)
            // 獲取所有可同步的任務（這包括已更改的任務）
            const appTasks = this.getAllSyncableTasks();
            
            // Separate deleted tasks from other changes
            // 將已刪除的任務與其他更改分開
            const deletedTaskIds = [];
            const otherChangedTaskIds = [];
            
            changedTaskIds.forEach(taskId => {
                const change = this.pendingChanges.get(taskId);
                if (change && change.type === 'delete') {
                    deletedTaskIds.push(taskId);
                } else {
                    otherChangedTaskIds.push(taskId);
                }
            });
            
            // Filter to only include non-deleted tasks that have pending changes
            // 過濾只包括有待處理更改的非已刪除任務
            const tasksToSync = appTasks.filter(task => otherChangedTaskIds.includes(task.id));
            
            // Check if we have any work to do
            // 檢查是否有任何工作要做
            if (tasksToSync.length === 0 && deletedTaskIds.length === 0) {
                console.log('🔧 No tasks to sync found');
                this.pendingChanges.clear();
                if (this.pendingTaskInfo) {
                    this.pendingTaskInfo.clear();
                }
                return;
            }

            console.log(`🔧 Auto-syncing ${tasksToSync.length} tasks:`, tasksToSync.map(t => ({ id: t.id, title: t.title, status: t.status })));
            console.log(`🔧 Status mappings:`, syncConfig.statusMappings);

            let result = { success: true, result: { results: [] } };
            
            // Sync regular tasks (create/update) if any
            // 如果有任何常規任務則同步（創建/更新）
            if (tasksToSync.length > 0) {
                // Call the auto-sync API via IPC
                // 通過 IPC 調用自動同步 API
                result = await window.electronAPI.notionAPI.autoSyncTasks(
                    settings.notionApiKey,
                    syncConfig.databaseId,
                    tasksToSync,
                    syncConfig.statusMappings || {}
                );
            }
            
            // Handle deleted tasks separately
            // 單獨處理已刪除的任務
            if (deletedTaskIds.length > 0) {
                console.log(`🔧 Processing ${deletedTaskIds.length} deleted tasks`);
                const deleteResult = await window.electronAPI.notionAPI.autoSyncDeletedTasks(
                    settings.notionApiKey,
                    syncConfig.databaseId,
                    deletedTaskIds,
                    this.pendingTaskInfo
                );
                
                // Merge results
                // 合併結果
                if (result.success && deleteResult.success) {
                    result.result.results = [...(result.result.results || []), ...(deleteResult.result.results || [])];
                } else if (!deleteResult.success) {
                    result = deleteResult;
                }
            }

            if (result.success) {
                console.log('🔧 Auto-sync completed successfully:', result.result);
                
                // Store ID mappings for created and updated tasks
                // 為創建和更新的任務存儲 ID 映射
                if (result.result && result.result.results) {
                    result.result.results.forEach(item => {
                        if (item.success && item.notionPageId) {
                            this.storeIdMapping(item.appTaskId, item.notionPageId, syncConfig.databaseId);
                        }
                    });
                }
                
                // Don't show success notification for auto-sync
                // 不為自動同步顯示成功通知
            } else {
                console.error('🔧 Auto-sync failed:', result.error);
                this.showNotification(`Auto-sync failed: ${result.error}`, 'error');
            }

        } catch (error) {
            console.error('🔧 Auto-sync error:', error);
            this.showNotification(`Auto-sync error: ${error.message}`, 'error');
        } finally {
            // Clear pending changes after sync attempt
            // 在同步嘗試後清除待處理的更改
            this.pendingChanges.clear();
            if (this.pendingTaskInfo) {
                this.pendingTaskInfo.clear();
            }
        }
    }

    /**
     * Get all tasks from the task board (only syncable statuses - includes TODAY for upload)
     * 從任務板獲取所有任務（僅可同步的狀態 - 包括 TODAY 用於上傳）
     * @returns {Array} - Array of task objects
     */
    getAllSyncableTasks() {
        if (!this.tasks) {
            return [];
        }
        
        // Get time spent data from focus mode if available
        // 如果可用，從專注模式獲取時間花費數據
        let taskTimers = {};
        try {
            const savedTimers = localStorage.getItem('focusModeTaskTimers');
            if (savedTimers) {
                taskTimers = JSON.parse(savedTimers);
            }
        } catch (error) {
            console.warn('Failed to load task timers:', error);
        }
        
        // Get tasks from statuses that sync with Notion (including TODAY for upload)
        // 獲取與 Notion 同步的狀態的任務（包括 TODAY 用於上傳）
        const syncableStatuses = ['in-process', 'today', 'done'];
        const syncableTasks = [];
        
        syncableStatuses.forEach(status => {
            console.log(`🔧 Processing status: ${status}, tasks count:`, this.tasks[status]?.length || 0);
            if (Array.isArray(this.tasks[status])) {
                // Add status to each task for sync purposes
                // 為每個任務添加狀態以供同步使用
                this.tasks[status].forEach(task => {
                    console.log(`🔧 Processing task:`, task.title, 'status:', status);
                    // Convert estimateTime from HH:MM to minutes for Notion
                    // 將 estimateTime 從 HH:MM 轉換為分鐘以供 Notion 使用
                    let estimatedTimeMinutes = 0;
                    if (task.estimateTime && typeof task.estimateTime === 'string') {
                        const [hours, minutes] = task.estimateTime.split(':').map(Number);
                        if (!isNaN(hours) && !isNaN(minutes)) {
                            estimatedTimeMinutes = hours * 60 + minutes;
                        }
                    } else if (typeof task.estimateTime === 'number') {
                        estimatedTimeMinutes = task.estimateTime;
                    }
                    
                    // Get time spent from focus mode timers (convert seconds to minutes)
                    // 從專注模式計時器獲取時間花費（將秒轉換為分鐘）
                    let timeSpentMinutes = 0;
                    if (taskTimers[task.id] && taskTimers[task.id].totalSeconds) {
                        timeSpentMinutes = Math.round(taskTimers[task.id].totalSeconds / 60);
                    }
                    
                    const syncableTask = {
                        ...task,
                        status: status,
                        estimatedTime: estimatedTimeMinutes,
                        timeSpent: timeSpentMinutes
                    };
                    
                    // Debug: Log subtasks if they exist
                    // 調試：如果存在子任務則記錄
                    if (task.subtasks && task.subtasks.length > 0) {
                        console.log(`🔧 Task "${task.title}" has ${task.subtasks.length} subtasks:`, task.subtasks);
                        console.log(`🔧 Syncable task subtasks:`, syncableTask.subtasks);
                    }
                    
                    syncableTasks.push(syncableTask);
                });
            }
        });
        
        console.log(`🔧 Total syncable tasks:`, syncableTasks.length);
        console.log(`🔧 Syncable tasks by status:`, {
            'in-process': syncableTasks.filter(t => t.status === 'in-process').length,
            'today': syncableTasks.filter(t => t.status === 'today').length,
            'done': syncableTasks.filter(t => t.status === 'done').length
        });
        
        return syncableTasks;
    }

    /**
     * Compare tasks between app and Notion to find differences
     * 比較應用和 Notion 之間的任務以找出差異
     * @param {Array} appTasks - Tasks from the app
     * @param {Array} notionPages - Pages from Notion
     * @param {Object} statusMappings - Status mappings from sync config
     * @returns {Object} - Object containing tasks to upload and download
     */
    compareTasksForSync(appTasks, notionPages, statusMappings = {}) {
        // Create a map of Notion pages by title for easier comparison
        // 通過標題創建 Notion 頁面映射以便於比較
        const notionPagesByTitle = new Map();
        notionPages.forEach(page => {
            const title = page.properties?.Name?.title?.[0]?.text?.content || '';
            if (title) {
                notionPagesByTitle.set(title, page);
            }
        });

        // Upload ALL app tasks to Notion (new and existing)
        // The NotionAPIService will handle creating new pages vs updating existing ones
        // 上傳所有應用任務到 Notion（新的和現有的）
        // NotionAPIService 將處理創建新頁面與更新現有頁面
        const tasksToUpload = appTasks;
        console.log(`🔧 All ${appTasks.length} app tasks will be uploaded to Notion (new or updated)`);

        // Find pages that exist in Notion but not in app (to download)
        // 找到存在於 Notion 中但不存在於應用中的頁面（需要下載）
        const appTaskTitles = new Set(appTasks.map(task => task.title));
        
        // Get the mapped Notion statuses (only download pages with these statuses)
        // 獲取映射的 Notion 狀態（只下載具有這些狀態的頁面）
        const mappedNotionStatuses = Object.values(statusMappings).filter(status => status);
        
        const pagesToDownload = notionPages.filter(page => {
            const title = page.properties?.Name?.title?.[0]?.text?.content || '';
            const notionStatus = page.properties?.['Status Update']?.status?.name || 'Not started';
            
            // Only download if:
            // 1. Page has a title
            // 2. Page doesn't exist in app by title
            // 3. Page status is one of our mapped statuses (or no mappings configured)
            // 只有當：
            // 1. 頁面有標題
            // 2. 頁面在應用中不存在（按標題）
            // 3. 頁面狀態是我們映射的狀態之一（或未配置映射）
            return title && 
                   !appTaskTitles.has(title) && 
                   (mappedNotionStatuses.length === 0 || mappedNotionStatuses.includes(notionStatus));
        });

        return {
            tasksToUpload,
            pagesToDownload
        };
    }

    /**
     * Add a new task to the appropriate status category (for sync)
     * 將新任務添加到適當的狀態類別（用於同步）
     * @param {Object} task - Task object to add
     */
    addTaskFromSync(task) {
        if (!task.status) {
            task.status = 'in-process'; // Default status
        }
        
        if (!this.tasks[task.status]) {
            this.tasks[task.status] = [];
        }
        
        // Generate ID if not present
        // 如果沒有 ID 則生成一個
        if (!task.id) {
            task.id = Date.now();
        }
        
        // Convert estimatedTime back to HH:MM format if it's in minutes
        // 如果 estimatedTime 是分鐘，則將其轉換回 HH:MM 格式
        if (typeof task.estimatedTime === 'number' && task.estimatedTime > 0) {
            const hours = Math.floor(task.estimatedTime / 60);
            const minutes = task.estimatedTime % 60;
            task.estimateTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
        
        this.tasks[task.status].push(task);
        this.renderTasks();
        this.saveToLocalStorage();
        
        // Dispatch event to notify home page about task count change
        // 分發事件以通知主頁任務計數變化
        this.dispatchTaskCountUpdate();
        
        // Notify Focus Mode if task added to 'today'
        // 如果任務添加到 'today'，通知專注模式
        if (this.focusMode && task.status === 'today') {
            this.focusMode.onTaskBoardUpdate();
        }
    }

    /**
     * Store ID mapping between app task ID and Notion page ID
     * 存儲應用任務 ID 和 Notion 頁面 ID 之間的映射
     * @param {string|number} appTaskId - App task ID
     * @param {string} notionPageId - Notion page ID
     * @param {string} databaseId - Database ID for mapping key
     */
    storeIdMapping(appTaskId, notionPageId, databaseId) {
        try {
            const mappingKey = `notion-id-mapping-${databaseId}`;
            const existingMappings = JSON.parse(localStorage.getItem(mappingKey) || '{}');
            existingMappings[appTaskId] = notionPageId;
            localStorage.setItem(mappingKey, JSON.stringify(existingMappings));
            console.log(`🔧 Stored ID mapping: ${appTaskId} -> ${notionPageId}`);
        } catch (error) {
            console.error('Failed to store ID mapping:', error);
        }
    }

    /**
     * Get Notion page ID from app task ID
     * 從應用任務 ID 獲取 Notion 頁面 ID
     * @param {string|number} appTaskId - App task ID
     * @param {string} databaseId - Database ID for mapping key
     * @returns {string|null} - Notion page ID or null if not found
     */
    getIdMapping(appTaskId, databaseId) {
        try {
            if (!databaseId) return null;
            
            const mappingKey = `notion-id-mapping-${databaseId}`;
            const existingMappings = JSON.parse(localStorage.getItem(mappingKey) || '{}');
            return existingMappings[appTaskId] || null;
        } catch (error) {
            console.error('Failed to get ID mapping:', error);
            return null;
        }
    }

    /**
     * Get app task ID from Notion page ID
     * 從 Notion 頁面 ID 獲取應用任務 ID
     * @param {string} notionPageId - Notion page ID
     * @param {string} databaseId - Database ID for mapping key
     * @returns {string|number|null} - App task ID or null if not found
     */
    getAppTaskIdFromNotionPageId(notionPageId, databaseId) {
        try {
            if (!databaseId) return null;
            
            const mappingKey = `notion-id-mapping-${databaseId}`;
            const existingMappings = JSON.parse(localStorage.getItem(mappingKey) || '{}');
            
            // Find the app task ID that maps to this Notion page ID
            // 查找映射到此 Notion 頁面 ID 的應用任務 ID
            for (const [appTaskId, mappedNotionPageId] of Object.entries(existingMappings)) {
                if (mappedNotionPageId === notionPageId) {
                    return appTaskId;
                }
            }
            
            return null;
        } catch (error) {
            console.error('Failed to get app task ID from Notion page ID:', error);
            return null;
        }
    }

    /**
     * Clear all ID mappings for current database
     * 清除當前資料庫的所有 ID 映射
     * @param {string} databaseId - Database ID for mapping key
     */
    clearIdMappings(databaseId) {
        try {
            if (!databaseId) return;
            
            const mappingKey = `notion-id-mapping-${databaseId}`;
            localStorage.removeItem(mappingKey);
            console.log(`🔧 Cleared ID mappings for database: ${databaseId}`);
        } catch (error) {
            console.error('Failed to clear ID mappings:', error);
        }
    }

    async showDatabaseSelection() {
        console.log('🔧 showDatabaseSelection called');
        
        // This will show a sub-modal or expand the current dropdown to show database selection
        const dropdownContent = this.element.querySelector('#notionDropdownContent');
        const dropdown = this.element.querySelector('#notionDropdown');
        
        // Ensure dropdown stays open
        dropdown.style.display = 'block';
        
        dropdownContent.innerHTML = '<div class="dropdown-loading">Loading databases...</div>';
        
        try {
            const settings = this.loadSettings();
            console.log('🔧 Loading databases with settings:', settings.notionSyncEnabled ? 'enabled' : 'disabled');
            
            if (!settings.notionSyncEnabled || !settings.notionApiKey) {
                dropdownContent.innerHTML = `
                    <div class="sync-config-error">
                        <div class="error-icon">⚠️</div>
                        <div class="error-message">Notion integration not configured</div>
                        <div class="error-detail">Please configure Notion settings first</div>
                        <button class="back-btn" id="backToConfigBtn" style="margin-top: 12px;">← Back to Config</button>
                    </div>
                `;
                
                // Bind back button
                const backBtn = this.element.querySelector('#backToConfigBtn');
                if (backBtn) {
                    backBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔧 Back button clicked');
                        this.loadNotionSyncConfig();
                    });
                }
                return;
            }
            
            const result = await window.electronAPI.notionAPI.searchDatabases(settings.notionApiKey);
            console.log('🔧 Database search result:', result);
            
            if (result.success && result.databases && result.databases.length > 0) {
                console.log('🔧 Found databases:', result.databases);
                dropdownContent.innerHTML = `
                    <div class="database-selection-header">
                        <button class="back-btn" id="backToConfigBtn">← Back to Config</button>
                        <h4>Select Database</h4>
                    </div>
                    <div class="database-list">
                        ${result.databases.map(db => 
                            `<div class="database-option" data-database-id="${db.id}" data-database-title="${db.title}">
                                <div class="database-title">${db.title}</div>
                                <div class="database-description">${db.description || 'No description'}</div>
                            </div>`
                        ).join('')}
                    </div>
                `;
                
                // Bind back button
                const backBtn = this.element.querySelector('#backToConfigBtn');
                if (backBtn) {
                    backBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔧 Back button clicked');
                        this.loadNotionSyncConfig();
                    });
                }
                
                // Bind database selection
                this.element.querySelectorAll('.database-option').forEach(item => {
                    item.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔧 Database option clicked');
                        this.selectNotionDatabase(item);
                    });
                });
                
            } else {
                console.log('🔧 No databases found or error:', result);
                const errorMsg = result.error || 'No accessible databases found.';
                dropdownContent.innerHTML = `
                    <div class="dropdown-error">
                        <div class="error-icon">❌</div>
                        <div class="error-message">${errorMsg}</div>
                        <button class="back-btn" id="backToConfigBtn" style="margin-top: 12px;">← Back to Config</button>
                    </div>
                `;
                
                // Bind back button
                const backBtn = this.element.querySelector('#backToConfigBtn');
                if (backBtn) {
                    backBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔧 Back button clicked');
                        this.loadNotionSyncConfig();
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load databases:', error);
            dropdownContent.innerHTML = `
                <div class="dropdown-error">
                    <div class="error-icon">❌</div>
                    <div class="error-message">Failed to load databases. Please try again.</div>
                    <button class="back-btn" id="backToConfigBtn" style="margin-top: 12px;">← Back to Config</button>
                </div>
            `;
            
            // Bind back button
            const backBtn = this.element.querySelector('#backToConfigBtn');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    this.loadNotionSyncConfig();
                });
            }
        }
    }

    async selectNotionDatabase(selectedItem) {
        const databaseId = selectedItem.dataset.databaseId;
        const databaseTitle = selectedItem.dataset.databaseTitle;
        
        console.log('Selected Notion database:', databaseTitle, 'ID:', databaseId);
        
        // Show loading state
        const dropdownContent = this.element.querySelector('#notionDropdownContent');
        dropdownContent.innerHTML = '<div class="dropdown-loading">Validating database schema...</div>';
        
        try {
            // Get settings for API key
            const settings = this.loadSettings();
            if (!settings.notionApiKey) {
                throw new Error('Notion API key not configured');
            }
            
            // Validate database schema
            console.log('🔧 Validating database schema for:', databaseTitle);
            const schemaResult = await window.electronAPI.notionAPI.getDatabaseSchema(settings.notionApiKey, databaseId);
            
            if (!schemaResult.success) {
                throw new Error(schemaResult.error || 'Failed to validate database schema');
            }
            
            // Check if schemaResult.schema exists
            if (!schemaResult.schema) {
                throw new Error('No schema data received from database validation');
            }
            
            console.log('🔧 Database schema validation result:', schemaResult.schema);
            
            // Check if database has required columns
            const requiredColumns = ['Name', 'Status Update', 'Est Time', 'Time Spent'];
            const missingColumns = [];
            
            // Check if the schema has the properties we need
            const schema = schemaResult.schema;
            if (schema.missingProperties && Array.isArray(schema.missingProperties)) {
                // Use the missing properties from the schema validation
                missingColumns.push(...schema.missingProperties);
            } else {
                // Fallback: check properties manually
                for (const column of requiredColumns) {
                    if (!schema.properties || !schema.properties.hasOwnProperty(column)) {
                        missingColumns.push(column);
                    }
                }
            }
            
            if (missingColumns.length > 0) {
                // Show schema validation error with option to auto-create missing columns
                dropdownContent.innerHTML = `
                    <div class="schema-validation-error">
                        <div class="error-icon">⚠️</div>
                        <div class="error-message">Database Schema Validation Failed</div>
                        <div class="error-detail">Missing required columns:</div>
                        <div class="missing-columns">
                            ${missingColumns.map(col => `<span class="missing-column">• ${col}</span>`).join('')}
                        </div>
                        <div class="schema-actions">
                            <button class="sync-btn connect" id="autoCreateColumnsBtn">
                                <span class="sync-icon">🔧</span>
                                Auto-Create Missing Columns
                            </button>
                            <button class="back-btn" id="backToConfigBtn" style="margin-top: 8px;">
                                ← Back to Config
                            </button>
                        </div>
                    </div>
                `;
                
                // Bind auto-create columns button
                const autoCreateBtn = this.element.querySelector('#autoCreateColumnsBtn');
                if (autoCreateBtn) {
                    autoCreateBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await this.autoCreateMissingColumns(databaseId, databaseTitle, missingColumns);
                    });
                }
                
                // Bind back button
                const backBtn = this.element.querySelector('#backToConfigBtn');
                if (backBtn) {
                    backBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.loadNotionSyncConfig();
                    });
                }
                
                return;
            }
            
            // Schema validation passed - proceed with connection
            console.log('🔧 Database schema validation passed for:', databaseTitle);
            
            // Update sync configuration
            const syncConfig = this.loadSyncConfig();
            syncConfig.connected = true;
            syncConfig.databaseId = databaseId;
            syncConfig.databaseTitle = databaseTitle;
            syncConfig.schemaValidated = true;
            this.saveSyncConfig(syncConfig);
            
            // Update UI to show selected database
            this.updateNotionButtonState(databaseTitle);
            
            // Show status mapping configuration
            this.showStatusMapping();
            
            // Show success message
            this.showNotification(`Successfully connected to database: ${databaseTitle}`, 'success');
            
        } catch (error) {
            console.error('Database selection failed:', error);
            
            dropdownContent.innerHTML = `
                <div class="dropdown-error">
                    <div class="error-icon">❌</div>
                    <div class="error-message">Database Connection Failed</div>
                    <div class="error-detail">${error.message}</div>
                    <button class="back-btn" id="backToConfigBtn" style="margin-top: 12px;">← Back to Config</button>
                </div>
            `;
            
            // Bind back button
            const backBtn = this.element.querySelector('#backToConfigBtn');
            if (backBtn) {
                backBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.loadNotionSyncConfig();
                });
            }
        }
    }

    async autoCreateMissingColumns(databaseId, databaseTitle, missingColumns) {
        console.log('🔧 Auto-creating missing columns:', missingColumns);
        
        try {
            // Show loading state
            const dropdownContent = this.element.querySelector('#notionDropdownContent');
            dropdownContent.innerHTML = '<div class="dropdown-loading">Creating missing columns...</div>';
            
            // Get settings for API key
            const settings = this.loadSettings();
            if (!settings.notionApiKey) {
                throw new Error('Notion API key not configured');
            }
            
            // Call the NotionAPIService to create missing columns
            const createResult = await window.electronAPI.notionAPI.createMissingColumns(settings.notionApiKey, databaseId, missingColumns);
            
            if (createResult.success) {
                // Columns created successfully
                this.showNotification(`Successfully created missing columns: ${missingColumns.join(', ')}`, 'success');
                
                // Now proceed with connection
                const syncConfig = this.loadSyncConfig();
                syncConfig.connected = true;
                syncConfig.databaseId = databaseId;
                syncConfig.databaseTitle = databaseTitle;
                syncConfig.schemaValidated = true; // Mark as validated since we just created the columns
                this.saveSyncConfig(syncConfig);
                
                // Update UI and reload config
                this.updateNotionButtonState(databaseTitle);
                this.loadNotionSyncConfig();
            } else {
                // Column creation failed
                throw new Error(createResult.error || 'Failed to create missing columns');
            }
            
        } catch (error) {
            console.error('Failed to auto-create missing columns:', error);
            this.showNotification('Failed to auto-create missing columns', 'error');
            
            // Show error state in dropdown
            const dropdownContent = this.element.querySelector('#notionDropdownContent');
            dropdownContent.innerHTML = `
                <div class="dropdown-error">
                    <div class="error-icon">❌</div>
                    <div class="error-message">Failed to create missing columns</div>
                    <div class="error-detail">${error.message}</div>
                    <button class="back-btn" id="backToConfigBtn" style="margin-top: 12px;">← Back to Config</button>
                </div>
            `;
            
            // Bind back button
            const backBtn = this.element.querySelector('#backToConfigBtn');
            if (backBtn) {
                backBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.loadNotionSyncConfig();
                });
            }
        }
    }

    updateNotionButtonState(databaseTitle) {
        const notionBtn = this.element.querySelector('#notionIntegrationBtn');
        if (notionBtn && databaseTitle) {
            notionBtn.title = `Linked to: ${databaseTitle}`;
            notionBtn.classList.add('linked');
        }
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('workwith-settings');
            return saved ? JSON.parse(saved) : {
                notionSyncEnabled: false,
                notionApiKey: '',
                notionConnectionTested: false
            };
        } catch (error) {
            console.error('Failed to load settings:', error);
            return {
                notionSyncEnabled: false,
                notionApiKey: '',
                notionConnectionTested: false
            };
        }
    }

    async loadStatusMappings() {
        try {
            const syncConfig = this.loadSyncConfig();
            const settings = this.loadSettings();
            
            if (!settings.notionApiKey || !syncConfig.databaseId) {
                console.error('Missing API key or database ID for status mapping');
                this.showStatusMappingError('Missing API key or database ID');
                return;
            }
            
            // Get status options from Notion database
            const result = await window.electronAPI.notionAPI.searchStatuses(settings.notionApiKey, syncConfig.databaseId);
            
            if (result.success && result.statuses) {
                // Populate status select dropdowns
                this.populateStatusSelects(result.statuses, syncConfig.statusMappings);
                
                // Bind status mapping change events
                this.bindStatusMappingEvents();
                
                // Clear any previous error messages
                this.clearStatusMappingError();
            } else {
                console.error('Failed to load statuses:', result.error);
                this.showStatusMappingError(result.error || 'Failed to load statuses');
            }
        } catch (error) {
            console.error('Failed to load status mappings:', error);
            this.showStatusMappingError('Network error or connection failed');
        }
    }

    showStatusMappingError(errorMessage) {
        // Show error message in the status mapping section
        const statusMappingSection = this.element.querySelector('.status-mapping');
        if (statusMappingSection) {
            let errorDiv = statusMappingSection.querySelector('.status-error');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'status-error';
                statusMappingSection.appendChild(errorDiv);
            }
            errorDiv.innerHTML = `
                <div class="error-message">
                    <span class="error-icon">⚠️</span>
                    <span class="error-text">${errorMessage}</span>
                </div>
            `;
        }
    }

    clearStatusMappingError() {
        // Clear error message from status mapping section
        const errorDiv = this.element.querySelector('.status-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    populateStatusSelects(statuses, currentMappings) {
        // Ensure currentMappings is an object with default values
        // 確保 currentMappings 是一個具有默認值的對象
        const mappings = currentMappings || {
            'in-process': '',
            'done': ''
        };
        
        const selects = {
            'inProcessMapping': 'in-process',
            'doneMapping': 'done'
        };
        
        Object.entries(selects).forEach(([selectId, mappingKey]) => {
            const select = this.element.querySelector(`#${selectId}`);
            if (select) {
                // Clear existing options except the first one
                select.innerHTML = '<option value="">Select Notion Status...</option>';
                
                // Add status options
                statuses.forEach(status => {
                    const option = document.createElement('option');
                    option.value = status.name;
                    option.textContent = status.name;
                    option.selected = mappings[mappingKey] === status.name;
                    select.appendChild(option);
                });
            }
        });
    }

    bindStatusMappingEvents() {
        const mappingSelects = ['inProcessMapping', 'doneMapping'];
        const mappingKeys = ['in-process', 'done'];
        
        mappingSelects.forEach((selectId, index) => {
            const select = this.element.querySelector(`#${selectId}`);
            if (select) {
                select.addEventListener('change', (e) => {
                    const notionStatus = e.target.value;
                    const appStatus = mappingKeys[index];
                    
                    this.updateStatusMapping(appStatus, notionStatus);
                });
            }
        });
    }

    updateStatusMapping(appStatus, notionStatus) {
        const syncConfig = this.loadSyncConfig();
        
        // Ensure statusMappings object exists
        // 確保 statusMappings 對象存在
        if (!syncConfig.statusMappings) {
            syncConfig.statusMappings = {
                'in-process': '',
                'done': ''
            };
        }
        
        syncConfig.statusMappings[appStatus] = notionStatus;
        this.saveSyncConfig(syncConfig);
        
        console.log(`Updated status mapping: ${appStatus} → ${notionStatus}`);
        this.showNotification(`Status mapping updated: ${appStatus} → ${notionStatus}`, 'success');
    }

    async showStatusMapping() {
        const syncConfig = this.loadSyncConfig();
        const dropdownContent = this.element.querySelector('#notionDropdownContent');
        
        if (!syncConfig.connected || !syncConfig.databaseId) {
            console.error('Cannot show status mapping: no database connected');
            return;
        }
        
        try {
            // Show loading state
            dropdownContent.innerHTML = '<div class="dropdown-loading">Loading status options...</div>';
            
            // Get status options from Notion database
            const settings = this.loadSettings();
            const result = await window.electronAPI.notionAPI.searchStatuses(settings.notionApiKey, syncConfig.databaseId);
            
            if (!result.success || !result.statuses) {
                throw new Error(result.error || 'Failed to load status options');
            }
            
            // Show status mapping UI
            dropdownContent.innerHTML = `
                <div class="status-mapping-container">
                    <div class="mapping-header">
                        <h4 class="mapping-title">Status Mapping Configuration</h4>
                        <div class="database-info">
                            <span class="database-name">📊 ${syncConfig.databaseTitle}</span>
                        </div>
                    </div>
                    
                    <div class="mapping-description">
                        Map your app's task statuses to the corresponding statuses in your Notion database.
                    </div>
                    
                    <div class="status-mapping">
                        <div class="mapping-row">
                            <label class="mapping-label">IN PROCESS</label>
                            <select class="status-select" id="inProcessMapping">
                                <option value="">Select Notion Status...</option>
                            </select>
                        </div>
                        <div class="mapping-row">
                            <label class="mapping-label">DONE</label>
                            <select class="status-select" id="doneMapping">
                                <option value="">Select Notion Status...</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="mapping-actions">
                        <button class="sync-btn primary" id="saveMappingBtn">
                            <span class="sync-icon">💾</span>
                            Save Status Mapping
                        </button>
                        <button class="back-btn" id="backToConfigBtn">
                            ← Back to Sync Config
                        </button>
                    </div>
                </div>
            `;
            
            // Populate status select dropdowns
            this.populateStatusSelects(result.statuses, syncConfig.statusMappings);
            
            // Bind status mapping change events
            this.bindStatusMappingEvents();
            
            // Bind save button
            const saveBtn = this.element.querySelector('#saveMappingBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.saveStatusMapping();
                });
            }
            
            // Bind back button
            const backBtn = this.element.querySelector('#backToConfigBtn');
            if (backBtn) {
                backBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.loadNotionSyncConfig();
                });
            }
            
        } catch (error) {
            console.error('Failed to show status mapping:', error);
            dropdownContent.innerHTML = `
                <div class="dropdown-error">
                    <div class="error-icon">❌</div>
                    <div class="error-message">Failed to Load Status Mapping</div>
                    <div class="error-detail">${error.message}</div>
                    <button class="back-btn" id="backToConfigBtn" style="margin-top: 12px;">← Back to Config</button>
                </div>
            `;
            
            // Bind back button
            const backBtn = this.element.querySelector('#backToConfigBtn');
            if (backBtn) {
                backBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.loadNotionSyncConfig();
                });
            }
        }
    }

    saveStatusMapping() {
        const syncConfig = this.loadSyncConfig();
        
        // Get current mapping values
        const inProcessSelect = this.element.querySelector('#inProcessMapping');
        const doneSelect = this.element.querySelector('#doneMapping');
        
        if (inProcessSelect && doneSelect) {
            syncConfig.statusMappings = {
                'in-process': inProcessSelect.value,
                'done': doneSelect.value
            };
            
            this.saveSyncConfig(syncConfig);
            this.showNotification('Status mapping saved successfully!', 'success');
            
            // Go back to sync config
            this.loadNotionSyncConfig();
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}
