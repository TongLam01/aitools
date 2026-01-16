/** * GZH AI Editor v2.2 - Final UX Polish
 */

const ALLOWED = ['aibox6.com', 'www.aibox6.com', 'localhost', '127.0.0.1'];
if (!ALLOWED.includes(window.location.hostname)) {
    document.body.innerHTML = "<div style='padding:100px;text-align:center;'>Domain Denied.</div>";
}

let activeBlockEl = null;
let newDraftContent = "";

// 1. 初始化
window.addEventListener('DOMContentLoaded', () => {
    const key = localStorage.getItem('ds_api_key_v1');
    if (key && document.getElementById('apiKeyInput')) {
        document.getElementById('apiKeyInput').value = key;
        updateApiLight(true);
    }
});

function toggleApiModal(show) { 
    const m = document.getElementById('apiModal');
    if(m) m.classList.toggle('hidden', !show); 
}

function updateApiLight(ok) {
    const dot = document.getElementById('statusDot');
    if(dot) dot.className = `w-3 h-3 rounded-full ${ok ? 'breathing-green' : 'breathing-red'}`;
}

function saveApiKey() {
    const input = document.getElementById('apiKeyInput');
    if (!input || !input.value.startsWith('sk-')) return alert("请输入有效密钥");
    localStorage.setItem('ds_api_key_v1', input.value.trim());
    updateApiLight(true);
    toggleApiModal(false);
}

function checkKeyOnFocus() {
    if (!localStorage.getItem('ds_api_key_v1')) toggleApiModal(true);
}

function updateWordCount(textarea) {
    const count = textarea.value.length;
    const label = document.getElementById('charCount');
    if(label) {
        label.innerText = `${count} / 150`;
        label.className = `text-xs ml-2 ${count >= 150 ? 'text-green-500 font-bold' : 'text-red-400'}`;
    }
}

// 2. 块生成：带精准定位逻辑
function createAtomicBlock(content = "") {
    const div = document.createElement('div');
    div.className = "block-node text-slate-800 leading-relaxed";
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

// 核心：工具栏跟随选中块
function positionToolbar(el) {
    const bar = document.getElementById('floatingBar');
    if(!bar) return;

    // 获取块相对于父容器的位置
    const elTop = el.offsetTop;
    const elHeight = el.offsetHeight;
    
    // 定位：在块的正下方
    bar.style.display = "flex";
    bar.style.top = `${elTop + elHeight + 10}px`;
    bar.style.left = "50%";
    
    // 自动滚动，确保工具栏可见
    const view = document.getElementById('editorView');
    const scrollTarget = elTop + elHeight + 100;
    if (scrollTarget > view.scrollTop + view.offsetHeight) {
        view.scrollTo({ top: elTop - 50, behavior: 'smooth' });
    }
}

// 3. 全文生成
async function runGeneration() {
    const key = localStorage.getItem('ds_api_key_v1');
    if (!key) return toggleApiModal(true);

    const materialEl = document.getElementById('material');
    if (!materialEl || materialEl.value.length < 150) return alert("素材字数不足150字");

    const btn = document.getElementById('genBtn');
    const view = document.getElementById('editorView');
    
    btn.disabled = true;
    btn.innerText = "DeepSeek 写作中...";
    view.innerHTML = ""; // 重置预览区

    const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";

    const params = {
        topic: getVal('topic'),
        style: getVal('style'),
        referenceStyle: getVal('refStyle'),
        material: materialEl.value,
        taboos: getVal('taboos'),
        lengthRange: getVal('lengthRange')
    };

    try {
        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: GZH_PROMPTS.system },
                    { role: "user", content: GZH_PROMPTS.generate(params) }
                ],
                stream: true
            })
        });

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
        view.innerHTML = `<div class='text-red-500 p-4'>Error: ${err.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.innerText = "重新生成全文";
    }
}

// 4. 块操作：带加载状态逻辑
async function handleBlockAction(btn, action) {
    if (!activeBlockEl) return;
    const key = localStorage.getItem('ds_api_key_v1');
    const originalText = activeBlockEl.innerText;
    
    // 状态 1：块进入加载动画
    activeBlockEl.classList.add('block-processing');
    
    // 状态 2：按钮进入加载样式
    const oldBtnText = btn.innerText;
    btn.innerText = "思考中";
    btn.classList.add('btn-loading');
    
    // 锁定工具栏所有按钮
    const allBtns = document.querySelectorAll('#floatingBar button');
    allBtns.forEach(b => b.disabled = true);

    try {
        const res = await fetch("https://api.deepseek.com/chat/completions", {
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
        const data = await res.json();
        newDraftContent = data.choices[0].message.content;
        
        // 弹出对比弹窗
        document.getElementById('oldTextPreview').innerText = originalText;
        document.getElementById('newTextPreview').innerText = newDraftContent;
        document.getElementById('compareModal').classList.remove('hidden');

    } catch (e) {
        alert("优化超时，请检查网络或Key余额");
    } finally {
        // 恢复状态
        activeBlockEl.classList.remove('block-processing');
        btn.innerText = oldBtnText;
        btn.classList.remove('btn-loading');
        allBtns.forEach(b => b.disabled = false);
        document.getElementById('floatingBar').style.display = "none";
    }
}

function closeCompareModal() { document.getElementById('compareModal').classList.add('hidden'); }

function confirmReplace() {
    if (activeBlockEl && newDraftContent) {
        activeBlockEl.innerText = newDraftContent;
        // 替换后重新定位一次工具栏
        positionToolbar(activeBlockEl);
    }
    closeCompareModal();
}

function copyAll() {
    const nodes = document.querySelectorAll('.block-node');
    const text = Array.from(nodes).map(el => el.innerText).join('\n\n');
    navigator.clipboard.writeText(text).then(() => alert("全文已复制，可在公众号后台直接粘贴！"));
}

// 全局点击监听：点击空白处隐藏工具栏
window.onclick = (e) => {
    if (!e.target.closest('.block-node') && !e.target.closest('#floatingBar') && !e.target.closest('#apiModal')) {
        if (activeBlockEl) activeBlockEl.classList.remove('active');
        const bar = document.getElementById('floatingBar');
        if(bar) bar.style.display = "none";
    }
};
