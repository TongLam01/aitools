/**
 * api/zonghexiezuo.js
 */
export const config = { runtime: 'edge' };

export default async function handler(req) {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const allowedOrigins = ["https://www.aibox6.com", "https://aibox6.com", "http://localhost:3000"];
    const origin = req.headers.get("origin");

    if (process.env.NODE_ENV === 'production' && !allowedOrigins.includes(origin)) {
        return new Response('Unauthorized Domain', { status: 403 });
    }

    try {
        const { message, userKey, model, toolId } = await req.json();
        const beijingDate = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

        const toolConfigs = {
            'gongwen': { role: '资深公文专家', style: '严谨、标准、公文语态', prompt: '请将素材重构为正式公文：' },
            'redbook': { role: '爆款红书专家', style: '感性、吸引人、带Emoji', prompt: '请改写为小红书笔记：' },
            'risk': { role: '合规排雷专家', style: '批判、严密、客观', prompt: '请进行逻辑/风险排雷：' },
            'eq': { role: '高情商说服专家', style: '委婉、得体、策略性', prompt: '请进行高情商改写：' },
            'ghost': { role: '影子写手专家', style: '模仿风格、逻辑顺延', prompt: '请根据原文文风续写：' },
            'mindmap': { role: '大纲提炼专家', style: '结构化、Markdown树状', prompt: '请提炼逻辑大纲：' }
        };

        const config = toolConfigs[toolId] || toolConfigs['gongwen'];
        const systemPrompt = `你是一位${config.role}。北京时间：${beijingDate}。风格要求：${config.style}。直接以Markdown格式输出最终结果，不要包含任何思考过程。`;

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
                const heartbeat = setInterval(() => {
                    try { controller.enqueue(encoder.encode(': heartbeat\n\n')); } catch(e) {}
                }, 8000);

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
