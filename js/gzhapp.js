/** GZH AI Editor v3.1 - Ultimate UX Fixes */

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
    
    // 滚动监听：实时调整工具栏位置
    const view = document.getElementById('editorView');
    if(view) {
        view.addEventListener('scroll', () => {
            if(activeBlockEl) positionToolbar(activeBlockEl);
            else document.getElementById('floatingBar').style.display = 'none';
        });
    }
});

/* --- Markdown 简易渲染器 (修复符号问题) --- */
function formatMD(text) {
    if (!text) return "";
    // 1. 加粗 **text** -> <b>text</b>
    let html = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    // 2. 列表 - item -> • item
    html = html.replace(/^\s*-\s+(.*)/gm, '• $1');
    // 3. 标题 ## -> <b> (公众号一般用加粗代替H2)
    html = html.replace(/^#+\s+(.*)/gm, '<b>$1</b>');
    // 4. 处理换行
    return html.replace(/\n/g, '<br>');
}

/* --- UI 辅助 --- */
function toggleApiModal(show) { document.getElementById('apiModal').classList.toggle('hidden', !show); }
function updateApiLight(ok) {
    const dot = document.getElementById('statusDot');
    if(dot) dot.className = `w-2.5 h-2.5 rounded-full ${ok ? 'breathing-wx' : 'bg-red-500'}`;
}
function saveApiKey() {
    const val = document.getElementById('apiKeyInput').value.trim();
    if(!val.startsWith('sk-')) return alert('Key 格式错误');
    localStorage.setItem('ds_api_key_v1', val);
    updateApiLight(true);
    toggleApiModal(false);
}
function checkKeyOnFocus() { if(!localStorage.getItem('ds_api_key_v1')) toggleApiModal(true); }

function updateWordCount(el) {
    const len = el.value.length;
    const label = document.getElementById('charCount');
    label.innerText = `${len} / 150`;
    if(len >= 150) {
        label.className = "text-xs font-bold text-[#07C160] bg-green-50 px-2 py-0.5 rounded";
    } else {
        label.className = "text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded";
    }
}
function updateRefLimit(el) {
    if (el.value.length > 1000) el.value = el.value.substring(0, 1000);
    document.getElementById('refCount').innerText = `${el.value.length}/1000`;
}
function updateTotalWords() {
    const nodes = document.querySelectorAll('.block-node');
    let total = 0;
    nodes.forEach(n => total += n.innerText.trim().length);
    document.getElementById('totalWords').innerText = `公众号预览 (${total}字)`;
}

/* --- 核心交互 --- */
function createAtomicBlock(rawText = "") {
    const div = document.createElement('div');
    div.className = "block-node";
    div.innerHTML = formatMD(rawText); // 使用 Markdown 渲染
    div.dataset.raw = rawText; // 存储原始文本供重写使用
    
    div.onclick = (e) => {
        e.stopPropagation();
        if (activeBlockEl) activeBlockEl.classList.remove('active');
        activeBlockEl = div;
        activeBlockEl.classList.add('active');
        positionToolbar(div);
    };
    return div;
}

// 智能定位：防遮挡算法
function positionToolbar(el) {
    const bar = document.getElementById('floatingBar');
    const view = document.getElementById('editorView');
    
    const elRect = el.getBoundingClientRect();
    const viewRect = view.getBoundingClientRect();
    
    // 默认显示在下方
    let top = elRect.bottom - viewRect.top + view.scrollTop + 10;
    
    // 检查底部是否溢出
    const barHeight = 50; 
    const isOverflowBottom = (elRect.bottom + barHeight) > viewRect.bottom;
    
    if (isOverflowBottom) {
        // 翻转到上方
        top = elRect.top - viewRect.top + view.scrollTop - barHeight - 10;
        bar.classList.remove('arrow-down');
        bar.classList.add('arrow-up');
    } else {
        bar.classList.remove('arrow-up');
        bar.classList.add('arrow-down');
    }

    bar.style.display = 'flex';
    bar.style.top = `${top}px`;
    bar.style.left = '50%';
}

/* --- 生成逻辑 --- */
async function runGeneration() {
    const key = localStorage.getItem('ds_api_key_v1');
    if (!key) return toggleApiModal(true);
    const mat = document.getElementById('material').value;
    if (mat.length < 150) return alert("素材太少");

    const btn = document.getElementById('genBtn');
    const view = document.getElementById('editorView');
    btn.disabled = true;
    btn.innerText = "AI 正在创作...";
    view.innerHTML = "";
    updateTotalWords();

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
        let rawBuffer = "";

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
                            // 换行时，完成上一块的渲染
                            currentBlock.innerHTML = formatMD(rawBuffer);
                            currentBlock.dataset.raw = rawBuffer;
                            
                            // 开启新块
                            rawBuffer = ""; 
                            currentBlock = createAtomicBlock("");
                            view.appendChild(currentBlock);
                        } else {
                            rawBuffer += text;
                            // 流式输出时暂不渲染Markdown，保持流畅，只更新文本
                            currentBlock.innerText = rawBuffer;
                        }
                        updateTotalWords();
                        view.scrollTop = view.scrollHeight;
                    } catch (e) {}
                }
            }
        }
        // 最后一段渲染
        if(currentBlock) {
             currentBlock.innerHTML = formatMD(rawBuffer);
             currentBlock.dataset.raw = rawBuffer;
        }

    } catch (e) {
        view.innerHTML = `<div class='text-red-500 p-4'>Error: ${e.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.innerText = "开始创作";
    }
}

/* --- 块操作 --- */
async function handleBlockAction(btn, action) {
    if (!activeBlockEl) return;
    const key = localStorage.getItem('ds_api_key_v1');
    const original = activeBlockEl.dataset.raw || activeBlockEl.innerText; // 优先取raw
    
    // UI 反馈：流光特效 + 按钮状态
    const oldText = btn.innerText;
    btn.innerHTML = `<svg class="animate-spin h-4 w-4 mr-1 inline" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>思考中`;
    activeBlockEl.classList.add('scanning-effect');
    
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
        
        // 对比弹窗显示 Markdown 渲染后的效果
        document.getElementById('oldTextPreview').innerHTML = formatMD(original);
        document.getElementById('newTextPreview').innerHTML = formatMD(newDraftContent);
        document.getElementById('compareModal').classList.remove('hidden');
    } catch (e) {
        alert("请求超时");
    } finally {
        btn.innerText = oldText;
        activeBlockEl.classList.remove('scanning-effect');
        document.getElementById('floatingBar').style.display = 'none';
    }
}

function closeCompareModal() { document.getElementById('compareModal').classList.add('hidden'); }
function confirmReplace() {
    if (activeBlockEl && newDraftContent) {
        activeBlockEl.innerHTML = formatMD(newDraftContent);
        activeBlockEl.dataset.raw = newDraftContent;
        updateTotalWords();
    }
    closeCompareModal();
}

function copyAll() {
    const nodes = document.querySelectorAll('.block-node');
    // 复制时还原为纯文本（带换行）
    const text = Array.from(nodes).map(e => e.innerText).join('\n\n');
    navigator.clipboard.writeText(text).then(() => alert("已复制"));
}

window.onclick = (e) => {
    if (!e.target.closest('.block-node') && !e.target.closest('#floatingBar') && !e.target.closest('#apiModal')) {
        if (activeBlockEl) activeBlockEl.classList.remove('active');
        document.getElementById('floatingBar').style.display = 'none';
        activeBlockEl = null;
    }
};
