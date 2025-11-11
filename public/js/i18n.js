class I18n {
    constructor() {
        this.locale = 'zh-CN';
        this.translations = {};
        this.loaded = false;
    }

    async init() {
        // 检测浏览器语言或从本地存储获取
        const savedLang = localStorage.getItem('preferredLanguage');
        const browserLang = navigator.language || navigator.userLanguage;
        
        this.locale = savedLang || (browserLang.startsWith('zh') ? 'zh-CN' : 'en');
        
        // 加载语言文件
        await this.loadTranslations(this.locale);
        this.applyTranslations();
        
        // 设置语言选择器
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.value = this.locale;
            this.setupLanguageSwitcher();
        }
        
        this.loaded = true;
        console.log('I18n initialized with locale:', this.locale);
    }

    async loadTranslations(locale) {
        try {
            const response = await fetch(`locales/${locale}.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.translations = await response.json();
            console.log(`Translations loaded for ${locale}`);
        } catch (error) {
            console.error('Failed to load translations:', error);
            // 加载默认语言文件
            if (locale !== 'en') {
                console.log('Trying to load English as fallback...');
                await this.loadTranslations('en');
            } else {
                // 如果英语也加载失败，使用空对象
                this.translations = {};
            }
        }
    }

    applyTranslations() {
        // 翻译所有带有 data-i18n 属性的元素
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getTranslation(key);
            if (translation) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translation;
                } else if (element.hasAttribute('title')) {
                    element.title = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });

        // 更新页面标题
        const title = this.getTranslation('title');
        if (title) {
            document.title = title;
        }
    }

    getTranslation(key) {
        return key.split('.').reduce((obj, k) => obj && obj[k], this.translations);
    }

    setupLanguageSwitcher() {
        const languageSelect = document.getElementById('languageSelect');
        if (!languageSelect) return;

        languageSelect.addEventListener('change', async (e) => {
            this.locale = e.target.value;
            await this.loadTranslations(this.locale);
            this.applyTranslations();
            
            // 保存语言偏好
            localStorage.setItem('preferredLanguage', this.locale);
            console.log('Language changed to:', this.locale);
        });
    }

    t(key) {
        const translation = this.getTranslation(key);
        return translation || key;
    }

    // 获取当前语言
    getCurrentLocale() {
        return this.locale;
    }

    // 检查是否已加载
    isLoaded() {
        return this.loaded;
    }
}

// 创建全局实例
const i18n = new I18n();