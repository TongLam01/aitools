// 域名锁
if (!['aibox6.com', 'www.aibox6.com', 'localhost'].includes(window.location.hostname)) {
    document.body.innerHTML = "Domain Denied.";
}

let activeBlock = null;
let newDraft = "";

// 实时字数统计
function updateCount(el) {
    const count = el.value.length;
    const label = document.getElementById('charCount');
    label.innerText = `${count} / 150`;
    label.className = count >= 150 ? "text-xs font-bold ml-2 text-green-500" : "text-xs font-normal ml-2 text-red-400";
}

// 初始化
window.onload = () => {
    const key = localStorage.getItem('ds_key');
    if (key) {
        document.getElementById('apiKey').value = key;
        updateStatus(true);
    }
};

function saveKey() {
    const key = document.getElementById('apiKey').value;
    localStorage.setItem('ds_key', key);
    updateStatus(!!key);
    document.getElementById('apiModal').classList.add('hidden');
}

function updateStatus(ok) {
    document.getElementById('statusDot').className = `w-3 h-3 rounded-full ${ok ? 'breathing-green' : 'breathing-red'}`;
}

// 块生成逻辑
function renderBlock(content) {
    const div = document.createElement('div');
    div.className = "block-node text-gray-800 leading-relaxed";
    div.innerText = content;

    // 点击/点击交互
    div.onclick = (e) => {
        e.stopPropagation();
        if (activeBlock) activeBlock.classList.remove('active');
        activeBlock = div;
        activeBlock.classList.add('active');
        showToolbar(div);
    };

    return div;
}

function showToolbar(el) {
    const bar = document.getElementById('floatingBar');
    const rect = el.getBoundingClientRect();
    const shellRect = document.querySelector('.wechat-shell').getBoundingClientRect();
    
    bar.classList.remove('hidden');
    // 定位在块的右上方
    bar.style.top = `${el.offsetTop - 40}px`;
    bar.style.right = `10px`;
}

// 核心生成
async function runGenerate() {
    const material = document.getElementById('material').value;
    if (material.length < 150) return alert("素材不足150字！");

    const key = localStorage.getItem('ds_key');
    if (!key) return alert("请先设置 API Key");

    const btn = document.getElementById('genBtn');
    const view = document.getElementById('editorView');
    btn.disabled = true;
    btn.innerText = "撰写中...";
    view.innerHTML = "";

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
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [{role:"system", content: GZH_PROMPTS.system}, {role:"user", content: GZH_PROMPTS.generate(params)}],
                stream: true
            })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let currentBlock = renderBlock("");
        view.appendChild(currentBlock);

        while (true) {
            /* Vercel Heartbeat */
            const {done, value} = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for(const line of lines) {
                if(line.startsWith('data: ') && line !== 'data: [DONE]') {
                    const json = JSON.parse(line.substring(6));
                    const text = json.choices[0].delta.content || "";
                    if (text.includes('\n')) {
                        currentBlock = renderBlock("");
                        view.appendChild(currentBlock);
                    } else {
                        currentBlock.innerText += text;
                        view.scrollTop = view.scrollHeight;
                    }
                }
            }
        }
    } catch (e) {
        alert("生成失败");
    } finally {
        btn.disabled = false;
        btn.innerText = "重新生成全文";
    }
}

// 块编辑操作
async function handleAction(action) {
    if (!activeBlock) return;
    const key = localStorage.getItem('ds_key');
    const original = activeBlock.innerText;
    
    // UI 反馈
    activeBlock.classList.add('animate-pulse', 'bg-blue-50');
    document.getElementById('floatingBar').classList.add('hidden');

    try {
        const res = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {role:"system", content: GZH_PROMPTS.system},
                    {role:"user", content: GZH_PROMPTS.blockAction(action, original, original)}
                ]
            })
        });
        const data = await res.json();
        newDraft = data.choices[0].message.content;
        
        // 弹出对比弹窗
        document.getElementById('oldText').innerText = original;
        document.getElementById('newText').innerText = newDraft;
        document.getElementById('compareModal').classList.remove('hidden');

    } catch (e) {
        alert("优化失败");
    } finally {
        activeBlock.classList.remove('animate-pulse', 'bg-blue-50');
    }
}

function closeCompare() {
    document.getElementById('compareModal').classList.add('hidden');
    newDraft = "";
}

function acceptNew() {
    if (activeBlock && newDraft) {
        activeBlock.innerText = newDraft;
    }
    closeCompare();
}

// 点击空白隐藏
window.onclick = (e) => {
    if (!e.target.closest('.block-node') && !e.target.closest('#floatingBar')) {
        if (activeBlock) activeBlock.classList.remove('active');
        document.getElementById('floatingBar').classList.add('hidden');
    }
};
