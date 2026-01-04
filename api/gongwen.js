// api/gongwen.js
export default async function handler(req, res) {
    // --- 1. 多域名安全校验 ---
    const allowedOrigins = [
        "https://www.aibox6.com",
        "https://aibox6.com"
    ];
    
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    const isAllowed = allowedOrigins.includes(origin) || 
                      (referer && allowedOrigins.some(d => referer.startsWith(d)));

    if (!isAllowed) {
        return res.status(403).json({ error: "Access Denied: 来源域名未授权。" });
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
        return res.status(400).json({ error: "API Key 格式不正确，请重新设置。" });
    }

    // --- 3. 获取并计算当前北京时间 (解决日期落后问题) ---
    // Vercel 服务器通常是 UTC 时间，通过 Asia/Shanghai 时区纠正
    const now = new Date();
    const beijingDate = now.toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // --- 4. 核心 Prompt (注入当前日期) ---
    const HIDDEN_SYSTEM_PROMPT = `你是一位经验丰富、笔风严谨的资深机关公文写作专家。你的任务是将用户提供的碎片化信息，转化为格式规范、用词精准、逻辑严密的正式公文。

【约束】
- 当前真实日期是：${beijingDate}。
- 身份代入：你不是 AI，你是单位的资深“笔杆子”。

【语言风格】
- 使用标准官方语言体系，杜绝口语和网络用语。
- 动词要精准有力（如将“打算做”改为“拟实施”，将“大家都要来”改为“全员覆盖”）。
- 句式要整散结合，多用四字短语，增强气势和节奏感。
- 如果适用，多使用数据。
- 结构规范：严格遵守《党政机关公文处理工作条例》，标题分级明确（一、(一)、1、(1)）。
- 格式美观：生成的Markdown应合理使用标题、加粗和列表。

【撰写步骤】
1. 意图识别：分析用户素材，提炼核心主旨。
2. 框架搭建：匹配文种的标准公文结构。
3. 内容填充：将素材填入框架，进行逻辑补全（补充背景背景、意义、要求等）。
4. 语言润色：用官方公文语态进行打磨。`;

    const finalMessages = [
        { role: "system", content: HIDDEN_SYSTEM_PROMPT },
        ...messages
    ];

    try {
        // --- 5. 开启流式响应与 Vercel 心跳保持 ---
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 发送心跳注释，防止 Vercel 10秒超时杀掉函数
        res.write(': heartbeat\n\n');

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userKey}`
            },
            body: JSON.stringify({
                model: "deepseek-reasoner", // 使用 DeepSeek R1 模型
                messages: finalMessages,
                stream: true,
                temperature: 0.6
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || "AI 接口调用失败");
        }

        // --- 6. 管道化传输 AI 数据流 ---
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value); // 实时将数据转发到前端
        }
        
        res.end();

    } catch (error) {
        console.error("Server Error:", error.message);
        // 如果在流传输中报错，以 SSE 格式告知前端
        res.write(`data: {"error": "${error.message}"}\n\n`);
        res.end();
    }
}

