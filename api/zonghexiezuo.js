/**
 * api/zonghexiezuo.js - 核心大脑补全版
 */
export const config = { runtime: 'edge' };

export default async function handler(req) {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const allowedOrigins = ["https://www.aibox6.com", "https://aibox6.com", "http://localhost:3000"];
    const origin = req.headers.get("origin");

    // 安全校验
    if (process.env.NODE_ENV === 'production' && !allowedOrigins.includes(origin)) {
        return new Response('Unauthorized Domain', { status: 403 });
    }

    try {
        const { message, userKey, model, toolId } = await req.json();
        const beijingDate = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

        // 6 大核心提示词配置库
        const toolConfigs = {
            'gongwen': { role: '资深机关公文专家', style: '官方语言体系，杜绝口语，动词精准有力（拟、稳步、聚焦），严格遵守公文条例。', steps: '1.意图识别 2.框架匹配 3.逻辑补全 4.公文语态润色', prompt: '请将素材重构为正式公文：' },
            'redbook': { role: '顶级新媒体运营专家', style: '视觉跳跃感强，多用Emoji，标题要有冲击力，语言口语化，末尾带话题。', steps: '1.槽点挖掘 2.视觉重构 3.情绪引导 4.互动闭环设计', prompt: '请改写为爆款小红书笔记：' },
            'risk': { role: '资深总编兼法务', style: '批判性思维，严密客观。指出逻辑漏洞、表达歧义或潜在风险。', steps: '1.全维扫描 2.风险定性 3.漏洞剖析 4.合规化建议', prompt: '请进行逻辑/风险排雷扫描：' },
            'eq': { role: '职场沟通心理大师', style: '共情力强，委婉且不失原则。多用缓冲词，关注接收者感受。', steps: '1.情绪拆解 2.接收方画像 3.语言缓冲 4.目标导向重写', prompt: '请进行高情商重组：' },
            'ghost': { role: '影子写手专家', style: '极强的模仿能力。保持原文的韵律、意境和节奏，确保续写浑然天成。', steps: '1.风格画像 2.意境对齐 3.逻辑顺延 4.文采升华', prompt: '请根据原文风格进行续写：' },
            'mindmap': { role: '资深商业分析师', style: '结构化思维。只保留核心词，层级严密，适合生成思维导图。', steps: '1.骨架提取 2.层级划分 3.冗余剥离 4.Markdown树状化', prompt: '请提炼逻辑大纲：' }
        };

        const config = toolConfigs[toolId] || toolConfigs['gongwen'];
        const systemPrompt = `你是一位经验丰富、笔风严谨的${config.role}。当前北京时间：${beijingDate}。身份代入：单位资深笔杆子。撰写步骤：${config.steps}。风格：${config.style}。直接输出结果，无需解释。`;

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userKey}` },
            body: JSON.stringify({
                model: model || "deepseek-reasoner",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `${config.prompt}\n\n${message}` }],
                stream: true,
                temperature: 0.6
            })
        });

        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body.getReader();
                const encoder = new TextEncoder();
                const heartbeat = setInterval(() => controller.enqueue(encoder.encode(': heartbeat\n\n')), 8000);
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        controller.enqueue(value);
                    }
                } finally {
                    clearInterval(heartbeat);
                    controller.close();
                }
            }
        });

        return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': origin || '*' } });
    } catch (error) {
        return new Response(error.message, { status: 500 });
    }
}
