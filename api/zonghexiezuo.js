/**
 * api/zonghexiezuo.js - 智能平衡版
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
        const beijingDate = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });

        const toolConfigs = {
            'gongwen': { 
                role: '资深公文专家', 
                prompt: '请将素材重构为正式公文。要求：表达自然流畅，不要过度使用占位符。仅在合同主体信息缺失时使用"[待填充]"。' 
            },
            'redbook': { role: '爆款红书专家', prompt: '请改写为带有Emoji的小红书笔记，语气要有感染力。' },
            'risk': { role: '合规排雷专家', prompt: '请进行逻辑/风险排雷，指出潜在隐患。' },
            'eq': { role: '高情商说服专家', prompt: '请进行高情商改写，使其更具亲和力和说服力。' },
            'ghost': { role: '影子写手专家', prompt: '请根据原文文风进行自然续写。' },
            'mindmap': { 
                role: '结构化思维专家', 
                prompt: '请提炼逻辑大纲。序号要求：严格使用"1." "1.1" "1.1.1"格式，严禁省略小数点（禁止31、32写法）。' 
            }
        };

        const config = toolConfigs[toolId] || toolConfigs['gongwen'];

        // 核心改进：引入“自然衔接”指令
        const systemPrompt = `你是一位${config.role}。当前时间：${beijingDate}。
输出规范：
1. 优先根据上下文进行语义衔接，保持文字的文学感和连贯性。
2. 严禁出现"()"或"（ ）"这种空括号。
3. 只有当关键事实（如姓名、具体日期、明确金额）在素材中完全缺失且无法推论时，才使用"[待填充]"。
4. 直接输出 Markdown 结果，不包含任何自我介绍或解释。`;

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userKey}` },
            body: JSON.stringify({
                model: model || "deepseek-reasoner",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `${config.prompt}\n\n素材如下：\n${message}` }],
                stream: true,
                temperature: 0.4 
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

        return new Response(stream, { 
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': origin || '*' } 
        });

    } catch (error) {
        return new Response(error.message, { status: 500 });
    }
}
