/** GZH AI Editor v3.0 - WeChat Pro */

const ALLOWED = ['aibox6.com', 'www.aibox6.com', 'localhost', '127.0.0.1'];
if (!ALLOWED.includes(window.location.hostname)) document.body.innerHTML = "Domain Denied.";

let activeBlockEl = null;
let newDraftContent = "";

// 1. 初始化
window.addEventListener('DOMContentLoaded', () => {
    const key = localStorage.getItem('ds_api_key_v1');
    if (key && document.getElementById('apiKeyInput')) {
        document.getElementById('apiKeyInput').value = key;
        updateApiLight(true);
    }
    
    // 监听滚动：保持工具栏吸附
    const view = document.getElementById('editorView');
    if(view) {
        view.addEventListener('scroll', () => {
            if(activeBlockEl) positionToolbar(activeBlockEl);
            else document.getElementById('floatingBar').style.display = 'none';
        });
    }
});

/* --- UI 辅助函数 --- */
function toggleApiModal(show) { document.getElementById('apiModal').classList.toggle('hidden', !show); }
function updateApiLight(ok) {
    const dot = document.getElementById('statusDot');
    if(dot) {
        dot.className = `w-2.5 h-2.5 rounded-full ${ok ? 'breathing-wx' : 'bg-red-500'}`;
    }
}
function saveApiKey() {
    const val = document.getElementById('apiKeyInput').value.trim();
    if(!val.startsWith('sk-')) return alert('Key 格式不正确');
    localStorage.setItem('ds_api_key_v1', val);
    updateApiLight(true);
    toggleApiModal(false);
}
function checkKeyOnFocus() { if(!localStorage.getItem('ds_api_key_v1')) toggleApiModal(true); }

/* --- 统计逻辑 (修复版) --- */
function updateWordCount(el) {
    const len = el.value.length;
    const label = document.getElementById('charCount');
    label.innerText = `${len} / 150`;
    if(len >= 150) {
        label.classList.remove('text-red-500', 'bg-red-50');
        label.classList.add('text-[#07C160]', 'bg-green-50');
    } else {
        label.classList.add('text-red-500', 'bg-red-50');
        label.classList.remove('text-[#07C160]', 'bg-green-50');
    }
}

// 修复：参考风格字数
function updateRefLimit(el) {
    if (el.value.length > 1000) el.value = el.value.substring(0, 1000);
    document.getElementById('refCount').innerText = `${el.value.length}/1000`;
}

// 修复：总字数 (遍历 DOM)
function updateTotalWords() {
    const nodes = document.querySelectorAll('.block-node');
    let total = 0;
    nodes.forEach(n => total += n.innerText.trim().length);
    document.getElementById('totalWords').innerText = `公众号预览 (${total}字)`;
}

/* --- 核心交互 --- */
function createAtomicBlock(content = "") {
    const div = document.createElement('div');
    div.className = "block-node";
    div.innerText = content;
    
    div.onclick = (e) => {
        e.stopPropagation();
        // 视觉切换
        if (activeBlockEl) activeBlockEl.classList.remove('active');
        activeBlockEl = div;
        activeBlockEl.classList.add('active');
        
        // 强制显示并定位
        positionToolbar(div);
    };
    return div;
}

// 精准定位工具栏
function positionToolbar(el) {
    const bar = document.getElementById('floatingBar');
    const view = document.getElementById('editorView');
    
    // 计算相对位置：Element Top - Scroll Top + Element Height + Margin
    // 修正：减去 view 的 padding-top (20px) 确保位置准确
    const relativeTop = el.offsetTop - view.scrollTop + el.offsetHeight + 15; 
    
    // 隐藏逻辑：如果滚出屏幕太远
    if (relativeTop < 0 || relativeTop > view.offsetHeight) {
        bar.style.display = 'none';
        return;
    }

    bar.style.display = 'flex';
    bar.style.top = `${relativeTop}px`;
    bar.style.left = '50%'; // CSS transform 会自动居中
}

/* --- 生成逻辑 (实时统计) --- */
async function runGeneration() {
    const key = localStorage.getItem('ds_api_key_v1');
    if (!key) return toggleApiModal(true);
    const mat = document.getElementById('material').value;
    if (mat.length < 150) return alert("素材太少，建议写多点");

    const btn = document.getElementById('genBtn');
    const view = document.getElementById('editorView');
    btn.disabled = true;
    btn.innerText = "AI 正在创作...";
    view.innerHTML = "";
    updateTotalWords(); // 归零

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
                        // 核心修复：每次有新内容，都更新字数和滚动
                        updateTotalWords();
                        view.scrollTop = view.scrollHeight;
                    } catch (e) {}
                }
            }
        }
    } catch (e) {
        view.innerHTML = `<div class='text-red-500 p-4'>Error: ${e.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.innerText = "开始创作";
    }
}

/* --- 块操作 (修复工具栏消失Bug) --- */
async function handleBlockAction(btn, action) {
    if (!activeBlockEl) return;
    const key = localStorage.getItem('ds_api_key_v1');
    const original = activeBlockEl.innerText;
    
    // UI Loading
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
        alert("操作失败");
    } finally {
        // 恢复按钮状态
        btn.innerText = oldText;
        btn.classList.remove('btn-loading');
        
        // 修复关键：操作完成后，仅仅隐藏工具栏，但不销毁状态
        // 这样下次点击别的块时，onclick 会重新唤醒它
        document.getElementById('floatingBar').style.display = 'none';
    }
}

function closeCompareModal() { document.getElementById('compareModal').classList.add('hidden'); }

function confirmReplace() {
    if (activeBlockEl && newDraftContent) {
        activeBlockEl.innerText = newDraftContent;
        // 替换后字数变了，重新统计
        updateTotalWords();
    }
    closeCompareModal();
}

function copyAll() {
    const text = Array.from(document.querySelectorAll('.block-node')).map(e => e.innerText).join('\n\n');
    navigator.clipboard.writeText(text).then(() => alert("已复制全文"));
}

// 点击空白关闭
window.onclick = (e) => {
    if (!e.target.closest('.block-node') && !e.target.closest('#floatingBar') && !e.target.closest('#apiModal')) {
        if (activeBlockEl) activeBlockEl.classList.remove('active');
        document.getElementById('floatingBar').style.display = 'none';
        activeBlockEl = null; // 彻底重置
    }
};
