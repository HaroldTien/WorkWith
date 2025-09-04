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
        // This would need to be implemented based on the original TaskCard's showEstimateEditor method
        // For now, we'll just call the update callback
        if (this.onUpdateTask) {
            this.onUpdateTask(this.task);
        }
    }

    handleAddSubtask(taskId) {
        // This would need to be implemented based on the original TaskCard's showAddSubtaskInput method
        // For now, we'll just call the update callback
        if (this.onUpdateTask) {
            this.onUpdateTask(this.task);
        }
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
