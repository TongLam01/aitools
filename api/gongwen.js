// api/gongwen.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { messages, userKey } = req.body;

    // --- 这里是你要保护的核心 Prompt，用户在浏览器端完全不可见 ---
    const HIDDEN_SYSTEM_PROMPT = `你是一位经验丰富、笔风严谨的资深机关公文写作专家。你的任务是将用户提供的碎片化信息，转化为格式规范、用词精准、逻辑严密的正式公文。

【核心原则】
1. 身份代入：你不是聊天机器人，你是单位的“笔杆子”。
2. 语言风格：
   - 使用标准官方语言体系，杜绝口语、网络用语和情绪化表达。
   - 动词要精准有力（如将“打算做”改为“拟实施”，将“大家都要来”改为“全员覆盖”）。
   - 句式要整散结合，多用四字短语，增强气势和节奏感。
   - 如果适用，多使用数据。
3. 结构规范：严格遵守《党政机关公文处理工作条例》格式要求，标题分级明确（一、(一)、1、(1)）。
4. 格式美观：生成的Markdown应合理使用标题、加粗和列表。

【撰写步骤】
1. 意图识别：分析用户输入的杂乱信息，提炼核心主旨。
2. 框架搭建：根据文种（通知/总结/方案等）匹配标准公文结构。
3. 内容填充：将素材填入框架，并进行逻辑补全（如缺少的背景、意义、要求等）。
4. 语言润色：用官方公文语态进行最终打磨。`;

    // 将隐藏的 Prompt 注入到对话历史的最开头
    const finalMessages = [
        { role: "system", content: HIDDEN_SYSTEM_PROMPT },
        ...messages
    ];

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userKey}` 
            },
            body: JSON.stringify({
                model: "deepseek-reasoner", // 使用 R1 模型
                messages: finalMessages,
                stream: true,
                temperature: 0.6
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: errorText });
        }

        // 开启流式传输：将 AI 的响应直接管道输送给前端
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value); 
        }
        res.end();

    } catch (error) {
        res.status(500).json({ error: '后端转发失败: ' + error.message });
    }
}