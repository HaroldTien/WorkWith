// Settings Modal Component
export class SettingsModal {
    constructor() {
        this.isVisible = false;
        this.settings = this.loadSettings();
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
                                <div class="toggle-switch ${this.settings.showPomodoroTimer ? 'active' : ''}" data-setting="showPomodoroTimer"></div>
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
                                <div class="toggle-switch ${this.settings.notionSyncEnabled ? 'active' : ''}" data-setting="notionSyncEnabled"></div>
                            </div>
                        </div>

                        <div class="settings-option notion-token-option" style="display: ${this.settings.notionSyncEnabled ? 'flex' : 'none'}">
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
                                    value="${this.settings.notionApiKey || ''}"
                                />
                                <button class="settings-btn secondary" id="testNotionConnectionBtn" ${!this.settings.notionApiKey ? 'disabled' : ''}>
                                    <span class="connection-status-dot ${this.settings.notionConnectionTested ? 'connected' : ''}"></span>
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
                this.settings[setting] = !this.settings[setting];
                toggle.classList.toggle('active');
                
                // Handle special cases for Notion integration
                if (setting === 'notionSyncEnabled') {
                    this.handleNotionSyncToggle();
                }
            });
        });
        
        // Select dropdowns
        const selects = this.element.querySelectorAll('.settings-select');
        selects.forEach(select => {
            select.addEventListener('change', (e) => {
                const setting = e.target.dataset.setting;
                this.settings[setting] = e.target.value;
            });
        });

        // Input fields
        const inputs = this.element.querySelectorAll('.settings-input');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const setting = e.target.dataset.setting;
                this.settings[setting] = e.target.value;
                
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
            notionSyncEnabled: false,
            notionApiKey: '',
            notionConnectionTested: false
        };
    }

    saveSettings() {
        try {
            localStorage.setItem('workwith-settings', JSON.stringify(this.settings));
            this.showSuccessMessage('Settings saved successfully!');
            this.applySettings();
            // Notify app of settings changes
            document.dispatchEvent(new CustomEvent('settingsChanged', { detail: this.settings }));
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
            this.settings = this.getDefaultSettings();
            this.updateUI();
            this.showSuccessMessage('Settings reset to defaults!');
        }
    }

    updateUI() {
        // Update toggle switches
        Object.keys(this.settings).forEach(key => {
            const toggle = this.element.querySelector(`[data-setting="${key}"]`);
            if (toggle && toggle.classList.contains('toggle-switch')) {
                toggle.classList.toggle('active', this.settings[key]);
            }
        });
        
        // Update selects
        Object.keys(this.settings).forEach(key => {
            const select = this.element.querySelector(`[data-setting="${key}"]`);
            if (select && select.tagName === 'SELECT') {
                select.value = this.settings[key];
            }
        });

        // Update input fields
        Object.keys(this.settings).forEach(key => {
            const input = this.element.querySelector(`[data-setting="${key}"]`);
            if (input && input.tagName === 'INPUT') {
                input.value = this.settings[key] || '';
            }
        });

        // Update Notion integration visibility
        this.updateNotionIntegrationVisibility();
        
        // Update save button visibility
        this.updateSaveButtonVisibility();
    }

    handleNotionSyncToggle() {
        // Show/hide Notion integration options based on toggle state
        // 根據切換狀態顯示/隱藏 Notion 整合選項
        this.updateNotionIntegrationVisibility();
        
        // If disabling sync, clear related settings
        // 如果禁用同步，清除相關設置
        if (!this.settings.notionSyncEnabled) {
            this.settings.notionApiKey = '';
            this.settings.notionConnectionTested = false;
            this.updateUI();
            this.updateConnectionStatusDot(false);
        }
        
        // Update save button visibility
        // 更新保存按鈕可見性
        this.updateSaveButtonVisibility();
    }

    handleNotionApiKeyChange() {
        // Update database selection visibility when API key changes
        // 當 API 密鑰更改時更新資料庫選擇可見性
        this.updateNotionIntegrationVisibility();
        
        // Reset connection test status when API key changes
        // 當 API 密鑰更改時重置連接測試狀態
        this.settings.notionConnectionTested = false;
        
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
            tokenOption.style.display = this.settings.notionSyncEnabled ? 'flex' : 'none';
        }

        // Update test connection button state
        // 更新測試連接按鈕狀態
        const testBtn = this.element.querySelector('#testNotionConnectionBtn');
        if (testBtn) {
            testBtn.disabled = !this.settings.notionApiKey;
        }
    }

    updateConnectionStatusDot(isConnected) {
        // Update the connection status dot on the test button
        // 更新測試按鈕上的連接狀態點
        
        const statusDot = this.element.querySelector('.connection-status-dot');
        console.log('🔧 updateConnectionStatusDot called with isConnected:', isConnected);
        console.log('🔧 Found status dot element:', statusDot);
        
        if (statusDot) {
            if (isConnected) {
                statusDot.classList.add('connected');
                console.log('🔧 Connection status dot set to connected (green)');
                console.log('🔧 Status dot classes after update:', statusDot.className);
            } else {
                statusDot.classList.remove('connected');
                console.log('🔧 Connection status dot set to disconnected (gray)');
                console.log('🔧 Status dot classes after update:', statusDot.className);
            }
        } else {
            console.log('🔧 Warning: Connection status dot element not found');
        }
    }

    updateSaveButtonVisibility() {
        // Show/hide save button based on Notion sync status and connection test
        // 根據 Notion 同步狀態和連接測試顯示/隱藏保存按鈕
        
        const saveBtn = this.element.querySelector('#saveSettingsBtn');
        if (saveBtn) {
            // Hide save button if Notion sync is enabled but connection hasn't been tested
            // 如果啟用了 Notion 同步但尚未測試連接，則隱藏保存按鈕
            if (this.settings.notionSyncEnabled && !this.settings.notionConnectionTested) {
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
            const result = await window.electronAPI.notionAPI.testNotionConnection(this.settings.notionApiKey);
            
            if (result.success) {
                // Connection successful - show success message and enable save button
                // 連接成功 - 顯示成功消息並啟用保存按鈕
                console.log('🔧 Connection test successful, setting notionConnectionTested = true');
                this.settings.notionConnectionTested = true;
                this.updateSaveButtonVisibility();
                // Add small delay to ensure DOM is updated
                setTimeout(() => {
                    this.updateConnectionStatusDot(true);
                }, 100);
                this.showSuccessMessage(`Connection successful! Found ${result.databaseCount} accessible database(s).`);
            } else {
                // Connection failed - show error message and keep save button hidden
                // 連接失敗 - 顯示錯誤消息並保持保存按鈕隱藏
                console.log('🔧 Connection test failed, setting notionConnectionTested = false');
                this.settings.notionConnectionTested = false;
                this.updateSaveButtonVisibility();
                setTimeout(() => {
                    this.updateConnectionStatusDot(false);
                }, 100);
                this.showErrorMessage(`Connection failed: ${result.error}`);
            }
            
        } catch (error) {
            // Handle unexpected errors
            // 處理意外錯誤
            console.error('Notion connection test failed:', error);
            this.settings.notionConnectionTested = false;
            this.updateSaveButtonVisibility();
            setTimeout(() => {
                this.updateConnectionStatusDot(false);
            }, 100);
            this.showErrorMessage('Connection test failed. Please try again.');
            
        } finally {
            // Reset button state regardless of success or failure
            // 無論成功或失敗都重置按鈕狀態
            testBtn.textContent = 'Test Connection';
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
