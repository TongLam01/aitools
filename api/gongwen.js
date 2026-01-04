// api/gongwen.js
export default async function handler(req, res) {
    // --- 1. 多域名安全校验 ---
    const allowedOrigins = [
        "https://www.aibox6.com",
        "https://aibox6.com"
    ];
    
    // 获取请求来源
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    // 检查 Origin 或 Referer 是否在允许名单内
    const isAllowed = allowedOrigins.includes(origin) || 
                      (referer && allowedOrigins.some(d => referer.startsWith(d)));

    if (!isAllowed) {
        return res.status(403).json({ error: "Access Denied: 非法来源请求。" });
    }

    // 设置动态 CORS 响应头
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // --- 2. 输入校验 ---
    const { messages, userKey } = req.body;
    if (!userKey || !userKey.startsWith("sk-")) {
        return res.status(400).json({ error: "API Key 格式不正确。" });
    }

    // --- 3. 核心 Prompt ---
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

    const finalMessages = [
        { role: "system", content: HIDDEN_SYSTEM_PROMPT },
        ...messages
    ];

    try {
        // --- 4. 解决 Vercel 10秒超时限制的关键 ---
        // 立即设置响应头，进入流式模式
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 发送一个空注释作为心跳，防止 Vercel 在 AI 思考时认为链接已死
        res.write(': heartbeat\n\n');

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userKey}`
            },
            body: JSON.stringify({
                model: "deepseek-reasoner",
                messages: finalMessages,
                stream: true,
                temperature: 0.6
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "AI 接口调用失败");
        }

        // --- 5. 管道化传输数据流 ---
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value); // 将 DeepSeek 的数据实时转发给前端
        }
        
        res.end();

    } catch (error) {
        console.error("Error:", error.message);
        // 注意：如果在流开始后报错，这里可能无法修改状态码，只能在流中输出错误
        res.write(`data: {"error": "${error.message}"}\n\n`);
        res.end();
    }
}
