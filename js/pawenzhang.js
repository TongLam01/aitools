/**
 * Pawenzhang 主程序
 * 路径: /js/pawenzhang.js
 */

const CONFIG = {
    texts: {
        appTitle: "Pawenzhang",
        appSubtitle: "网页文章导出工具",
        inputPlaceholder: "在此粘贴文章链接 (如微信公众号, 知乎等)...",
        actionBtn: "立即提取",
        processing: "正在解析中...",
        copySuccess: "已复制",
        copyFail: "复制失败",
        errorTitle: "操作失败",
        modalTitle: "配置 Metaso API Key",
        saveBtn: "保存连接",
        howToGet: "如何获取 API Key?",
        emptyUrl: "请输入有效的网址",
        missingKey: "请先点击右上角设置 API Key"
    },
    links: {
        tutorial: "https://www.aibox6.com/jiaocheng.html"
    },
    security: {
        allowedDomains: ['aibox6.com', 'www.aibox6.com', 'localhost', '127.0.0.1']
    }
};

// 域名检查
(function checkDomain() {
    const currentDomain = window.location.hostname;
    if (!CONFIG.security.allowedDomains.includes(currentDomain)) {
        console.warn(`Domain [${currentDomain}] is not authorized.`);
    }
})();

class PawenzhangApp {
    constructor() {
        this.apiKey = localStorage.getItem('metaso_api_key') || '';
        this.currentArticleData = null; // 存储当前文章数据用于导出
        this.initUI();
        this.bindEvents();
        this.updateStatus();
    }

    initUI() {
        document.getElementById('appTitle').textContent = CONFIG.texts.appTitle;
        document.getElementById('appSubtitle').textContent = CONFIG.texts.appSubtitle;
        document.getElementById('urlInput').placeholder = CONFIG.texts.inputPlaceholder;
        document.getElementById('extractBtn').firstElementChild.textContent = CONFIG.texts.actionBtn;
        document.getElementById('modalTitle').textContent = CONFIG.texts.modalTitle;
        document.getElementById('howToLink').textContent = CONFIG.texts.howToGet;
        document.getElementById('howToLink').href = CONFIG.links.tutorial;
        document.getElementById('saveKeyBtn').textContent = CONFIG.texts.saveBtn;
    }

    bindEvents() {
        // Modal 逻辑
        const modal = document.getElementById('settingsModal');
        const modalContent = document.getElementById('modalContent');
        const toggleModal = (show) => {
            if (show) {
                modal.classList.remove('hidden');
                document.getElementById('apiKeyInput').value = this.apiKey;
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    modalContent.classList.remove('scale-95');
                    modalContent.classList.add('scale-100');
                }, 10);
            } else {
                modal.classList.add('opacity-0');
                modalContent.classList.remove('scale-100');
                modalContent.classList.add('scale-95');
                setTimeout(() => modal.classList.add('hidden'), 200);
            }
        };

        document.getElementById('apiKeyBtn').addEventListener('click', () => toggleModal(true));
        document.getElementById('cancelBtn').addEventListener('click', () => toggleModal(false));
        document.getElementById('saveKeyBtn').addEventListener('click', () => {
            const val = document.getElementById('apiKeyInput').value.trim();
            if (val) {
                this.apiKey = val;
                localStorage.setItem('metaso_api_key', val);
                this.updateStatus();
                toggleModal(false);
            }
        });

        // 核心操作
        document.getElementById('extractBtn').addEventListener('click', () => this.handleExtract());
        
        // 复制 Markdown
        document.getElementById('copyBtn').addEventListener('click', async () => {
            const rawText = document.getElementById('rawMarkdown').value;
            if(!rawText) return;
            try {
                await navigator.clipboard.writeText(rawText);
                const btn = document.getElementById('copyBtn');
                const oldText = btn.textContent;
                btn.textContent = CONFIG.texts.copySuccess;
                btn.classList.add('text-success', 'border-success');
                setTimeout(() => {
                    btn.textContent = oldText;
                    btn.classList.remove('text-success', 'border-success');
                }, 2000);
            } catch (err) {
                alert(CONFIG.texts.copyFail);
            }
        });

        // 导出 Word
        document.getElementById('exportWordBtn').addEventListener('click', () => this.handleExportWord());
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

    async handleExtract() {
        const urlInput = document.getElementById('urlInput');
        const btn = document.getElementById('extractBtn');
        const resultArea = document.getElementById('resultArea');
        const url = urlInput.value.trim();

        if (!this.apiKey) {
            alert(CONFIG.texts.missingKey);
            document.getElementById('apiKeyBtn').click();
            return;
        }
        if (!url) {
            alert(CONFIG.texts.emptyUrl);
            return;
        }

        // Loading UI
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span>${CONFIG.texts.processing}</span>`;
        btn.disabled = true;
        resultArea.classList.add('hidden');
        this.currentArticleData = null;

        try {
            const response = await fetch('/api/proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({ url: url })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Network error');
            }

            const data = await response.json();
            
            // 核心修复：解析返回的 JSON 字符串
            // API 可能返回 { result: "{\"title\":\"...\"}" } 这种嵌套结构
            let articleData;
            try {
                articleData = JSON.parse(data.result);
            } catch (e) {
                // 如果不是 JSON，可能是纯文本，做兼容处理
                articleData = { title: '提取结果', author: 'Unknown', date: '', markdown: data.result, url: url };
            }

            this.currentArticleData = articleData;
            this.renderResult(articleData);
            
        } catch (error) {
            console.error(error);
            alert(`${CONFIG.texts.errorTitle}: ${error.message}`);
        } finally {
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
        }
    }

    renderResult(data) {
        const resultArea = document.getElementById('resultArea');
        
        // 填充元数据
        document.getElementById('articleTitle').textContent = data.title || '无标题';
        document.getElementById('articleAuthor').textContent = data.author ? `作者: ${data.author}` : '';
        document.getElementById('articleDate').textContent = data.date || '';
        document.getElementById('articleUrl').href = data.url || '#';
        document.getElementById('rawMarkdown').value = data.markdown || '';

        // 使用 Marked.js 渲染 Markdown
        // 确保 marked 已在全局加载
        if (typeof marked !== 'undefined') {
            document.getElementById('renderedContent').innerHTML = marked.parse(data.markdown || '');
        } else {
            document.getElementById('renderedContent').textContent = data.markdown;
        }

        resultArea.classList.remove('hidden');
    }

    handleExportWord() {
        if (!this.currentArticleData) return;

        const { title, author, date, url } = this.currentArticleData;
        const contentHtml = document.getElementById('renderedContent').innerHTML;

        // 构建一个完整的 HTML 文档，模拟 Word 格式
        // 增加 mso- 样式以优化 Word 中的显示
        const wordTemplate = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset="utf-8">
                <title>${title}</title>
                <style>
                    body { font-family: 'Microsoft YaHei', sans-serif; line-height: 1.6; }
                    h1 { font-size: 24pt; color: #333; text-align: center; margin-bottom: 20px; }
                    .meta { color: #888; text-align: center; font-size: 10pt; margin-bottom: 30px; }
                    img { max-width: 100%; height: auto; }
                    p { margin-bottom: 12pt; text-align: justify; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <div class="meta">
                    <p>作者：${author || '未知'} | 时间：${date || '未知'}</p>
                    <p>来源：<a href="${url}">${url}</a></p>
                </div>
                <hr/>
                <br/>
                ${contentHtml}
            </body>
            </html>
        `;

        // 创建 Blob 并下载
        const blob = new Blob([wordTemplate], { type: 'application/msword' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // 文件名处理，去除特殊字符
        const safeTitle = (title || 'article').replace(/[\\/:*?"<>|]/g, '_');
        link.href = downloadUrl;
        link.download = `${safeTitle}.doc`; // 使用 .doc 兼容性最好，Word 会自动识别 HTML 内容
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
    }
}

new PawenzhangApp();
