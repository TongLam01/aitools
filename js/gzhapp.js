// 1. 域名校验 (开发调试时允许 localhost)
const ALLOWED_DOMAINS = ['aibox6.com', 'www.aibox6.com', 'localhost', '127.0.0.1'];
if (!ALLOWED_DOMAINS.includes(window.location.hostname)) {
    document.body.innerHTML = "<div style='padding:50px;text-align:center;'>域名未授权，请联系管理员。</div>";
}

let activeBlock = null;
let newDraft = "";

// 初始化及状态管理
window.onload = () => {
    const key = localStorage.getItem('ds_key');
    if (key) {
        document.getElementById('apiKey').value = key;
        updateStatus(true);
    }
};

function updateStatus(ok) {
    const dot = document.getElementById('statusDot');
    if (dot) dot.className = `w-3 h-3 rounded-full ${ok ? 'breathing-green' : 'breathing-red'}`;
}

function saveKey() {
    const key = document.getElementById('apiKey').value.trim();
    if (!key) return alert("请输入 Key");
    localStorage.setItem('ds_key', key);
    updateStatus(true);
    document.getElementById('apiModal').classList.add('hidden');
}

// 实时字数统计
function updateCount(el) {
    const count = el.value.length;
    const label = document.getElementById('charCount');
    label.innerText = `${count} / 150`;
    label.className = count >= 150 ? "text-xs font-bold ml-2 text-green-500" : "text-xs font-normal ml-2 text-red-400";
}

// 块生成渲染
function renderBlock(content = "") {
    const div = document.createElement('div');
    div.className = "block-node text-gray-800 leading-relaxed";
    div.innerText = content;
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
    bar.classList.remove('hidden');
    // 相对于容器定位
    bar.style.top = `${el.offsetTop - 45}px`;
    bar.style.right = `10px`;
}

// 核心生成函数 (修复流式解析)
async function runGenerate() {
    const material = document.getElementById('material').value;
    const key = localStorage.getItem('ds_key');
    const view = document.getElementById('editorView');
    const btn = document.getElementById('genBtn');

    if (material.length < 150) return alert("素材字数不足150字");
    if (!key) return alert("请先点击右上角设置 API Key");

    // UI 重置
    btn.disabled = true;
    btn.innerText = "正在撰写中...";
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

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || "请求失败");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let currentBlock = renderBlock("");
        view.appendChild(currentBlock);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            // 关键修复：处理合并在一起的 data 块
            const lines = chunk.split('\n');
            
            for (let line of lines) {
                line = line.trim();
                if (!line || line === "data: [DONE]") continue;

                if (line.startsWith("data: ")) {
                    try {
                        const json = JSON.parse(line.substring(6));
                        const text = json.choices[0].delta.content || "";
                        
                        if (text.includes('\n')) {
                            // 遇到换行符，开启新块
                            currentBlock = renderBlock("");
                            view.appendChild(currentBlock);
                        } else {
                            currentBlock.innerText += text;
                            view.scrollTop = view.scrollHeight;
                        }
                    } catch (e) {
                        console.warn("解析跳过:", line);
                    }
                }
            }
        }
    } catch (err) {
        console.error(err);
        view.innerHTML = `<div class='text-red-500 p-4 font-bold text-sm'>
            生成中断：${err.message}<br>请检查 API Key 是否正确或网络是否通畅。
        </div>`;
    } finally {
        btn.disabled = false;
        btn.innerText = "重新生成全文";
    }
}

// 块操作：重写/润色等
async function handleAction(action) {
    if (!activeBlock) return;
    const key = localStorage.getItem('ds_key');
    const original = activeBlock.innerText;
    
    activeBlock.classList.add('animate-pulse', 'bg-blue-50');
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
        newDraft = data.choices[0].message.content;
        
        document.getElementById('oldText').innerText = original;
        document.getElementById('newText').innerText = newDraft;
        document.getElementById('compareModal').classList.remove('hidden');
    } catch (e) {
        alert("优化请求失败");
    } finally {
        activeBlock.classList.remove('animate-pulse', 'bg-blue-50');
    }
}

function closeCompare() { document.getElementById('compareModal').classList.add('hidden'); }
function acceptNew() {
    if (activeBlock && newDraft) activeBlock.innerText = newDraft;
    closeCompare();
}

function copyAll() {
    const text = Array.from(document.querySelectorAll('.block-node')).map(el => el.innerText).join('\n\n');
    navigator.clipboard.writeText(text).then(() => alert("已复制全文"));
}

window.onclick = (e) => {
    if (!e.target.closest('.block-node') && !e.target.closest('#floatingBar')) {
        if (activeBlock) activeBlock.classList.remove('active');
        document.getElementById('floatingBar').classList.add('hidden');
    }
};
