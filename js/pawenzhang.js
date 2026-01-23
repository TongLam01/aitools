/**
 * Pawenzhang 主程序 (调试增强版)
 * 路径: /js/pawenzhang.js
 */

const CONFIG = {
    texts: {
        appTitle: "Pawenzhang",
        appSubtitle: "网页文章导出工具",
        inputPlaceholder: "在此粘贴文章链接 (如微信公众号, 知乎等)...",
        actionBtn: "立即提取",
        processing: "正在解析中 (请稍候)...",
        copySuccess: "已复制",
        copyFail: "复制失败",
        errorTitle: "发生错误",
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
    if (!CONFIG.security.allowedDomains.includes(currentDomain) && currentDomain !== '') {
        console.warn(`[Security] Domain [${currentDomain}] is not authorized.`);
    }
})();

class PawenzhangApp {
    constructor() {
        this.apiKey = localStorage.getItem('metaso_api_key') || '';
        this.currentArticleData = null;
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

        document.getElementById('extractBtn').addEventListener('click', () => this.handleExtract());
        
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

        // --- Loading UI Start ---
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span>${CONFIG.texts.processing}</span>`;
        btn.disabled = true;
        resultArea.classList.add('hidden');
        this.currentArticleData = null;

        // 设置前端强制超时 (18秒，给后端Vercel一点缓冲)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 18000);

        try {
            console.log("正在请求 API...");
            
            const response = await fetch('/api/proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({ url: url }),
                signal: controller.signal
            });

            clearTimeout(timeoutId); // 清除超时计时器

            console.log(`API 响应状态: ${response.status}`);

            // 检查内容类型，防止解析 HTML 报错
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error("收到的非 JSON 响应:", text);
                
                if (response.status === 504) {
                    throw new Error("Metaso 解析时间过长，Vercel 网关超时 (504)。请重试或更换文章。");
                } else if (response.status === 404) {
                    throw new Error("找不到后端接口 (/api/proxy)。如果你在本地测试，请使用 'vercel dev' 而不是直接打开 HTML。");
                } else {
                    throw new Error(`服务器返回了错误格式的数据 (Code ${response.status})`);
                }
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Network error');
            }

            // 解析嵌套的 JSON 字符串
            let articleData;
            try {
                if (typeof data.result === 'object') {
                    articleData = data.result;
                } else {
                    articleData = JSON.parse(data.result);
                }
            } catch (e) {
                console.warn("JSON Parse warning, treating as text:", e);
                articleData = { title: '提取结果', author: 'Unknown', date: '', markdown: data.result, url: url };
            }

            console.log("解析成功:", articleData.title);
            this.currentArticleData = articleData;
            this.renderResult(articleData);
            
        } catch (error) {
            console.error("提取流程出错:", error);
            let msg = error.message;
            if (error.name === 'AbortError') {
                msg = "请求超时。网页内容可能过多，导致解析时间超过了限制。";
            }
            alert(`${CONFIG.texts.errorTitle}: ${msg}`);
        } finally {
            // 无论成功失败，恢复按钮状态
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
        }
    }

    renderResult(data) {
        const resultArea = document.getElementById('resultArea');
        
        document.getElementById('articleTitle').textContent = data.title || '无标题';
        document.getElementById('articleAuthor').textContent = data.author ? `作者: ${data.author}` : '';
        document.getElementById('articleDate').textContent = data.date || '';
        document.getElementById('articleUrl').href = data.url || '#';
        document.getElementById('rawMarkdown').value = data.markdown || '';

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
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <div class="meta">
                    <p>作者：${author || '未知'} | 时间：${date || '未知'}</p>
                    <p>来源：<a href="${url}">${url}</a></p>
                </div>
                <hr/><br/>
                ${contentHtml}
            </body>
            </html>
        `;

        const blob = new Blob([wordTemplate], { type: 'application/msword' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeTitle = (title || 'article').replace(/[\\/:*?"<>|]/g, '_');
        link.href = downloadUrl;
        link.download = `${safeTitle}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
    }
}

new PawenzhangApp();
