// Unified Task Card Component - Base class with strategy pattern
export class UnifiedTaskCard {
    constructor(task, context, strategy, callbacks = {}) {
        this.task = task;
        this.context = context; // 'focus' | 'board'
        this.strategy = strategy;
        this.callbacks = callbacks;
        this.element = null;
        this.isInitialized = false;
        
        // Initialize subtasks if not present
        if (!this.task.subtasks) {
            this.task.subtasks = [];
        }
        
        // Load styles and create element
        this.loadStyles();
        this.createElement();
    }

    loadStyles() {
        // Load TaskCard styles (already handles loading once)
        if (document.getElementById('task-card-styles')) return;
        
        const link = document.createElement('link');
        link.id = 'task-card-styles';
        link.rel = 'stylesheet';
        link.type = 'text/css';
        try {
            link.href = new URL('./TaskCard.css', import.meta.url).href;
        } catch (e) {
            console.error('Failed to resolve TaskCard.css URL', e);
        }
        
        link.onerror = () => {
            console.error('Failed to load TaskCard styles');
        };
        
        document.head.appendChild(link);
    }

    createElement() {
        this.element = document.createElement('div');
        this.element.className = this.strategy.getBaseClassName();
        this.element.draggable = this.strategy.isDraggable();
        this.element.dataset.taskId = this.task.id;
        this.element.dataset.context = this.context;
        
        // Add context-specific data attributes
        if (this.context === 'board') {
            this.element.dataset.status = this.callbacks.status || 'today';
        }
        
        this.element.innerHTML = this.strategy.getHTML(this.task, this.callbacks);
        
        // Bind events using strategy
        this.strategy.bindEvents(this.element, this.callbacks, this.task);
        
        this.isInitialized = true;
        return this.element;
    }

    // Update task data and re-render
    updateTask(task) {
        this.task = task;
        if (this.element) {
            this.element.innerHTML = this.strategy.getHTML(this.task, this.callbacks);
            this.strategy.bindEvents(this.element, this.callbacks, this.task);
        }
    }

    // Update status (for board context)
    updateStatus(status) {
        if (this.context === 'board' && this.element) {
            this.element.dataset.status = status;
            // Update delete button data attribute if exists
            const deleteBtn = this.element.querySelector('.delete-task-btn');
            if (deleteBtn) {
                deleteBtn.dataset.status = status;
            }
        }
    }

    // Get the DOM element
    getElement() {
        return this.element;
    }

    // Destroy the element
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.isInitialized = false;
    }

    // Static method to create task card
    static createTaskCard(task, context, callbacks) {
        const strategy = context === 'focus' 
            ? new FocusStrategy() 
            : new BoardStrategy();
            
        return new UnifiedTaskCard(task, context, strategy, callbacks);
    }
}

// Base Strategy Class
class BaseStrategy {
    getBaseClassName() {
        return 'unified-task-card';
    }
    
    isDraggable() {
        return true;
    }
    
    getHTML(task, callbacks) {
        throw new Error('getHTML must be implemented by strategy');
    }
    
    bindEvents(element, callbacks, task) {
        throw new Error('bindEvents must be implemented by strategy');
    }
}

// Focus Mode Strategy
class FocusStrategy extends BaseStrategy {
    getBaseClassName() {
        return 'focus-task-item';
    }
    
    getHTML(task, callbacks) {
        const estimateMinutes = this.getTaskEstimateMinutes(task);
        const hasEstimate = estimateMinutes && estimateMinutes > 0;
        const completedSubtasks = task.subtasks.filter(subtask => subtask.completed).length;
        const totalSubtasks = task.subtasks.length;
        
        return `
            <div class="task-content">
                <span class="task-title">${task.title}</span>
                ${hasEstimate ? `<span class="task-time">⏱️ ${this.formatEstimateTime(estimateMinutes)}</span>` : ''}
                ${totalSubtasks > 0 ? `
                    <div class="focus-subtasks">
                        <div class="subtask-progress">${completedSubtasks}/${totalSubtasks} subtasks</div>
                        <div class="focus-subtask-list">
                            ${this.getFocusSubtasksHTML(task)}
                        </div>
                    </div>
                ` : ''}
            </div>
            <button class="done-btn" title="Done">✓</button>`;
    }
    
    bindEvents(element, callbacks, task) {
        const doneBtn = element.querySelector('.done-btn');
        if (doneBtn && callbacks.onMarkDone) {
            doneBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                callbacks.onMarkDone(this.getTaskId(element), element);
            });
        }

        // Subtask checkbox events
        const subtaskCheckboxes = element.querySelectorAll('.subtask-checkbox');
        subtaskCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const subtaskId = parseInt(e.target.closest('.focus-subtask-item').dataset.subtaskId);
                if (callbacks.onToggleSubtask) {
                    callbacks.onToggleSubtask(this.getTaskId(element), subtaskId);
                }
            });
        });

        // Delete subtask events
        const deleteSubtaskBtns = element.querySelectorAll('.delete-subtask-btn');
        deleteSubtaskBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const subtaskId = Number(btn.dataset.subtaskId);
                if (callbacks.onDeleteSubtask) {
                    callbacks.onDeleteSubtask(this.getTaskId(element), subtaskId);
                }
            });
        });
    }
    
    getTaskEstimateMinutes(task) {
        if (typeof task.estimateMinutes === 'number') return task.estimateMinutes;
        // Back-compat: parse legacy estimateTime like "02:30"
        if (task.estimateTime) {
            const parts = task.estimateTime.split(':');
            if (parts.length === 2) {
                const hours = parseInt(parts[0], 10) || 0;
                const minutes = parseInt(parts[1], 10) || 0;
                return hours * 60 + minutes;
            }
        }
        return null;
    }
    
    formatEstimateTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        if (hours > 0) {
            return `${hours}:${String(mins).padStart(2, '0')}:00`;
        }
        return `${mins}:00`;
    }
    
    getTaskId(element) {
        return parseInt(element.dataset.taskId);
    }
    
    getFocusSubtasksHTML(task) {
        return task.subtasks.map(subtask => `
            <div class="focus-subtask-item ${subtask.completed ? 'completed' : ''}" data-subtask-id="${subtask.id}">
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
}

// Task Board Strategy
class BoardStrategy extends BaseStrategy {
    getBaseClassName() {
        return 'task-card';
    }
    
    getHTML(task, callbacks) {
        const completedSubtasks = task.subtasks.filter(subtask => subtask.completed).length;
        const totalSubtasks = task.subtasks.length;
        const minutes = this.getEstimateMinutes(task);
        const estimateHTML = minutes != null
            ? `<button class="estimate-badge" type="button" aria-label="Estimated time" title="Edit estimate">${this.formatEstimate(minutes)}</button>`
            : `<button class="estimate-placeholder" type="button" role="button" aria-label="Estimated time" title="Add estimate"></button>`;
        
        return `
            <div class="task-header">
                <div class="task-title">${task.title}</div>
                <div class="task-actions">
                    ${callbacks.status !== 'done' ? `<button class="done-task-btn" data-task-id="${task.id}" data-status="${callbacks.status}" aria-label="Mark as done" title="Mark as done">Done</button>` : ''}
                    <button class="delete-task-btn" data-task-id="${task.id}" data-status="${callbacks.status}" aria-label="Delete task" title="Delete task">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="task-estimate-row">${estimateHTML}</div>
            ${totalSubtasks > 0 ? `<div class="subtask-progress">${completedSubtasks}/${totalSubtasks} subtasks completed</div>` : ''}
            <div class="subtasks-container">
                ${this.getSubtasksHTML(task)}
                <button class="add-subtask-btn" title="Add subtask">+ Add subtask</button>
            </div>
        `;
    }
    
    bindEvents(element, callbacks, task) {
        // Delete button event
        const deleteBtn = element.querySelector('.delete-task-btn');
        if (deleteBtn && callbacks.onDelete) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                callbacks.onDelete(this.getTaskId(element), callbacks.status);
            });
        }

        // Done button event
        const doneBtn = element.querySelector('.done-task-btn');
        if (doneBtn && callbacks.onMoveToDone) {
            doneBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                callbacks.onMoveToDone(this.getTaskId(element), callbacks.status);
            });
        }

        // Task title double-click event for editing
        const taskTitle = element.querySelector('.task-title');
        if (taskTitle && callbacks.onEditTitle) {
            taskTitle.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                callbacks.onEditTitle(this.getTaskId(element));
            });
        }

        // Estimate: placeholder/badge click to edit
        const estTrigger = element.querySelector('.estimate-placeholder, .estimate-badge');
        if (estTrigger) {
            estTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEstimateEditor(element, callbacks, task);
            });
            estTrigger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.showEstimateEditor(element, callbacks, task);
                }
            });
        }

        // Add subtask button event
        const addSubtaskBtn = element.querySelector('.add-subtask-btn');
        if (addSubtaskBtn && callbacks.onAddSubtask) {
            addSubtaskBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                callbacks.onAddSubtask(this.getTaskId(element));
            });
        }

        // Subtask checkbox events
        const subtaskCheckboxes = element.querySelectorAll('.subtask-checkbox');
        subtaskCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                const subtaskId = parseInt(e.target.closest('.subtask-item').dataset.subtaskId);
                if (callbacks.onToggleSubtask) {
                    callbacks.onToggleSubtask(this.getTaskId(element), subtaskId);
                }
            });
        });

        // Delete subtask events
        const deleteSubtaskBtns = element.querySelectorAll('.delete-subtask-btn');
        deleteSubtaskBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const subtaskId = Number(btn.dataset.subtaskId);
                if (callbacks.onDeleteSubtask) {
                    callbacks.onDeleteSubtask(this.getTaskId(element), subtaskId);
                }
            });
        });
    }
    
    getSubtasksHTML(task) {
        return task.subtasks.map(subtask => `
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
    
    getEstimateMinutes(task) {
        if (typeof task.estimateMinutes === 'number') return task.estimateMinutes;
        // Back-compat: parse legacy estimateTime like "02:30"
        if (task.estimateTime) {
            const parts = task.estimateTime.split(':');
            if (parts.length === 2) {
                const hours = parseInt(parts[0], 10) || 0;
                const minutes = parseInt(parts[1], 10) || 0;
                return hours * 60 + minutes;
            }
        }
        return null;
    }

    formatEstimate(minutes) {
        const m = Math.max(0, parseInt(minutes, 10) || 0);
        const h = Math.floor(m / 60);
        const rem = m % 60;
        if (h > 0 && rem > 0) return `Est: ${h}h ${rem}m`;
        if (h > 0) return `Est: ${h}h`;
        return `Est: ${rem}m`;
    }
    
    getTaskId(element) {
        return parseInt(element.dataset.taskId);
    }
    
    showEstimateEditor(element, callbacks, task) {
        const estimateRow = element.querySelector('.task-estimate-row');
        if (!estimateRow) return;
        
        // Hide the current estimate display
        const currentEstimate = estimateRow.querySelector('.estimate-badge, .estimate-placeholder');
        if (currentEstimate) {
            currentEstimate.style.display = 'none';
        }
        
        // Create editor
        const editor = document.createElement('div');
        editor.className = 'estimate-editor';
        editor.innerHTML = `
            <input type="text" class="estimate-input" placeholder="HH:MM" value="${this.getCurrentEstimateValue(element, task)}" maxlength="5">
        `;
        
        estimateRow.appendChild(editor);
        
        const input = editor.querySelector('.estimate-input');
        
        // Focus and select input
        input.focus();
        input.select();
        
        // Auto-format input
        // Optimized input formatting and backspace handling for estimate input

        // Helper function to format value as HH:MM
        function formatEstimateInput(val) {
            const digits = val.replace(/[^\d]/g, '').slice(0, 4);
            if (digits.length === 0) return '';
            if (digits.length <= 2) return digits;
            return digits.slice(0, 2) + ':' + digits.slice(2);
        }

        input.addEventListener('input', (e) => {
            const formatted = formatEstimateInput(e.target.value);
            e.target.value = formatted;
        });

        input.addEventListener('keydown', (e) => {
            if (e.key !== 'Backspace') return;
            const val = input.value;
            const pos = input.selectionStart || 0;
            // Caret just after the second hour digit (position 3, colon at index 2)
            if (pos === 3 && val.charAt(2) === ':') {
                e.preventDefault();
                let digits = val.replace(/[^\d]/g, '');
                if (digits.length >= 2) {
                    digits = digits[0] + digits.slice(2); // remove second hour digit
                } else {
                    digits = '';
                }
                const newVal = formatEstimateInput(digits);
                input.value = newVal;
                const newPos = Math.min(1, newVal.replace(/[^\d]/g, '').length);
                input.setSelectionRange(newPos, newPos);
            }
            // Caret right before the colon (position 2, colon at index 2)
            else if (pos === 2 && val.charAt(2) === ':') {
                e.preventDefault();
                let digits = val.replace(/[^\d]/g, '');
                digits = digits.slice(1); // remove first hour digit
                const newVal = formatEstimateInput(digits);
                input.value = newVal;
                input.setSelectionRange(0, 0);
            }
        });
        
        // Save estimate function
        const saveEstimate = () => {
            const value = input.value.trim();
            const minutes = this.parseEstimateInput(value);
            
            if (minutes !== null && minutes >= 0) {
                // Update task
                task.estimateMinutes = minutes;
                task.estimateTime = this.formatEstimateTime(minutes);
                
                // Update UI
                this.updateEstimateDisplay(element, task);
                
                // Notify callback
                if (callbacks.onUpdateTask) {
                    callbacks.onUpdateTask(task);
                }
            }
            
            editor.remove();
            if (currentEstimate) {
                currentEstimate.style.display = '';
            }
        };
        
        // Cancel editing function (revert to original)
        const cancelEdit = () => {
            editor.remove();
            if (currentEstimate) {
                currentEstimate.style.display = '';
            }
        };
        
        // Keyboard events
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEstimate();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
        
        // Auto-save when clicking outside or losing focus
        const handleClickOutside = (e) => {
            if (!editor.contains(e.target)) {
                saveEstimate(); // Auto-save instead of cancel
                document.removeEventListener('click', handleClickOutside);
            }
        };
        
        // Also save on blur (when input loses focus)
        input.addEventListener('blur', () => {
            setTimeout(() => {
                if (document.contains(editor)) { // Check if editor still exists
                    saveEstimate();
                }
            }, 100); // Small delay to allow click events to process
        });
        
        // Prevent input clicks from closing the editor
        input.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        
        setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 100);
    }
    
    getCurrentEstimateValue(element, task) {
        const minutes = this.getEstimateMinutes(task);
        if (minutes === null) return '';
        
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours > 0) {
            return `${hours}:${String(mins).padStart(2, '0')}`;
        } else {
            return `0:${String(mins).padStart(2, '0')}`;
        }
    }
    
    parseEstimateInput(value) {
        if (!value || value.trim() === '') return 0;
        
        const parts = value.split(':');
        if (parts.length === 2) {
            const hours = parseInt(parts[0], 10) || 0;
            const minutes = parseInt(parts[1], 10) || 0;
            return hours * 60 + minutes;
        }
        
        // Try parsing as just minutes
        const minutes = parseInt(value, 10);
        return isNaN(minutes) ? null : minutes;
    }
    
    formatEstimateTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }
    
    updateEstimateDisplay(element, task) {
        const estimateRow = element.querySelector('.task-estimate-row');
        if (!estimateRow) return;
        
        const minutes = this.getEstimateMinutes(task);
        const estimateHTML = minutes != null
            ? `<button class="estimate-badge" type="button" aria-label="Estimated time" title="Edit estimate">${this.formatEstimate(minutes)}</button>`
            : `<button class="estimate-placeholder" type="button" role="button" aria-label="Estimated time" title="Add estimate"></button>`;
        
        estimateRow.innerHTML = estimateHTML;
        
        // Re-bind events
        const estTrigger = estimateRow.querySelector('.estimate-placeholder, .estimate-badge');
        if (estTrigger) {
            estTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEstimateEditor(element, {}, task);
            });
            estTrigger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.showEstimateEditor(element, {}, task);
                }
            });
        }
    }
}
