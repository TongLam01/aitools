/**
 * DeepSeek 小说创作工具 v2.3.1
 * 修复版 - 所有按钮事件正常工作
 * 仅限 www.aibox6.com 和 aibox6.com 域名使用
 */

(function() {
    'use strict';

    // ==================== 域名验证 ====================
    const ALLOWED_DOMAINS = ['www.aibox6.com', 'aibox6.com'];
    const DEV_DOMAINS = ['localhost', '127.0.0.1', ''];
    const currentDomain = window.location.hostname;

    function checkDomain() {
        if (!DEV_DOMAINS.includes(currentDomain) && !ALLOWED_DOMAINS.includes(currentDomain)) {
            document.getElementById('domain-error').style.display = 'flex';
            return false;
        }
        return true;
    }

    // ==================== Prompt模板 ====================
    const PROMPTS = {
        mainSystem: (config) => {
            const { novelTitle, worldView, characterBible, wikiCore, wikiActive,
                    negativePrompt, contextSummary, statusTracker, sceneGoal,
                    mustInclude, pov, rhythm, lengthInstruction, styleRef, currentChapter } = config;

            return `你是一位世界级畅销小说作家，拥有20年创作经验。

══════════════════════════════════════
📚 作品：《${novelTitle || '未命名'}》 第${currentChapter}章
══════════════════════════════════════

【世界观】
${worldView || '（自由发挥）'}

【角色档案】
${characterBible || '（根据上下文）'}

【🔴 核心记忆（永久）】
${wikiCore || '暂无'}

【🟢 活跃记忆（当前章节）】
${wikiActive || '暂无'}

【已确认事实】
${statusTracker || '无'}

【前情回顾】
${contextSummary || '无'}

══════════════════════════════════════
🎬 本场指令
══════════════════════════════════════
▸ 目标：${sceneGoal || '自然推进'}
▸ 必含：${mustInclude || '无'}
▸ 视角：${pov}
▸ 节奏：${rhythm}
▸ 篇幅：${lengthInstruction}
▸ 风格：${styleRef || '自然流畅'}

【禁忌】${negativePrompt || '无'}

【创作准则】
1. 严格遵循核心记忆和事实档案
2. 用具体动作、对话代替抽象描述
3. 长短句交错，张弛有度
4. 调动五感描写
5. 每场都有戏剧张力
6. 通过行动展现性格
7. 适当埋设伏笔

⚠️ 直接输出正文，不要解释。`;
        },

        updateMemory: (chapter) => `你是小说剧情分析师。分析最新内容，更新分层知识库。

【规则】
1. 🔴 核心层：主角核心设定、世界观基础（≤500字，很少改动）
2. 🟢 活跃层：第${chapter}章相关人物/地点/物品（≤800字）
   格式：
   ═══════ 第${chapter}章 ═══════
   ┄┄┄ 人物 ┄┄┄
   • 角色：描述
   ┄┄┄ 地点 ┄┄┄
   • 地名：描述
3. 事实：只记录不可逆改变，格式 [第X章] 事件

返回JSON：
{
    "wikiCore": "核心层（无变化则原样返回）",
    "wikiActive": "活跃层（用分隔符格式）",
    "summary": "（第${chapter}章）2-3句摘要",
    "newFacts": "新事实或空字符串"
}`
    };

    const LENGTH_MAP = {
        'standard': '1500-2000字，紧凑流畅',
        'long': '3000字以上，深度刻画',
        'short': '约1000字，快速推进'
    };

    // ==================== 主工具类 ====================
    class NovelTool {
        constructor() {
            this.controller = null;
            this.genCount = 0;
            this.storageKey = 'deepseek_novel_v231';
            this.isGenerating = false;
            this.drawerTarget = null;
            this.liveWordCount = 0;
            this.updatesSinceSync = 0;
        }

        // ========== 初始化 ==========
        init() {
            if (!checkDomain()) return;
            this.bindAllEvents();
            this.loadStorage();
            this.updateUI();
        }

        // ========== 绑定所有事件 ==========
        bindAllEvents() {
            const $ = (sel) => document.querySelector(sel);
            const $$ = (sel) => document.querySelectorAll(sel);

            // API Key
            $('#api-key-btn').onclick = () => this.toggleApiPopup();
            $('#save-api-btn').onclick = () => this.saveApiKey();
            $('#cancel-api-btn').onclick = () => this.toggleApiPopup();

            // 点击外部关闭弹窗
            document.addEventListener('click', (e) => {
                const popup = $('#api-popup');
                const btn = $('#api-key-btn');
                if (popup.classList.contains('show') && !popup.contains(e.target) && !btn.contains(e.target)) {
                    popup.classList.remove('show');
                }
            });

            // 沉浸模式
            $('#immersive-btn').onclick = () => this.toggleImmersive();
            $('#exit-immersive').onclick = () => this.toggleImmersive();

            // 抽屉
            $('#drawer-overlay').onclick = (e) => { if (e.target === $('#drawer-overlay')) this.closeDrawer(); };
            $('#drawer-close-btn').onclick = () => this.closeDrawer();
            $('#drawer-cancel-btn').onclick = () => this.closeDrawer();
            $('#drawer-save-btn').onclick = () => this.saveDrawer();
            $('#drawer-textarea').oninput = () => {
                $('#drawer-char-count').textContent = $('#drawer-textarea').value.length;
            };

            // 展开按钮（使用data属性）
            $$('[data-expand]').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    this.openDrawer(btn.dataset.expand, btn.dataset.title);
                };
            });

            // 知识库分区折叠
            $$('.wiki-section-header').forEach(header => {
                header.onclick = () => this.toggleWikiSection(header.dataset.section);
            });

            // 输入组折叠
            $$('.input-group-header').forEach(header => {
                header.onclick = (e) => {
                    if (!e.target.classList.contains('input-expand-btn')) {
                        this.toggleInputGroup(header.dataset.group);
                    }
                };
            });

            // 归档按钮
            $('#archive-wiki-btn').onclick = () => this.archiveWiki();

            // 移动端Tab
            $$('.tab-item').forEach(tab => {
                tab.onclick = () => this.switchTab(tab.dataset.panel, tab);
            });

            // 生成和停止
            $('#btn-gen').onclick = () => this.generate();
            $('#btn-stop').onclick = () => this.stop();

            // 更新知识库
            $('#btn-update-memory').onclick = () => this.updateMemory();

            // 导出
            $('#btn-export').onclick = () => this.exportDoc();

            // 编辑器字数
            $('#novel-content').oninput = () => {
                this.updateEditorCount();
                this.save();
            };

            // 章节变化
            $('#currentChapter').onchange = () => this.updateChapterTag();

            // 自动保存
            document.addEventListener('input', (e) => {
                if (e.target.matches('input, textarea, select')) {
                    this.save();
                    this.updatePreviews();
                    if (['wikiCore', 'wikiActive', 'wikiArchive'].includes(e.target.id)) {
                        this.updateWikiCounts();
                    }
                }
            });

            // 快捷键
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !this.isGenerating) {
                    e.preventDefault();
                    this.generate();
                }
                if (e.key === 'Escape') {
                    if (this.isGenerating) this.stop();
                    else if ($('#drawer-overlay').classList.contains('show')) this.closeDrawer();
                }
            });
        }

        // ========== API Key ==========
        toggleApiPopup() {
            const popup = document.getElementById('api-popup');
            popup.classList.toggle('show');
            if (popup.classList.contains('show')) {
                document.getElementById('apiKey').focus();
            }
        }

        saveApiKey() {
            const key = document.getElementById('apiKey').value.trim();
            if (key) {
                this.save();
                this.updateApiKeyStatus();
                this.toggleApiPopup();
                this.toast('API Key 已保存', 'success');
            } else {
                this.toast('请输入有效的 API Key', 'error');
            }
        }

        updateApiKeyStatus() {
            const btn = document.getElementById('api-key-btn');
            const key = document.getElementById('apiKey').value.trim();
            btn.classList.toggle('configured', !!key);
        }

        // ========== 沉浸模式 ==========
        toggleImmersive() {
            document.body.classList.toggle('immersive-mode');
            if (document.body.classList.contains('immersive-mode')) {
                this.toast('沉浸模式，按 ESC 退出', 'info');
            }
        }

        // ========== 抽屉 ==========
        openDrawer(targetId, title) {
            const target = document.getElementById(targetId);
            if (!target) return;
            this.drawerTarget = targetId;
            document.getElementById('drawer-title').textContent = title || '编辑';
            document.getElementById('drawer-textarea').value = target.value;
            document.getElementById('drawer-char-count').textContent = target.value.length;
            document.getElementById('drawer-overlay').classList.add('show');
            setTimeout(() => {
                const ta = document.getElementById('drawer-textarea');
                ta.focus();
                ta.setSelectionRange(ta.value.length, ta.value.length);
            }, 100);
        }

        closeDrawer() {
            document.getElementById('drawer-overlay').classList.remove('show');
            this.drawerTarget = null;
        }

        saveDrawer() {
            if (!this.drawerTarget) return;
            const target = document.getElementById(this.drawerTarget);
            target.value = document.getElementById('drawer-textarea').value;
            target.dispatchEvent(new Event('input'));
            this.closeDrawer();
            this.toast('已保存', 'success');
        }

        // ========== 折叠 ==========
        toggleWikiSection(sectionId) {
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.toggle('collapsed');
                this.save();
            }
        }

        toggleInputGroup(groupId) {
            const group = document.getElementById(groupId);
            if (group) {
                group.classList.toggle('collapsed');
                this.updatePreviews();
                this.save();
            }
        }

        // ========== 归档 ==========
        archiveWiki() {
            const active = document.getElementById('wikiActive').value;
            const archive = document.getElementById('wikiArchive').value;
            const chapter = document.getElementById('currentChapter').value || 1;

            if (!active.trim()) {
                this.toast('活跃记忆为空', 'info');
                return;
            }

            const sep = `\n═══════ 第${chapter - 1}章归档 ═══════\n`;
            document.getElementById('wikiArchive').value = archive + sep + active;
            document.getElementById('wikiActive').value = '';
            this.updateWikiCounts();
            this.save();
            this.toast('已归档到历史', 'success');
        }

        // ========== Tab切换 ==========
        switchTab(panelId, tabEl) {
            document.querySelectorAll('.panel, #main-container').forEach(p => p.classList.remove('active-panel'));
            document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
            document.getElementById(panelId).classList.add('active-panel');
            tabEl.classList.add('active');
        }

        // ========== 生成 ==========
        async generate() {
            const apiKey = document.getElementById('apiKey').value.trim();
            if (!apiKey) {
                this.toast('请先配置 API Key', 'error');
                this.toggleApiPopup();
                return;
            }

            const content = document.getElementById('novel-content').value;
            const prompt = document.getElementById('prompt-input').value.trim();
            if (!content.trim() && !prompt) {
                this.toast('请输入上文或指令', 'warning');
                return;
            }

            this.setGenerating(true);
            this.controller = new AbortController();
            this.liveWordCount = 0;
            this.genCount++;

            const chapter = document.getElementById('currentChapter').value || 1;
            const cardId = `card-${Date.now()}`;
            const card = this.createCard(cardId, this.genCount, chapter);
            document.getElementById('history-list').prepend(card);
            document.getElementById('history-empty').style.display = 'none';

            const body = card.querySelector('.history-body');
            const serial = document.createElement('span');
            serial.className = 'serial-number';
            serial.textContent = `#${this.genCount}`;
            body.appendChild(serial);

            const text = document.createElement('span');
            text.className = 'content-text';
            body.appendChild(text);

            card.classList.add('generating');
            document.getElementById('history-wrapper').scrollTop = 0;

            try {
                const config = {
                    novelTitle: document.getElementById('novel-title').value.trim(),
                    worldView: document.getElementById('worldView').value.trim(),
                    characterBible: document.getElementById('characterBible').value.trim(),
                    wikiCore: document.getElementById('wikiCore').value.trim(),
                    wikiActive: document.getElementById('wikiActive').value.trim(),
                    negativePrompt: document.getElementById('negativePrompt').value.trim(),
                    contextSummary: document.getElementById('contextSummary').value.trim(),
                    statusTracker: document.getElementById('statusTracker').value.trim(),
                    sceneGoal: document.getElementById('sceneGoal').value.trim(),
                    mustInclude: document.getElementById('mustInclude').value.trim(),
                    pov: document.getElementById('pov').value,
                    rhythm: document.getElementById('rhythmControl').value,
                    lengthInstruction: LENGTH_MAP[document.getElementById('lengthMode').value],
                    styleRef: document.getElementById('styleRef').value.trim(),
                    currentChapter: chapter
                };

                const res = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    signal: this.controller.signal,
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            { role: 'system', content: PROMPTS.mainSystem(config) },
                            { role: 'user', content: `【上文】\n${content || '（开头）'}\n\n【指令】\n${prompt || '继续创作'}` }
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
                                    this.liveWordCount = text.textContent.replace(/\s/g, '').length;
                                    document.getElementById('live-word-count').textContent = this.liveWordCount;
                                }
                            } catch {}
                        }
                    }
                }

                this.toast(`完成！${this.liveWordCount}字`, 'success');
                this.updatesSinceSync++;
                this.checkSyncReminder();

            } catch (e) {
                if (e.name === 'AbortError') this.toast('已停止', 'info');
                else this.toast(e.message, 'error');
            } finally {
                card.classList.remove('generating');
                this.updateCardCount(card);
                this.setGenerating(false);
                this.save();
            }
        }

        stop() {
            if (this.controller) this.controller.abort();
        }

        // ========== 更新知识库 ==========
        async updateMemory() {
            const apiKey = document.getElementById('apiKey').value.trim();
            if (!apiKey) {
                this.toast('请先配置 API Key', 'error');
                return;
            }

            const list = document.getElementById('history-list');
            if (!list.children.length) {
                this.toast('暂无内容', 'warning');
                return;
            }

            const btn = document.getElementById('btn-update-memory');
            const btnText = document.getElementById('update-btn-text');
            const orig = btnText.textContent;
            btnText.innerHTML = '<span class="loading-indicator"></span>分析中...';
            btn.disabled = true;

            const chapter = document.getElementById('currentChapter').value || 1;
            const recent = Array.from(list.querySelectorAll('.history-body')).slice(0, 3)
                .map(el => (el.querySelector('.content-text')?.textContent || el.textContent)).join('\n---\n');

            try {
                const res = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            { role: 'system', content: PROMPTS.updateMemory(chapter) },
                            { role: 'user', content: `【核心层】\n${document.getElementById('wikiCore').value}\n\n【活跃层】\n${document.getElementById('wikiActive').value}\n\n【事实】\n${document.getElementById('statusTracker').value}\n\n【摘要】\n${document.getElementById('contextSummary').value}\n\n【最新内容】\n${recent}` }
                        ],
                        response_format: { type: 'json_object' },
                        temperature: 0.3
                    })
                });

                if (!res.ok) throw new Error(`请求失败: ${res.status}`);

                const data = await res.json();
                const result = JSON.parse(data.choices[0].message.content);

                if (result.wikiCore) document.getElementById('wikiCore').value = result.wikiCore;
                if (result.wikiActive) document.getElementById('wikiActive').value = result.wikiActive;
                if (result.summary) document.getElementById('contextSummary').value = result.summary;
                if (result.newFacts?.trim()) {
                    const facts = document.getElementById('statusTracker');
                    if (!facts.value.includes(result.newFacts.trim())) {
                        facts.value = facts.value + (facts.value ? '\n' : '') + result.newFacts.trim();
                    }
                }

                this.updatesSinceSync = 0;
                this.hideSyncReminder();
                this.updateWikiCounts();
                this.save();
                this.toast('知识库已更新', 'success');

            } catch (e) {
                this.toast('更新失败: ' + e.message, 'error');
            } finally {
                btnText.textContent = orig;
                btn.disabled = false;
            }
        }

        // ========== 卡片操作 ==========
        createCard(id, count, chapter) {
            const time = new Date().toLocaleString('zh-CN', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            });

            const div = document.createElement('div');
            div.className = 'history-card';
            div.id = id;
            div.dataset.chapter = chapter;
            div.innerHTML = `
                <div class="history-header">
                    <div class="history-header-left">
                        <span class="history-time">${time}</span>
                        <span class="chapter-tag">第${chapter}章</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span class="word-count-badge">📝 <span class="w-count">0</span> 字</span>
                        <button class="btn btn-outline btn-sm toggle-btn">折叠</button>
                    </div>
                </div>
                <div class="history-body" contenteditable="true"></div>
                <div class="history-actions">
                    <button class="btn btn-outline btn-sm set-base-btn" style="flex:1">📌 设为上文</button>
                    <button class="btn btn-outline btn-sm export-one-btn" style="flex:1">📥 导出</button>
                    <button class="btn btn-outline btn-sm copy-btn">📋</button>
                    <button class="btn btn-outline btn-sm delete-btn" style="color:var(--danger)">🗑</button>
                </div>
            `;

            // 绑定卡片事件
            div.querySelector('.toggle-btn').onclick = () => {
                div.classList.toggle('collapsed');
                div.querySelector('.toggle-btn').textContent = div.classList.contains('collapsed') ? '展开' : '折叠';
            };

            div.querySelector('.set-base-btn').onclick = () => {
                const ct = div.querySelector('.content-text');
                let t = ct ? ct.textContent : div.querySelector('.history-body').textContent;
                t = t.replace(/^#\d+\s*/, '').trim();
                if (t.length > 500) t = '...' + t.slice(-500);
                document.getElementById('novel-content').value = t;
                this.updateEditorCount();
                this.toast('已设为上文', 'success');
            };

            div.querySelector('.export-one-btn').onclick = () => this.exportOne(id, count);

            div.querySelector('.copy-btn').onclick = () => {
                const ct = div.querySelector('.content-text');
                navigator.clipboard.writeText(ct ? ct.textContent : '').then(
                    () => this.toast('已复制', 'success'),
                    () => this.toast('复制失败', 'error')
                );
            };

            div.querySelector('.delete-btn').onclick = () => {
                if (!confirm('确定删除？')) return;
                div.style.cssText = 'transform:translateX(100%);opacity:0;transition:0.3s';
                setTimeout(() => {
                    div.remove();
                    this.updateCounts();
                    this.save();
                    if (!document.getElementById('history-list').children.length) {
                        document.getElementById('history-empty').style.display = 'block';
                    }
                    this.toast('已删除', 'info');
                }, 300);
            };

            div.querySelector('.history-body').oninput = () => {
                this.updateCardCount(div);
                this.save();
            };

            return div;
        }

        updateCardCount(card) {
            const ct = card.querySelector('.content-text');
            const text = ct ? ct.textContent : card.querySelector('.history-body').textContent;
            card.querySelector('.w-count').textContent = text.replace(/\s/g, '').replace(/^#\d+/, '').length.toLocaleString();
            this.updateCounts();
        }

        // ========== 导出 ==========
        exportDoc() {
            const title = document.getElementById('novel-title').value || '未命名';
            const cards = Array.from(document.querySelectorAll('.history-card')).reverse();

            if (!cards.length) {
                this.toast('暂无内容', 'warning');
                return;
            }

            let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:"宋体";font-size:14pt;line-height:1.8;padding:40px}
h1{text-align:center;font-size:22pt}
.meta{text-align:center;color:#666;font-size:10pt;margin-bottom:40px}
.section{margin-bottom:30px}.section-title{font-weight:bold;margin-bottom:10px}
.content{text-indent:2em}hr{border:none;border-top:1px dashed #ccc;margin:30px 0}</style></head>
<body><h1>《${title}》</h1><div class="meta">导出时间：${new Date().toLocaleString('zh-CN')}</div>`;

            cards.forEach((card, i) => {
                const ch = card.dataset.chapter || '?';
                const ct = card.querySelector('.content-text');
                const text = (ct ? ct.textContent : card.querySelector('.history-body').textContent).replace(/^#\d+\s*/, '').trim();
                html += `<div class="section"><div class="section-title">【第${ch}章·第${i+1}节】</div>
<div class="content">${text.replace(/\n/g, '</div><div class="content">')}</div></div><hr>`;
            });

            html += '</body></html>';
            this.download(`《${title}》_全稿.doc`, html, 'application/msword');
            this.toast('导出成功', 'success');
        }

        exportOne(id, count) {
            const card = document.getElementById(id);
            if (!card) return;
            const title = document.getElementById('novel-title').value || '未命名';
            const ch = card.dataset.chapter || '?';
            const ct = card.querySelector('.content-text');
            const text = (ct ? ct.textContent : '').replace(/^#\d+\s*/, '');

            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:"宋体";font-size:14pt;line-height:1.8;padding:40px}
h1{text-align:center;font-size:18pt;margin-bottom:30px}.content{text-indent:2em}</style></head>
<body><h1>《${title}》第${ch}章·第${count}节</h1>
<div class="content">${text.replace(/\n/g, '</div><div class="content">')}</div></body></html>`;

            this.download(`${title}_第${ch}章第${count}节.doc`, html, 'application/msword');
            this.toast('导出成功', 'success');
        }

        download(name, content, type) {
            const blob = new Blob([content], { type: type + ';charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = name;
            a.click();
            URL.revokeObjectURL(a.href);
        }

        // ========== UI更新 ==========
        setGenerating(loading) {
            this.isGenerating = loading;
            document.getElementById('btn-gen').style.display = loading ? 'none' : 'inline-flex';
            document.getElementById('btn-stop').style.display = loading ? 'inline-flex' : 'none';
            document.getElementById('generating-stats').classList.toggle('show', loading);
            document.getElementById('btn-update-memory').disabled = loading;
        }

        updateUI() {
            this.updateCounts();
            this.updateEditorCount();
            this.updateApiKeyStatus();
            this.updatePreviews();
            this.updateChapterTag();
            this.updateWikiCounts();
            if (!document.getElementById('history-list').children.length) {
                document.getElementById('history-empty').style.display = 'block';
            }
        }

        updateCounts() {
            let total = 0, count = 0;
            document.querySelectorAll('.history-body').forEach(el => {
                const ct = el.querySelector('.content-text');
                total += (ct ? ct.textContent : el.textContent).replace(/\s/g, '').replace(/^#\d+/, '').length;
                count++;
            });
            document.getElementById('total-words').textContent = total.toLocaleString();
            document.getElementById('ver-count').textContent = count;
            document.getElementById('avg-words').textContent = count ? Math.round(total / count) : 0;
        }

        updateEditorCount() {
            document.getElementById('editor-count').textContent = document.getElementById('novel-content').value.length + ' 字';
        }

        updatePreviews() {
            const map = { 'worldview-preview': 'worldView', 'character-preview': 'characterBible', 'style-preview': 'styleRef', 'negative-preview': 'negativePrompt' };
            Object.entries(map).forEach(([pid, iid]) => {
                const p = document.getElementById(pid);
                const t = document.getElementById(iid)?.value.trim() || '';
                if (p) p.textContent = t ? t.substring(0, 12) + (t.length > 12 ? '...' : '') : '';
            });
        }

        updateChapterTag() {
            document.getElementById('summary-chapter-tag').textContent = '第' + (document.getElementById('currentChapter').value || '?') + '章';
        }

        updateWikiCounts() {
            const core = document.getElementById('wikiCore').value.length;
            const active = document.getElementById('wikiActive').value.length;
            const archive = document.getElementById('wikiArchive').value.length;
            document.getElementById('wiki-core-count').textContent = core + '字';
            document.getElementById('wiki-active-count').textContent = active + '字';
            document.getElementById('wiki-archive-count').textContent = archive + '字';
            const total = core + active + archive;
            const el = document.getElementById('wiki-total-count');
            el.textContent = total;
            el.style.color = (core + active) > 2000 ? 'var(--danger)' : '';
        }

        checkSyncReminder() {
            if (this.updatesSinceSync >= 3) {
                document.getElementById('coherence-check').style.display = 'flex';
                document.getElementById('coherence-text').textContent = `已创作${this.updatesSinceSync}段，建议同步`;
            }
        }

        hideSyncReminder() {
            document.getElementById('coherence-check').style.display = 'none';
        }

        // ========== 存储 ==========
        save() {
            const fields = ['apiKey', 'novel-title', 'wikiCore', 'wikiActive', 'wikiArchive', 'worldView', 'characterBible',
                'styleRef', 'negativePrompt', 'statusTracker', 'contextSummary', 'sceneGoal', 'mustInclude',
                'rhythmControl', 'lengthMode', 'pov', 'novel-content', 'prompt-input', 'currentChapter'];

            const data = {
                config: {},
                history: [],
                wikiSections: {},
                collapsedGroups: [],
                genCount: this.genCount,
                updatesSinceSync: this.updatesSinceSync,
                version: '2.3.1'
            };

            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el) data.config[id] = el.value;
            });

            ['wiki-core-section', 'wiki-active-section', 'wiki-archive-section'].forEach(id => {
                const el = document.getElementById(id);
                if (el) data.wikiSections[id] = el.classList.contains('collapsed');
            });

            ['worldview-group', 'character-group', 'style-group', 'negative-group'].forEach(id => {
                if (document.getElementById(id)?.classList.contains('collapsed')) data.collapsedGroups.push(id);
            });

            document.querySelectorAll('.history-card').forEach(card => {
                data.history.push({ html: card.querySelector('.history-body').innerHTML, chapter: card.dataset.chapter || 1 });
            });

            try { localStorage.setItem(this.storageKey, JSON.stringify(data)); } catch {}
        }

        loadStorage() {
            try {
                const raw = localStorage.getItem(this.storageKey);
                if (!raw) return;
                const data = JSON.parse(raw);

                if (data.config) {
                    Object.entries(data.config).forEach(([id, val]) => {
                        const el = document.getElementById(id);
                        if (el) el.value = val;
                    });
                }

                this.genCount = data.genCount || 0;
                this.updatesSinceSync = data.updatesSinceSync || 0;

                if (data.wikiSections) {
                    Object.entries(data.wikiSections).forEach(([id, collapsed]) => {
                        const el = document.getElementById(id);
                        if (el) el.classList.toggle('collapsed', collapsed);
                    });
                }

                if (data.collapsedGroups) {
                    ['worldview-group', 'character-group', 'style-group', 'negative-group'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.classList.toggle('collapsed', data.collapsedGroups.includes(id));
                    });
                }

                if (data.history?.length) {
                    const list = document.getElementById('history-list');
                    data.history.slice().reverse().forEach((item, i) => {
                        const html = typeof item === 'string' ? item : item.html;
                        const ch = typeof item === 'string' ? 1 : (item.chapter || 1);
                        const count = data.history.length - i;
                        const card = this.createCard(`r-${i}`, count, ch);
                        card.querySelector('.history-body').innerHTML = html;
                        card.querySelector('.chapter-tag').textContent = `第${ch}章`;
                        list.prepend(card);
                        this.updateCardCount(card);
                    });
                }

                if (this.updatesSinceSync >= 3) this.checkSyncReminder();

            } catch (e) { console.warn('加载失败:', e); }
        }

        // ========== Toast ==========
        toast(msg, type = 'info') {
            document.querySelector('.toast-msg')?.remove();
            const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
            const colors = {
                success: 'linear-gradient(135deg,#34c759,#30d158)',
                error: 'linear-gradient(135deg,#ff3b30,#ff453a)',
                warning: 'linear-gradient(135deg,#ff9500,#ff9f0a)',
                info: 'linear-gradient(135deg,#0071e3,#0077ed)'
            };

            const div = document.createElement('div');
            div.className = 'toast-msg';
            div.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);
background:${colors[type]};color:#fff;padding:14px 28px;border-radius:50px;font-size:14px;
font-weight:600;z-index:10000;box-shadow:0 8px 30px rgba(0,0,0,0.2);display:flex;align-items:center;gap:10px;
animation:toastIn 0.4s cubic-bezier(0.68,-0.55,0.265,1.55)`;
            div.innerHTML = `<span style="font-size:18px">${icons[type]}</span><span>${msg}</span>`;
            document.body.appendChild(div);

            if (!document.getElementById('toast-css')) {
                const s = document.createElement('style');
                s.id = 'toast-css';
                s.textContent = `@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(30px) scale(0.9)}
to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
@keyframes toastOut{from{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}
to{opacity:0;transform:translateX(-50%) translateY(-20px) scale(0.9)}}`;
                document.head.appendChild(s);
            }

            setTimeout(() => {
                div.style.animation = 'toastOut 0.3s ease forwards';
                setTimeout(() => div.remove(), 300);
            }, 2500);
        }
    }

    // ==================== 启动 ====================
    const tool = new NovelTool();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => tool.init());
    } else {
        tool.init();
    }

})();
