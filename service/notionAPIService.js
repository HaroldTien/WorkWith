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
            console.log('🔧 Raw Notion API response:', JSON.stringify(response, null, 2));
            
            if (!response.results || !Array.isArray(response.results)) {
                console.error('🔧 Invalid response structure:', response);
                throw new Error('Invalid response from Notion API');
            }

            const databases = response.results.map(db => {
                console.log('🔧 Processing database:', db);
                return {
                    id: db.id,
                    title: db.title?.[0]?.plain_text || 'Untitled Database',
                    description: db.description?.[0]?.plain_text || '',
                    url: db.url,
                    created_time: db.created_time,
                    last_edited_time: db.last_edited_time
                };
            });

            console.log('🔧 Processed databases:', databases);
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
            
            // Debug logging to understand the properties structure
            console.log('🔧 Database properties:', JSON.stringify(properties, null, 2));
            console.log('🔧 Properties keys:', Object.keys(properties));
            
            // Validate required properties exist
            // 驗證必要屬性是否存在
            const requiredProperties = ['Name', 'Status Update', 'Est Time', 'Time Spent'];
            const missingProperties = [];
            
            for (const prop of requiredProperties) {
                try {
                    const exists = properties && properties[prop];
                    console.log(`🔧 Checking property "${prop}":`, exists);
                    if (!exists) {
                        missingProperties.push(prop);
                    }
                } catch (error) {
                    console.error(`🔧 Error checking property "${prop}":`, error);
                    missingProperties.push(prop);
                }
            }
            
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
                'Name': {
                    title: {} // Name should be the title property (usually already exists)
                    // 名稱應該是標題屬性（通常已經存在）
                },
                'Status Update': {
                    status: {
                        options: [
                            { name: 'Not started', color: 'default' },
                            { name: 'In progress', color: 'yellow' },
                            { name: 'Done', color: 'green' }
                        ],
                        groups: [
                            {
                                name: 'To-do',
                                color: 'gray',
                                option_ids: []
                            },
                            {
                                name: 'In progress',
                                color: 'blue',
                                option_ids: []
                            },
                            {
                                name: 'Complete',
                                color: 'green',
                                option_ids: []
                            }
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
     * Convert app task to Notion page format
     * 將應用任務轉換為 Notion 頁面格式
     * @param {Object} task - Task object from the app
     * @returns {Object} - Notion page format
     */
    convertTaskToNotionPage(task) {
        console.log(`🔧 convertTaskToNotionPage called with task:`, task);
        
        // Build the page properties object for Notion
        // 為 Notion 構建頁面屬性對象
        const properties = {
            'Name': {
                title: [
                    {
                        text: {
                            content: task.title || 'Untitled Task'
                        }
                    }
                ]
            },
            'Status Update': {
                status: {
                    name: task.status || 'Not started'
                }
            },
            'Est Time': {
                number: task.estimatedTime || 0
            },
            'Time Spent': {
                number: task.timeSpent || 0
            }
        };

        console.log(`🔧 Status value being used: "${task.status}" (type: ${typeof task.status})`);

        // Add due date if provided (for TODAY tasks)
        // 如果提供了截止日期則添加（適用於 TODAY 任務）
        if (task.dueDate) {
            properties['Due Date'] = {
                date: {
                    start: task.dueDate
                }
            };
        }

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
            id: notionPage.id, // Use Notion page ID as the task ID
            title: properties['Name']?.title?.[0]?.text?.content || 'Untitled Task',
            status: properties['Status Update']?.status?.name || 'Not started',
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
     * @param {Object} statusMappings - Status mappings from app to Notion
     * @returns {Promise<Object>} - Sync result information
     */
    async syncTaskBoardToNotion(tasks, statusMappings = {}) {
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
                    console.log(`🔧 Processing task: "${task.title}" (${task.status})`);
                    
                    // Apply status mappings to convert app status to Notion status
                    // 應用狀態映射以將應用狀態轉換為 Notion 狀態
                    let notionStatus = task.status;
                    if (statusMappings[task.status]) {
                        notionStatus = statusMappings[task.status];
                        console.log(`🔧 Status mapping: ${task.status} -> ${notionStatus}`);
                    }
                    
                    // Handle TODAY tasks - map to same status as IN-PROCESS and set due date
                    // 處理 TODAY 任務 - 映射到與 IN-PROCESS 相同的狀態並設置截止日期
                    let taskWithMapping = { ...task, status: notionStatus };
                    if (task.status === 'today') {
                        // Map TODAY to the same status as IN-PROCESS
                        // 將 TODAY 映射到與 IN-PROCESS 相同的狀態
                        if (statusMappings['in-process']) {
                            taskWithMapping.status = statusMappings['in-process'];
                        }
                        
                        // Set due date to today 23:59
                        // 設置截止日期為今天 23:59
                        const today = new Date();
                        today.setHours(23, 59, 59, 999);
                        taskWithMapping.dueDate = today.toISOString().split('T')[0];
                    }

                    // Check if task already exists in Notion by title
                    // 通過標題檢查任務是否已存在於 Notion 中
                    const existingPage = existingPages.find(page => {
                        const pageTitle = page.properties['Name']?.title?.[0]?.text?.content || '';
                        return pageTitle === task.title;
                    });

                    if (existingPage) {
                        // Update existing page
                        // 更新現有頁面
                        console.log(`🔧 Updating existing Notion page for task: "${task.title}"`);
                        console.log(`🔧 Task data to update:`, taskWithMapping);
                        const updatedPage = await this.updateNotionPage(existingPage.id, taskWithMapping);
                        results.updated.push({
                            appTaskId: task.id,
                            notionPageId: updatedPage.id,
                            title: task.title
                        });
                        console.log(`🔧 Successfully updated Notion page: ${updatedPage.id}`);
                    } else {
                        // Create new page
                        // 創建新頁面
                        console.log(`🔧 Creating new Notion page for task: "${task.title}"`);
                        console.log(`🔧 Task data to create:`, taskWithMapping);
                        const newPage = await this.createNotionPage(taskWithMapping);
                        results.created.push({
                            appTaskId: task.id,
                            notionPageId: newPage.id,
                            title: task.title
                        });
                        console.log(`🔧 Successfully created Notion page: ${newPage.id}`);
                    }
                } catch (error) {
                    // Record error but continue processing other tasks
                    // 記錄錯誤但繼續處理其他任務
                    results.errors.push({
                        taskId: task.id,
                        title: task.title,
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
     * @param {Object} statusMappings - Status mappings from Notion to app
     * @returns {Promise<Array>} - Array of task objects
     */
    async syncNotionToTaskBoard(statusMappings = {}) {
        if (!this.currentDatabaseId) {
            throw new Error('No database selected. Please select a database first.');
        }

        try {
            // Get all pages from the database
            // 從資料庫獲取所有頁面
            const pages = await this.getExistingPages();
            
            // Get the mapped Notion statuses (only download pages with these statuses)
            // 獲取映射的 Notion 狀態（只下載具有這些狀態的頁面）
            const mappedNotionStatuses = Object.values(statusMappings).filter(status => status);
            
            // Filter pages based on status mappings
            // 根據狀態映射過濾頁面
            const filteredPages = pages.filter(page => {
                const notionStatus = page.properties?.['Status Update']?.status?.name || 'Not started';
                
                // If no mappings configured, download all pages
                // 如果未配置映射，下載所有頁面
                if (mappedNotionStatuses.length === 0) {
                    return true;
                }
                
                // Only download pages with mapped statuses
                // 只下載具有映射狀態的頁面
                return mappedNotionStatuses.includes(notionStatus);
            });
            
            // Convert Notion pages to app task format
            // 將 Notion 頁面轉換為應用任務格式
            const tasks = filteredPages.map(page => {
                const task = this.convertNotionPageToTask(page);
                
                // Apply reverse status mappings to convert Notion status to app status
                // 應用反向狀態映射以將 Notion 狀態轉換為應用狀態
                if (statusMappings) {
                    const appStatus = Object.keys(statusMappings).find(appStatus => 
                        statusMappings[appStatus] === task.status
                    );
                    if (appStatus) {
                        task.status = appStatus;
                    } else {
                        // If no mapping found, default to 'in-process'
                        // 如果沒有找到映射，默認為 'in-process'
                        task.status = 'in-process';
                    }
                }
                
                return task;
            });
            
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
                        property: 'Name',
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
            console.log(`🔧 createNotionPage called with task:`, task);
            
            // Convert task to Notion page format
            // 將任務轉換為 Notion 頁面格式
            const pageData = this.convertTaskToNotionPage(task);
            
            console.log(`🔧 Page data to send to Notion:`, JSON.stringify(pageData, null, 2));
            
            // Create the page via API
            // 通過 API 創建頁面
            const response = await this.makeRequest('/pages', 'POST', pageData);
            
            console.log(`🔧 Notion API response:`, response);
            
            return response;
        } catch (error) {
            console.error('Failed to create Notion page:', error);
            console.error('Task data that failed:', task);
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
            console.log(`🔧 updateNotionPage called for pageId: ${pageId}`);
            console.log(`🔧 Task data received:`, task);
            
            // Convert task to Notion page update format
            // 將任務轉換為 Notion 頁面更新格式
            const updateData = {
                properties: {
                    'Name': {
                        title: [
                            {
                                text: {
                                    content: task.title || 'Untitled Task'
                                }
                            }
                        ]
                    },
                    'Status Update': {
                        status: {
                            name: task.status || 'Not started'
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

            // Add due date if provided (for TODAY tasks)
            // 如果提供了截止日期則添加（適用於 TODAY 任務）
            if (task.dueDate) {
                updateData.properties['Due Date'] = {
                    date: {
                        start: task.dueDate
                    }
                };
            }

            console.log(`🔧 Update data being sent to Notion:`, JSON.stringify(updateData, null, 2));
            
            // Update the page properties via API
            // 通過 API 更新頁面屬性
            const response = await this.makeRequest(`/pages/${pageId}`, 'PATCH', updateData);
            
            console.log(`🔧 Notion API response:`, response);
            
            // Update subtasks if they exist
            // 如果存在子任務則更新子任務
            if (task.subtasks && Array.isArray(task.subtasks)) {
                console.log(`🔧 Updating subtasks for page: ${pageId}`);
                await this.updatePageSubtasks(pageId, task.subtasks);
            }
            
            return response;
        } catch (error) {
            console.error('Failed to update Notion page:', error);
            throw new Error(`Failed to update Notion page: ${error.message}`);
        }
    }

    /**
     * Get page blocks (children) from Notion
     * 從 Notion 獲取頁面塊（子項）
     * @param {string} pageId - Notion page ID
     * @returns {Promise<Array>} - Array of block objects
     */
    async getPageBlocks(pageId) {
        try {
            console.log(`🔧 Getting page blocks for pageId: ${pageId}`);
            const response = await this.makeRequest(`/blocks/${pageId}/children`);
            console.log(`🔧 Found ${response.results.length} blocks`);
            return response.results;
        } catch (error) {
            console.error('Failed to get page blocks:', error);
            throw new Error(`Failed to get page blocks: ${error.message}`);
        }
    }

    /**
     * Delete a block from Notion
     * 從 Notion 刪除塊
     * @param {string} blockId - Block ID to delete
     * @returns {Promise<Object>} - Deletion result
     */
    async deleteBlock(blockId) {
        try {
            console.log(`🔧 Deleting block: ${blockId}`);
            const response = await this.makeRequest(`/blocks/${blockId}`, 'PATCH', {
                archived: true
            });
            console.log(`🔧 Successfully deleted block: ${blockId}`);
            return response;
        } catch (error) {
            console.error('Failed to delete block:', error);
            throw new Error(`Failed to delete block: ${error.message}`);
        }
    }

    /**
     * Add children blocks to a parent block
     * 向父塊添加子塊
     * @param {string} blockId - Parent block ID
     * @param {Array} children - Array of child block objects
     * @returns {Promise<Object>} - Creation result
     */
    async addBlockChildren(blockId, children) {
        try {
            console.log(`🔧 Adding ${children.length} children to block: ${blockId}`);
            const response = await this.makeRequest(`/blocks/${blockId}/children`, 'PATCH', {
                children: children
            });
            console.log(`🔧 Successfully added children to block: ${blockId}`);
            return response;
        } catch (error) {
            console.error('Failed to add block children:', error);
            throw new Error(`Failed to add block children: ${error.message}`);
        }
    }

    /**
     * Update subtasks for an existing page
     * 更新現有頁面的子任務
     * @param {string} pageId - Notion page ID
     * @param {Array} subtasks - Array of subtask objects
     * @returns {Promise<Object>} - Update result
     */
    async updatePageSubtasks(pageId, subtasks) {
        try {
            console.log(`🔧 Updating subtasks for page: ${pageId}`);
            console.log(`🔧 Subtasks to update:`, subtasks);
            
            // Get existing page blocks
            // 獲取現有頁面塊
            const existingBlocks = await this.getPageBlocks(pageId);
            
            // Find and delete existing subtask toggle blocks
            // 查找並刪除現有的子任務切換塊
            const subtaskBlocks = existingBlocks.filter(block => 
                block.type === 'toggle' && 
                block.toggle?.rich_text?.[0]?.text?.content?.includes('Subtasks')
            );
            
            console.log(`🔧 Found ${subtaskBlocks.length} existing subtask blocks to delete`);
            
            // Delete existing subtask blocks
            // 刪除現有的子任務塊
            for (const block of subtaskBlocks) {
                await this.deleteBlock(block.id);
            }
            
            // Create new subtask blocks if there are subtasks
            // 如果有子任務則創建新的子任務塊
            if (subtasks && subtasks.length > 0) {
                console.log(`🔧 Creating new subtask blocks for ${subtasks.length} subtasks`);
                
                // Create the toggle block for subtasks
                // 為子任務創建切換塊
                const toggleBlock = {
                    object: 'block',
                    type: 'toggle',
                    toggle: {
                        rich_text: [
                            {
                                type: 'text',
                                text: {
                                    content: `Subtasks (${subtasks.length})`
                                }
                            }
                        ]
                    }
                };
                
                // Create the toggle block first
                // 首先創建切換塊
                const toggleResponse = await this.makeRequest(`/blocks/${pageId}/children`, 'PATCH', {
                    children: [toggleBlock]
                });
                
                const toggleBlockId = toggleResponse.results[0].id;
                console.log(`🔧 Created toggle block: ${toggleBlockId}`);
                
                // Create subtask blocks as children of the toggle
                // 創建子任務塊作為切換的子項
                const subtaskBlocks = subtasks.map(subtask => ({
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
                }));
                
                // Add subtask blocks as children of the toggle block
                // 將子任務塊添加為切換塊的子項
                if (subtaskBlocks.length > 0) {
                    await this.addBlockChildren(toggleBlockId, subtaskBlocks);
                }
            }
            
            console.log(`🔧 Successfully updated subtasks for page: ${pageId}`);
            return { success: true };
            
        } catch (error) {
            console.error('Failed to update page subtasks:', error);
            throw new Error(`Failed to update page subtasks: ${error.message}`);
        }
    }

    /**
     * Auto-sync specific tasks to Notion (update existing tasks only)
     * 自動同步特定任務到 Notion（僅更新現有任務）
     * @param {Array} tasks - Array of task objects to sync
     * @param {Object} statusMappings - Status mappings between app and Notion
     * @returns {Promise<Object>} - Sync result with updated task IDs
     */
    async autoSyncTasksToNotion(tasks, statusMappings) {
        try {
            console.log(`🔧 Auto-syncing ${tasks.length} tasks to Notion`);
            console.log(`🔧 Tasks to auto-sync:`, tasks.map(t => ({ id: t.id, title: t.title, status: t.status })));
            
            const results = [];
            
            for (const task of tasks) {
                try {
                    console.log(`🔧 Auto-syncing task: "${task.title}" (${task.status})`);
                    
                    // Get existing pages to find the Notion page for this task
                    // 獲取現有頁面以找到此任務的 Notion 頁面
                    const existingPages = await this.getExistingPages();
                    const existingPage = existingPages.find(page => {
                        const pageTitle = page.properties.Name?.title?.[0]?.text?.content || '';
                        return pageTitle === task.title;
                    });
                    
                    if (existingPage) {
                        // Update existing page
                        // 更新現有頁面
                        console.log(`🔧 Updating existing Notion page for task: "${task.title}"`);
                        
                        // Apply status mapping
                        // 應用狀態映射
                        let notionStatus = task.status;
                        if (statusMappings && statusMappings[task.status]) {
                            notionStatus = statusMappings[task.status];
                            console.log(`🔧 Status mapping: ${task.status} -> ${notionStatus}`);
                        } else {
                            console.log(`🔧 No status mapping for ${task.status}, using original status: ${notionStatus}`);
                        }
                        
                        // Debug: Check if the mapped status is valid for Notion
                        console.log(`🔧 Status mapping validation - Original: ${task.status}, Mapped: ${notionStatus}, Empty mapping: ${!notionStatus || notionStatus.trim() === ''}`);
                        
                        // Handle TODAY tasks - always map to in-process and set due date
                        // 處理 TODAY 任務 - 始終映射到 in-process 並設置截止日期
                        const taskWithMapping = { ...task, status: notionStatus };
                        if (task.status === 'today') {
                            // Always map TODAY to in-process in Notion
                            // 始終將 TODAY 映射到 Notion 中的 in-process
                            const inProcessStatus = statusMappings['in-process'] || 'in-process';
                            taskWithMapping.status = inProcessStatus;
                            
                            console.log(`🔧 TODAY task "${task.title}" mapped to Notion status: ${inProcessStatus}`);
                            
                            // Set due date to today 23:59
                            // 設置截止日期為今天 23:59
                            const today = new Date();
                            today.setHours(23, 59, 59, 999);
                            taskWithMapping.dueDate = today.toISOString().split('T')[0];
                            
                            console.log(`🔧 TODAY task "${task.title}" due date set to: ${taskWithMapping.dueDate}`);
                        }
                        
                        const updateResult = await this.updateNotionPage(existingPage.id, taskWithMapping);
                        
                        results.push({
                            appTaskId: task.id,
                            notionPageId: existingPage.id,
                            action: 'updated',
                            success: true
                        });
                        
                        console.log(`🔧 Successfully updated task "${task.title}" in Notion`);
                    } else {
                        // Task doesn't exist in Notion - create new page
                        // 任務在 Notion 中不存在 - 創建新頁面
                        console.log(`🔧 Creating new Notion page for task: "${task.title}"`);
                        
                        // Apply status mapping
                        // 應用狀態映射
                        let notionStatus = task.status;
                        if (statusMappings && statusMappings[task.status]) {
                            notionStatus = statusMappings[task.status];
                            console.log(`🔧 New task status mapping: ${task.status} -> ${notionStatus}`);
                        } else {
                            console.log(`🔧 No status mapping for new task ${task.status}, using original status: ${notionStatus}`);
                        }
                        
                        // Debug: Check if the mapped status is valid for Notion
                        console.log(`🔧 Status mapping validation - Original: ${task.status}, Mapped: ${notionStatus}, Empty mapping: ${!notionStatus || notionStatus.trim() === ''}`);
                        
                        // Handle TODAY tasks - always map to in-process and set due date
                        // 處理 TODAY 任務 - 始終映射到 in-process 並設置截止日期
                        const taskWithMapping = { ...task, status: notionStatus };
                        if (task.status === 'today') {
                            // Always map TODAY to in-process in Notion
                            // 始終將 TODAY 映射到 Notion 中的 in-process
                            const inProcessStatus = statusMappings['in-process'] || 'in-process';
                            taskWithMapping.status = inProcessStatus;
                            
                            console.log(`🔧 TODAY task "${task.title}" mapped to Notion status: ${inProcessStatus}`);
                            
                            // Set due date to today 23:59
                            // 設置截止日期為今天 23:59
                            const today = new Date();
                            today.setHours(23, 59, 59, 999);
                            taskWithMapping.dueDate = today.toISOString().split('T')[0];
                            
                            console.log(`🔧 TODAY task "${task.title}" due date set to: ${taskWithMapping.dueDate}`);
                        }
                        
                        console.log(`🔧 Task data to create:`, taskWithMapping);
                        console.log(`🔧 About to call createNotionPage with status: "${taskWithMapping.status}"`);
                        const newPage = await this.createNotionPage(taskWithMapping);
                        console.log(`🔧 Successfully created Notion page with ID: ${newPage.id}`);
                        
                        results.push({
                            appTaskId: task.id,
                            notionPageId: newPage.id,
                            action: 'created',
                            success: true
                        });
                        
                        console.log(`🔧 Successfully created new task "${task.title}" in Notion`);
                    }
                    
                } catch (taskError) {
                    console.error(`🔧 Failed to auto-sync task "${task.title}":`, taskError);
                    results.push({
                        appTaskId: task.id,
                        notionPageId: null,
                        action: 'failed',
                        success: false,
                        error: taskError.message
                    });
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            const createdCount = results.filter(r => r.action === 'created').length;
            const updatedCount = results.filter(r => r.action === 'updated').length;
            const skippedCount = results.filter(r => r.action === 'skipped').length;
            
            console.log(`🔧 Auto-sync completed: ${successCount}/${tasks.length} tasks synced successfully`);
            console.log(`🔧 Auto-sync breakdown: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped`);
            
            return {
                syncedTasks: results.filter(r => r.success).length,
                totalTasks: tasks.length,
                createdTasks: createdCount,
                updatedTasks: updatedCount,
                skippedTasks: skippedCount,
                results: results
            };
            
        } catch (error) {
            console.error('Failed to auto-sync tasks to Notion:', error);
            throw new Error(`Failed to auto-sync tasks to Notion: ${error.message}`);
        }
    }

    /**
     * Auto-sync deleted tasks to Notion (archive pages)
     * 自動同步已刪除的任務到 Notion（歸檔頁面）
     * @param {Array} deletedTaskIds - Array of deleted task IDs
     * @param {Map} pendingTaskInfo - Map containing task info for deleted tasks
     * @returns {Promise<Object>} - Deletion result
     */
    async autoSyncDeletedTasks(deletedTaskIds, pendingTaskInfo) {
        try {
            console.log(`🔧 Auto-syncing ${deletedTaskIds.length} deleted tasks to Notion`);
            
            const results = [];
            
            for (const taskId of deletedTaskIds) {
                try {
                    const taskInfo = pendingTaskInfo.get(taskId);
                    if (!taskInfo) {
                        console.log(`🔧 No task info found for deleted task ID: ${taskId}`);
                        results.push({
                            appTaskId: taskId,
                            notionPageId: null,
                            action: 'skipped',
                            success: false,
                            reason: 'No task info available'
                        });
                        continue;
                    }
                    
                    console.log(`🔧 Processing deleted task: "${taskInfo.title}" (${taskInfo.status})`);
                    
                    // Get existing pages to find the Notion page for this task
                    // 獲取現有頁面以找到此任務的 Notion 頁面
                    const existingPages = await this.getExistingPages();
                    const existingPage = existingPages.find(page => {
                        const pageTitle = page.properties.Name?.title?.[0]?.text?.content || '';
                        return pageTitle === taskInfo.title;
                    });
                    
                    if (existingPage) {
                        // Archive the page
                        // 歸檔頁面
                        console.log(`🔧 Archiving Notion page for deleted task: "${taskInfo.title}"`);
                        const deleteResult = await this.deleteNotionPage(existingPage.id);
                        
                        results.push({
                            appTaskId: taskId,
                            notionPageId: existingPage.id,
                            action: 'deleted',
                            success: true
                        });
                        
                        console.log(`🔧 Successfully archived task "${taskInfo.title}" in Notion`);
                    } else {
                        // Task doesn't exist in Notion - nothing to delete
                        // 任務在 Notion 中不存在 - 無需刪除
                        console.log(`🔧 Deleted task "${taskInfo.title}" not found in Notion - nothing to archive`);
                        results.push({
                            appTaskId: taskId,
                            notionPageId: null,
                            action: 'skipped',
                            success: true,
                            reason: 'Task not found in Notion'
                        });
                    }
                    
                } catch (taskError) {
                    console.error(`🔧 Failed to auto-sync deleted task ID ${taskId}:`, taskError);
                    results.push({
                        appTaskId: taskId,
                        notionPageId: null,
                        action: 'failed',
                        success: false,
                        error: taskError.message
                    });
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            const deletedCount = results.filter(r => r.action === 'deleted').length;
            const skippedCount = results.filter(r => r.action === 'skipped').length;
            
            console.log(`🔧 Auto-sync deleted tasks completed: ${successCount}/${deletedTaskIds.length} tasks processed successfully`);
            console.log(`🔧 Auto-sync deleted tasks breakdown: ${deletedCount} archived, ${skippedCount} skipped`);
            
            return {
                syncedTasks: successCount,
                totalTasks: deletedTaskIds.length,
                deletedTasks: deletedCount,
                skippedTasks: skippedCount,
                results: results
            };
            
        } catch (error) {
            console.error('Failed to auto-sync deleted tasks to Notion:', error);
            throw new Error(`Failed to auto-sync deleted tasks to Notion: ${error.message}`);
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
     * Search and return all status options from the Status Update column
     * 搜尋並返回狀態更新欄位中的所有狀態選項
     * @param {string} databaseId - The database ID to search statuses in
     * @returns {Promise<Array>} - Array of status options
     */
    async searchStatuses(databaseId) {
        try {
            // Get database schema to find the Status Update property
            // 獲取資料庫架構以找到狀態更新屬性
            const response = await this.makeRequest(`/databases/${databaseId}`);
            
            // Debug: Log all available properties
            // 調試：記錄所有可用屬性
            console.log('🔧 Database properties available:', Object.keys(response.properties || {}));
            console.log('🔧 All properties details:', JSON.stringify(response.properties, null, 2));
            
            // Extract the Status Update property
            // 提取狀態更新屬性
            console.log('🔧 Response properties:', response.properties);
            const statusProperty = response.properties['Status Update'];
            
            if (!statusProperty) {
                // Check if there are any select properties we can suggest
                // 檢查是否有任何可以建議的選擇屬性
                const selectProperties = Object.entries(response.properties || {})
                    .filter(([name, prop]) => prop.type === 'select')
                    .map(([name, prop]) => name);
                
                console.log('🔧 Available select properties:', selectProperties);
                
                throw new Error(`Status Update column not found. Available select properties: ${selectProperties.join(', ') || 'none'}`);
            }
            
            if (statusProperty.type !== 'select' && statusProperty.type !== 'status') {
                throw new Error(`Status Update column exists but is not a select or status property. It's a ${statusProperty.type} property.`);
            }
            
            // Extract status options based on property type
            // 根據屬性類型提取狀態選項
            let statusOptions = [];
            if (statusProperty.type === 'select') {
                statusOptions = statusProperty.select.options || [];
            } else if (statusProperty.type === 'status') {
                statusOptions = statusProperty.status.options || [];
            }
            
            console.log('🔧 Found status options:', statusOptions);
            
            return statusOptions.map(option => ({
                id: option.id,
                name: option.name,
                color: option.color
            }));
            
        } catch (error) {
            console.error('Failed to search statuses:', error);
            throw new Error(`Failed to search statuses: ${error.message}`);
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
            'Name': {
                type: 'Title',
                description: 'Main task name (usually already exists in databases)',
                // 主要任務名稱（資料庫中通常已存在）
                required: true,
                example: 'Complete project documentation'
            },
            'Status Update': {
                type: 'Status',
                description: 'Current status of the task',
                // 任務的當前狀態
                required: true,
                options: ['Not started', 'In progress', 'Done'],
                example: 'In progress'
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
