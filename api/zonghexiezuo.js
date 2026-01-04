/**
 * api/zonghexiezuo.js - 工业级安全稳定版
 */
export const config = { runtime: 'edge' };

export default async function handler(req) {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    // 1. 恢复域名安全限制
    const allowedOrigins = ["https://www.aibox6.com", "https://aibox6.com", "http://localhost:3000"];
    const origin = req.headers.get("origin");
    if (process.env.NODE_ENV === 'production' && !allowedOrigins.includes(origin)) {
        return new Response('Unauthorized Domain', { status: 403 });
    }

    try {
        const { message, userKey, model, toolId } = await req.json();
        const beijingDate = new Date().toLocaleString("zh-CN", { 
            timeZone: "Asia/Shanghai", year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' 
        });

        // 2. 核心逻辑约束：解决序号错误与空括号问题
        const toolConfigs = {
            'gongwen': { role: '资深公文专家', prompt: '请将素材重构为正式公文。严禁出现空括号"()"。若缺失数据请用"[待填充]"标明。' },
            'redbook': { role: '爆款红书专家', prompt: '请改写为带有Emoji的小红书笔记。' },
            'risk': { role: '合规排雷专家', prompt: '请进行逻辑/风险排雷。' },
            'eq': { role: '高情商说服专家', prompt: '请进行高情商改写。' },
            'ghost': { role: '影子写手专家', prompt: '请根据原文文风续写。' },
            'mindmap': { role: '结构化思维专家', prompt: '请提炼逻辑大纲。要求：严格使用"1." "1.1" "1.1.1"格式，严禁简写序号（禁止31、32等）' }
        };

        const config = toolConfigs[toolId] || toolConfigs['gongwen'];
        const systemPrompt = `你是一位${config.role}。北京时间：${beijingDate}。请以Markdown格式输出。
规范：直接输出结果，不含思考过程。严禁出现逻辑断点。数据项缺失统一用"[待填充]"。`;

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userKey}` },
            body: JSON.stringify({
                model: model || "deepseek-reasoner",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `${config.prompt}\n\n${message}` }],
                stream: true,
                temperature: 0.3 // 低温度确保序号稳定
            })
        });

        // 3. 恢复稳定的 ReadableStream 与 Heartbeat
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body.getReader();
                const encoder = new TextEncoder();
                
                // 每 8 秒发送一次心跳包维持连接
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

        // 4. 恢复标准 SSE 响应头
        return new Response(stream, { 
            headers: { 
                'Content-Type': 'text/event-stream', 
                'Cache-Control': 'no-cache', 
                'Connection': 'keep-alive', 
                'Access-Control-Allow-Origin': origin || '*' 
            } 
        });

    } catch (error) {
        return new Response(error.message, { status: 500 });
    }
}
