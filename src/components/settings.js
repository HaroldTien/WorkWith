// Settings Modal Component
export class SettingsModal {
    constructor() {
        this.isVisible = false;
        this.savedSettings = this.loadSettings();
        this.workingSettings = JSON.parse(JSON.stringify(this.savedSettings)); // Working copy
        this.element = null;
        this.loadStyles();
        this.createModal();
        this.bindEvents();
    }

    loadStyles() {
        // Check if styles are already loaded
        if (document.getElementById('settings-styles')) return;
        
        const link = document.createElement('link');
        link.id = 'settings-styles';
        link.rel = 'stylesheet';
        link.type = 'text/css';
        try {
            link.href = new URL('./settings.css', import.meta.url).href;
        } catch (e) {
            console.error('Failed to resolve settings.css URL', e);
        }
        
        link.onerror = () => {
            console.error('Failed to load settings styles');
        };
        
        document.head.appendChild(link);
    }

    createModal() {
        const overlay = document.createElement('div');
        overlay.className = 'settings-overlay';
        
        overlay.innerHTML = `
            <div class="settings-modal">
                <div class="settings-header">
                    <h2 class="settings-title">Settings</h2>
                    <button class="settings-close-btn" aria-label="Close settings">×</button>
                </div>
                
                <div class="settings-content">
                    <!-- Task Management Section -->
                    <div class="settings-section">
                        <h3 class="settings-section-title">Task Management</h3>

                        <div class="settings-option">
                            <div>
                                <div class="settings-option-label">Pomodoro in Focus Mode</div>
                                <div class="settings-option-description">Show the Pomodoro timer inside Focus Mode</div>
                            </div>
                            <div class="settings-option-control">
                                <div class="toggle-switch ${this.workingSettings.showPomodoroTimer ? 'active' : ''}" data-setting="showPomodoroTimer"></div>
                            </div>
                        </div>

                        <div class="settings-option pomodoro-time-options" style="display: ${this.workingSettings.showPomodoroTimer ? 'flex' : 'none'}">
                            <div>
                                <div class="settings-option-label">Working Time</div>
                                <div class="settings-option-description">Duration for focused work sessions</div>
                            </div>
                            <div class="settings-option-control">
                                <input 
                                    type="text" 
                                    class="settings-input time-input" 
                                    placeholder="25:00" 
                                    data-setting="pomodoroWorkTime"
                                    value="${this.workingSettings.pomodoroWorkTime || '25:00'}"
                                />
                            </div>
                        </div>

                        <div class="settings-option pomodoro-time-options" style="display: ${this.workingSettings.showPomodoroTimer ? 'flex' : 'none'}">
                            <div>
                                <div class="settings-option-label">Rest Time</div>
                                <div class="settings-option-description">Duration for break sessions</div>
                            </div>
                            <div class="settings-option-control">
                                <input 
                                    type="text" 
                                    class="settings-input time-input" 
                                    placeholder="5:00" 
                                    data-setting="pomodoroRestTime"
                                    value="${this.workingSettings.pomodoroRestTime || '5:00'}"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Notion Integration Section -->
                    <div class="settings-section">
                        <h3 class="settings-section-title">Notion Integration</h3>

                        <div class="settings-option">
                            <div>
                                <div class="settings-option-label">Sync with Notion Database</div>
                                <div class="settings-option-description">Enable two-way synchronization with your Notion database</div>
                            </div>
                            <div class="settings-option-control">
                                <div class="toggle-switch ${this.workingSettings.notionSyncEnabled ? 'active' : ''}" data-setting="notionSyncEnabled"></div>
                            </div>
                        </div>

                        <div class="settings-option notion-token-option" style="display: ${this.workingSettings.notionSyncEnabled ? 'flex' : 'none'}">
                            <div>
                                <div class="settings-option-label">Notion Integration Token</div>
                                <div class="settings-option-description">
                                    Paste your Notion internal integration secret here. 
                                    <a href="https://developers.notion.com/docs/getting-started" target="_blank" class="settings-link">How to get your token?</a>
                                </div>
                            </div>
                            <div class="settings-option-control">
                                <input 
                                    type="password" 
                                    class="settings-input" 
                                    placeholder="secret_..." 
                                    data-setting="notionApiKey"
                                    value="${this.workingSettings.notionApiKey || ''}"
                                />
                                <button class="settings-btn secondary" id="testNotionConnectionBtn" ${!this.workingSettings.notionApiKey ? 'disabled' : ''}>
                                    <span class="connection-status-dot ${this.workingSettings.notionConnectionTested ? 'connected' : ''}"></span>
                                    Test Connection
                                </button>
                            </div>
                        </div>

                    </div>
                    

                </div>
                
                <div class="settings-actions">
                    <button class="settings-btn secondary" id="resetSettingsBtn">Reset to Defaults</button>
                    <button class="settings-btn" id="saveSettingsBtn">Save Changes</button>
                </div>
            </div>
        `;
        
        this.element = overlay;
    }

    bindEvents() {
        // Close button
        const closeBtn = this.element.querySelector('.settings-close-btn');
        closeBtn.addEventListener('click', () => this.hide());
        
        // Overlay click to close
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) this.hide();
        });
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
        
        // Toggle switches
        const toggleSwitches = this.element.querySelectorAll('.toggle-switch');
        toggleSwitches.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const setting = toggle.dataset.setting;
                this.workingSettings[setting] = !this.workingSettings[setting];
                toggle.classList.toggle('active');
                
                // Handle special cases for Notion integration
                if (setting === 'notionSyncEnabled') {
                    this.handleNotionSyncToggle();
                }
                
                // Handle special cases for Pomodoro timer
                if (setting === 'showPomodoroTimer') {
                    this.handlePomodoroTimerToggle();
                }
            });
        });
        
        // Select dropdowns
        const selects = this.element.querySelectorAll('.settings-select');
        selects.forEach(select => {
            select.addEventListener('change', (e) => {
                const setting = e.target.dataset.setting;
                this.workingSettings[setting] = e.target.value;
            });
        });

        // Input fields
        const inputs = this.element.querySelectorAll('.settings-input');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const setting = e.target.dataset.setting;
                
                // Validate time format for Pomodoro settings
                if (setting === 'pomodoroWorkTime' || setting === 'pomodoroRestTime') {
                    if (this.validateTimeFormat(e.target.value)) {
                        this.workingSettings[setting] = e.target.value;
                        e.target.classList.remove('error');
                    } else {
                        e.target.classList.add('error');
                        return; // Don't save invalid time
                    }
                } else {
                    this.workingSettings[setting] = e.target.value;
                }
                
                // Handle special cases for Notion integration
                if (setting === 'notionApiKey') {
                    this.handleNotionApiKeyChange();
                }
            });
        });
        
        // Action buttons
        const resetBtn = this.element.querySelector('#resetSettingsBtn');
        const saveBtn = this.element.querySelector('#saveSettingsBtn');
        
        resetBtn.addEventListener('click', () => this.resetSettings());
        saveBtn.addEventListener('click', () => this.saveSettings());

        // Notion connection test button
        const testConnectionBtn = this.element.querySelector('#testNotionConnectionBtn');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => this.testNotionConnection());
        }

    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('workwith-settings');
            return saved ? JSON.parse(saved) : this.getDefaultSettings();
        } catch (error) {
            console.error('Failed to load settings:', error);
            return this.getDefaultSettings();
        }
    }

    getDefaultSettings() {
        return {
            showPomodoroTimer: true,
            pomodoroWorkTime: '25:00',
            pomodoroRestTime: '5:00',
            notionSyncEnabled: false,
            notionApiKey: '',
            notionConnectionTested: false
        };
    }

    saveSettings() {
        try {
            // Copy working settings to saved settings
            this.savedSettings = JSON.parse(JSON.stringify(this.workingSettings));
            localStorage.setItem('workwith-settings', JSON.stringify(this.savedSettings));
            this.showSuccessMessage('Settings saved successfully!');
            this.applySettings();
            // Notify app of settings changes
            document.dispatchEvent(new CustomEvent('settingsChanged', { detail: this.savedSettings }));
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showErrorMessage('Failed to save settings');
        }
    }

    applySettings() {
        // No visual theme settings to apply currently.
    }





    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default values?')) {
            this.workingSettings = this.getDefaultSettings();
            this.savedSettings = JSON.parse(JSON.stringify(this.workingSettings));
            this.updateUI();
            this.showSuccessMessage('Settings reset to defaults!');
        }
    }

    updateUI() {
        // Update toggle switches
        Object.keys(this.workingSettings).forEach(key => {
            const toggle = this.element.querySelector(`[data-setting="${key}"]`);
            if (toggle && toggle.classList.contains('toggle-switch')) {
                toggle.classList.toggle('active', this.workingSettings[key]);
            }
        });
        
        // Update selects
        Object.keys(this.workingSettings).forEach(key => {
            const select = this.element.querySelector(`[data-setting="${key}"]`);
            if (select && select.tagName === 'SELECT') {
                select.value = this.workingSettings[key];
            }
        });

        // Update input fields
        Object.keys(this.workingSettings).forEach(key => {
            const input = this.element.querySelector(`[data-setting="${key}"]`);
            if (input && input.tagName === 'INPUT') {
                input.value = this.workingSettings[key] || '';
            }
        });

        // Update Notion integration visibility
        this.updateNotionIntegrationVisibility();
        
        // Update Pomodoro time options visibility
        this.updatePomodoroTimeVisibility();
        
        // Update save button visibility
        this.updateSaveButtonVisibility();
        
        // Update connection status dot
        this.updateConnectionStatusDot(this.workingSettings.notionConnectionTested);
    }

    handleNotionSyncToggle() {
        // Show/hide Notion integration options based on toggle state
        // 根據切換狀態顯示/隱藏 Notion 整合選項
        this.updateNotionIntegrationVisibility();
        
        // Note: We do NOT clear the token when disabling sync to preserve user input
        // 注意：我們在禁用同步時不清除令牌以保留用戶輸入
        
        // Update save button visibility
        // 更新保存按鈕可見性
        this.updateSaveButtonVisibility();
    }

    handlePomodoroTimerToggle() {
        // Show/hide Pomodoro time options based on toggle state
        this.updatePomodoroTimeVisibility();
    }

    validateTimeFormat(timeString) {
        // Validate MM:SS format
        const timeRegex = /^([0-5]?\d):([0-5]\d)$/;
        return timeRegex.test(timeString);
    }

    updatePomodoroTimeVisibility() {
        // Show/hide Pomodoro time options based on current settings
        const timeOptions = this.element.querySelectorAll('.pomodoro-time-options');
        
        timeOptions.forEach(option => {
            option.style.display = this.workingSettings.showPomodoroTimer ? 'flex' : 'none';
        });
    }

    handleNotionApiKeyChange() {
        // Update database selection visibility when API key changes
        // 當 API 密鑰更改時更新資料庫選擇可見性
        this.updateNotionIntegrationVisibility();
        
        // Reset connection test status when API key changes
        // 當 API 密鑰更改時重置連接測試狀態
        this.workingSettings.notionConnectionTested = false;
        
        // Update save button visibility and connection status dot
        // 更新保存按鈕可見性和連接狀態點
        this.updateSaveButtonVisibility();
        this.updateConnectionStatusDot(false);
    }

    updateNotionIntegrationVisibility() {
        // Show/hide Notion integration options based on current settings
        // 根據當前設置顯示/隱藏 Notion 整合選項
        
        const tokenOption = this.element.querySelector('.notion-token-option');
        
        if (tokenOption) {
            tokenOption.style.display = this.workingSettings.notionSyncEnabled ? 'flex' : 'none';
        }

        // Update test connection button state
        // 更新測試連接按鈕狀態
        const testBtn = this.element.querySelector('#testNotionConnectionBtn');
        if (testBtn) {
            testBtn.disabled = !this.workingSettings.notionApiKey;
            // Ensure status dot is always correct
            testBtn.innerHTML = `<span class="connection-status-dot ${this.workingSettings.notionConnectionTested ? 'connected' : ''}"></span>Test Connection`;
        }
    }

    updateConnectionStatusDot(isConnected) {
        // Update the connection status dot on the test button
        // 更新測試按鈕上的連接狀態點
        
        const testBtn = this.element.querySelector('#testNotionConnectionBtn');
        if (!testBtn) {
            console.log('🔧 Warning: Test connection button not found');
            return;
        }
        
        // Update the button's innerHTML to ensure status dot is correct
        testBtn.innerHTML = `<span class="connection-status-dot ${isConnected ? 'connected' : ''}"></span>Test Connection`;
        
        console.log('🔧 updateConnectionStatusDot called with isConnected:', isConnected);
        console.log('🔧 Button innerHTML updated');
    }

    updateSaveButtonVisibility() {
        // Show/hide save button based on Notion sync status and connection test
        // 根據 Notion 同步狀態和連接測試顯示/隱藏保存按鈕
        
        const saveBtn = this.element.querySelector('#saveSettingsBtn');
        if (saveBtn) {
            // Hide save button if Notion sync is enabled but connection hasn't been tested
            // 如果啟用了 Notion 同步但尚未測試連接，則隱藏保存按鈕
            if (this.workingSettings.notionSyncEnabled && !this.workingSettings.notionConnectionTested) {
                saveBtn.style.display = 'none';
                console.log('🔧 Hiding save button - Notion sync enabled but connection not tested');
            } else {
                saveBtn.style.display = 'block';
                console.log('🔧 Showing save button - Notion sync disabled or connection tested');
            }
        }
    }

    async testNotionConnection() {
        // Test the Notion API connection using the provided secret
        // 使用提供的密鑰測試 Notion API 連接
        
        const testBtn = this.element.querySelector('#testNotionConnectionBtn');
        
        try {
            // Show loading state on the button
            // 在按鈕上顯示加載狀態
            testBtn.textContent = 'Testing...';
            testBtn.disabled = true;
            
            // Call the main process to test the connection
            // 調用主進程來測試連接
            const result = await window.electronAPI.notionAPI.testNotionConnection(this.workingSettings.notionApiKey);
            
            if (result.success) {
                // Connection successful - show success message and enable save button
                // 連接成功 - 顯示成功消息並啟用保存按鈕
                console.log('🔧 Connection test successful, setting notionConnectionTested = true');
                this.workingSettings.notionConnectionTested = true;
                this.updateSaveButtonVisibility();
                this.updateConnectionStatusDot(true);
                this.showSuccessMessage(`Connection successful! Found ${result.databaseCount} accessible database(s).`);
            } else {
                // Connection failed - show error message and keep save button hidden
                // 連接失敗 - 顯示錯誤消息並保持保存按鈕隱藏
                console.log('🔧 Connection test failed, setting notionConnectionTested = false');
                this.workingSettings.notionConnectionTested = false;
                this.updateSaveButtonVisibility();
                this.updateConnectionStatusDot(false);
                this.showErrorMessage(`Connection failed: ${result.error}`);
            }
            
        } catch (error) {
            // Handle unexpected errors
            // 處理意外錯誤
            console.error('Notion connection test failed:', error);
            this.workingSettings.notionConnectionTested = false;
            this.updateSaveButtonVisibility();
            this.updateConnectionStatusDot(false);
            this.showErrorMessage('Connection test failed. Please try again.');
            
        } finally {
            // Reset button state regardless of success or failure
            // 無論成功或失敗都重置按鈕狀態
            testBtn.innerHTML = `<span class="connection-status-dot ${this.workingSettings.notionConnectionTested ? 'connected' : ''}"></span>Test Connection`;
            testBtn.disabled = false;
        }
    }


    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `settings-message ${type}`;
        messageDiv.textContent = message;
        
        // Add styles for the message
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 3000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            background: ${type === 'success' ? '#10B981' : '#EF4444'};
        `;
        
        document.body.appendChild(messageDiv);
        
        // Animate in
        setTimeout(() => {
            messageDiv.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            messageDiv.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }

    show() {
        if (!this.isVisible) {
            // Refresh working settings from saved settings when showing modal
            // 顯示模態框時從已保存的設置刷新工作設置
            this.workingSettings = JSON.parse(JSON.stringify(this.savedSettings));
            this.updateUI();
            
            if (!this.element.parentNode) {
                document.body.appendChild(this.element);
            }
            document.body.style.overflow = 'hidden';
            
            requestAnimationFrame(() => {
                this.element.classList.add('show');
            });
            
            this.isVisible = true;
            console.log('✅ Settings modal shown');
        }
    }

    hide() {
        if (this.isVisible) {
            this.element.classList.remove('show');
            
            // Restore working settings from saved settings when closing without saving
            // 在未保存的情況下關閉時，從已保存的設置恢復工作設置
            this.workingSettings = JSON.parse(JSON.stringify(this.savedSettings));
            
            setTimeout(() => {
                if (this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                }
                document.body.style.overflow = '';
            }, 300);
            
            this.isVisible = false;
            console.log('✅ Settings modal hidden');
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
