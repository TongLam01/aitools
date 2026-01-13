/**
 * DeepSeek 小说创作工具 v2.2
 * 仅限 www.aibox6.com 和 aibox6.com 域名使用
 */

(function() {
    'use strict';

    // ==================== 域名验证 ====================
    const ALLOWED_DOMAINS = ['www.aibox6.com', 'aibox6.com'];
    const currentDomain = window.location.hostname;
    const DEV_DOMAINS = ['localhost', '127.0.0.1', ''];

    function checkDomain() {
        const isDev = DEV_DOMAINS.includes(currentDomain);
        const isAllowed = ALLOWED_DOMAINS.includes(currentDomain);

        if (!isDev && !isAllowed) {
            document.getElementById('domain-error').style.display = 'flex';
            return false;
        }
        return true;
    }

    // ==================== Prompt模板系统 ====================
    const PROMPTS = {
        // 主创作系统Prompt
        mainSystem: function(config) {
            const {
                novelTitle, worldView, characterBible, entityMemory, negativePrompt,
                contextSummary, statusTracker, sceneGoal, mustInclude,
                pov, rhythm, lengthInstruction, styleRef, currentChapter
            } = config;

            return `你是一位世界级畅销小说作家，拥有20年创作经验。你的作品以情节紧凑、人物鲜活、文笔优美著称。

══════════════════════════════════════
📚 作品：《${novelTitle || '未命名'}》
📖 当前：第${currentChapter}章
══════════════════════════════════════

【世界观架构】
${worldView || '（由你根据上下文自由发挥）'}

【核心人物档案】
${characterBible || '（根据上下文理解人物）'}

【知识库 / 记忆存档】
━━━━━━━━━━━━━━━━━━━━━━━━━━
${entityMemory || '暂无存档记录'}

【已确认的事实（不可逆转）】
${statusTracker || '无'}

【前情回顾】
${contextSummary || '无'}

══════════════════════════════════════
🎬 本场创作指令
══════════════════════════════════════
▸ 场景目标：${sceneGoal || '自然推进剧情'}
▸ 必须包含：${mustInclude || '无强制要求'}
▸ 叙事视角：${pov}
▸ 节奏控制：${rhythm}
▸ 篇幅要求：${lengthInstruction}
▸ 文学风格：${styleRef || '自然流畅，张弛有度'}

【写作禁忌】
${negativePrompt || '无特殊禁忌'}

══════════════════════════════════════
📋 创作准则（务必遵守）
══════════════════════════════════════
1. **连贯性**：严格遵循已有设定和事实档案，人物性格、能力、关系必须前后一致
2. **具体化**：用具体的动作、对话、细节代替抽象描述，展示而非陈述
3. **节奏感**：长短句交错，张弛有度，避免平铺直叙
4. **沉浸感**：调动五感描写（视觉、听觉、触觉、嗅觉、味觉），让读者身临其境
5. **冲突性**：每一场都要有明确的戏剧张力或情感起伏
6. **人物弧光**：通过行动展现性格，通过选择推动成长
7. **伏笔意识**：适当埋设伏笔，回收前文线索，保持悬念
8. **对话真实**：对话要符合人物身份、性格、当时情绪，避免说教式台词

⚠️ 直接输出正文，不要任何解释、标题或元描述。保持文学性和可读性。`;
        },

        // 知识库智能更新Prompt
        updateMemory: function(currentChapter) {
            return `你是一位专业的小说剧情分析师和编辑。请仔细分析最新创作的小说片段，完成以下任务：

【任务一：更新知识库 Wiki】
提取并整理以下信息（保留重要旧条目，合并新信息）：
- [人物] 新出现或有变化的角色及其特征
- [关系] 人物关系的建立或变化
- [物品] 重要道具、武器、信物等
- [地点] 新场景、地理信息
- [势力] 组织、门派、国家等
- [伏笔] 未解之谜、暗示、线索
- [能力] 技能、功法、特殊能力

【任务二：更新剧情摘要】
用2-3句话概括最新剧情的核心发展，格式为"（第${currentChapter}章）内容..."，突出：
- 主要冲突/事件
- 关键转折
- 人物状态变化

【任务三：更新事实档案】
只记录【不可逆】的重大改变，格式为"[第X章] 事件"：
- 角色死亡/重伤
- 关系彻底破裂或建立
- 重要物品得失
- 重大决定/承诺
- 身份揭露
- 实力突破

请严格按以下JSON格式返回：
{
    "wiki": "整理后的知识库内容，使用[类别]标签分类",
    "summary": "（第${currentChapter}章）2-3句话的剧情摘要",
    "facts": "事实列表，每条格式为[第X章]事件，保留所有旧事实并添加新事实"
}`;
        }
    };

    // 篇幅指令映射 - 更新字数要求
    const LENGTH_INSTRUCTIONS = {
        'standard': '请按标准篇幅创作，约1500-2000字。保持叙事紧凑，情节推进流畅。',
        'long': '请深度扩写，字数3000字以上。充分展开环境描写、心理刻画、人物对话和动作细节，让读者完全沉浸其中。',
        'short': '请精炼叙事，约1000字左右。快速推进情节，保留核心冲突，适合过渡场景。'
    };

    // ==================== 主工具类 ====================
    class NovelCreationTool {
        constructor() {
            this.controller = null;
            this.genCount = 0;
            this.storageKey = 'deepseek_novel_v22';
            this.isGenerating = false;
            this.currentDrawerTarget = null;
            this.liveWordCount = 0;
            this.updatesSinceLastSync = 0;
            this.collapsedGroups = ['worldview-group', 'character-group', 'style-group', 'negative-group'];
        }

        // ========== 初始化 ==========
        init() {
            if (!checkDomain()) return;

            this.loadFromStorage();
            this.bindEvents();
            this.updateCounts();
            this.updateEditorCount();
            this.updateApiKeyStatus();
            this.checkEmptyState();
            this.updatePreviews();
            this.updateChapterTag();
        }

        // ========== 事件绑定 ==========
        bindEvents() {
            // 编辑器字数统计
            const editor = document.getElementById('novel-content');
            editor.addEventListener('input', () => {
                this.updateEditorCount();
                this.save();
            });

            // 抽屉textarea字数统计
            const drawerTextarea = document.getElementById('drawer-textarea');
            drawerTextarea.addEventListener('input', () => {
                document.getElementById('drawer-char-count').innerText =
                    drawerTextarea.value.length;
            });

            // 点击外部关闭API弹窗
            document.addEventListener('click', (e) => {
                const popup = document.getElementById('api-popup');
                const btn = document.getElementById('api-key-btn');
                if (!popup.contains(e.target) && !btn.contains(e.target)) {
                    popup.classList.remove('show');
                }
            });

            // 所有输入框自动保存和预览更新
            document.addEventListener('input', (e) => {
                if (e.target.matches('input, textarea, select')) {
                    this.save();
                    this.updatePreviews();
                }
            });

            // 章节号变化时更新标签
            document.getElementById('currentChapter').addEventListener('change', () => {
                this.updateChapterTag();
            });

            // 快捷键
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    if (!this.isGenerating) {
                        this.generate();
                    }
                }
                if (e.key === 'Escape') {
                    if (this.isGenerating) {
                        this.stop();
                    } else if (document.getElementById('drawer-overlay').classList.contains('show')) {
                        this.closeDrawer();
                    }
                }
            });

            // 监听选择变化以提供智能提示
            document.getElementById('lengthMode').addEventListener('change', () => {
                this.showSmartTip();
            });
        }

        // ========== 输入组折叠 ==========
        toggleInputGroup(groupId) {
            const group = document.getElementById(groupId);
            if (!group) return;

            // 知识库组不允许折叠
            if (groupId === 'wiki-group') return;

            group.classList.toggle('collapsed');
            this.updatePreviews();
            this.save();
        }

        // ========== 更新预览文本 ==========
        updatePreviews() {
            const previewMap = {
                'worldview-preview': 'worldView',
                'character-preview': 'characterBible',
                'style-preview': 'styleRef',
                'negative-preview': 'negativePrompt'
            };

            Object.keys(previewMap).forEach(previewId => {
                const preview = document.getElementById(previewId);
                const input = document.getElementById(previewMap[previewId]);
                if (preview && input) {
                    const text = input.value.trim();
                    preview.innerText = text ? text.substring(0, 15) + (text.length > 15 ? '...' : '') : '';
                }
            });
        }

        // ========== 更新章节标签 ==========
        updateChapterTag() {
            const chapter = document.getElementById('currentChapter').value || '?';
            document.getElementById('summary-chapter-tag').innerText = `第${chapter}章`;
        }

        // ========== Tab切换 ==========
        switchTab(panelId, tabEl) {
            document.querySelectorAll('.panel, #main-container').forEach(p => {
                p.classList.remove('active-panel');
            });
            document.querySelectorAll('.tab-item').forEach(t => {
                t.classList.remove('active');
            });
            document.getElementById(panelId).classList.add('active-panel');
            tabEl.classList.add('active');
        }

        // ========== API Key 管理 ==========
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
                this.showToast('API Key 已保存', 'success');
            } else {
                this.showToast('请输入有效的 API Key', 'error');
            }
        }

        updateApiKeyStatus() {
            const btn = document.getElementById('api-key-btn');
            const key = document.getElementById('apiKey').value.trim();
            if (key) {
                btn.classList.add('configured');
            } else {
                btn.classList.remove('configured');
            }
        }

        // ========== 抽屉编辑器 ==========
        openDrawer(targetId, title) {
            const target = document.getElementById(targetId);
            if (!target) return;

            this.currentDrawerTarget = targetId;
            document.getElementById('drawer-title').innerText = title;
            document.getElementById('drawer-textarea').value = target.value;
            document.getElementById('drawer-char-count').innerText = target.value.length;
            document.getElementById('drawer-overlay').classList.add('show');

            setTimeout(() => {
                const textarea = document.getElementById('drawer-textarea');
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }, 100);
        }

        closeDrawer() {
            document.getElementById('drawer-overlay').classList.remove('show');
            this.currentDrawerTarget = null;
        }

        saveDrawer() {
            if (!this.currentDrawerTarget) return;

            const target = document.getElementById(this.currentDrawerTarget);
            const newValue = document.getElementById('drawer-textarea').value;
            target.value = newValue;

            target.dispatchEvent(new Event('input'));

            this.closeDrawer();
            this.showToast('内容已保存', 'success');
            this.save();
        }

        // ========== 沉浸模式 ==========
        toggleImmersive() {
            document.body.classList.toggle('immersive-mode');
            const isImmersive = document.body.classList.contains('immersive-mode');

            if (isImmersive) {
                this.showToast('已进入沉浸写作模式，按 ESC 可退出', 'info');
            }
        }

        // ========== 构建Prompt ==========
        buildPromptConfig() {
            const lengthMode = document.getElementById('lengthMode').value;
            const currentChapter = document.getElementById('currentChapter').value || 1;

            return {
                novelTitle: document.getElementById('novel-title').value.trim(),
                worldView: document.getElementById('worldView').value.trim(),
                characterBible: document.getElementById('characterBible').value.trim(),
                entityMemory: document.getElementById('entityMemory').value.trim(),
                negativePrompt: document.getElementById('negativePrompt').value.trim(),
                contextSummary: document.getElementById('contextSummary').value.trim(),
                statusTracker: document.getElementById('statusTracker').value.trim(),
                sceneGoal: document.getElementById('sceneGoal').value.trim(),
                mustInclude: document.getElementById('mustInclude').value.trim(),
                pov: document.getElementById('pov').value,
                rhythm: document.getElementById('rhythmControl').value,
                lengthInstruction: LENGTH_INSTRUCTIONS[lengthMode],
                styleRef: document.getElementById('styleRef').value.trim(),
                currentChapter: currentChapter
            };
        }

        // ========== 生成内容 ==========
        async generate() {
            const apiKey = document.getElementById('apiKey').value.trim();
            if (!apiKey) {
                this.showToast('请先配置 API Key', 'error');
                this.toggleApiPopup();
                return;
            }

            const editor = document.getElementById('novel-content');
            const userPrompt = document.getElementById('prompt-input').value.trim();

            if (!editor.value.trim() && !userPrompt) {
                this.showToast('请输入上文内容或创作指令', 'warning');
                return;
            }

            this.toggleUI(true);
            this.controller = new AbortController();
            this.liveWordCount = 0;

            this.genCount++;
            const cardId = `card-${Date.now()}`;
            const currentChapter = document.getElementById('currentChapter').value || 1;
            const card = this.createHistoryCard(cardId, this.genCount, '', currentChapter);
            document.getElementById('history-list').prepend(card);
            this.checkEmptyState();

            const cardBody = card.querySelector('.history-body');
            const serialSpan = document.createElement('span');
            serialSpan.className = 'serial-number';
            serialSpan.innerText = `#${this.genCount}`;
            cardBody.appendChild(serialSpan);

            const textContent = document.createElement('span');
            textContent.className = 'content-text';
            cardBody.appendChild(textContent);

            card.classList.add('generating');
            document.getElementById('history-wrapper').scrollTop = 0;

            try {
                const config = this.buildPromptConfig();
                const systemPrompt = PROMPTS.mainSystem(config);

                const response = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    signal: this.controller.signal,
                    body: JSON.stringify({
                        model: "deepseek-chat",
                        messages: [
                            { role: "system", content: systemPrompt },
                            {
                                role: "user",
                                content: `【接续上文】
${editor.value || '（从头开始创作）'}

【本次指令】
${userPrompt || '请继续创作，自然推进剧情。'}`
                            }
                        ],
                        stream: true,
                        temperature: 0.85,
                        max_tokens: 8000,
                        top_p: 0.9
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `请求失败: ${response.status}`);
                }

                const reader = response.body.getReader();
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
                                const data = JSON.parse(line.slice(6));
                                const content = data.choices?.[0]?.delta?.content;
                                if (content) {
                                    textContent.innerText += content;
                                    this.liveWordCount = textContent.innerText.replace(/\s/g, '').length;
                                    document.getElementById('live-word-count').innerText = this.liveWordCount;
                                }
                            } catch (parseError) {
                                // 忽略解析错误
                            }
                        }
                    }
                }

                this.showToast(`创作完成！共 ${this.liveWordCount} 字`, 'success');
                this.updatesSinceLastSync++;
                this.checkCoherenceReminder();

            } catch (e) {
                if (e.name === 'AbortError') {
                    this.showToast('已停止生成', 'info');
                } else {
                    this.showToast(e.message, 'error');
                    console.error('生成错误:', e);
                }
            } finally {
                card.classList.remove('generating');
                this.updateCardWordCount(card);
                this.toggleUI(false);
                this.save();
            }
        }

        // ========== 智能更新记忆 ==========
        async smartUpdateMemory() {
            const apiKey = document.getElementById('apiKey').value.trim();
            if (!apiKey) {
                this.showToast('请先配置 API Key', 'error');
                return;
            }

            const historyList = document.getElementById('history-list');
            if (historyList.children.length === 0) {
                this.showToast('暂无内容可同步', 'warning');
                return;
            }

            const btn = document.querySelector('.btn-update');
            const btnText = document.getElementById('update-btn-text');
            const originalText = btnText.innerText;
            btnText.innerHTML = '<span class="loading-indicator"></span>正在分析...';
            btn.disabled = true;

            const currentChapter = document.getElementById('currentChapter').value || 1;

            // 获取最近2-3个片段
            const recentCards = Array.from(historyList.querySelectorAll('.history-body')).slice(0, 3);
            const recentTexts = recentCards.map(el => {
                const contentSpan = el.querySelector('.content-text');
                return contentSpan ? contentSpan.innerText : el.innerText;
            }).join('\n\n---\n\n');

            try {
                const response = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: "deepseek-chat",
                        messages: [
                            { role: "system", content: PROMPTS.updateMemory(currentChapter) },
                            {
                                role: "user",
                                content: `【当前知识库】
${document.getElementById('entityMemory').value || '（空）'}

【当前剧情摘要】
${document.getElementById('contextSummary').value || '（空）'}

【当前事实档案】
${document.getElementById('statusTracker').value || '（空）'}

【最新创作内容（第${currentChapter}章）】
${recentTexts}`
                            }
                        ],
                        response_format: { type: 'json_object' },
                        temperature: 0.3
                    })
                });

                if (!response.ok) {
                    throw new Error(`请求失败: ${response.status}`);
                }

                const data = await response.json();
                const result = JSON.parse(data.choices[0].message.content);

                if (result.wiki) {
                    document.getElementById('entityMemory').value = result.wiki;
                }
                if (result.summary) {
                    document.getElementById('contextSummary').value = result.summary;
                }
                if (result.facts) {
                    document.getElementById('statusTracker').value = result.facts;
                }

                this.updatesSinceLastSync = 0;
                this.hideCoherenceReminder();
                this.save();
                this.showToast('知识库更新完成！AI记忆已同步', 'success');

            } catch (e) {
                this.showToast('更新失败: ' + e.message, 'error');
                console.error('更新错误:', e);
            } finally {
                btnText.innerText = originalText;
                btn.disabled = false;
            }
        }

        // ========== 连贯性提醒 ==========
        checkCoherenceReminder() {
            if (this.updatesSinceLastSync >= 3) {
                const indicator = document.getElementById('coherence-check');
                indicator.style.display = 'flex';
                indicator.classList.add('warning');
                document.getElementById('coherence-text').innerText =
                    `已创作${this.updatesSinceLastSync}段，建议同步知识库`;
            }
        }

        hideCoherenceReminder() {
            document.getElementById('coherence-check').style.display = 'none';
        }

        // ========== 历史卡片 ==========
        createHistoryCard(id, count, content = '', chapter = 1) {
            const time = new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
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
                        <span class="word-count-badge">
                            📝 <span class="w-count">0</span> 字
                        </span>
                        <button class="btn btn-outline btn-sm" onclick="NovelTool.toggleCard('${id}')">折叠</button>
                    </div>
                </div>
                <div class="history-body" contenteditable="true">${content ? `<span class="serial-number">#${count}</span><span class="content-text">${content}</span>` : ''}</div>
                <div class="history-actions">
                    <button class="btn btn-outline btn-sm" style="flex:1" onclick="NovelTool.setAsBase('${id}')">
                        📌 设为上文
                    </button>
                    <button class="btn btn-outline btn-sm" style="flex:1" onclick="NovelTool.downloadOne('${id}', ${count})">
                        📥 导出
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="NovelTool.copyCard('${id}')">
                        📋
                    </button>
                    <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="NovelTool.deleteCard('${id}')">
                        🗑
                    </button>
                </div>
            `;

            if (content) {
                setTimeout(() => this.updateCardWordCount(div), 0);
            }

            // 绑定编辑事件
            const body = div.querySelector('.history-body');
            body.addEventListener('input', () => {
                this.updateCardWordCount(div);
                this.save();
            });

            return div;
        }

        toggleCard(id) {
            const card = document.getElementById(id);
            if (!card) return;

            const btn = card.querySelector('button[onclick^="NovelTool.toggleCard"]');
            card.classList.toggle('collapsed');
            btn.innerText = card.classList.contains('collapsed') ? '展开' : '折叠';
        }

        setAsBase(id) {
            const card = document.getElementById(id);
            if (!card) return;

            const contentSpan = card.querySelector('.content-text');
            let text = contentSpan ? contentSpan.innerText : card.querySelector('.history-body').innerText;
            text = text.replace(/^#\d+\s*/, '').trim();

            if (text.length > 500) {
                text = '...' + text.slice(-500);
            }

            document.getElementById('novel-content').value = text;
            this.updateEditorCount();

            const mainTab = document.querySelectorAll('.tab-item')[1];
            if (mainTab) {
                this.switchTab('main-container', mainTab);
            }

            this.showToast('已设为上文接力点', 'success');
        }

        copyCard(id) {
            const card = document.getElementById(id);
            if (!card) return;

            const contentSpan = card.querySelector('.content-text');
            const text = contentSpan ? contentSpan.innerText : card.querySelector('.history-body').innerText;

            navigator.clipboard.writeText(text).then(() => {
                this.showToast('已复制到剪贴板', 'success');
            }).catch(() => {
                this.showToast('复制失败', 'error');
            });
        }

        deleteCard(id) {
            if (!confirm('确定要删除这个片段吗？此操作不可恢复。')) return;

            const card = document.getElementById(id);
            if (card) {
                card.style.transform = 'translateX(100%)';
                card.style.opacity = '0';
                card.style.transition = 'all 0.3s ease';

                setTimeout(() => {
                    card.remove();
                    this.updateCounts();
                    this.save();
                    this.checkEmptyState();
                    this.showToast('已删除', 'info');
                }, 300);
            }
        }

        // ========== 导出功能 ==========
        downloadFullDraft() {
            const title = document.getElementById('novel-title').value || '未命名小说';

            // 创建HTML格式的文档内容（Word可以打开）
            let htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
body { font-family: "宋体", SimSun, serif; font-size: 14pt; line-height: 1.8; padding: 40px; }
h1 { text-align: center; font-size: 22pt; margin-bottom: 20px; }
.meta { text-align: center; color: #666; font-size: 10pt; margin-bottom: 40px; }
.section { margin-bottom: 30px; }
.section-title { font-weight: bold; color: #333; margin-bottom: 10px; }
.content { text-indent: 2em; }
hr { border: none; border-top: 1px dashed #ccc; margin: 30px 0; }
</style>
</head>
<body>
<h1>《${title}》</h1>
<div class="meta">导出时间：${new Date().toLocaleString('zh-CN')}</div>
`;

            const cards = Array.from(document.querySelectorAll('.history-card')).reverse();

            if (cards.length === 0) {
                this.showToast('暂无内容可导出', 'warning');
                return;
            }

            cards.forEach((card, index) => {
                const chapter = card.dataset.chapter || '?';
                const contentSpan = card.querySelector('.content-text');
                const text = contentSpan ? contentSpan.innerText : card.querySelector('.history-body').innerText;
                const cleanText = text.replace(/^#\d+\s*/, '').trim();

                htmlContent += `
<div class="section">
<div class="section-title">【第${chapter}章 · 第${index + 1}节】</div>
<div class="content">${cleanText.replace(/\n/g, '</div><div class="content">')}</div>
</div>
<hr>
`;
            });

            htmlContent += `
</body>
</html>`;

            // 创建Blob并下载为.doc文件
            const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `《${title}》_全稿_${Date.now()}.doc`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);

            this.showToast('全本导出成功！', 'success');
        }

        downloadOne(id, count) {
            const card = document.getElementById(id);
            if (!card) return;

            const chapter = card.dataset.chapter || '?';
            const contentSpan = card.querySelector('.content-text');
            const text = contentSpan ? contentSpan.innerText : card.querySelector('.history-body').innerText;
            const title = document.getElementById('novel-title').value || '未命名';

            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title} - 第${chapter}章第${count}节</title>
<style>
body { font-family: "宋体", SimSun, serif; font-size: 14pt; line-height: 1.8; padding: 40px; }
h1 { text-align: center; font-size: 18pt; margin-bottom: 30px; }
.content { text-indent: 2em; }
</style>
</head>
<body>
<h1>《${title}》第${chapter}章 · 第${count}节</h1>
<div class="content">${text.replace(/^#\d+\s*/, '').replace(/\n/g, '</div><div class="content">')}</div>
</body>
</html>`;

            const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${title}_第${chapter}章第${count}节.doc`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);

            this.showToast('导出成功！', 'success');
        }

        // ========== 统计更新 ==========
        updateCardWordCount(card) {
            const contentSpan = card.querySelector('.content-text');
            const text = contentSpan ? contentSpan.innerText : card.querySelector('.history-body').innerText;
            const wordCount = text.replace(/\s/g, '').replace(/^#\d+/, '').length;
            card.querySelector('.w-count').innerText = wordCount.toLocaleString();
            this.updateCounts();
        }

        updateCounts() {
            let total = 0;
            let count = 0;
            document.querySelectorAll('.history-body').forEach(el => {
                const contentSpan = el.querySelector('.content-text');
                const text = contentSpan ? contentSpan.innerText : el.innerText;
                total += text.replace(/\s/g, '').replace(/^#\d+/, '').length;
                count++;
            });

            document.getElementById('total-words').innerText = total.toLocaleString();
            document.getElementById('ver-count').innerText = count;
            document.getElementById('avg-words').innerText = count > 0 ? Math.round(total / count) : 0;
        }

        updateEditorCount() {
            const text = document.getElementById('novel-content').value;
            document.getElementById('editor-count').innerText = text.length + ' 字';
        }

        checkEmptyState() {
            const historyList = document.getElementById('history-list');
            const emptyState = document.getElementById('history-empty');

            if (historyList.children.length === 0) {
                emptyState.style.display = 'block';
            } else {
                emptyState.style.display = 'none';
            }
        }

        // ========== UI状态切换 ==========
        toggleUI(loading) {
            this.isGenerating = loading;
            document.getElementById('btn-gen').style.display = loading ? 'none' : 'inline-flex';
            document.getElementById('btn-stop').style.display = loading ? 'inline-flex' : 'none';
            document.getElementById('generating-stats').classList.toggle('show', loading);

            document.querySelectorAll('.btn-update').forEach(btn => {
                btn.disabled = loading;
            });
        }

        stop() {
            if (this.controller) {
                this.controller.abort();
            }
        }

        // ========== 智能提示 ==========
        showSmartTip() {
            const lengthMode = document.getElementById('lengthMode').value;
            const tips = {
                'long': '💡 长篇模式：适合重要场景的深度刻画，约3000字以上',
                'short': '💡 短篇模式：适合过渡场景或快节奏推进，约1000字'
            };
            if (tips[lengthMode]) {
                this.showToast(tips[lengthMode], 'info');
            }
        }

        // ========== 存储管理 ==========
        save() {
            const data = {
                config: {},
                history: [],
                genCount: this.genCount,
                updatesSinceLastSync: this.updatesSinceLastSync,
                collapsedGroups: [],
                version: '2.2'
            };

            const fields = [
                'apiKey', 'novel-title', 'entityMemory', 'worldView',
                'characterBible', 'styleRef', 'negativePrompt', 'statusTracker',
                'contextSummary', 'sceneGoal', 'mustInclude', 'rhythmControl',
                'lengthMode', 'pov', 'novel-content', 'prompt-input', 'currentChapter'
            ];

            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    data.config[id] = el.value;
                }
            });

            // 保存折叠状态
            ['worldview-group', 'character-group', 'style-group', 'negative-group'].forEach(groupId => {
                const group = document.getElementById(groupId);
                if (group && group.classList.contains('collapsed')) {
                    data.collapsedGroups.push(groupId);
                }
            });

            // 保存历史记录（包含章节信息）
            document.querySelectorAll('.history-card').forEach(card => {
                const body = card.querySelector('.history-body');
                data.history.push({
                    html: body.innerHTML,
                    chapter: card.dataset.chapter || 1
                });
            });

            try {
                localStorage.setItem(this.storageKey, JSON.stringify(data));
            } catch (e) {
                console.warn('保存失败:', e);
            }
        }

        loadFromStorage() {
            try {
                const saved = localStorage.getItem(this.storageKey);
                if (!saved) return;

                const data = JSON.parse(saved);

                if (data.config) {
                    Object.keys(data.config).forEach(id => {
                        const el = document.getElementById(id);
                        if (el) {
                            el.value = data.config[id];
                        }
                    });
                }

                this.genCount = data.genCount || 0;
                this.updatesSinceLastSync = data.updatesSinceLastSync || 0;

                // 恢复折叠状态
                if (data.collapsedGroups) {
                    ['worldview-group', 'character-group', 'style-group', 'negative-group'].forEach(groupId => {
                        const group = document.getElementById(groupId);
                        if (group) {
                            if (data.collapsedGroups.includes(groupId)) {
                                group.classList.add('collapsed');
                            } else {
                                group.classList.remove('collapsed');
                            }
                        }
                    });
                }

                // 恢复历史记录
                if (data.history && data.history.length > 0) {
                    const historyList = document.getElementById('history-list');
                    data.history.reverse().forEach((item, i) => {
                        const count = data.history.length - i;
                        // 兼容旧版本数据
                        const html = typeof item === 'string' ? item : item.html;
                        const chapter = typeof item === 'string' ? 1 : (item.chapter || 1);

                        const card = this.createHistoryCard(`restored-${i}`, count, '', chapter);
                        card.querySelector('.history-body').innerHTML = html;
                        card.dataset.chapter = chapter;
                        card.querySelector('.chapter-tag').innerText = `第${chapter}章`;
                        historyList.prepend(card);
                        this.updateCardWordCount(card);
                    });
                }

                if (this.updatesSinceLastSync >= 3) {
                    this.checkCoherenceReminder();
                }

            } catch (e) {
                console.warn('加载存储数据失败:', e);
            }
        }

        // ========== Toast提示 ==========
        showToast(message, type = 'info') {
            const existingToast = document.querySelector('.toast-message');
            if (existingToast) {
                existingToast.remove();
            }

            const toast = document.createElement('div');
            toast.className = 'toast-message';

            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
            };

            const colors = {
                success: 'linear-gradient(135deg, #34c759, #30d158)',
                error: 'linear-gradient(135deg, #ff3b30, #ff453a)',
                warning: 'linear-gradient(135deg, #ff9500, #ff9f0a)',
                info: 'linear-gradient(135deg, #0071e3, #0077ed)'
            };

            toast.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: ${colors[type]};
                color: white;
                padding: 14px 28px;
                border-radius: 50px;
                font-size: 14px;
                font-weight: 600;
                z-index: 10000;
                box-shadow: 0 8px 30px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                gap: 10px;
                animation: toastIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            `;

            toast.innerHTML = `<span style="font-size:18px">${icons[type]}</span><span>${message}</span>`;
            document.body.appendChild(toast);

            if (!document.getElementById('toast-style')) {
                const style = document.createElement('style');
                style.id = 'toast-style';
                style.textContent = `
                    @keyframes toastIn {
                        from { opacity: 0; transform: translateX(-50%) translateY(30px) scale(0.9); }
                        to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
                    }
                    @keyframes toastOut {
                        from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
                        to { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.9); }
                    }
                `;
                document.head.appendChild(style);
            }

            setTimeout(() => {
                toast.style.animation = 'toastOut 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }, 2500);
        }
    }

    // ==================== 初始化 ====================
    const tool = new NovelCreationTool();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => tool.init());
    } else {
        tool.init();
    }

    // 导出全局接口
    window.NovelTool = {
        generate: () => tool.generate(),
        stop: () => tool.stop(),
        smartUpdateMemory: () => tool.smartUpdateMemory(),
        switchTab: (panelId, tabEl) => tool.switchTab(panelId, tabEl),
        toggleCard: (id) => tool.toggleCard(id),
        setAsBase: (id) => tool.setAsBase(id),
        copyCard: (id) => tool.copyCard(id),
        deleteCard: (id) => tool.deleteCard(id),
        downloadFullDraft: () => tool.downloadFullDraft(),
        downloadOne: (id, count) => tool.downloadOne(id, count),
        toggleApiPopup: () => tool.toggleApiPopup(),
        saveApiKey: () => tool.saveApiKey(),
        openDrawer: (targetId, title) => tool.openDrawer(targetId, title),
        closeDrawer: () => tool.closeDrawer(),
        saveDrawer: () => tool.saveDrawer(),
        toggleImmersive: () => tool.toggleImmersive(),
        toggleInputGroup: (groupId) => tool.toggleInputGroup(groupId)
    };

})();
