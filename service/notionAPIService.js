/**
 * Notion API Service
 * Handles all communication with Notion's API for task board synchronization
 * 處理與 Notion API 的所有通信，用於任務板同步
 */

class NotionAPIService {
    constructor() {
        // Initialize the service with empty configuration
        // 使用空配置初始化服務
        this.apiKey = null;
        this.baseURL = 'https://api.notion.com/v1';
        this.currentDatabaseId = null;
        this.syncQueue = [];
        this.isSyncing = false;
        
        // Rate limiting configuration (Notion allows 3 requests per second)
        // 速率限制配置（Notion 允許每秒 3 個請求）
        this.requestDelay = 350; // 350ms between requests for safety
        this.lastRequestTime = 0;
    }

    /**
     * Set the Notion integration token
     * 設置 Notion 整合令牌
     * @param {string} token - The Notion integration token
     */
    setApiKey(token) {
        // Store the API key for authentication
        // 存儲用於身份驗證的 API 密鑰
        this.apiKey = token;
        
        // Reset current database selection when API key changes
        // 當 API 密鑰更改時重置當前資料庫選擇
        this.currentDatabaseId = null;
    }

    /**
     * Make authenticated request to Notion API with rate limiting
     * 向 Notion API 發送帶有速率限制的身份驗證請求
     * @param {string} endpoint - API endpoint path
     * @param {string} method - HTTP method (GET, POST, PATCH, etc.)
     * @param {Object} data - Request body data (optional)
     * @returns {Promise<Object>} - API response
     */
    async makeRequest(endpoint, method = 'GET', data = null) {
        // Check if API key is configured
        // 檢查是否已配置 API 密鑰
        if (!this.apiKey) {
            throw new Error('Notion API key not configured. Please set your integration token.');
        }

        // Rate limiting: wait if needed to respect Notion's 3 requests/second limit
        // 速率限制：如果需要，等待以遵守 Notion 的每秒 3 個請求限制
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.requestDelay) {
            // Calculate how long to wait before making the request
            // 計算在發送請求前需要等待多長時間
            const waitTime = this.requestDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        // Prepare request options
        // 準備請求選項
        const requestOptions = {
            method: method,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28' // Use stable API version
            }
        };

        // Add request body if data is provided
        // 如果提供了數據，則添加請求體
        if (data) {
            requestOptions.body = JSON.stringify(data);
        }

        try {
            // Make the HTTP request to Notion API
            // 向 Notion API 發送 HTTP 請求
            const response = await fetch(`${this.baseURL}${endpoint}`, requestOptions);
            
            // Update last request time for rate limiting
            // 更新最後請求時間以進行速率限制
            this.lastRequestTime = Date.now();

            // Check if response is successful
            // 檢查響應是否成功
            if (!response.ok) {
                // Parse error response for detailed error information
                // 解析錯誤響應以獲取詳細的錯誤信息
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Notion API Error: ${response.status} - ${errorData.message || response.statusText}`);
            }

            // Parse and return successful response
            // 解析並返回成功的響應
            return await response.json();
        } catch (error) {
            // Handle network errors or API errors
            // 處理網絡錯誤或 API 錯誤
            console.error('Notion API request failed:', error);
            throw error;
        }
    }

    /**
     * Search for databases accessible by the integration
     * 搜尋整合可訪問的資料庫
     * @returns {Promise<Array>} - Array of database objects
     */
    async searchDatabases() {
        try {
            // Search for databases using Notion's search API
            // 使用 Notion 的搜尋 API 搜尋資料庫
            const response = await this.makeRequest('/search', 'POST', {
                filter: {
                    property: 'object',
                    value: 'database'
                }
            });

            // Extract and format database information
            // 提取並格式化資料庫信息
            const databases = response.results.map(db => ({
                id: db.id,
                title: db.title[0]?.plain_text || 'Untitled Database',
                description: db.description?.[0]?.plain_text || '',
                url: db.url,
                created_time: db.created_time,
                last_edited_time: db.last_edited_time
            }));

            return databases;
        } catch (error) {
            console.error('Failed to search databases:', error);
            throw new Error(`Failed to search Notion databases: ${error.message}`);
        }
    }

    /**
     * Get database schema (properties) to validate required columns
     * 獲取資料庫架構（屬性）以驗證必要欄位
     * @param {string} databaseId - The database ID
     * @returns {Promise<Object>} - Database schema information
     */
    async getDatabaseSchema(databaseId) {
        try {
            // Fetch database information including properties
            // 獲取包括屬性在內的資料庫信息
            const response = await this.makeRequest(`/databases/${databaseId}`);
            
            // Extract properties from the database
            // 從資料庫中提取屬性
            const properties = response.properties;
            
            // Validate required properties exist
            // 驗證必要屬性是否存在
            const requiredProperties = ['Task Title', 'Task ID', 'Status', 'Est Time', 'Time Spent'];
            const missingProperties = requiredProperties.filter(prop => !properties[prop]);
            
            // Return formatted schema information (don't throw error, just report missing properties)
            // 返回格式化的架構信息（不拋出錯誤，只報告缺失的屬性）
            return {
                id: response.id,
                title: response.title[0]?.plain_text || 'Untitled Database',
                properties: properties,
                hasRequiredProperties: missingProperties.length === 0,
                missingProperties: missingProperties
            };
        } catch (error) {
            console.error('Failed to get database schema:', error);
            throw new Error(`Failed to get database schema: ${error.message}`);
        }
    }

    /**
     * Create missing required columns in the database
     * 在資料庫中創建缺失的必要欄位
     * @param {string} databaseId - The database ID
     * @param {Array} missingProperties - Array of missing property names
     * @returns {Promise<Object>} - Update result information
     */
    async createMissingColumns(databaseId, missingProperties) {
        try {
            // Define the schema for each required property
            // 為每個必要屬性定義架構
            const propertySchemas = {
                'Task Title': {
                    title: {} // Task Title should be the title property (usually already exists)
                    // 任務標題應該是標題屬性（通常已經存在）
                },
                'Task ID': {
                    rich_text: {} // Text property for unique task identifier
                    // 用於唯一任務標識符的文本屬性
                },
                'Status': {
                    select: {
                        options: [
                            { name: 'pending', color: 'yellow' },
                            { name: 'in-progress', color: 'blue' },
                            { name: 'completed', color: 'green' }
                        ]
                    }
                },
                'Est Time': {
                    number: {
                        format: 'number' // Estimated time in minutes
                        // 預估時間（分鐘）
                    }
                },
                'Time Spent': {
                    number: {
                        format: 'number' // Time spent in minutes
                        // 已用時間（分鐘）
                    }
                }
            };

            // Prepare the update data with new properties
            // 準備包含新屬性的更新數據
            const updateData = {
                properties: {}
            };

            // Add each missing property to the update data
            // 將每個缺失的屬性添加到更新數據中
            missingProperties.forEach(propName => {
                if (propertySchemas[propName]) {
                    updateData.properties[propName] = propertySchemas[propName];
                }
            });

            // Update the database with new properties
            // 使用新屬性更新資料庫
            const response = await this.makeRequest(`/databases/${databaseId}`, 'PATCH', updateData);
            
            return {
                success: true,
                createdProperties: missingProperties,
                updatedDatabase: response
            };
        } catch (error) {
            console.error('Failed to create missing columns:', error);
            throw new Error(`Failed to create missing columns: ${error.message}`);
        }
    }

    /**
     * Set the current database for synchronization
     * 設置當前資料庫進行同步
     * @param {string} databaseId - The database ID to bind to
     * @param {boolean} autoCreateColumns - Whether to automatically create missing columns (default: true)
     * @returns {Promise<Object>} - Database schema information
     */
    async selectDatabase(databaseId, autoCreateColumns = true) {
        try {
            // Validate the database exists and check required properties
            // 驗證資料庫是否存在並檢查必要屬性
            const schema = await this.getDatabaseSchema(databaseId);
            
            // If missing properties exist and auto-creation is enabled, create them
            // 如果存在缺失屬性且啟用了自動創建，則創建它們
            if (schema.missingProperties.length > 0 && autoCreateColumns) {
                console.log(`Creating missing columns: ${schema.missingProperties.join(', ')}`);
                // 創建缺失的欄位：${schema.missingProperties.join(', ')}
                
                // Create the missing columns
                // 創建缺失的欄位
                const createResult = await this.createMissingColumns(databaseId, schema.missingProperties);
                
                // Refresh the schema after creating columns
                // 創建欄位後刷新架構
                const updatedSchema = await this.getDatabaseSchema(databaseId);
                
                // Store the selected database ID
                // 存儲選定的資料庫 ID
                this.currentDatabaseId = databaseId;
                
                return {
                    ...updatedSchema,
                    createdColumns: createResult.createdProperties,
                    autoCreated: true
                };
            } else if (schema.missingProperties.length > 0) {
                // Return schema with missing properties info (don't auto-create)
                // 返回包含缺失屬性信息的架構（不自動創建）
                return {
                    ...schema,
                    autoCreated: false,
                    needsManualSetup: true
                };
            }
            
            // Store the selected database ID
            // 存儲選定的資料庫 ID
            this.currentDatabaseId = databaseId;
            
            return {
                ...schema,
                autoCreated: false,
                needsManualSetup: false
            };
        } catch (error) {
            console.error('Failed to select database:', error);
            throw new Error(`Failed to select database: ${error.message}`);
        }
    }

    /**
     * Convert app task to Notion page format
     * 將應用任務轉換為 Notion 頁面格式
     * @param {Object} task - Task object from the app
     * @returns {Object} - Notion page format
     */
    convertTaskToNotionPage(task) {
        // Build the page properties object for Notion
        // 為 Notion 構建頁面屬性對象
        const properties = {
            'Task Title': {
                title: [
                    {
                        text: {
                            content: task.title || 'Untitled Task'
                        }
                    }
                ]
            },
            'Task ID': {
                rich_text: [
                    {
                        text: {
                            content: task.id || ''
                        }
                    }
                ]
            },
            'Status': {
                select: {
                    name: task.status || 'pending'
                }
            },
            'Est Time': {
                number: task.estimatedTime || 0
            },
            'Time Spent': {
                number: task.timeSpent || 0
            }
        };

        // Add subtasks as children if they exist
        // 如果存在子任務，則將其添加為子項
        const children = [];
        if (task.subtasks && task.subtasks.length > 0) {
            // Create a toggle block for subtasks
            // 為子任務創建切換塊
            children.push({
                object: 'block',
                type: 'toggle',
                toggle: {
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: `Subtasks (${task.subtasks.length})`
                            }
                        }
                    ],
                    children: task.subtasks.map(subtask => ({
                        object: 'block',
                        type: 'to_do',
                        to_do: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: subtask.text || ''
                                    }
                                }
                            ],
                            checked: subtask.completed || false
                        }
                    }))
                }
            });
        }

        return {
            parent: {
                database_id: this.currentDatabaseId
            },
            properties: properties,
            children: children
        };
    }

    /**
     * Convert Notion page to app task format
     * 將 Notion 頁面轉換為應用任務格式
     * @param {Object} notionPage - Notion page object
     * @returns {Object} - Task object for the app
     */
    convertNotionPageToTask(notionPage) {
        // Extract properties from Notion page
        // 從 Notion 頁面提取屬性
        const properties = notionPage.properties;
        
        // Build task object with extracted data
        // 使用提取的數據構建任務對象
        const task = {
            id: properties['Task ID']?.rich_text?.[0]?.text?.content || '',
            title: properties['Task Title']?.title?.[0]?.text?.content || 'Untitled Task',
            status: properties['Status']?.select?.name || 'pending',
            estimatedTime: properties['Est Time']?.number || 0,
            timeSpent: properties['Time Spent']?.number || 0,
            notionPageId: notionPage.id,
            lastModified: notionPage.last_edited_time
        };

        // Extract subtasks from page children
        // 從頁面子項中提取子任務
        if (notionPage.children) {
            const subtasks = [];
            notionPage.children.forEach(child => {
                if (child.type === 'toggle' && child.toggle?.children) {
                    child.toggle.children.forEach(subtaskChild => {
                        if (subtaskChild.type === 'to_do') {
                            subtasks.push({
                                id: subtaskChild.id,
                                text: subtaskChild.to_do?.rich_text?.[0]?.text?.content || '',
                                completed: subtaskChild.to_do?.checked || false
                            });
                        }
                    });
                }
            });
            task.subtasks = subtasks;
        }

        return task;
    }

    /**
     * Sync task board to Notion database
     * 將任務板同步到 Notion 資料庫
     * @param {Array} tasks - Array of task objects from the app
     * @returns {Promise<Object>} - Sync result information
     */
    async syncTaskBoardToNotion(tasks) {
        if (!this.currentDatabaseId) {
            throw new Error('No database selected. Please select a database first.');
        }

        try {
            // Get existing pages from Notion to check for conflicts
            // 從 Notion 獲取現有頁面以檢查衝突
            const existingPages = await this.getExistingPages();
            
            const results = {
                created: [],
                updated: [],
                errors: []
            };

            // Process each task
            // 處理每個任務
            for (const task of tasks) {
                try {
                    // Check if task already exists in Notion
                    // 檢查任務是否已存在於 Notion 中
                    const existingPage = existingPages.find(page => 
                        page.properties['Task ID']?.rich_text?.[0]?.text?.content === task.id
                    );

                    if (existingPage) {
                        // Update existing page
                        // 更新現有頁面
                        const updatedPage = await this.updateNotionPage(existingPage.id, task);
                        results.updated.push(updatedPage);
                    } else {
                        // Create new page
                        // 創建新頁面
                        const newPage = await this.createNotionPage(task);
                        results.created.push(newPage);
                    }
                } catch (error) {
                    // Record error but continue processing other tasks
                    // 記錄錯誤但繼續處理其他任務
                    results.errors.push({
                        taskId: task.id,
                        error: error.message
                    });
                }
            }

            return results;
        } catch (error) {
            console.error('Failed to sync task board to Notion:', error);
            throw new Error(`Failed to sync task board to Notion: ${error.message}`);
        }
    }

    /**
     * Sync Notion database to task board
     * 將 Notion 資料庫同步到任務板
     * @returns {Promise<Array>} - Array of task objects
     */
    async syncNotionToTaskBoard() {
        if (!this.currentDatabaseId) {
            throw new Error('No database selected. Please select a database first.');
        }

        try {
            // Get all pages from the database
            // 從資料庫獲取所有頁面
            const pages = await this.getExistingPages();
            
            // Convert Notion pages to app task format
            // 將 Notion 頁面轉換為應用任務格式
            const tasks = pages.map(page => this.convertNotionPageToTask(page));
            
            return tasks;
        } catch (error) {
            console.error('Failed to sync Notion to task board:', error);
            throw new Error(`Failed to sync Notion to task board: ${error.message}`);
        }
    }

    /**
     * Get existing pages from the current database
     * 從當前資料庫獲取現有頁面
     * @returns {Promise<Array>} - Array of Notion page objects
     */
    async getExistingPages() {
        try {
            // Query the database for all pages
            // 查詢資料庫中的所有頁面
            const response = await this.makeRequest(`/databases/${this.currentDatabaseId}/query`, 'POST', {
                sorts: [
                    {
                        property: 'Task Title',
                        direction: 'ascending'
                    }
                ]
            });

            // Return the results array
            // 返回結果數組
            return response.results;
        } catch (error) {
            console.error('Failed to get existing pages:', error);
            throw new Error(`Failed to get existing pages: ${error.message}`);
        }
    }

    /**
     * Create a new page in Notion database
     * 在 Notion 資料庫中創建新頁面
     * @param {Object} task - Task object from the app
     * @returns {Promise<Object>} - Created Notion page
     */
    async createNotionPage(task) {
        try {
            // Convert task to Notion page format
            // 將任務轉換為 Notion 頁面格式
            const pageData = this.convertTaskToNotionPage(task);
            
            // Create the page via API
            // 通過 API 創建頁面
            const response = await this.makeRequest('/pages', 'POST', pageData);
            
            return response;
        } catch (error) {
            console.error('Failed to create Notion page:', error);
            throw new Error(`Failed to create Notion page: ${error.message}`);
        }
    }

    /**
     * Update an existing page in Notion database
     * 更新 Notion 資料庫中的現有頁面
     * @param {string} pageId - Notion page ID
     * @param {Object} task - Updated task object from the app
     * @returns {Promise<Object>} - Updated Notion page
     */
    async updateNotionPage(pageId, task) {
        try {
            // Convert task to Notion page update format
            // 將任務轉換為 Notion 頁面更新格式
            const updateData = {
                properties: {
                    'Task Title': {
                        title: [
                            {
                                text: {
                                    content: task.title || 'Untitled Task'
                                }
                            }
                        ]
                    },
                    'Task ID': {
                        rich_text: [
                            {
                                text: {
                                    content: task.id || ''
                                }
                            }
                        ]
                    },
                    'Status': {
                        select: {
                            name: task.status || 'pending'
                        }
                    },
                    'Est Time': {
                        number: task.estimatedTime || 0
                    },
                    'Time Spent': {
                        number: task.timeSpent || 0
                    }
                }
            };

            // Update the page via API
            // 通過 API 更新頁面
            const response = await this.makeRequest(`/pages/${pageId}`, 'PATCH', updateData);
            
            return response;
        } catch (error) {
            console.error('Failed to update Notion page:', error);
            throw new Error(`Failed to update Notion page: ${error.message}`);
        }
    }

    /**
     * Delete a page from Notion database
     * 從 Notion 資料庫中刪除頁面
     * @param {string} pageId - Notion page ID
     * @returns {Promise<Object>} - Deletion result
     */
    async deleteNotionPage(pageId) {
        try {
            // Archive the page (Notion doesn't allow permanent deletion via API)
            // 歸檔頁面（Notion 不允許通過 API 永久刪除）
            const response = await this.makeRequest(`/pages/${pageId}`, 'PATCH', {
                archived: true
            });
            
            return response;
        } catch (error) {
            console.error('Failed to delete Notion page:', error);
            throw new Error(`Failed to delete Notion page: ${error.message}`);
        }
    }

    /**
     * Get current database information
     * 獲取當前資料庫信息
     * @returns {Object|null} - Current database info or null
     */
    getCurrentDatabase() {
        return this.currentDatabaseId ? {
            id: this.currentDatabaseId,
            isConfigured: true
        } : null;
    }

    /**
     * Check if service is properly configured
     * 檢查服務是否正確配置
     * @returns {boolean} - True if service is ready to use
     */
    isConfigured() {
        return !!(this.apiKey && this.currentDatabaseId);
    }

    /**
     * Get information about required database columns
     * 獲取有關必要資料庫欄位的信息
     * @returns {Object} - Information about required columns
     */
    getRequiredColumnsInfo() {
        // Define the schema information for each required property
        // 為每個必要屬性定義架構信息
        const columnInfo = {
            'Task Title': {
                type: 'Title',
                description: 'Main task name (usually already exists in databases)',
                // 主要任務名稱（資料庫中通常已存在）
                required: true,
                example: 'Complete project documentation'
            },
            'Task ID': {
                type: 'Text',
                description: 'Unique identifier for the task in your app',
                // 應用中任務的唯一標識符
                required: true,
                example: 'task_12345'
            },
            'Status': {
                type: 'Select',
                description: 'Current status of the task',
                // 任務的當前狀態
                required: true,
                options: ['pending', 'in-progress', 'completed'],
                example: 'in-progress'
            },
            'Est Time': {
                type: 'Number',
                description: 'Estimated time to complete task (in minutes)',
                // 完成任務的預估時間（分鐘）
                required: true,
                example: 120
            },
            'Time Spent': {
                type: 'Number',
                description: 'Actual time spent on task (in minutes)',
                // 任務實際花費的時間（分鐘）
                required: true,
                example: 85
            }
        };

        return {
            columns: columnInfo,
            totalRequired: Object.keys(columnInfo).length,
            note: 'If these columns don\'t exist, they will be automatically created when you select a database.',
            // 如果這些欄位不存在，當您選擇資料庫時將自動創建它們。
            noteZh: '如果這些欄位不存在，當您選擇資料庫時將自動創建它們。'
        };
    }

    /**
     * Reset service configuration
     * 重置服務配置
     */
    reset() {
        // Clear all configuration and state
        // 清除所有配置和狀態
        this.apiKey = null;
        this.currentDatabaseId = null;
        this.syncQueue = [];
        this.isSyncing = false;
    }
}

// Export the service for use in other modules
// 導出服務以供其他模組使用
export default NotionAPIService;
