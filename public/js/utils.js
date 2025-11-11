// API 基础 URL
const API_BASE = '/api';

// 显示提示消息
function showAlert(message, type = 'success') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        console.warn('Alert container not found');
        return;
    }

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alertContainer.appendChild(alert);
    
    // 5秒后自动移除
    setTimeout(() => {
        alert.classList.add('fade-out');
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 300);
    }, 5000);
}

// 健康检查
async function healthCheck() {
    try {
        console.log('Performing health check...');
        const response = await fetch(`${API_BASE}/health`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Health check result:', result);
        
        if (result.status === 'ok') {
            console.log('Backend service is healthy');
            return true;
        } else {
            console.warn('Backend service may have issues');
            return false;
        }
    } catch (error) {
        console.error('Health check failed:', error);
        const message = i18n && i18n.isLoaded() ? 
            i18n.t('errors.connectionFailed') + error.message : 
            '无法连接到后端服务: ' + error.message;
        showAlert(message, 'error');
        return false;
    }
}

// 生成随机密码
async function generateRandomPassword() {
    try {
        const response = await fetch(`${API_BASE}/generate-password`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        if (result.success) {
            const passwordField = document.getElementById('userPassword');
            if (passwordField) {
                passwordField.value = result.password;
            }
            const message = i18n && i18n.isLoaded() ? 
                i18n.t('messages.passwordGenerated') : 
                '随机密码生成成功';
            showAlert(message, 'success');
        } else {
            const message = i18n && i18n.isLoaded() ? 
                i18n.t('errors.passwordGenerationFailed') + result.error : 
                '生成随机密码失败: ' + result.error;
            showAlert(message, 'error');
        }
    } catch (error) {
        console.error('Password generation failed:', error);
        const message = i18n && i18n.isLoaded() ? 
            i18n.t('errors.passwordGenerationFailed') + error.message : 
            '生成随机密码失败: ' + error.message;
        showAlert(message, 'error');
    }
}

// 工具函数：防抖
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 格式化权限显示
function formatPermissions(permissions) {
    if (!permissions) return '';
    
    const permissionMap = {
        'C': i18n && i18n.isLoaded() ? i18n.t('permissions.create') : '创建',
        'R': i18n && i18n.isLoaded() ? i18n.t('permissions.read') : '读取',
        'U': i18n && i18n.isLoaded() ? i18n.t('permissions.update') : '更新',
        'D': i18n && i18n.isLoaded() ? i18n.t('permissions.delete') : '删除'
    };
    
    return permissions.split('').map(p => permissionMap[p] || p).join(', ');
}

// 验证表单
function validateForm(formData) {
    const errors = [];
    
    if (!formData.username || formData.username.trim() === '') {
        errors.push(i18n && i18n.isLoaded() ? i18n.t('validation.usernameRequired') : '用户名不能为空');
    }
    
    if (!formData.password || formData.password.trim() === '') {
        errors.push(i18n && i18n.isLoaded() ? i18n.t('validation.passwordRequired') : '密码不能为空');
    }
    
    if (!formData.directory || formData.directory.trim() === '') {
        errors.push(i18n && i18n.isLoaded() ? i18n.t('validation.directoryRequired') : '目录不能为空');
    }
    
    return errors;
}

// 显示加载状态
function setLoadingState(element, isLoading) {
    if (isLoading) {
        element.classList.add('loading');
        element.disabled = true;
    } else {
        element.classList.remove('loading');
        element.disabled = false;
    }
}

// 获取CSRF令牌（如果需要）
function getCSRFToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
}

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showAlert,
        healthCheck,
        generateRandomPassword,
        debounce,
        formatPermissions,
        validateForm,
        setLoadingState,
        getCSRFToken
    };
}