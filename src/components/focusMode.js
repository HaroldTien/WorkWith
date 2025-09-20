// Focus Mode Component - shows timer and today's tasks, resizes window
import { TaskCardFactory } from './TaskCardFactory.js';

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
        this.beforeUnloadHandler = null; // Handle reload while in focus mode
        this.settings = this.loadAppSettings();
        this.isMinimalMode = false; // Track minimal mode state
        
        // Pomodoro state management
        this.pomodoroPhase = 'work'; // 'work' or 'rest'
        this.pomodoroWorkTime = this.parseTimeToMinutes(this.settings.pomodoroWorkTime);
        this.pomodoroRestTime = this.parseTimeToMinutes(this.settings.pomodoroRestTime);
        
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
                pomodoroWorkTime: parsed.pomodoroWorkTime || '25:00',
                pomodoroRestTime: parsed.pomodoroRestTime || '5:00'
            };
        } catch {
            return { 
                showPomodoroTimer: true,
                pomodoroWorkTime: '25:00',
                pomodoroRestTime: '5:00'
            };
        }
    }

    parseTimeToMinutes(timeString) {
        // Parse MM:SS format to minutes
        const parts = timeString.split(':');
        if (parts.length === 2) {
            const minutes = parseInt(parts[0], 10) || 0;
            const seconds = parseInt(parts[1], 10) || 0;
            return minutes + (seconds / 60);
        }
        return 25; // default fallback
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
        
        // Trigger auto-sync for time spent changes
        // 為時間花費更改觸發自動同步
        if (this.taskBoard && typeof this.taskBoard.triggerTimeSpentSync === 'function') {
            this.taskBoard.triggerTimeSpentSync(this.currentTaskId);
        }
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

        // Ensure window is restored if the page is reloaded (Ctrl+R/F5)
        this.beforeUnloadHandler = () => {
            try {
                if (window.electronAPI && window.electronAPI.minimalMode) {
                    window.electronAPI.minimalMode.restoreWindow();
                }
                if (window.electronAPI && window.electronAPI.focusMode) {
                    window.electronAPI.focusMode.restoreWindow();
                }
            } catch {}
        };
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
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
        if (this.beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
            this.beforeUnloadHandler = null;
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
                    <div class="global-progress">
                        <div class="global-progress-fill" style="width:0%"></div>
                    </div>
                    <div class="timer-controls">
                        <button class="t-start" title="Start">▶</button>
                        <button class="t-pause" title="Pause" style="display:none">⏸</button>
                    </div>
                    <button class="compress-btn" title="Minimize to Timer Only">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
                        </svg>
                    </button>
                </section>
                <section class="focus-tasks">
                    <h2>Today</h2>
                    <div id="focus-task-list" class="focus-task-list"></div>
                </section>
            </main>`;

        // Apply initial visibility based on settings
        this.applyPomodoroVisibility();
        
        // Initialize timer with current phase time
        this.setTimerForCurrentPhase();
        this.updateTimer();
        this.updateTimerLabel();
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
        const compressBtn = this.root.querySelector('.compress-btn');
        start.addEventListener('click', () => this.startTimer());
        pause.addEventListener('click', () => this.pauseTimer());
        compressBtn.addEventListener('click', () => this.toggleMinimalMode());
        this.keydownHandler = (e) => {
            // Escape exits focus mode
            if (e.key === 'Escape') {
                this.deactivate();
                return;
            }
            // Intercept reload shortcuts to restore window and prevent stuck size
            const key = String(e.key || '').toLowerCase();
            if ((e.ctrlKey || e.metaKey) && key === 'r') {
                e.preventDefault();
                // Restore window then navigate back by deactivating
                try {
                    if (window.electronAPI && window.electronAPI.minimalMode) {
                        window.electronAPI.minimalMode.restoreWindow();
                    }
                    if (window.electronAPI && window.electronAPI.focusMode) {
                        window.electronAPI.focusMode.restoreWindow();
                    }
                } catch {}
                this.deactivate();
            }
            if (key === 'f5') {
                e.preventDefault();
                try {
                    if (window.electronAPI && window.electronAPI.minimalMode) {
                        window.electronAPI.minimalMode.restoreWindow();
                    }
                    if (window.electronAPI && window.electronAPI.focusMode) {
                        window.electronAPI.focusMode.restoreWindow();
                    }
                } catch {}
                this.deactivate();
            }
        };
        document.addEventListener('keydown', this.keydownHandler);
        this.enableDnD();

        // React to settings changes
        document.addEventListener('settingsChanged', (e) => {
            const detail = e.detail || {};
            const prev = this.settings.showPomodoroTimer;
            this.settings.showPomodoroTimer = detail.showPomodoroTimer !== false;
            this.settings.pomodoroWorkTime = detail.pomodoroWorkTime || '25:00';
            this.settings.pomodoroRestTime = detail.pomodoroRestTime || '5:00';
            
            // Update Pomodoro times
            this.pomodoroWorkTime = this.parseTimeToMinutes(this.settings.pomodoroWorkTime);
            this.pomodoroRestTime = this.parseTimeToMinutes(this.settings.pomodoroRestTime);
            
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
                    if (this.timer.minutes === 0) { 
                        this.handlePomodoroPhaseComplete(); 
                        return; 
                    }
                    this.timer.minutes--; 
                    this.timer.seconds = 59;
                } else { 
                    this.timer.seconds--; 
                }
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
        // Reset Pomodoro display based on current phase
        this.setTimerForCurrentPhase();
        this.positiveTimer.totalSeconds = 0; // Reset positive timer
        this.updateTimer(); 
        this.updatePositiveTimer();
    }

    setTimerForCurrentPhase() {
        const totalMinutes = this.pomodoroPhase === 'work' ? this.pomodoroWorkTime : this.pomodoroRestTime;
        this.timer.minutes = Math.floor(totalMinutes);
        this.timer.seconds = Math.round((totalMinutes - this.timer.minutes) * 60);
        if (this.timer.seconds >= 60) {
            this.timer.minutes++;
            this.timer.seconds -= 60;
        }
    }

    handlePomodoroPhaseComplete() {
        if (this.pomodoroPhase === 'work') {
            // Work phase completed - switch to rest
            this.pomodoroPhase = 'rest';
            this.playNotificationSound('rest');
            this.showNotification('Time for a break! 🎉', 'Take a 5-minute rest to recharge.');
            this.setTimerForCurrentPhase();
            this.updateTimerLabel();
        } else {
            // Rest phase completed - switch to work
            this.pomodoroPhase = 'work';
            this.playNotificationSound('work');
            this.showRestEndNotification();
        }
        this.updateTimer();
    }

    showRestEndNotification() {
        // Create a custom notification modal for rest end
        const modal = document.createElement('div');
        modal.className = 'pomodoro-notification-modal';
        modal.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">⏰</div>
                <h3>Break Time is Over!</h3>
                <p>Time to get back to work. Ready to focus?</p>
                <button class="notification-btn">Start Working</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add styles
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;
        
        const content = modal.querySelector('.notification-content');
        content.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 12px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
        `;
        
        const btn = modal.querySelector('.notification-btn');
        btn.style.cssText = `
            background: #10b981;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 1rem;
        `;
        
        btn.addEventListener('click', () => {
            modal.remove();
        });
        
        // Auto-remove after 10 seconds if user doesn't click
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 10000);
    }

    playNotificationSound(type) {
        // Create and play notification sounds
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        if (type === 'rest') {
            // Pleasant chime for break time
            const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.value = freq;
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                    
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.5);
                }, index * 200);
            });
        } else if (type === 'work') {
            // More urgent sound for back to work
            const frequencies = [440, 554.37, 659.25]; // A4, C#5, E5
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.frequency.value = freq;
                    oscillator.type = 'square';
                    
                    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.3);
                }, index * 150);
            });
        }
    }

    showNotification(title, message) {
        const notification = document.createElement('div');
        notification.className = 'pomodoro-notification';
        notification.innerHTML = `
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.pomodoroPhase === 'rest' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    updateTimerLabel() {
        if (!this.root) return;
        const label = this.root.querySelector('.timer-label');
        if (label) {
            label.textContent = this.pomodoroPhase === 'work' ? 'Pomodoro' : 'Rest Time';
        }
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
        // Use unified task card with focus mode callbacks
        const taskCard = TaskCardFactory.createFocusTaskCard(task, {
            onMarkDone: (taskId, element) => this.markDone(taskId, element)
        });
        
        return taskCard.getElement();
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
        
        // Update minimal mode title if in minimal mode
        if (this.isMinimalMode) {
            this.updateMinimalModeTaskTitle();
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
        // Also update the global progress bar in the timer section
        const globalFill = this.root.querySelector('.global-progress-fill');
        if (globalFill) {
            globalFill.style.width = `${progressPercent}%`;
        }
        
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
            if (globalFill) globalFill.style.background = '#ef4444';
            countdown.style.color = '#ef4444';
        } else if (remainingSeconds <= estimateSeconds * 0.2) {
            progressFill.style.background = '#f59e0b'; // Orange when 20% time left
            if (globalFill) globalFill.style.background = '#f59e0b';
            countdown.style.color = '#f59e0b';
        } else {
            progressFill.style.background = '#10b981'; // Green for normal progress
            if (globalFill) globalFill.style.background = '#10b981';
            countdown.style.color = '#94a3b8';
        }
    }

    // Toggle minimal mode (shrink window to timer block size)
    toggleMinimalMode() {
        this.isMinimalMode = !this.isMinimalMode;
        const container = this.root;
        const tasksSection = this.root.querySelector('.focus-tasks');
        const topbar = this.root.querySelector('.focus-topbar');
        const compressBtn = this.root.querySelector('.compress-btn');
        const timerBlock = this.root.querySelector('.focus-timer');
        
        if (this.isMinimalMode) {
            // Enter minimal mode - hide everything except timer block and resize window
            container.classList.add('minimal-mode');
            tasksSection.style.display = 'none';
            topbar.style.display = 'none';
            
            // Add current task title to minimal mode
            this.updateMinimalModeTaskTitle();
            
            // Get timer block position relative to current window
            const timerRect = timerBlock.getBoundingClientRect();
            
            // Resize Electron window to timer block size at timer block position
            if (window.electronAPI && window.electronAPI.minimalMode) {
                window.electronAPI.minimalMode.resizeWindowAtPosition(timerRect.left, timerRect.top);
            }
            
            compressBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 15l4 4 4-4m0-6l-4-4-4 4"></path>
                </svg>
            `;
            compressBtn.title = 'Restore Full View';
        } else {
            // Exit minimal mode - restore all elements and window size
            container.classList.remove('minimal-mode');
            tasksSection.style.display = '';
            topbar.style.display = '';
            
            // Remove current task title from minimal mode
            const existingTitle = timerBlock.querySelector('.current-task-title');
            if (existingTitle) {
                existingTitle.remove();
            }
            
            // Restore Electron window to original size
            if (window.electronAPI && window.electronAPI.minimalMode) {
                window.electronAPI.minimalMode.restoreWindow();
            }
            
            compressBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
                </svg>
            `;
            compressBtn.title = 'Minimize to Timer Only';
        }
    }

    // Update current task title in minimal mode
    updateMinimalModeTaskTitle() {
        if (!this.isMinimalMode) return;
        
        const timerBlock = this.root.querySelector('.focus-timer');
        if (!timerBlock) return;
        
        // Remove existing title if any
        const existingTitle = timerBlock.querySelector('.current-task-title');
        if (existingTitle) {
            existingTitle.remove();
        }
        
        // Get current ongoing task
        const ongoingTask = this.root.querySelector('.focus-task-item.current-ongoing');
        if (!ongoingTask) return;
        
        const taskTitle = ongoingTask.querySelector('.task-title');
        if (!taskTitle) return;
        
        // Create and add current task title
        const titleElement = document.createElement('div');
        titleElement.className = 'current-task-title';
        titleElement.textContent = taskTitle.textContent;
        timerBlock.appendChild(titleElement);
    }
}



