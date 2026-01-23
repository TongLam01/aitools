/**
 * Pawenzhang 主程序
 * 路径: /js/pawenzhang.js
 * 包含: 1.配置/提示词 2.环境检查 3.业务逻辑
 */

// ==========================================
// PART 1: 提示词与配置 (CONFIG)
// ==========================================
const CONFIG = {
    // 界面文本/提示词
    texts: {
        appTitle: "Pawenzhang",
        appSubtitle: "网页文章转 Markdown 工具",
        inputPlaceholder: "在此粘贴文章链接 (如微信公众号, 知乎等)...",
        actionBtn: "立即提取",
        processing: "正在解析中...",
        copySuccess: "Markdown 已复制到剪贴板",
        copyFail: "复制失败，请手动复制",
        errorTitle: "解析失败",
        modalTitle: "配置 Metaso API Key",
        saveBtn: "保存连接",
        howToGet: "如何获取 API Key?",
        emptyUrl: "请输入有效的网址",
        missingKey: "请先点击右上角设置 API Key"
    },
    // 外部链接
    links: {
        tutorial: "https://www.aibox6.com/jiaocheng.html"
    },
    // 安全/限制配置
    security: {
        allowedDomains: ['aibox6.com', 'www.aibox6.com', 'localhost', '127.0.0.1']
    }
};

// ==========================================
// PART 2: 环境安全检查
// ==========================================
(function checkDomain() {
    const currentDomain = window.location.hostname;
    // 如果不在允许的域名列表中，给与警告或阻止运行
    if (!CONFIG.security.allowedDomains.includes(currentDomain)) {
        console.warn(`Pawenzhang Warning: Domain [${currentDomain}] is not authorized.`);
        // 严格模式下可取消下方注释以禁用页面：
        // document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;"><h1>403 Forbidden: Invalid Domain</h1></div>';
    }
})();

// ==========================================
// PART 3: 核心业务逻辑 (App)
// ==========================================
class PawenzhangApp {
    constructor() {
        this.apiKey = localStorage.getItem('metaso_api_key') || '';
        this.initUI();
        this.bindEvents();
        this.updateStatus();
    }

    // 初始化界面文本
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

    // 绑定交互事件
    bindEvents() {
        const modal = document.getElementById('settingsModal');
        const modalContent = document.getElementById('modalContent');
        const openModal = () => {
            modal.classList.remove('hidden');
            document.getElementById('apiKeyInput').value = this.apiKey;
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modalContent.classList.remove('scale-95');
                modalContent.classList.add('scale-100');
            }, 10);
        };
        const closeModal = () => {
            modal.classList.add('opacity-0');
            modalContent.classList.remove('scale-100');
            modalContent.classList.add('scale-95');
            setTimeout(() => modal.classList.add('hidden'), 200);
        };

        // Modal 事件
        document.getElementById('apiKeyBtn').addEventListener('click', openModal);
        document.getElementById('cancelBtn').addEventListener('click', closeModal);
        document.getElementById('saveKeyBtn').addEventListener('click', () => {
            const val = document.getElementById('apiKeyInput').value.trim();
            if (val) {
                this.apiKey = val;
                localStorage.setItem('metaso_api_key', val);
                this.updateStatus();
                closeModal();
            }
        });

        // 核心功能事件
        document.getElementById('extractBtn').addEventListener('click', () => this.handleExtract());
        
        // 复制功能
        document.getElementById('copyBtn').addEventListener('click', async () => {
            const text = document.getElementById('outputContent').textContent;
            try {
                await navigator.clipboard.writeText(text);
                const originalText = CONFIG.texts.actionBtn; 
                // 临时改变按钮文字提示成功
                const btn = document.getElementById('copyBtn');
                const oldText = btn.textContent;
                btn.textContent = CONFIG.texts.copySuccess;
                btn.classList.add('text-green-600');
                setTimeout(() => {
                    btn.textContent = oldText;
                    btn.classList.remove('text-green-600');
                }, 2000);
            } catch (err) {
                alert(CONFIG.texts.copyFail);
            }
        });
    }

    // 更新呼吸灯状态
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

    // 处理提取请求
    async handleExtract() {
        const urlInput = document.getElementById('urlInput');
        const btn = document.getElementById('extractBtn');
        const resultArea = document.getElementById('resultArea');
        const output = document.getElementById('outputContent');
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

        // Loading 状态
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span>${CONFIG.texts.processing}</span>`;
        btn.disabled = true;
        resultArea.classList.add('hidden');
        output.textContent = '';

        try {
            // 调用 Vercel Serverless Function 代理
            // 这里包含心跳/超时逻辑是在后端处理的，前端只需等待结果
            const response = await fetch('/api/pawenzhangproxy', {
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
            resultArea.classList.remove('hidden');
            output.textContent = data.result || "未获取到内容";
            
        } catch (error) {
            console.error(error);
            alert(`${CONFIG.texts.errorTitle}: ${error.message}`);
        } finally {
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
        }
    }
}

// 启动应用
new PawenzhangApp();