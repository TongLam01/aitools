/**
 * DeepSeek 小说创作工具 v2.4
 * 优化版：统一配色、简化交互、自动章节
 * 仅限 www.aibox6.com 和 aibox6.com
 */

(function() {
    'use strict';

    // ========== 域名验证 ==========
    const ALLOWED = ['www.aibox6.com', 'aibox6.com'];
    const DEV = ['localhost', '127.0.0.1', ''];
    const host = location.hostname;
    
    if (!DEV.includes(host) && !ALLOWED.includes(host)) {
        document.getElementById('domain-error').style.display = 'flex';
        return;
    }

    // ========== 配置 ==========
    const STORAGE_KEY = 'novel_v24';
    const WIKI_ACTIVE_LIMIT = 1000;
    const WIKI_CHAPTER_LIMIT = 250;

    const LENGTH_MAP = {
        standard: '1500-2000字',
        long: '3000字以上',
        short: '约1000字'
    };

    // ========== 状态 ==========
    let state = {
        chapter: 1,
        generating: false,
        controller: null,
        drawerTarget: null,
        syncCount: 0
    };

    // ========== DOM ==========
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    // ========== Prompts ==========
    const PROMPTS = {
        main: (c) => `你是世界级小说家。

══════════════════════════
📚《${c.title || '未命名'}》第${c.chapter}章
══════════════════════════

【世界观与核心设定】
${c.wikiCore || '（自由发挥）'}

【角色档案】
${c.characters || '（根据上下文）'}

【活跃记忆】
${c.wikiActive || '暂无'}

【已确认事实】
${c.facts || '无'}

【前情摘要】
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

【创作准则】
1. 严格遵循设定和事实
2. 展示而非陈述
3. 长短句交错
4. 调动五感
5. 保持戏剧张力
6. 通过行动展现性格
7. 埋设伏笔

⚠️ 直接输出正文。`,

        sync: (ch) => `你是剧情分析师。分析内容，更新知识库。

【规则】
1. 活跃记忆：第${ch}章相关，≤${WIKI_CHAPTER_LIMIT}字
   格式：
   ═══ 第${ch}章 ═══
   ┄┄ 人物 ┄┄
   • 角色：描述
   ┄┄ 地点 ┄┄
   • 地名：描述

2. 事实：只记录不可逆改变
   格式：[第${ch}章] 事件

返回JSON：
{
  "wikiActive": "活跃层内容",
  "summary": "（第${ch}章）摘要",
  "newFacts": "新事实或空"
}`
    };

    // ========== 初始化 ==========
    function init() {
        bindEvents();
        loadStorage();
        updateUI();
    }

    // ========== 事件绑定 ==========
    function bindEvents() {
        // API Key
        $('#api-key-btn').onclick = () => $('#api-popup').classList.toggle('show');
        $('#save-api-btn').onclick = saveApiKey;
        $('#cancel-api-btn').onclick = () => $('#api-popup').classList.remove('show');

        document.addEventListener('click', e => {
            if (!$('#api-popup').contains(e.target) && !$('#api-key-btn').contains(e.target)) {
                $('#api-popup').classList.remove('show');
            }
        });

        // 沉浸
        $('#immersive-btn').onclick = toggleImmersive;
        $('#exit-immersive').onclick = toggleImmersive;

        // 抽屉
        $('#drawer-overlay').onclick = e => { if (e.target === $('#drawer-overlay')) closeDrawer(); };
        $('#drawer-close-btn').onclick = closeDrawer;
        $('#drawer-cancel-btn').onclick = closeDrawer;
        $('#drawer-save-btn').onclick = saveDrawer;
        $('#drawer-textarea').oninput = () => {
            $('#drawer-char-count').textContent = $('#drawer-textarea').value.length;
        };

        // 展开按钮
        $$('[data-expand]').forEach(btn => {
            btn.onclick = e => {
                e.stopPropagation();
                openDrawer(btn.dataset.expand, btn.dataset.title);
            };
        });

        // 知识库折叠
        $$('.wiki-section-header').forEach(h => {
            h.onclick = () => {
                const s = document.getElementById(h.dataset.section);
                if (s) s.classList.toggle('collapsed');
                save();
            };
        });

        // 输入组折叠
        $$('.input-group-header').forEach(h => {
            h.onclick = e => {
                if (e.target.classList.contains('btn-expand')) return;
                const g = document.getElementById(h.dataset.group);
                if (g) g.classList.toggle('collapsed');
                updatePreviews();
                save();
            };
        });

        // 归档
        $('#archive-wiki-btn').onclick = archiveWiki;

        // Tab
        $$('.tab-item').forEach(t => {
            t.onclick = () => switchTab(t.dataset.panel, t);
        });

        // 生成/停止
        $('#btn-gen').onclick = generate;
        $('#btn-stop').onclick = stop;

        // 同步
        $('#btn-sync').onclick = syncMemory;

        // 导出
        $('#btn-export').onclick = exportDoc;

        // 编辑器
        $('#novel-content').oninput = () => {
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
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !state.generating) {
                e.preventDefault();
                generate();
            }
            if (e.key === 'Escape') {
                if (state.generating) stop();
                else if ($('#drawer-overlay').classList.contains('show')) closeDrawer();
            }
        });
    }

    // ========== API Key ==========
    function saveApiKey() {
        const key = $('#apiKey').value.trim();
        if (key) {
            save();
            updateApiStatus();
            $('#api-popup').classList.remove('show');
            toast('已保存', 'success');
        } else {
            toast('请输入Key', 'error');
        }
    }

    function updateApiStatus() {
        const btn = $('#api-key-btn');
        btn.classList.toggle('configured', !!$('#apiKey').value.trim());
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
        const el = document.getElementById(id);
        if (!el) return;
        state.drawerTarget = id;
        $('#drawer-title').textContent = title || '编辑';
        $('#drawer-textarea').value = el.value;
        $('#drawer-char-count').textContent = el.value.length;
        $('#drawer-overlay').classList.add('show');
        setTimeout(() => {
            const ta = $('#drawer-textarea');
            ta.focus();
            ta.setSelectionRange(ta.value.length, ta.value.length);
        }, 100);
    }

    function closeDrawer() {
        $('#drawer-overlay').classList.remove('show');
        state.drawerTarget = null;
    }

    function saveDrawer() {
        if (!state.drawerTarget) return;
        document.getElementById(state.drawerTarget).value = $('#drawer-textarea').value;
        document.getElementById(state.drawerTarget).dispatchEvent(new Event('input'));
        closeDrawer();
        toast('已保存', 'success');
    }

    // ========== Tab ==========
    function switchTab(panel, tab) {
        $$('.panel, #main-container').forEach(p => p.classList.remove('active-panel'));
        $$('.tab-item').forEach(t => t.classList.remove('active'));
        document.getElementById(panel).classList.add('active-panel');
        tab.classList.add('active');
    }

    // ========== 归档 ==========
    function archiveWiki() {
        const active = $('#wikiActive').value.trim();
        if (!active) {
            toast('活跃记忆为空', 'info');
            return;
        }
        const archive = $('#wikiArchive').value;
        const sep = `\n═══ 第${state.chapter - 1}章归档 ═══\n`;
        $('#wikiArchive').value = archive + sep + active;
        $('#wikiActive').value = '';
        updateWikiCounts();
        save();
        toast('已归档', 'success');
    }

    // ========== 生成 ==========
    async function generate() {
        const apiKey = $('#apiKey').value.trim();
        if (!apiKey) {
            toast('请配置API Key', 'error');
            $('#api-popup').classList.add('show');
            return;
        }

        const content = $('#novel-content').value;
        const prompt = $('#prompt-input').value.trim();
        if (!content.trim() && !prompt) {
            toast('请输入上文或指令', 'warning');
            return;
        }

        setGenerating(true);
        state.controller = new AbortController();

        // 创建卡片
        const cardId = `c-${Date.now()}`;
        const card = createCard(cardId, state.chapter);
        $('#history-list').prepend(card);
        $('#history-empty').style.display = 'none';

        const body = card.querySelector('.history-body');
        const serial = document.createElement('span');
        serial.className = 'serial-number';
        serial.textContent = `#${state.chapter}`;
        body.appendChild(serial);

        const text = document.createElement('span');
        text.className = 'content-text';
        body.appendChild(text);

        card.classList.add('generating');
        $('#history-wrapper').scrollTop = 0;

        let wordCount = 0;

        try {
            const config = {
                title: $('#novel-title').value.trim(),
                chapter: state.chapter,
                wikiCore: $('#wikiCore').value.trim(),
                wikiActive: $('#wikiActive').value.trim(),
                characters: $('#characterBible').value.trim(),
                facts: $('#statusTracker').value.trim(),
                summary: $('#contextSummary').value.trim(),
                goal: $('#sceneGoal').value.trim(),
                must: $('#mustInclude').value.trim(),
                pov: $('#pov').value,
                rhythm: $('#rhythmControl').value,
                length: LENGTH_MAP[$('#lengthMode').value],
                style: $('#styleRef').value.trim(),
                negative: $('#negativePrompt').value.trim()
            };

            const res = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                signal: state.controller.signal,
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: PROMPTS.main(config) },
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
                                $('#live-word-count').textContent = wordCount;
                            }
                        } catch {}
                    }
                }
            }

            // 成功后章节+1
            state.chapter++;
            state.syncCount++;
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
        if (state.controller) state.controller.abort();
    }

    function setGenerating(v) {
        state.generating = v;
        $('#btn-gen').style.display = v ? 'none' : 'inline-flex';
        $('#btn-stop').style.display = v ? 'inline-flex' : 'none';
        $('#generating-stats').classList.toggle('show', v);
        $('#btn-sync').disabled = v;
    }

    // ========== 同步 ==========
    async function syncMemory() {
        const apiKey = $('#apiKey').value.trim();
        if (!apiKey) {
            toast('请配置API Key', 'error');
            return;
        }

        const list = $('#history-list');
        if (!list.children.length) {
            toast('暂无内容', 'warning');
            return;
        }

        const btn = $('#btn-sync');
        const btnText = $('#sync-btn-text');
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
                        { role: 'system', content: PROMPTS.sync(state.chapter - 1) },
                        { role: 'user', content: `【活跃层】\n${$('#wikiActive').value}\n\n【事实】\n${$('#statusTracker').value}\n\n【最新内容】\n${recent}` }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.3
                })
            });

            if (!res.ok) throw new Error(`请求失败: ${res.status}`);

            const data = await res.json();
            const result = JSON.parse(data.choices[0].message.content);

            if (result.wikiActive) $('#wikiActive').value = result.wikiActive;
            if (result.summary) $('#contextSummary').value = result.summary;
            if (result.newFacts?.trim()) {
                const facts = $('#statusTracker');
                if (!facts.value.includes(result.newFacts.trim())) {
                    facts.value = facts.value + (facts.value ? '\n' : '') + result.newFacts.trim();
                }
            }

            state.syncCount = 0;
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
        if (state.syncCount >= 3) {
            $('#sync-reminder').classList.add('show');
            $('#sync-reminder-text').textContent = `已创作${state.syncCount}章，建议同步`;
        }
    }

    function hideSyncReminder() {
        $('#sync-reminder').classList.remove('show');
    }

    // ========== 卡片 ==========
    function createCard(id, chapter) {
        const time = new Date().toLocaleString('zh-CN', {
            month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        });

        const div = document.createElement('div');
        div.className = 'history-card';
        div.id = id;
        div.dataset.chapter = chapter;
        div.innerHTML = `
            <div class="history-header">
                <div class="history-header-left">
                    <span class="chapter-badge">第${chapter}章</span>
                    <span class="history-time">${time}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span class="word-count-badge">📝 <span class="w-count">0</span>字</span>
                    <button class="btn btn-outline btn-sm toggle-btn">折叠</button>
                </div>
            </div>
            <div class="history-body" contenteditable="true"></div>
            <div class="history-actions">
                <button class="btn btn-outline btn-sm base-btn" style="flex:1">📌 设为上文</button>
                <button class="btn btn-outline btn-sm export-btn" style="flex:1">📥</button>
                <button class="btn btn-outline btn-sm copy-btn">📋</button>
                <button class="btn btn-outline btn-sm del-btn" style="color:var(--danger)">🗑</button>
            </div>
        `;

        div.querySelector('.toggle-btn').onclick = () => {
            div.classList.toggle('collapsed');
            div.querySelector('.toggle-btn').textContent = div.classList.contains('collapsed') ? '展开' : '折叠';
        };

        div.querySelector('.base-btn').onclick = () => {
            const ct = div.querySelector('.content-text');
            let t = ct ? ct.textContent : '';
            if (t.length > 500) t = '...' + t.slice(-500);
            $('#novel-content').value = t;
            updateEditorCount();
            toast('已设为上文', 'success');
        };

        div.querySelector('.export-btn').onclick = () => exportOne(id, chapter);

        div.querySelector('.copy-btn').onclick = () => {
            const ct = div.querySelector('.content-text');
            navigator.clipboard.writeText(ct?.textContent || '')
                .then(() => toast('已复制', 'success'))
                .catch(() => toast('复制失败', 'error'));
        };

        div.querySelector('.del-btn').onclick = () => {
            if (!confirm('删除？')) return;
            div.style.cssText = 'transform:translateX(100%);opacity:0;transition:0.3s';
            setTimeout(() => {
                div.remove();
                updateCounts();
                save();
                if (!$('#history-list').children.length) {
                    $('#history-empty').style.display = 'block';
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
        const title = $('#novel-title').value || '未命名';
        const cards = Array.from($$('.history-card')).reverse();

        if (!cards.length) {
            toast('暂无内容', 'warning');
            return;
        }

        let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:"宋体";font-size:14pt;line-height:1.8;padding:40px}
h1{text-align:center;font-size:22pt}
.meta{text-align:center;color:#666;font-size:10pt;margin-bottom:40px}
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

    function exportOne(id, chapter) {
        const card = document.getElementById(id);
        if (!card) return;
        const title = $('#novel-title').value || '未命名';
        const ct = card.querySelector('.content-text');
        const text = ct?.textContent || '';

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:"宋体";font-size:14pt;line-height:1.8;padding:40px}
h1{text-align:center;font-size:18pt;margin-bottom:30px}.content{text-indent:2em}</style></head>
<body><h1>《${title}》第${chapter}章</h1>
<div class="content">${text.replace(/\n/g, '</div><div class="content">')}</div></body></html>`;

        download(`${title}_第${chapter}章.doc`, html);
        toast('导出成功', 'success');
    }

    function download(name, content) {
        const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    // ========== UI更新 ==========
    function updateUI() {
        updateCounts();
        updateEditorCount();
        updateApiStatus();
        updatePreviews();
        updateWikiCounts();
        if (!$('#history-list').children.length) {
            $('#history-empty').style.display = 'block';
        }
    }

    function updateCounts() {
        let total = 0, count = 0;
        $$('.history-body').forEach(el => {
            const ct = el.querySelector('.content-text');
            total += (ct?.textContent || '').replace(/\s/g, '').length;
            count++;
        });
        $('#total-words').textContent = total.toLocaleString();
        $('#chapter-count').textContent = count;
        $('#avg-words').textContent = count ? Math.round(total / count) : 0;
    }

    function updateEditorCount() {
        $('#editor-count').textContent = $('#novel-content').value.length + ' 字';
    }

    function updatePreviews() {
        const map = {
            'character-preview': 'characterBible',
            'style-preview': 'styleRef',
            'negative-preview': 'negativePrompt'
        };
        Object.entries(map).forEach(([p, i]) => {
            const el = document.getElementById(p);
            const val = document.getElementById(i)?.value.trim() || '';
            if (el) el.textContent = val ? val.slice(0, 10) + (val.length > 10 ? '...' : '') : '';
        });
    }

    function updateWikiCounts() {
        const core = $('#wikiCore').value.length;
        const active = $('#wikiActive').value.length;
        const archive = $('#wikiArchive').value.length;

        const coreEl = $('#wiki-core-count');
        const activeEl = $('#wiki-active-count');
        const archiveEl = $('#wiki-archive-count');

        coreEl.textContent = core;
        activeEl.textContent = active;
        archiveEl.textContent = archive;

        // 超限提示
        activeEl.classList.toggle('over', active > WIKI_ACTIVE_LIMIT);
        
        $('#wiki-total-count').textContent = core + active + archive;
        $('#wiki-limit-tip').textContent = active > WIKI_ACTIVE_LIMIT ? 
            `⚠️ 活跃层超限(>${WIKI_ACTIVE_LIMIT})` : `活跃层建议≤${WIKI_ACTIVE_LIMIT}`;
        $('#wiki-limit-tip').style.color = active > WIKI_ACTIVE_LIMIT ? 'var(--danger)' : '';
    }

    // ========== 存储 ==========
    function save() {
        const fields = [
            'apiKey', 'novel-title', 'wikiCore', 'wikiActive', 'wikiArchive',
            'characterBible', 'styleRef', 'negativePrompt', 'statusTracker',
            'contextSummary', 'sceneGoal', 'mustInclude', 'rhythmControl',
            'lengthMode', 'pov', 'novel-content', 'prompt-input'
        ];

        const data = {
            config: {},
            history: [],
            wikiSections: {},
            collapsedGroups: [],
            chapter: state.chapter,
            syncCount: state.syncCount,
            version: '2.4'
        };

        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) data.config[id] = el.value;
        });

        ['wiki-core-section', 'wiki-active-section', 'wiki-archive-section'].forEach(id => {
            const el = document.getElementById(id);
            if (el) data.wikiSections[id] = el.classList.contains('collapsed');
        });

        ['character-group', 'style-group', 'negative-group'].forEach(id => {
            if (document.getElementById(id)?.classList.contains('collapsed')) {
                data.collapsedGroups.push(id);
            }
        });

        $$('.history-card').forEach(card => {
            data.history.push({
                html: card.querySelector('.history-body').innerHTML,
                chapter: card.dataset.chapter
            });
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
                    const el = document.getElementById(id);
                    if (el) el.value = val;
                });
            }

            state.chapter = data.chapter || 1;
            state.syncCount = data.syncCount || 0;

            if (data.wikiSections) {
                Object.entries(data.wikiSections).forEach(([id, collapsed]) => {
                    const el = document.getElementById(id);
                    if (el) el.classList.toggle('collapsed', collapsed);
                });
            }

            if (data.collapsedGroups) {
                ['character-group', 'style-group', 'negative-group'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.classList.toggle('collapsed', data.collapsedGroups.includes(id));
                });
            }

            if (data.history?.length) {
                const list = $('#history-list');
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

            if (state.syncCount >= 3) checkSyncReminder();

        } catch (e) { console.warn('加载失败:', e); }
    }

    // ========== Toast ==========
    function toast(msg, type = 'info') {
        document.querySelector('.toast-msg')?.remove();

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

        if (!document.getElementById('toast-css')) {
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
