// Task Card Component
export class TaskCard {
    constructor(task, status, onDelete, onMoveToDone, onUpdateTask) {
        this.task = task;
        this.status = status;
        this.onDelete = onDelete;
        this.onMoveToDone = onMoveToDone;
        this.onUpdateTask = onUpdateTask;
        this.loadStyles(); // Load TaskCard specific CSS
        this.element = this.createElement();
        
        // Initialize subtasks if not present
        if (!this.task.subtasks) {
            this.task.subtasks = [];
        }
    }

    loadStyles() {
        // Check if styles are already loaded
        if (document.getElementById('task-card-styles')) return;
        
        const link = document.createElement('link');
        link.id = 'task-card-styles';
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = './src/components/TaskCard.css';
        
        // Add error handling
        link.onerror = () => {
            console.error('Failed to load TaskCard styles');
        };
        
        document.head.appendChild(link);
    }

    createElement() {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card';
        taskCard.draggable = true;
        taskCard.dataset.taskId = this.task.id;
        taskCard.dataset.status = this.status;
        
        taskCard.innerHTML = this.getHTML();
        
        // Bind events
        this.bindEvents(taskCard);
        
        return taskCard;
    }

    getHTML() {
        const completedSubtasks = this.task.subtasks.filter(subtask => subtask.completed).length;
        const totalSubtasks = this.task.subtasks.length;
        
        return `
            <div class="task-header">
                <div class="task-title">${this.task.title}</div>
                <div class="task-actions">
                    ${this.status !== 'done' ? `<button class="done-task-btn" data-task-id="${this.task.id}" data-status="${this.status}" aria-label="Mark as done" title="Mark as done">Done</button>` : ''}
                    <button class="delete-task-btn" data-task-id="${this.task.id}" data-status="${this.status}" aria-label="Delete task" title="Delete task">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            </div>
            ${this.task.estimateTime ? `<div class="task-estimate">⏱️ ${this.task.estimateTime}</div>` : ''}
            ${totalSubtasks > 0 ? `<div class="subtask-progress">${completedSubtasks}/${totalSubtasks} subtasks completed</div>` : ''}
            <div class="subtasks-container">
                ${this.getSubtasksHTML()}
                <button class="add-subtask-btn" title="Add subtask">+ Add subtask</button>
            </div>
        `;
    }

    getSubtasksHTML() {
        return this.task.subtasks.map(subtask => `
            <div class="subtask-item ${subtask.completed ? 'completed' : ''}" data-subtask-id="${subtask.id}">
                <input type="checkbox" class="subtask-checkbox" ${subtask.completed ? 'checked' : ''}>
                <span class="subtask-text">${subtask.text}</span>
                <button class="delete-subtask-btn" data-subtask-id="${subtask.id}" title="Delete subtask">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
        `).join('');
    }

    bindEvents(taskCard) {
        // Delete button event
        const deleteBtn = taskCard.querySelector('.delete-task-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onDelete) {
                this.onDelete(this.task.id, this.status);
            }
        });

        // Done button event
        const doneBtn = taskCard.querySelector('.done-task-btn');
        if (doneBtn && this.onMoveToDone) {
            doneBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onMoveToDone(this.task.id, this.status);
            });
        }

        // Task title double-click event for editing
        const taskTitle = taskCard.querySelector('.task-title');
        taskTitle.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.showEditTitleInput();
        });

        // Add subtask button event
        const addSubtaskBtn = taskCard.querySelector('.add-subtask-btn');
        addSubtaskBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showAddSubtaskInput();
        });

        // Subtask checkbox events
        const subtaskCheckboxes = taskCard.querySelectorAll('.subtask-checkbox');
        subtaskCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const subtaskId = parseInt(e.target.closest('.subtask-item').dataset.subtaskId);
                this.toggleSubtask(subtaskId);
            });
        });

        // Delete subtask events
        const deleteSubtaskBtns = taskCard.querySelectorAll('.delete-subtask-btn');
        deleteSubtaskBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const subtaskId = parseInt(btn.dataset.subtaskId);
                this.deleteSubtask(subtaskId);
            });
        });
    }

    // Update task data and re-render
    updateTask(task) {
        this.task = task;
        this.element.innerHTML = this.getHTML();
        // Re-bind events after updating HTML
        this.bindEvents(this.element);
    }

    // Update status
    updateStatus(status) {
        this.status = status;
        this.element.dataset.status = status;
        // Update delete button data attribute
        const deleteBtn = this.element.querySelector('.delete-task-btn');
        if (deleteBtn) {
            deleteBtn.dataset.status = status;
        }
    }

    // Get the DOM element
    getElement() {
        return this.element;
    }

    showEditTitleInput() {
        // Check if input is already shown
        const existingInput = this.element.querySelector('.title-edit-input-container');
        if (existingInput) {
            existingInput.remove();
        }

        // Get the current task title element
        const taskTitle = this.element.querySelector('.task-title');
        const currentTitle = taskTitle.textContent;

        // Create input container
        const inputContainer = document.createElement('div');
        inputContainer.className = 'title-edit-input-container';
        
        // Create input field
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'title-edit-input';
        input.value = currentTitle;
        input.placeholder = 'Enter task title...';
        input.maxLength = 200;

        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'title-edit-input-buttons';

        // Create save button
        const saveBtn = document.createElement('button');
        saveBtn.className = 'title-edit-save-btn';
        saveBtn.textContent = '✓';
        saveBtn.title = 'Save title';

        // Create cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'title-edit-cancel-btn';
        cancelBtn.textContent = '✕';
        cancelBtn.title = 'Cancel';

        // Add buttons to container
        buttonsContainer.appendChild(saveBtn);
        buttonsContainer.appendChild(cancelBtn);

        // Add input and buttons to container
        inputContainer.appendChild(input);
        inputContainer.appendChild(buttonsContainer);

        // Replace the task title with the input
        taskTitle.style.display = 'none';
        taskTitle.parentNode.insertBefore(inputContainer, taskTitle);

        // Focus the input and select all text
        input.focus();
        input.select();

        // Handle save
        const handleSave = () => {
            const newTitle = input.value.trim();
            if (newTitle && newTitle !== currentTitle) {
                this.task.title = newTitle;
                this.updateTaskAndNotify();
            }
            this.hideEditTitleInput();
        };

        // Handle cancel
        const handleCancel = () => {
            this.hideEditTitleInput();
        };

        // Event listeners
        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleSave();
        });

        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleCancel();
        });

        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                handleSave();
            } else if (e.key === 'Escape') {
                handleCancel();
            }
        });

        // Prevent event bubbling to avoid closing when clicking inside
        inputContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    hideEditTitleInput() {
        const inputContainer = this.element.querySelector('.title-edit-input-container');
        if (inputContainer) {
            inputContainer.remove();
        }
        
        // Show the task title again
        const taskTitle = this.element.querySelector('.task-title');
        if (taskTitle) {
            taskTitle.style.display = 'block';
        }
    }

    showAddSubtaskInput() {
        // Check if input is already shown
        const existingInput = this.element.querySelector('.subtask-input-container');
        if (existingInput) {
            existingInput.remove();
        }

        // Create input container
        const inputContainer = document.createElement('div');
        inputContainer.className = 'subtask-input-container';
        
        // Create input field
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'subtask-input';
        input.placeholder = 'Enter subtask...';
        input.maxLength = 100;

        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'subtask-input-buttons';

        // Create save button
        const saveBtn = document.createElement('button');
        saveBtn.className = 'subtask-save-btn';
        saveBtn.textContent = '✓';
        saveBtn.title = 'Add subtask';

        // Create cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'subtask-cancel-btn';
        cancelBtn.textContent = '✕';
        cancelBtn.title = 'Cancel';

        // Add buttons to container
        buttonsContainer.appendChild(saveBtn);
        buttonsContainer.appendChild(cancelBtn);

        // Add input and buttons to container
        inputContainer.appendChild(input);
        inputContainer.appendChild(buttonsContainer);

        // Insert before the add button
        const addBtn = this.element.querySelector('.add-subtask-btn');
        addBtn.parentNode.insertBefore(inputContainer, addBtn);

        // Hide the add button
        addBtn.style.display = 'none';

        // Focus the input
        input.focus();

        // Handle save
        const handleSave = () => {
            const text = input.value.trim();
            if (text) {
                this.addSubtask(text);
            }
            this.hideAddSubtaskInput();
        };

        // Handle cancel
        const handleCancel = () => {
            this.hideAddSubtaskInput();
        };

        // Event listeners
        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleSave();
        });

        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleCancel();
        });

        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                handleSave();
            } else if (e.key === 'Escape') {
                handleCancel();
            }
        });

        // Prevent event bubbling to avoid closing when clicking inside
        inputContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    hideAddSubtaskInput() {
        const inputContainer = this.element.querySelector('.subtask-input-container');
        if (inputContainer) {
            inputContainer.remove();
        }
        
        // Show the add button again
        const addBtn = this.element.querySelector('.add-subtask-btn');
        if (addBtn) {
            addBtn.style.display = 'block';
        }
    }

    addSubtask(text) {
        const subtask = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        this.task.subtasks.push(subtask);
        this.updateTaskAndNotify();
    }

    toggleSubtask(subtaskId) {
        const subtask = this.task.subtasks.find(s => s.id === subtaskId);
        if (subtask) {
            subtask.completed = !subtask.completed;
            this.updateTaskAndNotify();
        }
    }

    deleteSubtask(subtaskId) {
        this.task.subtasks = this.task.subtasks.filter(s => s.id !== subtaskId);
        this.updateTaskAndNotify();
    }

    updateTaskAndNotify() {
        // Update the task card display
        this.updateTask(this.task);
        
        // Notify the parent component about the task update
        if (this.onUpdateTask) {
            this.onUpdateTask(this.task);
        }
    }

    // Static method to create task card without instantiating class
    static createTaskCard(task, status, onDelete, onMoveToDone, onUpdateTask) {
        const taskCard = new TaskCard(task, status, onDelete, onMoveToDone, onUpdateTask);
        return taskCard.getElement();
    }
}
