// 全局变量
let currentConfig = null;
let editingUser = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, initializing application');
    
    try {
        // 初始化国际化
        await i18n.init();
        
        // 先进行健康检查
        const healthy = await healthCheck();
        if (healthy) {
            // 然后加载配置
            await loadConfig();
        }
        
        setupEventListeners();
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showAlert('应用初始化失败: ' + error.message, 'error');
    }
});

function setupEventListeners() {
    // 标签切换功能
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const tabId = this.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // TLS 设置显示/隐藏
    const tlsCheckbox = document.getElementById('configTLS');
    const tlsSettings = document.getElementById('tlsSettings');
    
    if (tlsCheckbox && tlsSettings) {
        tlsCheckbox.addEventListener('change', function() {
            tlsSettings.classList.toggle('hidden', !this.checked);
        });
    }
    
    // 用户管理功能
    const addUserBtn = document.getElementById('addUserBtn');
    const userFormCard = document.getElementById('userFormCard');
    const cancelUserBtn = document.getElementById('cancelUserBtn');
    const saveUserBtn = document.getElementById('saveUserBtn');
    const generatePasswordBtn = document.getElementById('generatePasswordBtn');
    
    if (addUserBtn) {
        addUserBtn.addEventListener('click', showUserForm);
    }
    
    if (cancelUserBtn) {
        cancelUserBtn.addEventListener('click', hideUserForm);
    }
    
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', saveUser);
    }
    
    if (generatePasswordBtn) {
        generatePasswordBtn.addEventListener('click', generateRandomPassword);
    }
    
    // 配置保存功能
    const saveServerConfigBtn = document.getElementById('saveServerConfig');
    const saveLogConfigBtn = document.getElementById('saveLogConfig');
    const saveCorsConfigBtn = document.getElementById('saveCorsConfig');
    
    if (saveServerConfigBtn) {
        saveServerConfigBtn.addEventListener('click', saveServerConfig);
    }
    
    if (saveLogConfigBtn) {
        saveLogConfigBtn.addEventListener('click', saveLogConfig);
    }
    
    if (saveCorsConfigBtn) {
        saveCorsConfigBtn.addEventListener('click', saveCorsConfig);
    }
    
    // 重启服务器
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', function() {
            const message = i18n.t('messages.confirmRestart');
            if (confirm(message)) {
                restartServer();
            }
        });
    }
}

// 加载配置
async function loadConfig() {
    console.log('Loading configuration...');
    showAlert(i18n.t('messages.loadingConfig'), 'info');
    
    try {
        const response = await fetch(`${API_BASE}/config`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API response:', result);
        
        if (result.success) {
            currentConfig = result.config;
            console.log('Configuration loaded successfully:', currentConfig);
            populateForm(currentConfig);
            await loadUsers();
            showAlert(i18n.t('messages.configLoaded'), 'success');
        } else {
            console.error('API returned error:', result.error);
            showAlert(i18n.t('errors.configLoadFailed') + result.error, 'error');
        }
    } catch (error) {
        console.error('Failed to load configuration:', error);
        showAlert(i18n.t('errors.configLoadFailed') + error.message, 'error');
    }
}

// 填充表单数据
function populateForm(config) {
    console.log('Populating form with config:', config);
    
    if (!config) {
        console.error('Config is empty, cannot populate form');
        return;
    }
    
    try {
        // 服务器设置
        setValue('configAddress', config.address || '0.0.0.0');
        setValue('configPort', config.port || 80);
        setValue('configPrefix', config.prefix || '/');
        setValue('configDirectory', config.directory || '.');
        setChecked('configTLS', config.tls || false);
        setValue('configCert', config.cert || '.cert');
        setValue('configKey', config.key || '.key');
        setChecked('configDebug', config.debug || false);
        setChecked('configNoSniff', config.noSniff || false);
        setChecked('configBehindProxy', config.behindProxy || false);
        
        // TLS 设置显示/隐藏
        const tlsSettings = document.getElementById('tlsSettings');
        if (tlsSettings) {
            tlsSettings.classList.toggle('hidden', !config.tls);
        }
        
        // 权限设置
        const permissions = config.permissions || 'R';
        console.log('Permissions setting:', permissions);
        setChecked('permC', permissions.includes('C'));
        setChecked('permR', permissions.includes('R'));
        setChecked('permU', permissions.includes('U'));
        setChecked('permD', permissions.includes('D'));
        
        // 日志设置
        if (config.log) {
            setValue('logFormat', config.log.format || 'console');
            setChecked('logColors', config.log.colors !== false);
            setChecked('logStderr', config.log.outputs && config.log.outputs.includes('stderr'));
        }
        
        // CORS 设置
        if (config.cors) {
            setChecked('corsEnabled', config.cors.enabled || false);
            setChecked('corsCredentials', config.cors.credentials || false);
            setValue('corsHeaders', config.cors.allowed_headers ? config.cors.allowed_headers.join(', ') : 'Depth');
            setValue('corsHosts', config.cors.allowed_hosts ? config.cors.allowed_hosts.join(', ') : 'http://localhost:8080');
            setValue('corsMethods', config.cors.allowed_methods ? config.cors.allowed_methods.join(', ') : 'GET');
            setValue('corsExposedHeaders', config.cors.exposed_headers ? config.cors.exposed_headers.join(', ') : 'Content-Length, Content-Range');
        }
        
        console.log('Form populated successfully');
    } catch (error) {
        console.error('Error populating form:', error);
        showAlert(i18n.t('errors.formPopulationFailed') + error.message, 'error');
    }
}

// 设置表单值
function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value;
    }
}

// 设置复选框状态
function setChecked(id, checked) {
    const element = document.getElementById(id);
    if (element) {
        element.checked = checked;
    }
}

// 加载用户列表
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/users`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            displayUsers(result.users);
        } else {
            showAlert(i18n.t('errors.usersLoadFailed') + result.error, 'error');
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        showAlert(i18n.t('errors.usersLoadFailed') + error.message, 'error');
    }
}

// 显示用户列表
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!users || users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">${i18n.t('users.noUsers')}</td></tr>`;
        return;
    }
    
    users.forEach(user => {
        const tr = document.createElement('tr');
        
        // 用户名
        const usernameTd = document.createElement('td');
        usernameTd.textContent = user.username;
        tr.appendChild(usernameTd);
        
        // 密码（明文显示）
        const passwordTd = document.createElement('td');
        passwordTd.textContent = user.password || '';
        tr.appendChild(passwordTd);
        
        // 权限
        const permissionsTd = document.createElement('td');
        if (user.permissions) {
            if (user.permissions.includes('C')) {
                const badge = document.createElement('span');
                badge.className = 'permission-badge permission-C';
                badge.textContent = 'C';
                badge.title = i18n.t('permissions.create');
                permissionsTd.appendChild(badge);
            }
            if (user.permissions.includes('R')) {
                const badge = document.createElement('span');
                badge.className = 'permission-badge permission-R';
                badge.textContent = 'R';
                badge.title = i18n.t('permissions.read');
                permissionsTd.appendChild(badge);
            }
            if (user.permissions.includes('U')) {
                const badge = document.createElement('span');
                badge.className = 'permission-badge permission-U';
                badge.textContent = 'U';
                badge.title = i18n.t('permissions.update');
                permissionsTd.appendChild(badge);
            }
            if (user.permissions.includes('D')) {
                const badge = document.createElement('span');
                badge.className = 'permission-badge permission-D';
                badge.textContent = 'D';
                badge.title = i18n.t('permissions.delete');
                permissionsTd.appendChild(badge);
            }
        }
        tr.appendChild(permissionsTd);
        
        // 目录
        const directoryTd = document.createElement('td');
        directoryTd.textContent = user.directory || '/';
        tr.appendChild(directoryTd);
        
        // 操作按钮
        const actionsTd = document.createElement('td');
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm mr-2 edit-user';
        editBtn.textContent = i18n.t('buttons.edit');
        editBtn.addEventListener('click', () => editUser(user));
        actionsTd.appendChild(editBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm btn-danger delete-user';
        deleteBtn.textContent = i18n.t('buttons.delete');
        deleteBtn.addEventListener('click', () => deleteUser(user.username));
        actionsTd.appendChild(deleteBtn);
        
        tr.appendChild(actionsTd);
        tbody.appendChild(tr);
    });
}

// 显示用户表单
function showUserForm() {
    const userFormCard = document.getElementById('userFormCard');
    const userFormTitle = document.getElementById('userFormTitle');
    
    if (userFormCard && userFormTitle) {
        userFormTitle.textContent = i18n.t('users.addUser');
        userFormCard.classList.remove('hidden');
        editingUser = null;
        
        // 重置表单
        setValue('userUsername', '');
        setValue('userPassword', '');
        setValue('userDirectory', '.');
        setChecked('userPermC', false);
        setChecked('userPermR', true);
        setChecked('userPermU', false);
        setChecked('userPermD', false);
    }
}

// 隐藏用户表单
function hideUserForm() {
    const userFormCard = document.getElementById('userFormCard');
    if (userFormCard) {
        userFormCard.classList.add('hidden');
        editingUser = null;
    }
}

// 编辑用户
function editUser(user) {
    const userFormCard = document.getElementById('userFormCard');
    const userFormTitle = document.getElementById('userFormTitle');
    
    if (userFormCard && userFormTitle) {
        userFormTitle.textContent = i18n.t('users.editUser');
        userFormCard.classList.remove('hidden');
        editingUser = user;
        
        // 填充表单
        setValue('userUsername', user.username);
        setValue('userPassword', user.password || '');
        setValue('userDirectory', user.directory || '/');
        
        const permissions = user.permissions || 'R';
        setChecked('userPermC', permissions.includes('C'));
        setChecked('userPermR', permissions.includes('R'));
        setChecked('userPermU', permissions.includes('U'));
        setChecked('userPermD', permissions.includes('D'));
    }
}

// 保存用户
async function saveUser() {
    const username = getValue('userUsername').trim();
    const password = getValue('userPassword');
    const directory = getValue('userDirectory').trim();
    
    if (!username) {
        showAlert(i18n.t('validation.usernameRequired'), 'error');
        return;
    }
    
    if (!password) {
        showAlert(i18n.t('validation.passwordRequired'), 'error');
        return;
    }
    
    // 收集权限
    let permissions = '';
    if (isChecked('userPermC')) permissions += 'C';
    if (isChecked('userPermR')) permissions += 'R';
    if (isChecked('userPermU')) permissions += 'U';
    if (isChecked('userPermD')) permissions += 'D';
    
    if (!permissions) {
        showAlert(i18n.t('validation.permissionsRequired'), 'error');
        return;
    }
    
    const user = {
        username,
        password,
        permissions,
        directory
    };
    
    try {
        const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user,
                isEdit: !!editingUser
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message);
            hideUserForm();
            await loadUsers();
        } else {
            showAlert(i18n.t('errors.userSaveFailed') + result.error, 'error');
        }
    } catch (error) {
        console.error('Failed to save user:', error);
        showAlert(i18n.t('errors.userSaveFailed') + error.message, 'error');
    }
}

// 删除用户
async function deleteUser(username) {
    const message = i18n.t('messages.confirmDeleteUser', { username: username });
    if (!confirm(message)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message);
            await loadUsers();
        } else {
            showAlert(i18n.t('errors.userDeleteFailed') + result.error, 'error');
        }
    } catch (error) {
        console.error('Failed to delete user:', error);
        showAlert(i18n.t('errors.userDeleteFailed') + error.message, 'error');
    }
}

// 获取表单值
function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : '';
}

// 获取复选框状态
function isChecked(id) {
    const element = document.getElementById(id);
    return element ? element.checked : false;
}

// 保存服务器配置
async function saveServerConfig() {
    // 收集服务器配置
    const serverConfig = {
        address: getValue('configAddress').trim(),
        port: parseInt(getValue('configPort')) || 80,
        prefix: getValue('configPrefix').trim(),
        directory: getValue('configDirectory').trim(),
        tls: isChecked('configTLS'),
        cert: getValue('configCert').trim(),
        key: getValue('configKey').trim(),
        debug: isChecked('configDebug'),
        noSniff: isChecked('configNoSniff'),
        behindProxy: isChecked('configBehindProxy')
    };
    
    // 收集权限
    let permissions = '';
    if (isChecked('permC')) permissions += 'C';
    if (isChecked('permR')) permissions += 'R';
    if (isChecked('permU')) permissions += 'U';
    if (isChecked('permD')) permissions += 'D';
    
    serverConfig.permissions = permissions || 'R';
    
    try {
        const response = await fetch(`${API_BASE}/config/server`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ serverConfig })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message);
            await loadConfig(); // 重新加载配置以确保同步
        } else {
            showAlert(i18n.t('errors.serverConfigSaveFailed') + result.error, 'error');
        }
    } catch (error) {
        console.error('Failed to save server configuration:', error);
        showAlert(i18n.t('errors.serverConfigSaveFailed') + error.message, 'error');
    }
}

// 保存日志配置
async function saveLogConfig() {
    if (!currentConfig) return;
    
    const logConfig = {
        format: getValue('logFormat'),
        colors: isChecked('logColors'),
        outputs: []
    };
    
    if (isChecked('logStderr')) {
        logConfig.outputs.push('stderr');
    }
    
    currentConfig.log = logConfig;
    
    try {
        const response = await fetch(`${API_BASE}/config/server`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ serverConfig: currentConfig })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(i18n.t('messages.logConfigSaved'));
        } else {
            showAlert(i18n.t('errors.logConfigSaveFailed') + result.error, 'error');
        }
    } catch (error) {
        console.error('Failed to save log configuration:', error);
        showAlert(i18n.t('errors.logConfigSaveFailed') + error.message, 'error');
    }
}

// 保存 CORS 配置
async function saveCorsConfig() {
    if (!currentConfig) return;
    
    const corsConfig = {
        enabled: isChecked('corsEnabled'),
        credentials: isChecked('corsCredentials'),
        allowed_headers: getValue('corsHeaders').split(',').map(h => h.trim()).filter(h => h),
        allowed_hosts: getValue('corsHosts').split(',').map(h => h.trim()).filter(h => h),
        allowed_methods: getValue('corsMethods').split(',').map(m => m.trim()).filter(m => m),
        exposed_headers: getValue('corsExposedHeaders').split(',').map(h => h.trim()).filter(h => h)
    };
    
    currentConfig.cors = corsConfig;
    
    try {
        const response = await fetch(`${API_BASE}/config/server`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ serverConfig: currentConfig })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(i18n.t('messages.corsConfigSaved'));
        } else {
            showAlert(i18n.t('errors.corsConfigSaveFailed') + result.error, 'error');
        }
    } catch (error) {
        console.error('Failed to save CORS configuration:', error);
        showAlert(i18n.t('errors.corsConfigSaveFailed') + error.message, 'error');
    }
}

// 重启服务器
async function restartServer() {
    try {
        showAlert(i18n.t('messages.restartingServer'), 'info');
        const response = await fetch(`${API_BASE}/restart`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message);
        } else {
            showAlert(i18n.t('errors.restartFailed') + result.error, 'error');
        }
    } catch (error) {
        console.error('Failed to restart server:', error);
        showAlert(i18n.t('errors.restartFailed') + error.message, 'error');
    }
}