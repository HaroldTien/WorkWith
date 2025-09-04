// Test file for Unified Task Card functionality preservation
// This is a comprehensive test to ensure all features work correctly

export class UnifiedTaskCardTest {
    constructor() {
        this.testResults = [];
    }

    // Test Focus Mode functionality
    async testFocusModeFeatures() {
        console.log('🧪 Testing Focus Mode Features...');
        
        const testTask = {
            id: 1,
            title: 'Test Focus Task',
            estimateMinutes: 30,
            subtasks: []
        };

        const callbacks = {
            onMarkDone: (taskId, element) => {
                console.log(`✅ Focus Mode: Mark done callback triggered for task ${taskId}`);
                return true;
            }
        };

        try {
            // Test task card creation
            const { TaskCardFactory } = await import('./TaskCardFactory.js');
            const taskCard = TaskCardFactory.createFocusTaskCard(testTask, callbacks);
            
            // Test element creation
            const element = taskCard.getElement();
            if (!element) throw new Error('Element not created');
            
            // Test CSS classes
            if (!element.classList.contains('focus-task-item')) {
                throw new Error('Incorrect CSS class for focus mode');
            }
            
            // Test draggable attribute
            if (!element.draggable) {
                throw new Error('Element should be draggable');
            }
            
            // Test task ID data attribute
            if (element.dataset.taskId !== '1') {
                throw new Error('Incorrect task ID data attribute');
            }
            
            // Test context data attribute
            if (element.dataset.context !== 'focus') {
                throw new Error('Incorrect context data attribute');
            }
            
            // Test HTML content
            if (!element.querySelector('.task-content')) {
                throw new Error('Task content not found');
            }
            
            if (!element.querySelector('.task-title')) {
                throw new Error('Task title not found');
            }
            
            if (!element.querySelector('.done-btn')) {
                throw new Error('Done button not found');
            }
            
            // Test estimate display
            const estimateDisplay = element.querySelector('.task-time');
            if (!estimateDisplay) {
                throw new Error('Estimate display not found');
            }
            
            if (!estimateDisplay.textContent.includes('30:00')) {
                throw new Error('Incorrect estimate format');
            }
            
            this.testResults.push({ test: 'Focus Mode Features', status: 'PASS' });
            console.log('✅ Focus Mode Features: PASS');
            
        } catch (error) {
            this.testResults.push({ test: 'Focus Mode Features', status: 'FAIL', error: error.message });
            console.error('❌ Focus Mode Features: FAIL', error);
        }
    }

    // Test Task Board functionality
    async testTaskBoardFeatures() {
        console.log('🧪 Testing Task Board Features...');
        
        const testTask = {
            id: 2,
            title: 'Test Board Task',
            estimateMinutes: 60,
            subtasks: [
                { id: 1, text: 'Subtask 1', completed: false },
                { id: 2, text: 'Subtask 2', completed: true }
            ]
        };

        const callbacks = {
            onDelete: (taskId, status) => {
                console.log(`✅ Task Board: Delete callback triggered for task ${taskId}`);
                return true;
            },
            onMoveToDone: (taskId, fromStatus) => {
                console.log(`✅ Task Board: Move to done callback triggered for task ${taskId}`);
                return true;
            },
            onUpdateTask: (task) => {
                console.log(`✅ Task Board: Update task callback triggered for task ${task.id}`);
                return true;
            }
        };

        try {
            // Test task card creation
            const { TaskCardFactory } = await import('./TaskCardFactory.js');
            const taskCard = TaskCardFactory.createBoardTaskCard(testTask, 'today', callbacks);
            
            // Test element creation
            const element = taskCard.getElement();
            if (!element) throw new Error('Element not created');
            
            // Test CSS classes
            if (!element.classList.contains('task-card')) {
                throw new Error('Incorrect CSS class for task board');
            }
            
            // Test draggable attribute
            if (!element.draggable) {
                throw new Error('Element should be draggable');
            }
            
            // Test task ID data attribute
            if (element.dataset.taskId !== '2') {
                throw new Error('Incorrect task ID data attribute');
            }
            
            // Test context data attribute
            if (element.dataset.context !== 'board') {
                throw new Error('Incorrect context data attribute');
            }
            
            // Test status data attribute
            if (element.dataset.status !== 'today') {
                throw new Error('Incorrect status data attribute');
            }
            
            // Test HTML content
            if (!element.querySelector('.task-header')) {
                throw new Error('Task header not found');
            }
            
            if (!element.querySelector('.task-title')) {
                throw new Error('Task title not found');
            }
            
            if (!element.querySelector('.task-actions')) {
                throw new Error('Task actions not found');
            }
            
            if (!element.querySelector('.done-task-btn')) {
                throw new Error('Done button not found');
            }
            
            if (!element.querySelector('.delete-task-btn')) {
                throw new Error('Delete button not found');
            }
            
            // Test estimate display
            const estimateBadge = element.querySelector('.estimate-badge');
            if (!estimateBadge) {
                throw new Error('Estimate badge not found');
            }
            
            if (!estimateBadge.textContent.includes('1h')) {
                throw new Error('Incorrect estimate format');
            }
            
            // Test subtasks display
            const subtaskProgress = element.querySelector('.subtask-progress');
            if (!subtaskProgress) {
                throw new Error('Subtask progress not found');
            }
            
            if (!subtaskProgress.textContent.includes('1/2')) {
                throw new Error('Incorrect subtask progress');
            }
            
            // Test subtasks container
            const subtasksContainer = element.querySelector('.subtasks-container');
            if (!subtasksContainer) {
                throw new Error('Subtasks container not found');
            }
            
            // Test subtask items
            const subtaskItems = element.querySelectorAll('.subtask-item');
            if (subtaskItems.length !== 2) {
                throw new Error('Incorrect number of subtask items');
            }
            
            // Test add subtask button
            if (!element.querySelector('.add-subtask-btn')) {
                throw new Error('Add subtask button not found');
            }
            
            this.testResults.push({ test: 'Task Board Features', status: 'PASS' });
            console.log('✅ Task Board Features: PASS');
            
        } catch (error) {
            this.testResults.push({ test: 'Task Board Features', status: 'FAIL', error: error.message });
            console.error('❌ Task Board Features: FAIL', error);
        }
    }

    // Test backward compatibility
    async testBackwardCompatibility() {
        console.log('🧪 Testing Backward Compatibility...');
        
        try {
            // Test TaskCardWrapper static method
            const { TaskCardWrapper } = await import('./TaskCardWrapper.js');
            
            const testTask = {
                id: 3,
                title: 'Test Compatibility Task',
                estimateMinutes: 45,
                subtasks: []
            };

            const callbacks = {
                onDelete: (taskId, status) => true,
                onMoveToDone: (taskId, fromStatus) => true,
                onUpdateTask: (task) => true
            };

            // Test static createTaskCard method
            const element = TaskCardWrapper.createTaskCard(testTask, 'today', callbacks.onDelete, callbacks.onMoveToDone, callbacks.onUpdateTask);
            
            if (!element) {
                throw new Error('Element not created by static method');
            }
            
            if (!element.classList.contains('task-card')) {
                throw new Error('Incorrect CSS class for wrapper');
            }
            
            this.testResults.push({ test: 'Backward Compatibility', status: 'PASS' });
            console.log('✅ Backward Compatibility: PASS');
            
        } catch (error) {
            this.testResults.push({ test: 'Backward Compatibility', status: 'FAIL', error: error.message });
            console.error('❌ Backward Compatibility: FAIL', error);
        }
    }

    // Test feature support detection
    async testFeatureSupport() {
        console.log('🧪 Testing Feature Support Detection...');
        
        try {
            const { TaskCardFactory } = await import('./TaskCardFactory.js');
            
            // Test focus mode features
            const focusFeatures = TaskCardFactory.getSupportedFeatures('focus');
            const expectedFocusFeatures = ['display', 'completion', 'reordering', 'estimates'];
            
            for (const feature of expectedFocusFeatures) {
                if (!focusFeatures.includes(feature)) {
                    throw new Error(`Focus mode missing feature: ${feature}`);
                }
            }
            
            // Test board features
            const boardFeatures = TaskCardFactory.getSupportedFeatures('board');
            const expectedBoardFeatures = ['display', 'completion', 'editing', 'subtasks', 'estimates', 'deletion', 'reordering'];
            
            for (const feature of expectedBoardFeatures) {
                if (!boardFeatures.includes(feature)) {
                    throw new Error(`Board mode missing feature: ${feature}`);
                }
            }
            
            // Test feature support checks
            if (!TaskCardFactory.supportsFeature('focus', 'completion')) {
                throw new Error('Focus mode should support completion');
            }
            
            if (!TaskCardFactory.supportsFeature('board', 'editing')) {
                throw new Error('Board mode should support editing');
            }
            
            if (TaskCardFactory.supportsFeature('focus', 'editing')) {
                throw new Error('Focus mode should not support editing');
            }
            
            this.testResults.push({ test: 'Feature Support Detection', status: 'PASS' });
            console.log('✅ Feature Support Detection: PASS');
            
        } catch (error) {
            this.testResults.push({ test: 'Feature Support Detection', status: 'FAIL', error: error.message });
            console.error('❌ Feature Support Detection: FAIL', error);
        }
    }

    // Run all tests
    async runAllTests() {
        console.log('🚀 Starting Unified Task Card Tests...');
        
        await this.testFocusModeFeatures();
        await this.testTaskBoardFeatures();
        await this.testBackwardCompatibility();
        await this.testFeatureSupport();
        
        this.printResults();
    }

    // Print test results
    printResults() {
        console.log('\n📊 Test Results Summary:');
        console.log('========================');
        
        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        
        this.testResults.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : '❌';
            console.log(`${icon} ${result.test}: ${result.status}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });
        
        console.log(`\n📈 Total: ${passed} passed, ${failed} failed`);
        
        if (failed === 0) {
            console.log('🎉 All tests passed! Unified Task Card implementation is working correctly.');
        } else {
            console.log('⚠️ Some tests failed. Please review the implementation.');
        }
    }
}

// Auto-run tests if this file is loaded directly
if (typeof window !== 'undefined') {
    const testRunner = new UnifiedTaskCardTest();
    testRunner.runAllTests();
}
