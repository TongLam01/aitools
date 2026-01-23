/**
 * Pawenzhang 主程序 (微信绿UI + 页面视图优化)
 * 路径: /js/pawenzhang.js
 */

const CONFIG = {
    texts: {
        appTitle: "网页文章导出工具",
        appSubtitle: "支持公众号文章导出",
        inputPlaceholder: "在此粘贴文章链接，每行一个 (最多支持 5 篇)...",
        actionBtn: "批量提取",
        processing: "正在解析中...",
        copySuccess: "已复制",
        errorTitle: "提示",
        saveBtn: "保存",
        howToGet: "获取Key",
        missingKey: "请先配置秘塔 API Key，已为您打开设置菜单。",
        limitExceeded: "一次最多支持提取 5 篇文章"
    },
    links: { tutorial: "https://metaso.cn/search-api/api-keys" },
    security: { allowedDomains: ['aibox6.com', 'www.aibox6.com', 'localhost', '127.0.0.1'] }
};

// 域名检查
(function checkDomain() {
    const currentDomain = window.location.hostname;
    if (!CONFIG.security.allowedDomains.includes(currentDomain) && currentDomain !== '') {
        console.warn(`[Security] Domain [${currentDomain}] is not authorized.`);
    }
})();

class PawenzhangApp {
    constructor() {
        this.apiKey = localStorage.getItem('metaso_api_key') || '';
        this.results = [];
        this.currentIndex = 0;
        this.initUI();
        this.bindEvents();
        this.updateStatus();
    }

    initUI() {
        document.getElementById('appTitle').textContent = CONFIG.texts.appTitle;
        document.getElementById('appSubtitle').textContent = CONFIG.texts.appSubtitle;
        document.getElementById('howToLink').textContent = CONFIG.texts.howToGet;
        document.getElementById('howToLink').href = CONFIG.links.tutorial;
    }

    bindEvents() {
        // --- Dropdown 逻辑 ---
        const dropdown = document.getElementById('settingsDropdown');
        const apiKeyBtn = document.getElementById('apiKeyBtn');
        const saveKeyBtn = document.getElementById('saveKeyBtn');
        const apiKeyInput = document.getElementById('apiKeyInput');

        const toggleDropdown = (forceOpen = false) => {
            const isHidden = dropdown.classList.contains('hidden');
            if (forceOpen || isHidden) {
                dropdown.classList.remove('hidden');
                dropdown.classList.add('animate-slide-down');
                dropdown.classList.remove('animate-slide-up');
                apiKeyInput.value = this.apiKey;
                apiKeyInput.focus();
            } else {
                closeDropdown();
            }
        };

        const closeDropdown = () => {
            dropdown.classList.remove('animate-slide-down');
            dropdown.classList.add('animate-slide-up');
            setTimeout(() => dropdown.classList.add('hidden'), 200);
        };

        apiKeyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown();
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !apiKeyBtn.contains(e.target)) {
                if (!dropdown.classList.contains('hidden')) closeDropdown();
            }
        });

        saveKeyBtn.addEventListener('click', () => {
            const val = apiKeyInput.value.trim();
            if (val) {
                this.apiKey = val;
                localStorage.setItem('metaso_api_key', val);
                this.updateStatus();
                closeDropdown();
            }
        });

        // --- 输入监听 ---
        const urlInput = document.getElementById('urlInput');
        urlInput.addEventListener('input', () => {
            const lines = urlInput.value.split('\n').filter(line => line.trim() !== '');
            const count = lines.length;
            const counter = document.getElementById('lineCounter');
            counter.textContent = `${count}/5`;
            counter.className = count > 5 ? 'absolute bottom-3 right-4 text-xs text-red-500 font-bold bg-white/80 px-1 rounded' : 'absolute bottom-3 right-4 text-xs text-gray-400 bg-white/80 px-1 rounded';
        });

        // --- 核心功能 ---
        document.getElementById('extractBtn').addEventListener('click', () => this.handleBatchExtract(toggleDropdown));
        
        document.getElementById('exportCurrentBtn').addEventListener('click', () => {
            if (this.results[this.currentIndex]) {
                this.exportWord([this.results[this.currentIndex]], false);
            }
        });

        document.getElementById('exportAllBtn').addEventListener('click', () => {
            if (this.results.length > 0) {
                this.exportWord(this.results, true);
            }
        });
    }

    updateStatus() {
        const indicator = document.getElementById('statusIndicator');
        if (this.apiKey) {
            indicator.classList.remove('bg-red-500', 'animate-breathe-red');
            indicator.classList.add('bg-success', 'animate-breathe-green');
        } else {
            indicator.classList.remove('bg-success', 'animate-breathe-green');
            indicator.classList.add('bg-red-500', 'animate-breathe-red');
        }
    }

    // --- 批量提取 ---
    async handleBatchExtract(openSettingsCallback) {
        const urlInput = document.getElementById('urlInput');
        const btn = document.getElementById('extractBtn');
        const resultArea = document.getElementById('resultArea');
        
        const urls = urlInput.value.split('\n').map(u => u.trim()).filter(u => u !== '');

        // 提醒 Key
        if (!this.apiKey) {
            alert(CONFIG.texts.missingKey);
            if (openSettingsCallback) openSettingsCallback(true);
            return;
        }
        if (urls.length === 0) return;
        if (urls.length > 5) {
            alert(CONFIG.texts.limitExceeded);
            return;
        }

        const originalBtnText = btn.innerHTML;
        btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span>处理中...</span>`;
        btn.disabled = true;
        
        this.results = [];
        resultArea.classList.remove('hidden');
        document.getElementById('tabsContainer').innerHTML = '';
        document.getElementById('contentWrapper').classList.add('hidden');
        document.getElementById('loadingState').classList.remove('hidden');

        try {
            const promises = urls.map((url, index) => this.fetchOneArticle(url, index));
            const responses = await Promise.all(promises);
            this.results = responses.filter(r => r !== null);

            if (this.results.length === 0) {
                alert("所有链接提取失败，请检查链接或 API Key。");
            } else {
                this.renderTabs();
                this.switchTab(0);
            }
        } catch (error) {
            console.error(error);
        } finally {
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
            document.getElementById('loadingState').classList.add('hidden');
        }
    }

    async fetchOneArticle(url, index) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); 

        try {
            const response = await fetch('/api/pawenzhangproxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
                body: JSON.stringify({ url: url }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const rawText = await response.text();
            let data;
            try { data = JSON.parse(rawText); } 
            catch (e) { throw new Error(`Server Error (${response.status})`); }

            if (!response.ok) throw new Error(data.error || 'API Error');

            let articleData;
            try { articleData = (typeof data.result === 'object') ? data.result : JSON.parse(data.result); } 
            catch (e) { articleData = { title: `文章 ${index + 1}`, author: 'Unknown', markdown: data.result, url: url }; }

            articleData.sourceUrl = url;
            if (!articleData.title) articleData.title = `未命名文章 ${index + 1}`;
            
            return articleData;

        } catch (error) {
            console.error(`Link ${index + 1} failed:`, error);
            return {
                title: `提取失败 ${index + 1}`,
                author: 'Error',
                markdown: `> 错误信息: ${error.message}\n\n链接: ${url}`,
                isError: true,
                sourceUrl: url
            };
        }
    }

    renderTabs() {
        const container = document.getElementById('tabsContainer');
        container.innerHTML = '';

        this.results.forEach((article, index) => {
            const tab = document.createElement('button');
            const shortTitle = article.title.length > 8 ? article.title.substring(0, 8) + '...' : article.title;
            
            tab.className = `flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors rounded-t-lg ${index === 0 ? 'active-tab' : 'inactive-tab'}`;
            tab.textContent = shortTitle;
            
            if (article.isError) tab.classList.add('text-red-400');

            tab.addEventListener('click', () => this.switchTab(index));
            container.appendChild(tab);
        });
        document.getElementById('exportCurrentBtn').classList.remove('hidden');
    }

    switchTab(index) {
        this.currentIndex = index;
        const article = this.results[index];
        const tabs = document.getElementById('tabsContainer').children;

        Array.from(tabs).forEach((t, i) => {
            t.className = `flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors rounded-t-lg ${i === index ? 'active-tab' : 'inactive-tab'}`;
            if (this.results[i].isError) t.classList.add('text-red-400');
        });

        document.getElementById('contentWrapper').classList.remove('hidden');
        document.getElementById('emptyState').classList.add('hidden');
        
        document.getElementById('articleTitle').textContent = article.title;
        document.getElementById('articleAuthor').textContent = article.author ? `作者: ${article.author}` : '';
        document.getElementById('articleDate').textContent = article.date || '';

        if (typeof marked !== 'undefined') {
            document.getElementById('renderedContent').innerHTML = marked.parse(article.markdown || '');
        } else {
            document.getElementById('renderedContent').textContent = article.markdown;
        }
    }

    // --- 导出 Word (页面视图修正版) ---
    exportWord(articlesToExport, isMerge) {
        if (!articlesToExport || articlesToExport.length === 0) return;

        let combinedHtml = '';
        let fileName = '';

        if (isMerge) {
            fileName = `公众号文章导出合集_${new Date().toISOString().slice(0,10)}.doc`;
            articlesToExport.forEach((article, idx) => {
                const content = typeof marked !== 'undefined' ? marked.parse(article.markdown || '') : article.markdown;
                combinedHtml += `
                    <div class="article-section">
                        <h1 style="text-align: center; font-size: 24pt; color: #333;">${article.title}</h1>
                        <p style="text-align: center; color: #888; font-size: 10pt; margin-bottom: 20px;">
                            作者：${article.author || '-'} | <a href="${article.sourceUrl}" style="color:#07C160">原文链接</a>
                        </p>
                        <hr style="border:0; border-top:1px solid #eee; margin-bottom:20px"/>
                        ${content}
                        <br/>
                        ${idx < articlesToExport.length - 1 ? "<br clear=all style='mso-special-character:line-break;page-break-before:always'>" : ""} 
                    </div>
                `;
            });
        } else {
            const article = articlesToExport[0];
            fileName = `${(article.title || 'article').replace(/[\\/:*?"<>|]/g, '_')}.doc`;
            const content = typeof marked !== 'undefined' ? marked.parse(article.markdown || '') : article.markdown;
            combinedHtml = `
                <h1 style="text-align: center; font-size: 24pt; margin-bottom: 10px;">${article.title}</h1>
                <p style="text-align: center; color: #888; margin-bottom: 20px;">${article.author || '-'} | ${article.date || ''}</p>
                <p style="text-align: center; font-size: 10pt; margin-bottom: 30px;"><a href="${article.sourceUrl}" style="color:#07C160">查看原文</a></p>
                <hr style="border:0; border-top:1px solid #eee; margin-bottom:20px"/>
                ${content}
            `;
        }

        // --- 核心优化: 添加 Word XML 定义以强制页面视图 ---
        const template = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset="utf-8">
                <title>Export</title>
                <style>
                    body { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; line-height: 1.6; }
                    img { max-width: 100%; height: auto; }
                    p { margin-bottom: 1em; text-align: justify; }
                    a { color: #07C160; text-decoration: none; }
                    code { background: #f3f4f6; padding: 2px 5px; border-radius: 4px; font-family: Consolas, monospace; }
                    blockquote { border-left: 4px solid #07C160; padding-left: 10px; color: #666; background: #f9f9f9; padding: 10px; }
                </style>
            </head>
            <body>${combinedHtml}</body>
            </html>
        `;

        const blob = new Blob([template], { type: 'application/msword' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }
}

new PawenzhangApp();
