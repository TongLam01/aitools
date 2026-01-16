// 域名锁
const ALLOWED = ['aibox6.com', 'www.aibox6.com', 'localhost', '127.0.0.1'];
if (!ALLOWED.includes(window.location.hostname)) {
    document.body.innerHTML = "<div style='padding:50px;text-align:center;'>Domain Denied.</div>";
}

let activeBlockEl = null;
let newDraftContent = "";

window.addEventListener('DOMContentLoaded', () => {
    const key = localStorage.getItem('ds_api_key_v1');
    if (key) {
        document.getElementById('apiKeyInput').value = key;
        updateApiLight(true);
    }
});

function toggleApiModal(show) { document.getElementById('apiModal').classList.toggle('hidden', !show); }

function updateApiLight(ok) {
    const dot = document.getElementById('statusDot');
    if(dot) dot.className = `w-3 h-3 rounded-full ${ok ? 'breathing-green' : 'breathing-red'}`;
}

function saveApiKey() {
    const key = document.getElementById('apiKeyInput').value.trim();
    if (!key.startsWith('sk-')) return alert("无效的 Key");
    localStorage.setItem('ds_api_key_v1', key);
    updateApiLight(true);
    toggleApiModal(false);
}

function checkKeyOnFocus() {
    if (!localStorage.getItem('ds_api_key_v1')) toggleApiModal(true);
}

function updateWordCount(textarea) {
    const count = textarea.value.length;
    const label = document.getElementById('charCount');
    label.innerText = `${count} / 150`;
    label.className = `text-xs ml-2 ${count >= 150 ? 'text-green-500 font-bold' : 'text-red-400'}`;
}

function createAtomicBlock(content = "") {
    const div = document.createElement('div');
    div.className = "block-node";
    div.innerText = content;
    div.onclick = (e) => {
        e.stopPropagation();
        if (activeBlockEl) activeBlockEl.classList.remove('active');
        activeBlockEl = div;
        activeBlockEl.classList.add('active');
        const bar = document.getElementById('floatingBar');
        bar.classList.remove('hidden');
        bar.style.top = `${div.offsetTop - 50}px`;
        bar.style.right = `10px`;
    };
    return div;
}

async function runGeneration() {
    const key = localStorage.getItem('ds_api_key_v1');
    if (!key) return toggleApiModal(true);

    const materialText = document.getElementById('material').value;
    if (materialText.length < 150) return alert("素材不足150字");

    const btn = document.getElementById('genBtn');
    const view = document.getElementById('editorView');
    btn.disabled = true;
    btn.innerText = "生成中...";
    view.innerHTML = "";

    // 修正点：增加了防御性代码，防止读取 null
    const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";

    const params = {
        topic: getVal('topic'),
        style: getVal('style'),
        referenceStyle: getVal('refStyle'),
        material: materialText,
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
        view.innerHTML = `<div class='text-red-500'>生成失败: ${err.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.innerText = "重新生成";
    }
}

// 块编辑和对比弹窗逻辑保持不变...
async function handleBlockAction(action) {
    if (!activeBlockEl) return;
    const key = localStorage.getItem('ds_api_key_v1');
    const original = activeBlockEl.innerText;
    activeBlockEl.classList.add('animate-pulse');
    try {
        const res = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [{ role: "system", content: GZH_PROMPTS.system }, { role: "user", content: GZH_PROMPTS.blockAction(action, original, original) }]
            })
        });
        const data = await res.json();
        newDraftContent = data.choices[0].message.content;
        document.getElementById('oldTextPreview').innerText = original;
        document.getElementById('newTextPreview').innerText = newDraftContent;
        document.getElementById('compareModal').classList.remove('hidden');
    } catch (e) { alert("微调失败"); } finally { activeBlockEl.classList.remove('animate-pulse'); }
}
function closeCompareModal() { document.getElementById('compareModal').classList.add('hidden'); }
function confirmReplace() { if(activeBlockEl) activeBlockEl.innerText = newDraftContent; closeCompareModal(); }
function copyAll() {
    const text = Array.from(document.querySelectorAll('.block-node')).map(el => el.innerText).join('\n\n');
    navigator.clipboard.writeText(text).then(() => alert("已复制"));
}
window.onclick = (e) => {
    if (!e.target.closest('.block-node') && !e.target.closest('#floatingBar')) {
        document.getElementById('floatingBar').classList.add('hidden');
    }
};
