/** * GZH AI Editor Core Logic
 * Author: Product Manager Team
 */

// 1. 域名校验
const ALLOWED = ['aibox6.com', 'www.aibox6.com', 'localhost', '127.0.0.1'];
if (!ALLOWED.includes(window.location.hostname)) {
    document.body.innerHTML = "<div style='padding:100px;text-align:center;'>Access Denied. Please visit aibox6.com</div>";
}

let activeBlockEl = null;
let newDraftContent = "";

// 2. 初始化：读取 Key 并更新状态
window.addEventListener('DOMContentLoaded', () => {
    const key = localStorage.getItem('ds_api_key_v1');
    if (key) {
        document.getElementById('apiKeyInput').value = key;
        updateApiLight(true);
    } else {
        updateApiLight(false);
    }
});

// 3. 基础 UI 交互
function toggleApiModal(show) {
    document.getElementById('apiModal').classList.toggle('hidden', !show);
}

function updateApiLight(ok) {
    const dot = document.getElementById('statusDot');
    dot.className = `w-3 h-3 rounded-full ${ok ? 'breathing-green' : 'breathing-red'}`;
}

// 保存 API Key 逻辑 (修复保存无反应问题)
function saveApiKey() {
    const keyInput = document.getElementById('apiKeyInput');
    const key = keyInput.value.trim();
    
    if (!key || !key.startsWith('sk-')) {
        alert("请输入有效的 DeepSeek API Key (以 sk- 开头)");
        return;
    }

    try {
        localStorage.setItem('ds_api_key_v1', key);
        updateApiLight(true);
        toggleApiModal(false);
        console.log("API Key saved successfully.");
    } catch (e) {
        alert("保存失败，请检查浏览器 LocalStorage 权限");
    }
}

// 主题输入框焦点检查 (修复校验不及时问题)
function checkKeyOnFocus() {
    const key = localStorage.getItem('ds_api_key_v1');
    if (!key) {
        toggleApiModal(true);
        // 给用户一个友好的提示
        console.log("Prompting user for API key...");
    }
}

// 素材字数统计
function updateWordCount(textarea) {
    const count = textarea.value.length;
    const label = document.getElementById('charCount');
    label.innerText = `${count} / 150`;
    if (count >= 150) {
        label.classList.replace('text-red-400', 'text-green-500');
        label.classList.add('font-bold');
    } else {
        label.classList.replace('text-green-500', 'text-red-400');
        label.classList.remove('font-bold');
    }
}

// 4. 原子化块逻辑
function createAtomicBlock(content = "") {
    const div = document.createElement('div');
    div.className = "block-node text-gray-800 leading-relaxed";
    div.innerText = content;
    div.onclick = (e) => {
        e.stopPropagation();
        if (activeBlockEl) activeBlockEl.classList.remove('active');
        activeBlockEl = div;
        activeBlockEl.classList.add('active');
        
        // 显示浮动菜单
        const bar = document.getElementById('floatingBar');
        bar.classList.remove('hidden');
        bar.style.top = `${div.offsetTop - 50}px`;
        bar.style.right = `10px`;
    };
    return div;
}

// 5. 核心生成流程 (DeepSeek Stream)
async function runGeneration() {
    const key = localStorage.getItem('ds_api_key_v1');
    if (!key) {
        toggleApiModal(true);
        return;
    }

    const material = document.getElementById('material').value;
    if (material.length < 150) {
        alert("写作素材不足150字，AI可能无法生成高质量内容。");
        return;
    }

    const btn = document.getElementById('genBtn');
    const view = document.getElementById('editorView');
    
    btn.disabled = true;
    btn.innerText = "DeepSeek 正在撰写中...";
    view.innerHTML = ""; // 清空预览

    const params = {
        topic: document.getElementById('topic').value,
        style: document.getElementById('style').value,
        referenceStyle: document.getElementById('refStyle').value,
        material: material,
        taboos: document.getElementById('taboos').value,
        lengthRange: document.getElementById('lengthRange').value
    };

    try {
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
                    { role: "user", content: GZH_PROMPTS.generate(params) }
                ],
                stream: true
            })
        });

        if (!response.ok) throw new Error("API请求失败，请检查Key有效性");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let currentBlock = createAtomicBlock("");
        view.appendChild(currentBlock);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (let line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const json = JSON.parse(line.substring(6));
                        const text = json.choices[0].delta.content || "";
                        if (text.includes('\n')) {
                            currentBlock = createAtomicBlock("");
                            view.appendChild(currentBlock);
                        } else {
                            currentBlock.innerText += text;
                            view.scrollTop = view.scrollHeight;
                        }
                    } catch (e) {}
                }
            }
        }
    } catch (err) {
        view.innerHTML = `<div class='text-red-500 p-4 font-bold'>生成失败: ${err.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.innerText = "重新生成全文";
    }
}

// 6. 块操作功能
async function handleBlockAction(action) {
    if (!activeBlockEl) return;
    const key = localStorage.getItem('ds_api_key_v1');
    const original = activeBlockEl.innerText;
    
    activeBlockEl.classList.add('animate-pulse', 'bg-blue-50/50');
    document.getElementById('floatingBar').classList.add('hidden');

    try {
        const res = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: GZH_PROMPTS.system },
                    { role: "user", content: GZH_PROMPTS.blockAction(action, original, original) }
                ]
            })
        });
        const data = await res.json();
        newDraftContent = data.choices[0].message.content;
        
        // 弹出对比弹窗
        document.getElementById('oldTextPreview').innerText = original;
        document.getElementById('newTextPreview').innerText = newDraftContent;
        document.getElementById('compareModal').classList.remove('hidden');
    } catch (e) {
        alert("微调失败，请重试");
    } finally {
        activeBlockEl.classList.remove('animate-pulse', 'bg-blue-50/50');
    }
}

function closeCompareModal() { document.getElementById('compareModal').classList.add('hidden'); }
function confirmReplace() {
    if (activeBlockEl && newDraftContent) {
        activeBlockEl.innerText = newDraftContent;
    }
    closeCompareModal();
}

// 点击空白隐藏菜单
window.onclick = (e) => {
    if (!e.target.closest('.block-node') && !e.target.closest('#floatingBar') && !e.target.closest('#apiModal')) {
        if (activeBlockEl) activeBlockEl.classList.remove('active');
        document.getElementById('floatingBar').classList.add('hidden');
    }
};
