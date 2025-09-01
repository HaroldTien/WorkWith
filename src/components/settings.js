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
                    <!-- Appearance Section -->
                    <div class="settings-section">
                        <h3 class="settings-section-title">Appearance</h3>
                        
                        <div class="settings-option">
                            <div>
                                <div class="settings-option-label">Dark Theme</div>
                                <div class="settings-option-description">Use dark theme for the application</div>
                            </div>
                            <div class="settings-option-control">
                                <div class="toggle-switch ${this.settings.darkTheme ? 'active' : ''}" data-setting="darkTheme"></div>
                            </div>
                        </div>
                        

                    </div>
                    
                    <!-- Task Management Section -->
                    <div class="settings-section">
                        <h3 class="settings-section-title">Task Management</h3>
                        
                        <div class="settings-option">
                            <div>
                                <div class="settings-option-label">Auto-save</div>
                                <div class="settings-option-description">Automatically save changes to tasks</div>
                            </div>
                            <div class="settings-option-control">
                                <div class="toggle-switch ${this.settings.autoSave ? 'active' : ''}" data-setting="autoSave"></div>
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
        
        // Action buttons
        const resetBtn = this.element.querySelector('#resetSettingsBtn');
        const saveBtn = this.element.querySelector('#saveSettingsBtn');
        
        resetBtn.addEventListener('click', () => this.resetSettings());
        saveBtn.addEventListener('click', () => this.saveSettings());
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
            darkTheme: true,
            autoSave: true
        };
    }

    saveSettings() {
        try {
            localStorage.setItem('workwith-settings', JSON.stringify(this.settings));
            this.showSuccessMessage('Settings saved successfully!');
            this.applySettings();
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showErrorMessage('Failed to save settings');
        }
    }

    applySettings() {
        // Apply dark theme
        if (this.settings.darkTheme) {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
        } else {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
        }
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
