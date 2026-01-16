/** GZH AI Editor v3.4 - Mobile Adaptation */

const ALLOWED = ['aibox6.com', 'www.aibox6.com', 'localhost', '127.0.0.1'];
if (!ALLOWED.includes(window.location.hostname)) document.body.innerHTML = "Domain Denied.";

let activeBlockEl = null;
let newDraftContent = "";

window.addEventListener('DOMContentLoaded', () => {
    const key = localStorage.getItem('ds_api_key_v1');
    if (key && document.getElementById('apiKeyInput')) {
        document.getElementById('apiKeyInput').value = key;
        updateApiLight(true);
    }
    
    // 监听滚动
    const view = document.getElementById('editorView');
    if(view) {
        view.addEventListener('scroll', () => {
            if(activeBlockEl) {
                requestAnimationFrame(() => positionToolbar(activeBlockEl));
            } else {
                document.getElementById('floatingBar').style.display = 'none';
            }
        });
        
        view.addEventListener('click', (e) => {
            const block = e.target.closest('.block-node');
            if (block) {
                e.stopPropagation();
                activateBlock(block);
            }
        });
    }
});

function formatMD(text) {
    if (!text) return "";
    let html = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/^\s*-\s+(.*)/gm, '• $1');
    html = html.replace(/^#+\s+(.*)/gm, '<b>$1</b>');
    return html.replace(/\n/g, '<br>');
}

/* UI Helpers */
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
    label.className = len >= 150 ? "text-xs font-bold text-[#07C160] bg-green-50 px-2 py-0.5 rounded" : "text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded";
}
function updateRefLimit(el) {
    if (el.value.length > 1000) el.value = el.value.substring(0, 1000);
    document.getElementById('refCount').innerText = `${el.value.length}/1000`;
}
function updateTotalWords() {
    const nodes = document.querySelectorAll('.block-node');
    let total = 0;
    nodes.forEach(n => total += n.innerText.trim().length);
    document.getElementById('totalWords').innerText = `预览 (${total}字)`;
}

/* 核心交互 */
function createAtomicBlock(rawText = "") {
    const div = document.createElement('div');
    div.className = "block-node";
    div.innerHTML = formatMD(rawText);
    div.dataset.raw = rawText;
    return div;
}

function activateBlock(div) {
    if (activeBlockEl) activeBlockEl.classList.remove('active');
    activeBlockEl = div;
    activeBlockEl.classList.add('active');
    positionToolbar(div);
}

function positionToolbar(el) {
    const bar = document.getElementById('floatingBar');
    const shell = document.querySelector('.iphone-shell');
    
    const elRect = el.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    
    let top = elRect.bottom - shellRect.top + 8; 
    
    const barHeight = 45;
    // 边界检测：因为底部 Padding 够大，理论上不会溢出，但保留此逻辑
    if (top + barHeight > shellRect.height) {
        top = elRect.top - shellRect.top - barHeight - 8;
        bar.className = 'arrow-up flex space-x-1'; 
    } else {
        bar.className = 'arrow-down flex space-x-1';
    }

    bar.style.display = 'flex';
    bar.style.top = `${top}px`;
    bar.style.left = '50%'; 
}

/* 生成逻辑 */
async function runGeneration() {
    const key = localStorage.getItem('ds_api_key_v1');
    if (!key) return toggleApiModal(true);
    const mat = document.getElementById('material').value;
    if (mat.length < 150) return alert("素材不足150字");

    const btn = document.getElementById('genBtn');
    const view = document.getElementById('editorView');
    btn.disabled = true;
    btn.innerText = "DeepSeek 思考中...";
    view.innerHTML = "";
    updateTotalWords();

    const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";
    
    const params = {
        topic: getVal('topic'), 
        style: getVal('style'),
        referenceStyle: getVal('refStyle'), 
        material: mat,
        taboos: getVal('taboos'),
        lengthRange: getVal('lengthRange')
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
                            currentBlock.innerHTML = formatMD(rawBuffer);
                            currentBlock.dataset.raw = rawBuffer;
                            rawBuffer = ""; 
                            currentBlock = createAtomicBlock("");
                            view.appendChild(currentBlock);
                        } else {
                            rawBuffer += text;
                            currentBlock.innerText = rawBuffer;
                        }
                        updateTotalWords();
                        view.scrollTop = view.scrollHeight;
                    } catch (e) {}
                }
            }
        }
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

async function handleBlockAction(btn, action) {
    if (!activeBlockEl) return;
    const key = localStorage.getItem('ds_api_key_v1');
    const original = activeBlockEl.dataset.raw || activeBlockEl.innerText;
    
    const oldText = btn.innerText;
    btn.innerHTML = `...`; 
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
        
        document.getElementById('oldTextPreview').innerHTML = formatMD(original);
        document.getElementById('newTextPreview').innerHTML = formatMD(newDraftContent);
        document.getElementById('compareModal').classList.remove('hidden');
    } catch (e) {
        alert("操作失败");
    } finally {
        btn.innerText = oldText;
        activeBlockEl.classList.remove('scanning-effect');
        document.getElementById('floatingBar').style.display = 'none';
    }
}

function closeCompareModal() { 
    document.getElementById('compareModal').classList.add('hidden'); 
    if(activeBlockEl) activeBlockEl.classList.remove('active');
    activeBlockEl = null;
}

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
    const text = Array.from(nodes).map(e => e.innerText).join('\n\n');
    navigator.clipboard.writeText(text).then(() => alert("已复制全文"));
}

window.onclick = (e) => {
    if (!e.target.closest('.block-node') && 
        !e.target.closest('#floatingBar') && 
        !e.target.closest('#apiModal') &&
        !e.target.closest('#compareModal')) {
            
        if (activeBlockEl) activeBlockEl.classList.remove('active');
        document.getElementById('floatingBar').style.display = 'none';
        activeBlockEl = null;
    }
};
