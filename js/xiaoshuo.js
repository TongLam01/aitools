/**
 * DeepSeek 小说创作工具
 * 版本: 2.0
 * 仅限 www.aibox6.com 和 aibox6.com 域名使用
 */

(function() {
    'use strict';

    // ==================== 域名验证 ====================
    const ALLOWED_DOMAINS = ['www.aibox6.com', 'aibox6.com'];
    const currentDomain = window.location.hostname;
    
    // 开发环境白名单（localhost等）
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

    // ==================== 写作Prompt模板 ====================
    const PROMPTS = {
        // 主创作Prompt
        mainSystem: function(config) {
            const { worldView, characterBible, entityMemory, negativePrompt, 
                    contextSummary, statusTracker, sceneGoal, mustInclude, 
                    pov, rhythm, lengthInstruction, styleRef } = config;
            
            return `你是一位殿堂级小说家，拥有深厚的文学功底和丰富的创作经验。请严格遵循以下设定进行创作：

【静态框架 (Static Foundation)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▪ 世界观：
${worldView || '（未设定）'}

▪ 核心角色档案：
${characterBible || '（未设定）'}

【动态知识库 (Auto-Wiki)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${entityMemory || '暂无记录'}

【创作禁忌 (Negative Prompt)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${negativePrompt || '无特殊禁忌'}

【当前剧情状态 (Story Status)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▪ 剧情摘要：${contextSummary || '（无）'}
▪ 已发生事实：${statusTracker || '（无）'}

【本场创作指令 (Scene Direction)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▪ 场景目标：${sceneGoal || '自由发挥'}
▪ 必须包含：${mustInclude || '无强制要求'}
▪ 叙事视角：${pov}
▪ 节奏控制：${rhythm}
▪ 篇幅要求：${lengthInstruction}
▪ 文学风格：${styleRef || '自然流畅'}

【创作准则】
1. 保持人物性格和世界观的一致性
2. 情节发展要合理，避免突兀转折
3. 对话要符合角色身份和性格
4. 描写要有画面感，避免空洞叙述
5. 直接续写正文，不要任何解释或元描述`;
        },

        // 知识库更新Prompt
        updateMemory: `你是一位专业的小说编辑和剧情分析师。请仔细分析最新的小说段落，完成以下任务：

【任务说明】
1. **更新Wiki知识库**：
   - 提取新出现的关键人物及其特征变化
   - 记录新出现的重要物品、地点
   - 标记新埋下的伏笔或线索
   - 保留旧的重要条目，与新条目合并
   - 格式：[类别] 名称：描述

2. **更新剧情摘要**：
   - 用1-2段话概括最新剧情发展
   - 突出关键冲突和转折

3. **更新事实档案**：
   - 只记录不可逆的重大改变
   - 如：角色死亡、关系破裂、物品毁灭、重要决定等

请以JSON格式返回结果：
{
    "wiki": "更新后的知识库内容",
    "summary": "更新后的剧情摘要",
    "facts": "更新后的事实档案"
}`
    };

    // ==================== 篇幅控制映射 ====================
    const LENGTH_INSTRUCTIONS = {
        'standard': '请按正常篇幅创作，约800-1200字。',
        'long': '请深度扩写，丰富细节描写，篇幅1500字以上。注重环境渲染和心理刻画。',
        'short': '请快速推进剧情，篇幅控制在500字左右。保持紧凑节奏。'
    };

    // ==================== 工具主类 ====================
    class NovelCreationTool {
        constructor() {
            this.controller = null;
            this.genCount = 0;
            this.storageKey = 'deepseek_novel_v2';
            this.isGenerating = false;
        }

        // 初始化
        init() {
            if (!checkDomain()) return;
            
            this.loadFromStorage();
            this.bindEvents();
            this.updateCounts();
            this.updateEditorCount();
        }

        // 绑定事件
        bindEvents() {
            // 编辑器字数统计
            const editor = document.getElementById('novel-content');
            editor.addEventListener('input', () => {
                this.updateEditorCount();
                this.save();
            });

            // 所有输入框自动保存
            document.addEventListener('input', (e) => {
                if (e.target.matches('input, textarea, select')) {
                    this.save();
                }
            });

            // 快捷键支持
            document.addEventListener('keydown', (e) => {
                // Ctrl/Cmd + Enter 生成
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    if (!this.isGenerating) {
                        this.generate();
                    }
                }
                // Escape 停止生成
                if (e.key === 'Escape' && this.isGenerating) {
                    this.stop();
                }
            });
        }

        // 切换Tab
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

        // 构建Prompt配置
        buildPromptConfig() {
            const lengthMode = document.getElementById('lengthMode').value;
            
            return {
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
                styleRef: document.getElementById('styleRef').value.trim()
            };
        }

        // 生成内容
        async generate() {
            const apiKey = document.getElementById('apiKey').value.trim();
            if (!apiKey) {
                this.showToast('请先填写 API Key', 'error');
                document.getElementById('apiKey').focus();
                return;
            }

            this.toggleUI(true);
            this.controller = new AbortController();
            
            const editor = document.getElementById('novel-content');
            const userPrompt = document.getElementById('prompt-input').value.trim();
            
            this.genCount++;
            const cardId = `card-${Date.now()}`;
            const card = this.createHistoryCard(cardId, this.genCount);
            document.getElementById('history-list').prepend(card);

            const cardBody = card.querySelector('.history-body');
            cardBody.innerHTML = `<span class="serial-number">#${this.genCount}</span>`;
            const textContent = document.createElement('span');
            cardBody.appendChild(textContent);

            // 滚动到顶部
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
                            { role: "user", content: `【上文内容】\n${editor.value}\n\n【创作指令】\n${userPrompt || '请继续创作'}` }
                        ],
                        stream: true,
                        temperature: 0.8,
                        max_tokens: 4000
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
                                }
                            } catch (parseError) {
                                // 忽略解析错误，继续处理
                            }
                        }
                    }
                }

                this.showToast('生成完成！', 'success');

            } catch (e) {
                if (e.name === 'AbortError') {
                    this.showToast('已停止生成', 'info');
                } else {
                    this.showToast(e.message, 'error');
                    console.error('生成错误:', e);
                }
            } finally {
                this.updateCardWordCount(card);
                this.toggleUI(false);
                this.save();
            }
        }

        // 智能更新记忆
        async smartUpdateMemory() {
            const apiKey = document.getElementById('apiKey').value.trim();
            if (!apiKey) {
                this.showToast('请先填写 API Key', 'error');
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

            const latestText = historyList.children[0].querySelector('.history-body').innerText;

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
                            { role: "system", content: PROMPTS.updateMemory },
                            { 
                                role: "user", 
                                content: `【当前Wiki知识库】\n${document.getElementById('entityMemory').value}\n\n【当前剧情摘要】\n${document.getElementById('contextSummary').value}\n\n【当前事实档案】\n${document.getElementById('statusTracker').value}\n\n【最新创作内容】\n${latestText}` 
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

                // 更新各字段
                if (result.wiki) {
                    document.getElementById('entityMemory').value = result.wiki;
                }
                if (result.summary) {
                    document.getElementById('contextSummary').value = result.summary;
                }
                if (result.facts) {
                    document.getElementById('statusTracker').value = result.facts;
                }

                this.save();
                this.showToast('知识库更新完成！', 'success');

            } catch (e) {
                this.showToast('更新失败: ' + e.message, 'error');
                console.error('更新错误:', e);
            } finally {
                btnText.innerText = originalText;
                btn.disabled = false;
            }
        }

        // 创建历史卡片
        createHistoryCard(id, count, content = '') {
            const time = new Date().toLocaleString('zh-CN', { hour12: false });
            const div = document.createElement('div');
            div.className = 'history-card';
            div.id = id;
            div.innerHTML = `
                <div class="history-header">
                    <div>
                        <span style="font-weight:700">场次 ${count}</span>
                        <span style="color:#999;font-size:10px;margin-left:5px">${time}</span>
                    </div>
                    <div>
                        <span style="font-size:11px;color:#86868b;margin-right:5px">
                            字数: <span class="w-count">0</span>
                        </span>
                        <button class="btn btn-outline btn-sm" onclick="NovelTool.toggleCard('${id}')">折叠</button>
                    </div>
                </div>
                <div class="history-body" contenteditable="true">${content}</div>
                <div class="history-actions">
                    <button class="btn btn-outline btn-sm" style="flex:1" onclick="NovelTool.downloadOne('${id}', ${count})">📥 导出</button>
                    <button class="btn btn-outline btn-sm" style="flex:1" onclick="NovelTool.setAsBase('${id}')">🔝 设为起点</button>
                    <button class="btn btn-outline btn-sm" style="color:#ff3b30" onclick="NovelTool.deleteCard('${id}')">🗑</button>
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

        // 切换卡片折叠状态
        toggleCard(id) {
            const card = document.getElementById(id);
            if (!card) return;
            
            const btn = card.querySelector('button[onclick^="NovelTool.toggleCard"]');
            card.classList.toggle('collapsed');
            btn.innerText = card.classList.contains('collapsed') ? '展开' : '折叠';
        }

        // 设为起点
        setAsBase(id) {
            const card = document.getElementById(id);
            if (!card) return;

            const text = card.querySelector('.history-body').innerText.replace(/^#\d+\s*/, '');
            document.getElementById('novel-content').value = text;
            this.updateEditorCount();
            
            // 切换到创作面板
            const mainTab = document.querySelectorAll('.tab-item')[1];
            this.switchTab('main-container', mainTab);
            
            this.showToast('已设为创作起点', 'success');
        }

        // 删除卡片
        deleteCard(id) {
            if (!confirm('确定要删除这个片段吗？')) return;
            
            const card = document.getElementById(id);
            if (card) {
                card.remove();
                this.updateCounts();
                this.save();
                this.showToast('已删除', 'info');
            }
        }

        // 导出全稿
        downloadFullDraft() {
            const title = document.getElementById('novel-title').value || '未命名小说';
            let fullText = `《${title}》\n\n`;
            fullText += `导出时间：${new Date().toLocaleString('zh-CN')}\n`;
            fullText += '═'.repeat(40) + '\n\n';

            const cards = Array.from(document.querySelectorAll('.history-body')).reverse();
            cards.forEach((el, index) => {
                fullText += `【第${index + 1}节】\n`;
                fullText += el.innerText + '\n\n';
            });

            this.saveFile(`${title}_全稿_${Date.now()}.txt`, fullText);
            this.showToast('导出成功！', 'success');
        }

        // 导出单个片段
        downloadOne(id, count) {
            const card = document.getElementById(id);
            if (!card) return;

            const text = card.querySelector('.history-body').innerText;
            const title = document.getElementById('novel-title').value || '未命名';
            this.saveFile(`${title}_场次${count}.txt`, text);
            this.showToast('导出成功！', 'success');
        }

        // 保存文件
        saveFile(name, text) {
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        }

        // 更新卡片字数
        updateCardWordCount(card) {
            const text = card.querySelector('.history-body').innerText;
            const wordCount = text.replace(/\s/g, '').length;
            card.querySelector('.w-count').innerText = wordCount;
            this.updateCounts();
        }

        // 更新总计数
        updateCounts() {
            let total = 0;
            document.querySelectorAll('.history-body').forEach(el => {
                total += el.innerText.replace(/\s/g, '').length;
            });
            document.getElementById('total-words').innerText = total.toLocaleString();
            document.getElementById('ver-count').innerText = document.querySelectorAll('.history-body').length;
        }

        // 更新编辑器字数
        updateEditorCount() {
            const text = document.getElementById('novel-content').value;
            document.getElementById('editor-count').innerText = text.length + ' 字';
        }

        // 切换UI状态
        toggleUI(loading) {
            this.isGenerating = loading;
            document.getElementById('btn-gen').style.display = loading ? 'none' : 'inline-flex';
            document.getElementById('btn-stop').style.display = loading ? 'inline-flex' : 'none';
            
            // 禁用/启用其他按钮
            document.querySelectorAll('.btn-update, .btn-outline').forEach(btn => {
                btn.disabled = loading;
            });
        }

        // 停止生成
        stop() {
            if (this.controller) {
                this.controller.abort();
            }
        }

        // 保存到本地存储
        save() {
            const data = {
                config: {},
                history: [],
                genCount: this.genCount,
                version: 2
            };

            // 保存所有配置
            const fields = [
                'apiKey', 'novel-title', 'entityMemory', 'worldView', 
                'characterBible', 'styleRef', 'negativePrompt', 'statusTracker',
                'contextSummary', 'sceneGoal', 'mustInclude', 'rhythmControl',
                'lengthMode', 'pov', 'novel-content', 'prompt-input'
            ];

            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    data.config[id] = el.value;
                }
            });

            // 保存历史记录
            document.querySelectorAll('.history-body').forEach(el => {
                data.history.push(el.innerText);
            });

            try {
                localStorage.setItem(this.storageKey, JSON.stringify(data));
            } catch (e) {
                console.warn('保存失败:', e);
            }
        }

        // 从本地存储加载
        loadFromStorage() {
            try {
                const saved = localStorage.getItem(this.storageKey);
                if (!saved) return;

                const data = JSON.parse(saved);

                // 恢复配置
                if (data.config) {
                    Object.keys(data.config).forEach(id => {
                        const el = document.getElementById(id);
                        if (el) {
                            el.value = data.config[id];
                        }
                    });
                }

                // 恢复计数
                this.genCount = data.genCount || 0;

                // 恢复历史记录
                if (data.history && data.history.length > 0) {
                    const historyList = document.getElementById('history-list');
                    data.history.reverse().forEach((txt, i) => {
                        const card = this.createHistoryCard(
                            `restored-${i}`,
                            data.history.length - i,
                            txt
                        );
                        historyList.prepend(card);
                    });
                }
            } catch (e) {
                console.warn('加载存储数据失败:', e);
            }
        }

        // 显示Toast提示
        showToast(message, type = 'info') {
            // 移除已存在的toast
            const existingToast = document.querySelector('.toast-message');
            if (existingToast) {
                existingToast.remove();
            }

            const toast = document.createElement('div');
            toast.className = 'toast-message';
            
            const colors = {
                success: '#34c759',
                error: '#ff3b30',
                warning: '#ff9500',
                info: '#0071e3'
            };

            toast.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: ${colors[type]};
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: toastIn 0.3s ease;
            `;

            toast.innerText = message;
            document.body.appendChild(toast);

            // 添加动画样式
            if (!document.getElementById('toast-style')) {
                const style = document.createElement('style');
                style.id = 'toast-style';
                style.textContent = `
                    @keyframes toastIn {
                        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                        to { opacity: 1; transform: translateX(-50%) translateY(0); }
                    }
                    @keyframes toastOut {
                        from { opacity: 1; transform: translateX(-50%) translateY(0); }
                        to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
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

    // ==================== 初始化与导出 ====================
    const tool = new NovelCreationTool();

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => tool.init());
    } else {
        tool.init();
    }

    // 导出到全局（供HTML onclick调用）
    window.NovelTool = {
        generate: () => tool.generate(),
        stop: () => tool.stop(),
        smartUpdateMemory: () => tool.smartUpdateMemory(),
        switchTab: (panelId, tabEl) => tool.switchTab(panelId, tabEl),
        toggleCard: (id) => tool.toggleCard(id),
        setAsBase: (id) => tool.setAsBase(id),
        deleteCard: (id) => tool.deleteCard(id),
        downloadFullDraft: () => tool.downloadFullDraft(),
        downloadOne: (id, count) => tool.downloadOne(id, count)
    };

})();
