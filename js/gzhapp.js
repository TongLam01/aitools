/** GZH AI Editor v2.3 Stable */

const ALLOWED = ['aibox6.com', 'www.aibox6.com', 'localhost', '127.0.0.1'];
if (!ALLOWED.includes(window.location.hostname)) document.body.innerHTML = "Domain Denied.";

let activeBlockEl = null;
let newDraftContent = "";

// 初始化
window.addEventListener('DOMContentLoaded', () => {
    const key = localStorage.getItem('ds_api_key_v1');
    if (key && document.getElementById('apiKeyInput')) {
        document.getElementById('apiKeyInput').value = key;
        updateApiLight(true);
    }
    
    // 监听滚动，确保工具栏跟随
    const view = document.getElementById('editorView');
    if(view) {
        view.addEventListener('scroll', () => {
            if(activeBlockEl) positionToolbar(activeBlockEl);
            else document.getElementById('floatingBar').style.display = 'none';
        });
    }
});

/* --- UI Helpers --- */
function toggleApiModal(show) { document.getElementById('apiModal').classList.toggle('hidden', !show); }
function updateApiLight(ok) {
    const dot = document.getElementById('statusDot');
    if(dot) dot.className = `w-3 h-3 rounded-full ${ok ? 'breathing-green' : 'breathing-red'}`;
}
function saveApiKey() {
    const val = document.getElementById('apiKeyInput').value.trim();
    if(!val.startsWith('sk-')) return alert('Key 无效');
    localStorage.setItem('ds_api_key_v1', val);
    updateApiLight(true);
    toggleApiModal(false);
}
function checkKeyOnFocus() { if(!localStorage.getItem('ds_api_key_v1')) toggleApiModal(true); }

/* --- 字数统计逻辑 (新) --- */
function updateWordCount(el) {
    const len = el.value.length;
    const label = document.getElementById('charCount');
    label.innerText = `${len} / 150`;
    label.className = `text-xs font-bold ${len >= 150 ? 'text-green-500' : 'text-red-400'}`;
}

// 参考风格字数限制
function updateRefLimit(el) {
    if (el.value.length > 1000) {
        el.value = el.value.substring(0, 1000); // 自动截断
    }
    document.getElementById('refCount').innerText = `${el.value.length}/1000`;
}

// 模拟器总字数统计
function updateTotalWords() {
    const nodes = document.querySelectorAll('.block-node');
    let total = 0;
    nodes.forEach(n => total += n.innerText.length);
    document.getElementById('totalWords').innerText = `共 ${total} 字`;
}

/* --- 块生成与交互 --- */
function createAtomicBlock(content = "") {
    const div = document.createElement('div');
    div.className = "block-node text-justify";
    div.innerText = content;
    
    div.onclick = (e) => {
        e.stopPropagation();
        if (activeBlockEl) activeBlockEl.classList.remove('active');
        activeBlockEl = div;
        activeBlockEl.classList.add('active');
        positionToolbar(div);
    };
    return div;
}

// 核心：工具栏定位算法
function positionToolbar(el) {
    const bar = document.getElementById('floatingBar');
    const view = document.getElementById('editorView');
    
    // 计算位置：块的 Top (相对容器) - 容器滚动距离 + 块高度 + 间距
    // 注意：editorView 有 padding-top: 60px，需要修正
    const relativeTop = el.offsetTop - view.scrollTop + el.offsetHeight + 10;
    
    // 边界检查：如果超出底部，就不显示了
    if (relativeTop > view.offsetHeight || relativeTop < 60) {
        bar.style.display = 'none';
        return;
    }

    bar.style.display = 'flex';
    bar.style.top = `${relativeTop}px`;
    bar.style.left = '50%'; // CSS transform handled centering
}

/* --- 生成逻辑 --- */
async function runGeneration() {
    const key = localStorage.getItem('ds_api_key_v1');
    if (!key) return toggleApiModal(true);
    const mat = document.getElementById('material').value;
    if (mat.length < 150) return alert("素材不足 150 字");

    const btn = document.getElementById('genBtn');
    const view = document.getElementById('editorView');
    btn.disabled = true;
    btn.innerText = "DeepSeek 正在思考...";
    view.innerHTML = "";
    updateTotalWords(); // Reset

    const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";
    const params = {
        topic: getVal('topic'), style: getVal('style'),
        referenceStyle: getVal('refStyle'), material: mat,
        taboos: getVal('taboos'), lengthRange: getVal('lengthRange')
    };

    try {
        const res = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [{role:"system",content:GZH_PROMPTS.system},{role:"user",content:GZH_PROMPTS.generate(params)}],
                stream: true
            })
        });

        const reader = res.body.getReader();
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
                        }
                        // 每次有新字，更新滚动和统计
                        view.scrollTop = view.scrollHeight;
                        updateTotalWords();
                    } catch (e) {}
                }
            }
        }
    } catch (e) {
        view.innerHTML = `<div class='text-red-500 p-4'>Error: ${e.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.innerText = "✨ 开始创作";
    }
}

/* --- 块操作 (重写/润色) --- */
async function handleBlockAction(btn, action) {
    if (!activeBlockEl) return;
    const key = localStorage.getItem('ds_api_key_v1');
    const original = activeBlockEl.innerText;
    
    // UI Loading State
    const oldText = btn.innerText;
    btn.innerText = "...";
    btn.classList.add('btn-loading');
    
    try {
        const res = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [{role:"system",content:GZH_PROMPTS.system},{role:"user",content:GZH_PROMPTS.blockAction(action, original, original)}]
            })
        });
        const data = await res.json();
        newDraftContent = data.choices[0].message.content;
        
        document.getElementById('oldTextPreview').innerText = original;
        document.getElementById('newTextPreview').innerText = newDraftContent;
        document.getElementById('compareModal').classList.remove('hidden');
    } catch (e) {
        alert("请求超时");
    } finally {
        btn.innerText = oldText;
        btn.classList.remove('btn-loading');
        document.getElementById('floatingBar').style.display = 'none';
    }
}

function closeCompareModal() { document.getElementById('compareModal').classList.add('hidden'); }
function confirmReplace() {
    if (activeBlockEl && newDraftContent) {
        activeBlockEl.innerText = newDraftContent;
        updateTotalWords(); // Update count after replace
    }
    closeCompareModal();
}
function copyAll() {
    const text = Array.from(document.querySelectorAll('.block-node')).map(e => e.innerText).join('\n\n');
    navigator.clipboard.writeText(text).then(() => alert("已复制"));
}
window.onclick = (e) => {
    if (!e.target.closest('.block-node') && !e.target.closest('#floatingBar') && !e.target.closest('#apiModal')) {
        if (activeBlockEl) activeBlockEl.classList.remove('active');
        document.getElementById('floatingBar').style.display = 'none';
    }
};
