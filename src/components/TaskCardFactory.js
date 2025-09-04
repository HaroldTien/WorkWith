// Task Card Factory - Creates unified task cards with appropriate strategies
import { UnifiedTaskCard } from './UnifiedTaskCard.js';

export class TaskCardFactory {
    /**
     * Create a unified task card for Focus Mode
     * @param {Object} task - The task object
     * @param {Object} callbacks - Callback functions for focus mode
     * @returns {UnifiedTaskCard} - Configured task card instance
     */
    static createFocusTaskCard(task, callbacks = {}) {
        return UnifiedTaskCard.createTaskCard(task, 'focus', callbacks);
    }

    /**
     * Create a unified task card for Task Board
     * @param {Object} task - The task object
     * @param {string} status - Task status ('in-process', 'today', 'done')
     * @param {Object} callbacks - Callback functions for task board
     * @returns {UnifiedTaskCard} - Configured task card instance
     */
    static createBoardTaskCard(task, status, callbacks = {}) {
        return UnifiedTaskCard.createTaskCard(task, 'board', {
            status,
            ...callbacks
        });
    }

    /**
     * Create a task card with automatic context detection
     * @param {Object} task - The task object
     * @param {string} context - 'focus' or 'board'
     * @param {Object} options - Additional options including status and callbacks
     * @returns {UnifiedTaskCard} - Configured task card instance
     */
    static createTaskCard(task, context, options = {}) {
        if (context === 'focus') {
            return this.createFocusTaskCard(task, options);
        } else if (context === 'board') {
            const { status, ...callbacks } = options;
            return this.createBoardTaskCard(task, status, callbacks);
        } else {
            throw new Error(`Unknown context: ${context}. Must be 'focus' or 'board'`);
        }
    }

    /**
     * Create multiple task cards for a list
     * @param {Array} tasks - Array of task objects
     * @param {string} context - 'focus' or 'board'
     * @param {Object} options - Additional options
     * @returns {Array<UnifiedTaskCard>} - Array of task card instances
     */
    static createTaskCardList(tasks, context, options = {}) {
        return tasks.map(task => this.createTaskCard(task, context, options));
    }

    /**
     * Get the appropriate CSS class for a context
     * @param {string} context - 'focus' or 'board'
     * @returns {string} - CSS class name
     */
    static getContextClassName(context) {
        return context === 'focus' ? 'focus-task-item' : 'task-card';
    }

    /**
     * Check if a context supports a specific feature
     * @param {string} context - 'focus' or 'board'
     * @param {string} feature - Feature name ('editing', 'subtasks', 'estimates', 'deletion')
     * @returns {boolean} - Whether the feature is supported
     */
    static supportsFeature(context, feature) {
        const featureSupport = {
            'focus': ['display', 'completion', 'reordering', 'estimates'],
            'board': ['display', 'completion', 'editing', 'subtasks', 'estimates', 'deletion', 'reordering']
        };
        
        return featureSupport[context]?.includes(feature) || false;
    }

    /**
     * Get available features for a context
     * @param {string} context - 'focus' or 'board'
     * @returns {Array<string>} - Array of supported features
     */
    static getSupportedFeatures(context) {
        const featureSupport = {
            'focus': ['display', 'completion', 'reordering', 'estimates'],
            'board': ['display', 'completion', 'editing', 'subtasks', 'estimates', 'deletion', 'reordering']
        };
        
        return featureSupport[context] || [];
    }
}
