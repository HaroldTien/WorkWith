// Task Card Wrapper - Maintains backward compatibility with existing TaskCard interface
import { TaskCardFactory } from './TaskCardFactory.js';

export class TaskCardWrapper {
    constructor(task, status, onDelete, onMoveToDone, onUpdateTask) {
        this.task = task;
        this.status = status;
        this.onDelete = onDelete;
        this.onMoveToDone = onMoveToDone;
        this.onUpdateTask = onUpdateTask;
        
        // Create unified task card with board context
        this.unifiedCard = TaskCardFactory.createBoardTaskCard(task, status, {
            onDelete: (taskId, taskStatus) => this.onDelete(taskId, taskStatus),
            onMoveToDone: (taskId, fromStatus) => this.onMoveToDone(taskId, fromStatus),
            onUpdateTask: (updatedTask) => this.onUpdateTask(updatedTask),
            onEditTitle: (taskId) => this.handleEditTitle(taskId),
            onEditEstimate: (taskId) => this.handleEditEstimate(taskId),
            onAddSubtask: (taskId) => this.handleAddSubtask(taskId),
            onToggleSubtask: (taskId, subtaskId) => this.handleToggleSubtask(taskId, subtaskId),
            onDeleteSubtask: (taskId, subtaskId) => this.handleDeleteSubtask(taskId, subtaskId)
        });
        
        this.element = this.unifiedCard.getElement();
    }

    // Maintain the same interface as the original TaskCard
    createElement() {
        return this.element;
    }

    updateTask(task) {
        this.task = task;
        this.unifiedCard.updateTask(task);
    }

    updateStatus(status) {
        this.status = status;
        this.unifiedCard.updateStatus(status);
    }

    getElement() {
        return this.element;
    }

    // Handle editing functionality that was in the original TaskCard
    handleEditTitle(taskId) {
        // This would need to be implemented based on the original TaskCard's showEditTitleInput method
        // For now, we'll just call the update callback
        if (this.onUpdateTask) {
            this.onUpdateTask(this.task);
        }
    }

    handleEditEstimate(taskId) {
        // Get the unified card's strategy and call its estimate editor
        if (this.unifiedCard && this.unifiedCard.strategy) {
            this.unifiedCard.strategy.showEstimateEditor(this.element, {
                onUpdateTask: (updatedTask) => {
                    this.task = updatedTask;
                    if (this.onUpdateTask) {
                        this.onUpdateTask(updatedTask);
                    }
                }
            }, this.task);
        }
    }

    handleAddSubtask(taskId) {
        // Find the subtasks container and add subtask button
        const subtasksContainer = this.element.querySelector('.subtasks-container');
        const addSubtaskBtn = this.element.querySelector('.add-subtask-btn');
        
        if (!subtasksContainer || !addSubtaskBtn) {
            console.error('Subtasks container or add subtask button not found');
            return;
        }
        
        // Hide the add subtask button
        addSubtaskBtn.style.display = 'none';
        
        // Create subtask input container
        const inputContainer = document.createElement('div');
        inputContainer.className = 'subtask-input-container';
        inputContainer.innerHTML = `
            <input type="text" class="subtask-input" placeholder="Enter subtask..." maxlength="200" autocomplete="off">
            <div class="subtask-input-buttons">
                <button type="button" class="subtask-save-btn" title="Save subtask">✓</button>
                <button type="button" class="subtask-cancel-btn" title="Cancel">×</button>
            </div>
        `;
        
        // Insert the input container before the add subtask button
        subtasksContainer.insertBefore(inputContainer, addSubtaskBtn);
        
        const input = inputContainer.querySelector('.subtask-input');
        const saveBtn = inputContainer.querySelector('.subtask-save-btn');
        const cancelBtn = inputContainer.querySelector('.subtask-cancel-btn');
        
        // Focus on the input
        input.focus();
        
        // Save subtask function
        const saveSubtask = () => {
            const text = input.value.trim();
            if (text) {
                // Generate unique ID for subtask
                const subtaskId = Date.now() + Math.random();
                
                // Create new subtask
                const newSubtask = {
                    id: subtaskId,
                    text: text,
                    completed: false
                };
                
                // Add to task's subtasks array
                if (!this.task.subtasks) {
                    this.task.subtasks = [];
                }
                this.task.subtasks.push(newSubtask);
                
                // Update the task card display
                this.unifiedCard.updateTask(this.task);
                
                // Notify callback
                if (this.onUpdateTask) {
                    this.onUpdateTask(this.task);
                }
            } else {
                // If no text, just remove the input
                inputContainer.remove();
                addSubtaskBtn.style.display = '';
            }
        };
        
        // Cancel function
        const cancelSubtask = () => {
            inputContainer.remove();
            addSubtaskBtn.style.display = '';
        };
        
        // Event listeners
        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            saveSubtask();
        });
        
        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            cancelSubtask();
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveSubtask();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelSubtask();
            }
        });
        
        // Auto-save when clicking outside
        const handleClickOutside = (e) => {
            if (!inputContainer.contains(e.target)) {
                saveSubtask();
                document.removeEventListener('click', handleClickOutside);
            }
        };
        
        // Also save on blur
        input.addEventListener('blur', () => {
            setTimeout(() => {
                if (document.contains(inputContainer)) {
                    saveSubtask();
                }
            }, 100);
        });
        
        // Prevent input clicks from closing the editor
        input.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        
        setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 100);
    }

    handleToggleSubtask(taskId, subtaskId) {
        const subtask = this.task.subtasks.find(s => s.id === subtaskId);
        if (subtask) {
            subtask.completed = !subtask.completed;
            if (this.onUpdateTask) {
                this.onUpdateTask(this.task);
            }
        }
    }

    handleDeleteSubtask(taskId, subtaskId) {
        this.task.subtasks = this.task.subtasks.filter(s => s.id !== subtaskId);
        if (this.onUpdateTask) {
            this.onUpdateTask(this.task);
        }
    }

    // Static method to maintain compatibility
    static createTaskCard(task, status, onDelete, onMoveToDone, onUpdateTask) {
        const wrapper = new TaskCardWrapper(task, status, onDelete, onMoveToDone, onUpdateTask);
        return wrapper.getElement();
    }
}
