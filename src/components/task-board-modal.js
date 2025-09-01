// Floating Task Board Modal Component
import { TaskCard } from './TaskCard.js';

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
    }

    createModal() {
        const modal = document.createElement('div');
        modal.className = 'task-board-overlay';
        modal.innerHTML = `
            <div class="task-board-modal">
                <header class="task-board-header">
                    <h2>${this.boardName}</h2>
                    <button class="close-btn" aria-label="Close">×</button>
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
                const taskCard = TaskCard.createTaskCard(task, status, (taskId, taskStatus) => {
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

        // Remove task from the array immediately
        this.tasks[status] = this.tasks[status].filter(t => t.id !== taskId);
        
        // Re-render tasks to update UI
        this.renderTasks();
        
        // Save updated tasks to localStorage
        this.saveToLocalStorage();
        
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

    show() {
        if (!this.isVisible) {
            // Modal mode - overlay
            if (!this.element.parentNode) {
                document.body.appendChild(this.element);
            }
            document.body.style.overflow = 'hidden';
            
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
}
