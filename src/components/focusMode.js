// Focus Mode Component - shows timer and today's tasks, resizes window
export class FocusMode {
    constructor(taskBoardInstance) {
        this.taskBoard = taskBoardInstance; // TaskBoardModal instance
        this.isActive = false;
        this.root = null;
        this.timer = { minutes: 25, seconds: 0, running: false, handle: null };
        this.positiveTimer = { totalSeconds: 0, running: false, handle: null }; // New positive timer
        this.taskTimers = {}; // Individual task timers: { taskId: { totalSeconds: 0, running: false, handle: null } }
        this.currentTaskId = null; // Currently focused task ID
        this.keydownHandler = null;
        this.settings = this.loadAppSettings();
        this.loadStyles();
        this.loadTaskTimers();
    }

    // Load app-level settings
    loadAppSettings() {
        try {
            const saved = localStorage.getItem('workwith-settings');
            const parsed = saved ? JSON.parse(saved) : {};
            return {
                showPomodoroTimer: parsed.showPomodoroTimer !== false, // default true
            };
        } catch {
            return { showPomodoroTimer: true };
        }
    }
    loadStyles() {
        if (document.getElementById('focus-mode-styles')) return;
        const link = document.createElement('link');
        link.id = 'focus-mode-styles';
        link.rel = 'stylesheet';
        link.type = 'text/css';
        try { link.href = new URL('./focusMode.css', import.meta.url).href; } catch {}
        document.head.appendChild(link);
    }

    // Load task timers from localStorage
    loadTaskTimers() {
        try {
            const saved = localStorage.getItem('focusModeTaskTimers');
            if (saved) {
                this.taskTimers = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load task timers:', error);
            this.taskTimers = {};
        }
    }

    // Save task timers to localStorage
    saveTaskTimers() {
        try {
            localStorage.setItem('focusModeTaskTimers', JSON.stringify(this.taskTimers));
        } catch (error) {
            console.warn('Failed to save task timers:', error);
        }
    }

    // Get or create task timer
    getTaskTimer(taskId) {
        if (!this.taskTimers[taskId]) {
            this.taskTimers[taskId] = { totalSeconds: 0, running: false, handle: null };
        }
        return this.taskTimers[taskId];
    }

    // Start timer for current task
    startCurrentTaskTimer() {
        if (!this.currentTaskId) return;
        const taskTimer = this.getTaskTimer(this.currentTaskId);
        if (taskTimer.running) return;
        
        taskTimer.running = true;
        taskTimer.handle = setInterval(() => {
            taskTimer.totalSeconds++;
            this.saveTaskTimers(); // Save every second
            this.updateCurrentTaskTimer(); // Update UI
        }, 1000);
    }

    // Pause timer for current task
    pauseCurrentTaskTimer() {
        if (!this.currentTaskId) return;
        const taskTimer = this.getTaskTimer(this.currentTaskId);
        if (!taskTimer.running) return;
        
        taskTimer.running = false;
        clearInterval(taskTimer.handle);
        taskTimer.handle = null;
        this.saveTaskTimers(); // Save when paused
    }

    // Update current task timer display
    updateCurrentTaskTimer() {
        if (!this.currentTaskId) return;
        const taskTimer = this.getTaskTimer(this.currentTaskId);
        const ongoingTask = this.root.querySelector('.focus-task-item.current-ongoing');
        if (!ongoingTask) return;
        
        const countdown = ongoingTask.querySelector('.task-countdown');
        if (!countdown) return;
        
        // Format time: HH:MM:SS or MM:SS
        const formatTime = (totalSeconds) => {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = Math.floor(totalSeconds % 60);
            
            if (hours > 0) {
                return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            } else {
                return `${minutes}:${String(seconds).padStart(2, '0')}`;
            }
        };
        
        countdown.textContent = `Time spent: ${formatTime(taskTimer.totalSeconds)}`;
    }

    activate() {
        if (this.isActive) return;
        this.isActive = true;
        this.createUI();
        this.mount();
        this.applyResize();
        this.bind();
        this.renderTasks();
        // Hide global title bar during focus mode
        document.body.classList.add('focus-mode-active');
    }

    deactivate() {
        if (!this.isActive) return;
        this.isActive = false;
        
        // Stop all timers and reset positive timer
        this.pauseTimer();
        this.pauseCurrentTaskTimer(); // Pause current task timer
        this.positiveTimer.totalSeconds = 0;
        this.saveTaskTimers(); // Save task timers before closing
        
        if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
        const mainContainer = document.getElementById('mainContainer');
        if (mainContainer) mainContainer.style.display = '';
        if (window.electronAPI && window.electronAPI.focusMode) {
            window.electronAPI.focusMode.restoreWindow();
        }
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
        document.dispatchEvent(new CustomEvent('focusModeDeactivated'));
        // Restore global UI state
        document.body.classList.remove('focus-mode-active');
    }

    createUI() {
        this.root = document.createElement('div');
        this.root.className = 'focus-mode-container';
        this.root.innerHTML = `
            <main class="focus-content">
                <section class="focus-timer">
                    <div class="focus-topbar">
                        <button class="focus-back" title="Return to Task Board" aria-label="Return">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                <polyline points="15 18 9 12 15 6"></polyline>
                                <line x1="9" y1="12" x2="21" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="timer-display">
                        <div class="pomodoro-timer">
                            <div class="timer-label">Pomodoro</div>
                            <div class="timer-time">25:00</div>
                        </div>
                        <div class="positive-timer">
                            <div class="timer-label">Focused</div>
                            <div class="positive-time">0:00</div>
                        </div>
                    </div>
                    <div class="timer-controls">
                        <button class="t-start" title="Start">▶</button>
                        <button class="t-pause" title="Pause" style="display:none">⏸</button>
                        <button class="t-reset" title="Reset">⟲</button>
                    </div>
                </section>
                <section class="focus-tasks">
                    <h2>Today</h2>
                    <div id="focus-task-list" class="focus-task-list"></div>
                </section>
            </main>`;

        // Apply initial visibility based on settings
        this.applyPomodoroVisibility();
    }

    mount() {
        const mainContainer = document.getElementById('mainContainer');
        if (mainContainer) mainContainer.style.display = 'none';
        document.body.appendChild(this.root);
    }

    applyResize() {
        if (window.electronAPI && window.electronAPI.focusMode) {
            window.electronAPI.focusMode.resizeWindow();
        }
    }

    bind() {
        this.root.querySelector('.focus-back').addEventListener('click', () => this.deactivate());
        const start = this.root.querySelector('.t-start');
        const pause = this.root.querySelector('.t-pause');
        const reset = this.root.querySelector('.t-reset');
        start.addEventListener('click', () => this.startTimer());
        pause.addEventListener('click', () => this.pauseTimer());
        reset.addEventListener('click', () => this.resetTimer());
        this.keydownHandler = (e) => { if (e.key === 'Escape') this.deactivate(); };
        document.addEventListener('keydown', this.keydownHandler);
        this.enableDnD();

        // React to settings changes
        document.addEventListener('settingsChanged', (e) => {
            const detail = e.detail || {};
            const prev = this.settings.showPomodoroTimer;
            this.settings.showPomodoroTimer = detail.showPomodoroTimer !== false;
            this.applyPomodoroVisibility();
            // If toggled off while running, stop pomodoro countdown only
            if (prev && !this.settings.showPomodoroTimer && this.timer.handle) {
                clearInterval(this.timer.handle);
                this.timer.handle = null;
            }
        });
    }

    // Show/hide Pomodoro timer in UI and adjust layout
    applyPomodoroVisibility() {
        if (!this.root) return;
        const display = this.root.querySelector('.timer-display');
        const pomo = this.root.querySelector('.pomodoro-timer');
        if (!display || !pomo) return;
        if (this.settings.showPomodoroTimer) {
            pomo.style.display = '';
            display.classList.remove('single-timer');
        } else {
            pomo.style.display = 'none';
            display.classList.add('single-timer');
        }
    }

    startTimer() {
        if (this.timer.running) return;
        this.timer.running = true;
        this.positiveTimer.running = true; // Start positive timer too
        this.root.querySelector('.t-start').style.display = 'none';
        this.root.querySelector('.t-pause').style.display = 'inline-block';
        
        // Start current task timer if there's an ongoing task
        if (this.currentTaskId) {
            this.startCurrentTaskTimer();
        }
        
        // Pomodoro timer (only if enabled)
        if (this.settings.showPomodoroTimer) {
            this.timer.handle = setInterval(() => {
                if (this.timer.seconds === 0) {
                    if (this.timer.minutes === 0) { this.resetTimer(); return; }
                    this.timer.minutes--; this.timer.seconds = 59;
                } else { this.timer.seconds--; }
                this.updateTimer();
            }, 1000);
        }
        
        // Positive timer
        this.positiveTimer.handle = setInterval(() => {
            this.positiveTimer.totalSeconds++;
            this.updatePositiveTimer();
            this.updateOngoingTaskProgress(); // Update progress for ongoing task only
        }, 1000);
    }

    pauseTimer() {
        if (!this.timer.running) return;
        this.timer.running = false;
        this.positiveTimer.running = false; // Pause positive timer too
        
        // Pause current task timer
        this.pauseCurrentTaskTimer();
        
        if (this.timer.handle) clearInterval(this.timer.handle);
        clearInterval(this.positiveTimer.handle);
        this.root.querySelector('.t-start').style.display = 'inline-block';
        this.root.querySelector('.t-pause').style.display = 'none';
    }

    resetTimer() { 
        this.pauseTimer(); 
        // Only reset Pomodoro display; its interval is gated by setting
        this.timer.minutes = 25; 
        this.timer.seconds = 0; 
        this.positiveTimer.totalSeconds = 0; // Reset positive timer
        this.updateTimer(); 
        this.updatePositiveTimer();
    }
    
    updateTimer() {
        const mm = String(this.timer.minutes).padStart(2, '0');
        const ss = String(this.timer.seconds).padStart(2, '0');
        this.root.querySelector('.timer-time').textContent = `${mm}:${ss}`;
    }
    
    updatePositiveTimer() {
        const totalSeconds = this.positiveTimer.totalSeconds;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        let timeString;
        if (hours > 0) {
            timeString = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
            timeString = `${minutes}:${String(seconds).padStart(2, '0')}`;
        }
        
        this.root.querySelector('.positive-time').textContent = timeString;
    }

    renderTasks() {
        const list = this.root.querySelector('#focus-task-list');
        list.innerHTML = '';
        const tasks = (this.taskBoard && this.taskBoard.tasks && this.taskBoard.tasks['today']) ? this.taskBoard.tasks['today'] : [];
        // Use Task Board array order directly (no localStorage ordering)
        if (!tasks.length) {
            list.innerHTML = '<div class="no-tasks">No tasks</div>';
            return;
        }
        tasks.forEach((task, index) => {
            const taskEl = this.createTask(task);
            list.appendChild(taskEl);
        });
        
        // Update ongoing task after all tasks are rendered
        this.updateOngoingTask();
    }

    createTask(task) {
        const el = document.createElement('div');
        el.className = 'focus-task-item';
        el.draggable = true;
        el.dataset.taskId = String(task.id);
        
        // Get estimate in minutes
        const estimateMinutes = this.getTaskEstimateMinutes(task);
        const hasEstimate = estimateMinutes && estimateMinutes > 0;
        
        el.innerHTML = `
            <div class="task-content">
                <span class="task-title">${task.title}</span>
                ${hasEstimate ? `<span class="task-time">⏱️ ${this.formatEstimateTime(estimateMinutes)}</span>` : ''}
            </div>
            <button class="done-btn" title="Done">✓</button>`;
        el.querySelector('.done-btn').addEventListener('click', () => this.markDone(task.id, el));
        return el;
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

    markDone(taskId, el) {
        el.classList.add('completed');
        setTimeout(() => {
            el.remove();
            if (this.taskBoard && typeof this.taskBoard.moveTaskToDone === 'function') {
                this.taskBoard.moveTaskToDone(taskId, 'today');
            }
            // No need to persistOrder - Task Board handles the data
            const list = this.root.querySelector('#focus-task-list');
            if (list && !list.querySelector('.focus-task-item')) {
                list.innerHTML = '<div class="no-tasks">No tasks</div>';
            } else {
                // Update ongoing task after removing a task
                this.updateOngoingTask();
            }
        }, 250);
    }

    enableDnD() {
        const list = this.root.querySelector('#focus-task-list');
        list.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.focus-task-item');
            if (!item) return; item.classList.add('dragging');
        });
        list.addEventListener('dragend', (e) => {
            const item = e.target.closest('.focus-task-item');
            if (!item) return; 
            item.classList.remove('dragging'); 
            this.syncOrderToTaskBoard();
            this.updateOngoingTask(); // Update ongoing task styling after reorder
        });
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            const after = this.getAfter(list, e.clientY);
            const dragging = list.querySelector('.dragging');
            if (!dragging) return;
            if (after == null) list.appendChild(dragging); else list.insertBefore(dragging, after);
        });
    }

    getAfter(container, y) {
        const els = [...container.querySelectorAll('.focus-task-item:not(.dragging)')];
        let closest = { offset: Number.NEGATIVE_INFINITY, el: null };
        for (const child of els) {
            const box = child.getBoundingClientRect();
            const offset = y - (box.top + box.height / 2);
            if (offset < 0 && offset > closest.offset) closest = { offset, el: child };
        }
        return closest.el;
    }

    // Sync Focus Mode drag order back to Task Board
    syncOrderToTaskBoard() {
        if (!this.taskBoard || !this.taskBoard.tasks || !this.taskBoard.tasks['today']) return;
        
        const focusTaskIds = [...this.root.querySelectorAll('.focus-task-item')].map(n => parseInt(n.dataset.taskId));
        const taskBoardTasks = this.taskBoard.tasks['today'];
        
        // Reorder Task Board array to match Focus Mode order
        const reorderedTasks = [];
        focusTaskIds.forEach(id => {
            const task = taskBoardTasks.find(t => t.id === id);
            if (task) reorderedTasks.push(task);
        });
        
        // Update Task Board array
        this.taskBoard.tasks['today'] = reorderedTasks;
        
        // Save Task Board changes and trigger UI update
        if (typeof this.taskBoard.saveToLocalStorage === 'function') {
            this.taskBoard.saveToLocalStorage();
        }
        if (typeof this.taskBoard.renderTasks === 'function') {
            this.taskBoard.renderTasks();
        }
    }
    
    // Listen for Task Board changes and update Focus Mode
    onTaskBoardUpdate() {
        if (this.isActive) {
            this.renderTasks();
        }
    }

    // Update ongoing task styling based on current list order
    updateOngoingTask() {
        const list = this.root.querySelector('#focus-task-list');
        if (!list) return;

        // Pause previous task timer if switching tasks
        if (this.currentTaskId) {
            this.pauseCurrentTaskTimer();
        }

        // Remove ongoing styling and progress bars from all tasks
        const allTasks = list.querySelectorAll('.focus-task-item');
        allTasks.forEach(task => {
            task.classList.remove('current-ongoing');
            // Remove existing progress container
            const existingProgress = task.querySelector('.task-progress-container');
            if (existingProgress) {
                existingProgress.remove();
            }
        });

        // Add ongoing styling and progress bar to the first task (topmost)
        const firstTask = list.querySelector('.focus-task-item');
        if (firstTask) {
            firstTask.classList.add('current-ongoing');
            
            // Set current task ID
            this.currentTaskId = parseInt(firstTask.dataset.taskId);
            
            // Add progress bar if task has estimate
            const task = this.taskBoard.tasks['today'].find(t => t.id === this.currentTaskId);
            if (task) {
                const estimateMinutes = this.getTaskEstimateMinutes(task);
                const taskContent = firstTask.querySelector('.task-content');
                
                // Always add progress container for count-up timer
                const progressHTML = `
                    <div class="task-progress-container">
                        <div class="task-progress-bar">
                            <div class="task-progress-fill" style="width: 0%"></div>
                        </div>
                        <div class="task-countdown">Time spent: 0:00</div>
                    </div>
                `;
                taskContent.insertAdjacentHTML('beforeend', progressHTML);
                
                // Update timer display with saved time
                this.updateCurrentTaskTimer();
                
                // Start timer if main timer is running
                if (this.timer.running) {
                    this.startCurrentTaskTimer();
                }
            }
        } else {
            this.currentTaskId = null;
        }
    }
    
    // Update progress bar and countdown timer for ongoing task only
    updateOngoingTaskProgress() {
        const list = this.root.querySelector('#focus-task-list');
        if (!list) return;
        
        // Only update the ongoing task (first task with current-ongoing class)
        const ongoingTask = list.querySelector('.focus-task-item.current-ongoing');
        if (!ongoingTask) return;
        
        const taskId = parseInt(ongoingTask.dataset.taskId);
        const task = this.taskBoard.tasks['today'].find(t => t.id === taskId);
        if (!task) return;
        
        const estimateMinutes = this.getTaskEstimateMinutes(task);
        if (!estimateMinutes || estimateMinutes <= 0) return;
        
        const progressContainer = ongoingTask.querySelector('.task-progress-container');
        if (!progressContainer) return;
        
        const progressFill = progressContainer.querySelector('.task-progress-fill');
        const countdown = progressContainer.querySelector('.task-countdown');
        
        if (!progressFill || !countdown) return;
        
        // Use task-specific timer instead of general positive timer
        const taskTimer = this.getTaskTimer(taskId);
        const focusedSeconds = taskTimer.totalSeconds;
        const estimateSeconds = estimateMinutes * 60;
        const progressPercent = Math.min((focusedSeconds / estimateSeconds) * 100, 100);
        
        // Update progress bar
        progressFill.style.width = `${progressPercent}%`;
        
        // Update countdown timer to show elapsed/remaining time (accurate to seconds)
        const remainingSeconds = Math.max(estimateSeconds - focusedSeconds, 0);
        
        // Format time with seconds: MM:SS or HH:MM:SS
        const formatTime = (totalSeconds) => {
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = Math.floor(totalSeconds % 60);
            
            if (hours > 0) {
                return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            } else {
                return `${minutes}:${String(seconds).padStart(2, '0')}`;
            }
        };
        
        // Show format: "elapsed / total (remaining left)"
        const elapsedTime = formatTime(focusedSeconds);
        const totalTime = formatTime(estimateSeconds);
        const remainingTime = formatTime(remainingSeconds);
        
        countdown.textContent = `${elapsedTime} / ${totalTime} (${remainingTime} left)`;
        
        // Change color when time is up
        if (remainingSeconds <= 0) {
            progressFill.style.background = '#ef4444'; // Red when time is up
            countdown.style.color = '#ef4444';
        } else if (remainingSeconds <= estimateSeconds * 0.2) {
            progressFill.style.background = '#f59e0b'; // Orange when 20% time left
            countdown.style.color = '#f59e0b';
        } else {
            progressFill.style.background = '#10b981'; // Green for normal progress
            countdown.style.color = '#94a3b8';
        }
    }
}


