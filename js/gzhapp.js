// 域名限制逻辑
const ALLOWED_DOMAINS = ['aibox6.com', 'www.aibox6.com', 'localhost'];
if (!ALLOWED_DOMAINS.includes(window.location.hostname)) {
    document.body.innerHTML = `<div style="padding:100px;text-align:center;font-family:sans-serif;">
        <h2>域名未授权</h2><p>请访问 aibox6.com 使用正版工具。</p></div>`;
}

let activeBlockEl = null;

// 初始化检测 Key
window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('ds_api_key');
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
        updateStatus(true);
    }
});

function updateStatus(ok) {
    const dot = document.getElementById('statusDot');
    dot.className = ok ? "w-2.5 h-2.5 rounded-full breathing-green" : "w-2.5 h-2.5 rounded-full breathing-red";
}

function openSettings() { document.getElementById('settingsModal').classList.remove('hidden'); }
function closeSettings() { document.getElementById('settingsModal').classList.add('hidden'); }

function saveSettings() {
    const key = document.getElementById('apiKey').value;
    if (key.startsWith('sk-')) {
        localStorage.setItem('ds_api_key', key);
        updateStatus(true);
        closeSettings();
    } else {
        alert("请输入有效的 DeepSeek API Key");
    }
}

// 原子化块渲染
function createBlock(content) {
    const div = document.createElement('div');
    div.className = "block-hover";
    div.innerText = content;
    div.onclick = (e) => {
        e.stopPropagation();
        activeBlockEl = div;
        showMenu(e);
    };
    return div;
}

function showMenu(e) {
    const menu = document.getElementById('blockMenu');
    menu.classList.remove('hidden');
    menu.style.top = `${e.clientY - 50}px`;
    menu.style.left = `${Math.min(e.clientX, window.innerWidth - 200)}px`;
}

// 核心生成功能
async function runGeneration() {
    const material = document.getElementById('material').value;
    if (material.length < 200) return alert("素材字数不足200字，为了文章质量请补充内容。");

    const key = localStorage.getItem('ds_api_key');
    if (!key) return openSettings();

    const btn = document.getElementById('genBtn');
    const editor = document.getElementById('editorView');
    
    btn.disabled = true;
    btn.innerText = "正在调遣 DeepSeek 深度撰稿...";
    editor.innerHTML = ""; // 清空预览

    const formData = {
        topic: document.getElementById('topic').value,
        style: document.getElementById('style').value,
        referenceStyle: document.getElementById('refStyle').value,
        material: material,
        taboos: document.getElementById('taboos').value,
        lengthRange: document.getElementById('lengthRange').value
    };

    try {
        // 使用流式传输防止 Vercel 超时
        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: GZH_PROMPTS.system },
                    { role: "user", content: GZH_PROMPTS.generate(formData) }
                ],
                stream: true // 开启流式
            })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let currentBlock = createBlock("");
        editor.appendChild(currentBlock);

        while (true) {
            /* Vercel Heartbeat Comment: Keep Connection Alive */
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");
            
            for (const line of lines) {
                if (line.startsWith("data: ") && line !== "data: [DONE]") {
                    const data = JSON.parse(line.substring(6));
                    const delta = data.choices[0].delta.content || "";
                    
                    if (delta.includes("\n")) {
                        currentBlock = createBlock("");
                        editor.appendChild(currentBlock);
                    } else {
                        currentBlock.innerText += delta;
                        // 自动滚动到底部
                        editor.scrollTop = editor.scrollHeight;
                    }
                }
            }
        }
    } catch (err) {
        editor.innerHTML = `<p class="text-red-500">生成出错: ${err.message}</p>`;
    } finally {
        btn.disabled = false;
        btn.innerText = "重新生成全文";
    }
}

// 块操作功能
async function applyBlockAction(action) {
    if (!activeBlockEl) return;
    const key = localStorage.getItem('ds_api_key');
    const menu = document.getElementById('blockMenu');
    menu.classList.add('hidden');

    const originalText = activeBlockEl.innerText;
    activeBlockEl.classList.add('opacity-50', 'animate-pulse');

    try {
        const resp = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: GZH_PROMPTS.system },
                    { role: "user", content: GZH_PROMPTS.blockAction(action, originalText, originalText) }
                ]
            })
        });
        const json = await resp.json();
        activeBlockEl.innerText = json.choices[0].message.content;
    } catch (e) {
        alert("局部重写失败，请重试");
    } finally {
        activeBlockEl.classList.remove('opacity-50', 'animate-pulse');
    }
}

function copyAll() {
    const text = Array.from(document.querySelectorAll('.block-hover')).map(el => el.innerText).join('\n\n');
    navigator.clipboard.writeText(text).then(() => alert("复制成功！可以直接粘贴到公众号后台。"));
}

// 点击空白隐藏菜单
window.onclick = () => document.getElementById('blockMenu').classList.add('hidden');
