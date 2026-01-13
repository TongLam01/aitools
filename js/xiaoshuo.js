/**
 * DeepSeek 小说创作工具 v2.4.1
 * 修复版：所有按钮正常工作
 */

(function() {
    'use strict';

    // ========== 域名验证 ==========
    const ALLOWED = ['www.aibox6.com', 'aibox6.com'];
    const DEV = ['localhost', '127.0.0.1', ''];
    
    if (!DEV.includes(location.hostname) && !ALLOWED.includes(location.hostname)) {
        document.getElementById('domain-error').style.display = 'flex';
        return;
    }

    // ========== 配置 ==========
    const STORAGE_KEY = 'novel_v241';
    const WIKI_LIMIT = 10000;

    const LENGTH_MAP = {
        standard: '1500-2000字',
        long: '3000字以上',
        short: '约1000字'
    };

    // ========== 状态 ==========
    let chapter = 1;
    let generating = false;
    let controller = null;
    let drawerTarget = null;
    let syncCount = 0;

    // ========== 工具函数 ==========
    const $ = id => document.getElementById(id);
    const $q = sel => document.querySelector(sel);
    const $qa = sel => document.querySelectorAll(sel);

// ========== Prompts ==========
    const mainPrompt = (c) => `你是世界级小说家。

══════════════════════════
📚《${c.title || '未命名'}》第${c.chapter}章
══════════════════════════

【世界观与核心设定】
${c.wikiCore || '（自由发挥）'}

【角色档案】
${c.characters || '（根据上下文）'}

【活跃记忆】
${c.wikiActive || '暂无'}

【已确认事实】（⚠️绝对真理，不可违背，不可修改历史）
${c.facts || '无'}

【前情摘要】（⚠️剧情必须紧接此处，保持因果逻辑连贯）
${c.summary || '无'}

══════════════════════════
🎬 本场指令
══════════════════════════
▸ 目标：${c.goal || '自然推进'}
▸ 必含：${c.must || '无'}
▸ 视角：${c.pov}
▸ 节奏：${c.rhythm}
▸ 篇幅：${c.length}
▸ 风格：${c.style || '自然流畅'}

【禁忌】${c.negative || '无'}

【准则】严格遵循设定，展示而非陈述，长短句交错，调动五感，保持张力，逻辑自洽。

⚠️ 直接输出正文。`;

    const syncPrompt = (ch) => `分析内容，更新知识库。

规则：
1. 活跃记忆：第${ch}章相关，≤250字
   格式：═══ 第${ch}章 ═══
   ┄┄ 核心人物 ┄┄
   • 角色：描述
   ┄┄ 核心冲突 ┄┄  

2. 事实：仅记录不可逆的客观改变（如死亡、重伤、获得关键道具、地点变更），禁止记录心理活动或日常对话。
   格式：═══ [第${ch}章] ═══ 
   ┄┄ 事实 ┄┄（要求：简练，每条事实限30字内，并且每一章的事实档案总字数严格不能超过200字）

3. 摘要：高度概括第${ch}章剧情，保留关键冲突和结果，作为下一章的开头背景。
   要求：严格控制在220字以内。

返回JSON：
{"wikiActive":"活跃层","summary":"（第${ch}章）摘要","newFacts":"新事实或空"}`;

    // ========== 初始化 ==========
    function init() {
        bindEvents();
        loadStorage();
        updateAllUI();
    }

    // ========== 事件绑定 ==========
    function bindEvents() {
        // API Key
        $('api-key-btn').onclick = toggleApiPopup;
        $('save-api-btn').onclick = saveApiKey;
        $('cancel-api-btn').onclick = () => $('api-popup').classList.remove('show');

        document.addEventListener('click', e => {
            const popup = $('api-popup');
            const btn = $('api-key-btn');
            if (popup && btn && !popup.contains(e.target) && !btn.contains(e.target)) {
                popup.classList.remove('show');
            }
        });

        // 沉浸
        $('immersive-btn').onclick = toggleImmersive;
        $('exit-immersive').onclick = toggleImmersive;

        // 抽屉
        $('drawer-overlay').onclick = e => {
            if (e.target.id === 'drawer-overlay') closeDrawer();
        };
        $('drawer-close-btn').onclick = closeDrawer;
        $('drawer-cancel-btn').onclick = closeDrawer;
        $('drawer-save-btn').onclick = saveDrawer;
        $('drawer-textarea').oninput = () => {
            $('drawer-char-count').textContent = $('drawer-textarea').value.length;
        };

        // 展开按钮
        $('btn-edit-core').onclick = e => { e.stopPropagation(); openDrawer('wikiCore', '世界观与核心设定'); };
        $('btn-edit-active').onclick = e => { e.stopPropagation(); openDrawer('wikiActive', '活跃记忆'); };
        $('btn-expand-char').onclick = e => { e.stopPropagation(); openDrawer('characterBible', '角色档案'); };
        $('btn-expand-style').onclick = e => { e.stopPropagation(); openDrawer('styleRef', '文风'); };
        $('btn-expand-neg').onclick = e => { e.stopPropagation(); openDrawer('negativePrompt', '禁忌'); };
        $('btn-expand-content').onclick = () => openDrawer('novel-content', '上文接力');
        $('btn-expand-facts').onclick = () => openDrawer('statusTracker', '事实档案');
        $('btn-expand-summary').onclick = () => openDrawer('contextSummary', '前情摘要');
        $('btn-expand-goal').onclick = () => openDrawer('sceneGoal', '本段目标');
        $('btn-expand-must').onclick = () => openDrawer('mustInclude', '必须包含');

        // 归档
        $('btn-archive').onclick = archiveWiki;

        // 知识库折叠
        $qa('.wiki-section-header').forEach(h => {
            h.onclick = e => {
                if (e.target.closest('.btn-expand, .btn-xs, button')) return;
                const section = h.closest('.wiki-section');
                if (section) section.classList.toggle('collapsed');
                save();
            };
        });

        // 输入组折叠
        $qa('.input-group-header').forEach(h => {
            h.onclick = e => {
                if (e.target.closest('.btn-expand, button')) return;
                const group = h.closest('.input-group');
                if (group) group.classList.toggle('collapsed');
                updatePreviews();
                save();
            };
        });

        // Tab
        $qa('.tab-item').forEach(t => {
            t.onclick = () => {
                $qa('.panel, #main-container').forEach(p => p.classList.remove('active-panel'));
                $qa('.tab-item').forEach(x => x.classList.remove('active'));
                $(t.dataset.panel).classList.add('active-panel');
                t.classList.add('active');
            };
        });

        // 生成/停止
        $('btn-gen').onclick = generate;
        $('btn-stop').onclick = stop;

        // 同步
        $('btn-sync').onclick = syncMemory;

        // 导出
        $('btn-export').onclick = exportDoc;

        // 编辑器
        $('novel-content').oninput = () => {
            updateEditorCount();
            save();
        };

        // 自动保存
        document.addEventListener('input', e => {
            if (e.target.matches('input, textarea, select')) {
                save();
                updatePreviews();
                if (['wikiCore', 'wikiActive', 'wikiArchive'].includes(e.target.id)) {
                    updateWikiCounts();
                }
            }
        });

        // 快捷键
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !generating) {
                e.preventDefault();
                generate();
            }
            if (e.key === 'Escape') {
                if (generating) stop();
                else if ($('drawer-overlay').classList.contains('show')) closeDrawer();
            }
        });
    }

    // ========== API Key ==========
    function toggleApiPopup() {
        $('api-popup').classList.toggle('show');
    }

    function saveApiKey() {
        if ($('apiKey').value.trim()) {
            save();
            updateApiStatus();
            $('api-popup').classList.remove('show');
            toast('已保存', 'success');
        } else {
            toast('请输入Key', 'error');
        }
    }

    function updateApiStatus() {
        $('api-key-btn').classList.toggle('configured', !!$('apiKey').value.trim());
    }

    // ========== 沉浸 ==========
    function toggleImmersive() {
        document.body.classList.toggle('immersive-mode');
        if (document.body.classList.contains('immersive-mode')) {
            toast('沉浸模式，ESC退出', 'info');
        }
    }

    // ========== 抽屉 ==========
    function openDrawer(id, title) {
        const el = $(id);
        if (!el) return;
        drawerTarget = id;
        $('drawer-title').textContent = title || '编辑';
        $('drawer-textarea').value = el.value;
        $('drawer-char-count').textContent = el.value.length;
        $('drawer-overlay').classList.add('show');
        setTimeout(() => {
            const ta = $('drawer-textarea');
            ta.focus();
            ta.setSelectionRange(ta.value.length, ta.value.length);
        }, 100);
    }

    function closeDrawer() {
        $('drawer-overlay').classList.remove('show');
        drawerTarget = null;
    }

    function saveDrawer() {
        if (!drawerTarget) return;
        $(drawerTarget).value = $('drawer-textarea').value;
        $(drawerTarget).dispatchEvent(new Event('input', { bubbles: true }));
        closeDrawer();
        toast('已保存', 'success');
    }

    // ========== 归档 ==========
    function archiveWiki() {
        const active = $('wikiActive').value.trim();
        if (!active) {
            toast('活跃记忆为空', 'info');
            return;
        }
        const archive = $('wikiArchive').value;
        const sep = `\n═══ 第${Math.max(1, chapter - 1)}章归档 ═══\n`;
        $('wikiArchive').value = archive + sep + active;
        $('wikiActive').value = '';
        updateWikiCounts();
        save();
        toast('已归档', 'success');
    }

    // ========== 生成 ==========
    async function generate() {
        const apiKey = $('apiKey').value.trim();
        if (!apiKey) {
            toast('请配置API Key', 'error');
            toggleApiPopup();
            return;
        }

        const content = $('novel-content').value;
        const prompt = $('prompt-input').value.trim();
        if (!content.trim() && !prompt) {
            toast('请输入上文或指令', 'warning');
            return;
        }

        setGenerating(true);
        controller = new AbortController();

        const cardId = `c-${Date.now()}`;
        const card = createCard(cardId, chapter);
        $('history-list').prepend(card);
        $('history-empty').style.display = 'none';

        const body = card.querySelector('.history-body');
        const serial = document.createElement('span');
        serial.className = 'serial-number';
        serial.textContent = `#${chapter}`;
        body.appendChild(serial);

        const text = document.createElement('span');
        text.className = 'content-text';
        body.appendChild(text);

        card.classList.add('generating');
        $('history-wrapper').scrollTop = 0;

        let wordCount = 0;

        try {
            const config = {
                title: $('novel-title').value.trim(),
                chapter: chapter,
                wikiCore: $('wikiCore').value.trim(),
                wikiActive: $('wikiActive').value.trim(),
                characters: $('characterBible').value.trim(),
                facts: $('statusTracker').value.trim(),
                summary: $('contextSummary').value.trim(),
                goal: $('sceneGoal').value.trim(),
                must: $('mustInclude').value.trim(),
                pov: $('pov').value,
                rhythm: $('rhythmControl').value,
                length: LENGTH_MAP[$('lengthMode').value],
                style: $('styleRef').value.trim(),
                negative: $('negativePrompt').value.trim()
            };

            const res = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal,
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: mainPrompt(config) },
                        { role: 'user', content: `【上文】\n${content || '（开头）'}\n\n【指令】\n${prompt || '继续'}` }
                    ],
                    stream: true,
                    temperature: 0.85,
                    max_tokens: 8000
                })
            });

            if (!res.ok) throw new Error(`请求失败: ${res.status}`);

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content;
                            if (delta) {
                                text.textContent += delta;
                                wordCount = text.textContent.replace(/\s/g, '').length;
                                $('live-word-count').textContent = wordCount;
                            }
                        } catch {}
                    }
                }
            }

            chapter++;
            syncCount++;
            checkSyncReminder();
            toast(`完成！${wordCount}字`, 'success');

        } catch (e) {
            if (e.name === 'AbortError') toast('已停止', 'info');
            else toast(e.message, 'error');
        } finally {
            card.classList.remove('generating');
            updateCardCount(card);
            setGenerating(false);
            save();
        }
    }

    function stop() {
        if (controller) controller.abort();
    }

    function setGenerating(v) {
        generating = v;
        $('btn-gen').style.display = v ? 'none' : 'inline-flex';
        $('btn-stop').style.display = v ? 'inline-flex' : 'none';
        $('generating-stats').classList.toggle('show', v);
        $('btn-sync').disabled = v;
    }

    // ========== 同步 ==========
    async function syncMemory() {
        const apiKey = $('apiKey').value.trim();
        if (!apiKey) {
            toast('请配置API Key', 'error');
            return;
        }

        const list = $('history-list');
        if (!list.children.length) {
            toast('暂无内容', 'warning');
            return;
        }

        const btn = $('btn-sync');
        const btnText = $('sync-btn-text');
        const orig = btnText.textContent;
        btnText.innerHTML = '<span class="loading"></span>分析中...';
        btn.disabled = true;

        const recent = Array.from(list.querySelectorAll('.history-body')).slice(0, 3)
            .map(el => (el.querySelector('.content-text')?.textContent || '')).join('\n---\n');

        try {
            const res = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: syncPrompt(Math.max(1, chapter - 1)) },
                        { role: 'user', content: `【活跃层】\n${$('wikiActive').value}\n\n【事实】\n${$('statusTracker').value}\n\n【最新内容】\n${recent}` }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.3
                })
            });

            if (!res.ok) throw new Error(`请求失败: ${res.status}`);

            const data = await res.json();
            const result = JSON.parse(data.choices[0].message.content);

            if (result.wikiActive) $('wikiActive').value = result.wikiActive;
            if (result.summary) $('contextSummary').value = result.summary;
            if (result.newFacts?.trim()) {
                const facts = $('statusTracker');
                if (!facts.value.includes(result.newFacts.trim())) {
                    facts.value = facts.value + (facts.value ? '\n' : '') + result.newFacts.trim();
                }
            }

            syncCount = 0;
            hideSyncReminder();
            updateWikiCounts();
            save();
            toast('已同步', 'success');

        } catch (e) {
            toast('失败: ' + e.message, 'error');
        } finally {
            btnText.textContent = orig;
            btn.disabled = false;
        }
    }

    function checkSyncReminder() {
        if (syncCount >= 3) {
            $('sync-reminder').classList.add('show');
            $('sync-reminder-text').textContent = `已创作${syncCount}章，建议同步`;
        }
    }

    function hideSyncReminder() {
        $('sync-reminder').classList.remove('show');
    }

    // ========== 卡片 ==========
    function createCard(id, ch) {
        const time = new Date().toLocaleString('zh-CN', {
            month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
        });

        const div = document.createElement('div');
        div.className = 'history-card';
        div.id = id;
        div.dataset.chapter = ch;
        div.innerHTML = `
            <div class="history-header">
                <div class="history-header-left">
                    <span class="chapter-badge">第${ch}章</span>
                    <span class="history-time">${time}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span class="word-count-badge">📝 <span class="w-count">0</span>字</span>
                    <button class="btn btn-outline btn-sm card-toggle">折叠</button>
                </div>
            </div>
            <div class="history-body" contenteditable="true"></div>
            <div class="history-actions">
                <button class="btn btn-outline btn-sm card-base" style="flex:1">📌 设为上文</button>
                <button class="btn btn-outline btn-sm card-export" style="flex:1">📥</button>
                <button class="btn btn-outline btn-sm card-copy">📋</button>
                <button class="btn btn-outline btn-sm card-del" style="color:var(--danger)">🗑</button>
            </div>
        `;

        // 绑定卡片事件
        div.querySelector('.card-toggle').onclick = () => {
            div.classList.toggle('collapsed');
            div.querySelector('.card-toggle').textContent = div.classList.contains('collapsed') ? '展开' : '折叠';
        };

        div.querySelector('.card-base').onclick = () => {
            const ct = div.querySelector('.content-text');
            let t = ct ? ct.textContent : '';
            if (t.length > 500) t = '...' + t.slice(-500);
            $('novel-content').value = t;
            updateEditorCount();
            toast('已设为上文', 'success');
        };

        div.querySelector('.card-export').onclick = () => exportOne(id, ch);

        div.querySelector('.card-copy').onclick = () => {
            const ct = div.querySelector('.content-text');
            navigator.clipboard.writeText(ct?.textContent || '')
                .then(() => toast('已复制', 'success'))
                .catch(() => toast('复制失败', 'error'));
        };

        div.querySelector('.card-del').onclick = () => {
            if (!confirm('删除？')) return;
            div.style.cssText = 'transform:translateX(100%);opacity:0;transition:0.3s';
            setTimeout(() => {
                div.remove();
                updateCounts();
                save();
                if (!$('history-list').children.length) {
                    $('history-empty').style.display = 'block';
                }
            }, 300);
        };

        div.querySelector('.history-body').oninput = () => {
            updateCardCount(div);
            save();
        };

        return div;
    }

    function updateCardCount(card) {
        const ct = card.querySelector('.content-text');
        const len = (ct?.textContent || '').replace(/\s/g, '').length;
        card.querySelector('.w-count').textContent = len.toLocaleString();
        updateCounts();
    }

    // ========== 导出 ==========
    function exportDoc() {
        const title = $('novel-title').value || '未命名';
        const cards = Array.from($qa('.history-card')).reverse();

        if (!cards.length) {
            toast('暂无内容', 'warning');
            return;
        }

        let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:"宋体";font-size:14pt;line-height:1.8;padding:40px}
h1{text-align:center;font-size:22pt}.meta{text-align:center;color:#666;font-size:10pt;margin-bottom:40px}
.section{margin-bottom:30px}.section-title{font-weight:bold;margin-bottom:10px}
.content{text-indent:2em}hr{border:none;border-top:1px dashed #ccc;margin:30px 0}</style></head>
<body><h1>《${title}》</h1><div class="meta">导出：${new Date().toLocaleString('zh-CN')}</div>`;

        cards.forEach(card => {
            const ch = card.dataset.chapter;
            const ct = card.querySelector('.content-text');
            const text = (ct?.textContent || '').trim();
            html += `<div class="section"><div class="section-title">【第${ch}章】</div>
<div class="content">${text.replace(/\n/g, '</div><div class="content">')}</div></div><hr>`;
        });

        html += '</body></html>';
        download(`《${title}》.doc`, html);
        toast('导出成功', 'success');
    }

    function exportOne(id, ch) {
        const card = $(id);
        if (!card) return;
        const title = $('novel-title').value || '未命名';
        const ct = card.querySelector('.content-text');
        const text = ct?.textContent || '';

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:"宋体";font-size:14pt;line-height:1.8;padding:40px}
h1{text-align:center;font-size:18pt;margin-bottom:30px}.content{text-indent:2em}</style></head>
<body><h1>《${title}》第${ch}章</h1>
<div class="content">${text.replace(/\n/g, '</div><div class="content">')}</div></body></html>`;

        download(`${title}_第${ch}章.doc`, html);
        toast('导出成功', 'success');
    }

    function download(name, content) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type: 'application/msword;charset=utf-8' }));
        a.download = name;
        a.click();
    }

    // ========== UI更新 ==========
    function updateAllUI() {
        updateCounts();
        updateEditorCount();
        updateApiStatus();
        updatePreviews();
        updateWikiCounts();
        if (!$('history-list').children.length) {
            $('history-empty').style.display = 'block';
        }
    }

    function updateCounts() {
        let total = 0, count = 0;
        $qa('.history-body').forEach(el => {
            const ct = el.querySelector('.content-text');
            total += (ct?.textContent || '').replace(/\s/g, '').length;
            count++;
        });
        $('total-words').textContent = total.toLocaleString();
        $('chapter-count').textContent = count;
        $('avg-words').textContent = count ? Math.round(total / count) : 0;
    }

    function updateEditorCount() {
        $('editor-count').textContent = $('novel-content').value.length + ' 字';
    }

    function updatePreviews() {
        const map = { 'character-preview': 'characterBible', 'style-preview': 'styleRef', 'negative-preview': 'negativePrompt' };
        Object.entries(map).forEach(([p, i]) => {
            const el = $(p);
            const val = $(i)?.value.trim() || '';
            if (el) el.textContent = val ? val.slice(0, 10) + (val.length > 10 ? '...' : '') : '';
        });
    }

    function updateWikiCounts() {
        const core = $('wikiCore').value.length;
        const active = $('wikiActive').value.length;
        const archive = $('wikiArchive').value.length;

        $('wiki-core-count').textContent = core;
        $('wiki-active-count').textContent = active;
        $('wiki-archive-count').textContent = archive;

        const activeEl = $('wiki-active-count');
        activeEl.classList.toggle('over', active > WIKI_LIMIT);

        $('wiki-total-count').textContent = core + active + archive;
        $('wiki-limit-tip').textContent = active > WIKI_LIMIT ? `⚠️ 超限>${WIKI_LIMIT}` : `活跃层≤${WIKI_LIMIT}`;
        $('wiki-limit-tip').style.color = active > WIKI_LIMIT ? 'var(--danger)' : '';
    }

    // ========== 存储 ==========
    function save() {
        const fields = ['apiKey', 'novel-title', 'wikiCore', 'wikiActive', 'wikiArchive', 'characterBible', 'styleRef',
            'negativePrompt', 'statusTracker', 'contextSummary', 'sceneGoal', 'mustInclude', 'rhythmControl', 'lengthMode', 'pov', 'novel-content', 'prompt-input'];

        const data = {
            config: {},
            history: [],
            collapsed: { wiki: {}, groups: [] },
            chapter, syncCount,
            version: '2.4.1'
        };

        fields.forEach(id => {
            const el = $(id);
            if (el) data.config[id] = el.value;
        });

        ['wiki-core-section', 'wiki-active-section', 'wiki-archive-section'].forEach(id => {
            const el = $(id);
            if (el) data.collapsed.wiki[id] = el.classList.contains('collapsed');
        });

        ['character-group', 'style-group', 'negative-group'].forEach(id => {
            if ($(id)?.classList.contains('collapsed')) data.collapsed.groups.push(id);
        });

        $qa('.history-card').forEach(card => {
            data.history.push({ html: card.querySelector('.history-body').innerHTML, chapter: card.dataset.chapter });
        });

        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
    }

    function loadStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);

            if (data.config) {
                Object.entries(data.config).forEach(([id, val]) => {
                    const el = $(id);
                    if (el) el.value = val;
                });
            }

            chapter = data.chapter || 1;
            syncCount = data.syncCount || 0;

            if (data.collapsed?.wiki) {
                Object.entries(data.collapsed.wiki).forEach(([id, v]) => {
                    const el = $(id);
                    if (el) el.classList.toggle('collapsed', v);
                });
            }

            if (data.collapsed?.groups) {
                ['character-group', 'style-group', 'negative-group'].forEach(id => {
                    const el = $(id);
                    if (el) el.classList.toggle('collapsed', data.collapsed.groups.includes(id));
                });
            }

            if (data.history?.length) {
                const list = $('history-list');
                data.history.slice().reverse().forEach((item, i) => {
                    const html = typeof item === 'string' ? item : item.html;
                    const ch = typeof item === 'string' ? i + 1 : (item.chapter || i + 1);
                    const card = createCard(`r-${i}`, ch);
                    card.querySelector('.history-body').innerHTML = html;
                    card.querySelector('.chapter-badge').textContent = `第${ch}章`;
                    list.prepend(card);
                    updateCardCount(card);
                });
            }

            if (syncCount >= 3) checkSyncReminder();
        } catch (e) { console.warn('加载失败:', e); }
    }

    // ========== Toast ==========
    function toast(msg, type = 'info') {
        $q('.toast-msg')?.remove();
        const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
        const colors = {
            success: 'linear-gradient(135deg,#38a169,#48bb78)',
            error: 'linear-gradient(135deg,#e53e3e,#f56565)',
            warning: 'linear-gradient(135deg,#dd6b20,#ed8936)',
            info: 'linear-gradient(135deg,#3182ce,#4299e1)'
        };

        const div = document.createElement('div');
        div.className = 'toast-msg';
        div.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);
background:${colors[type]};color:#fff;padding:12px 24px;border-radius:30px;font-size:14px;
font-weight:600;z-index:10000;box-shadow:0 6px 20px rgba(0,0,0,0.15);display:flex;align-items:center;gap:8px;
animation:toastIn 0.3s ease`;
        div.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
        document.body.appendChild(div);

        if (!$('toast-css')) {
            const s = document.createElement('style');
            s.id = 'toast-css';
            s.textContent = `@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;
            document.head.appendChild(s);
        }

        setTimeout(() => {
            div.style.opacity = '0';
            div.style.transform = 'translateX(-50%) translateY(-10px)';
            div.style.transition = '0.3s';
            setTimeout(() => div.remove(), 300);
        }, 2000);
    }

    // ========== 启动 ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
