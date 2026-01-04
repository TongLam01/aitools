/**
 * api/zonghexiezuo.js - 后端专家大脑
 */
export const config = { runtime: 'edge' };

export default async function handler(req) {
    const allowedOrigins = ["https://www.aibox6.com", "https://aibox6.com", "http://localhost:3000"];
    const origin = req.headers.get("origin");

    // 1. 安全校验
    if (process.env.NODE_ENV === 'production' && !allowedOrigins.includes(origin)) {
        return new Response(JSON.stringify({ error: "未授权的来源" }), { status: 403 });
    }

    // 2. GET 请求：返回 6 个工具配置供前端渲染
    if (req.method === 'GET') {
        const tools = [
            { id: 'gongwen', name: '资深公文', icon: 'fa-solid fa-file-signature' },
            { id: 'redbook', name: '爆款红书', icon: 'fa-solid fa-fire-flame-curved' },
            { id: 'risk', name: '逻辑排雷', icon: 'fa-solid fa-shield-halved' },
            { id: 'eq', name: '高情商说', icon: 'fa-solid fa-face-smile-wink' },
            { id: 'ghost', name: '灵感续写', icon: 'fa-solid fa-feather-pointed' },
            { id: 'mindmap', name: '思维大纲', icon: 'fa-solid fa-sitemap' }
        ];
        return new Response(JSON.stringify(tools), { 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
    }

    // 3. POST 请求：执行 AI 逻辑
    if (req.method === 'POST') {
        try {
            const { message, userKey, model, toolId } = await req.json();
            const beijingDate = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

            // 深度专家逻辑配置
            const toolConfigs = {
                'gongwen': { role: '资深机关公文专家', style: '官方语言体系，杜绝口语，动词精准有力（拟、稳步、聚焦），严格遵守公文条例。', steps: '1.意图识别 2.框架匹配 3.逻辑补全 4.公文语态打磨', prompt: '请将素材重构为正式公文：' },
                'redbook': { role: '顶级新媒体运营专家', style: '视觉跳跃感强，多用Emoji，二段式吸睛标题，语言亲切口语化，末尾带互动话题。', steps: '1.槽点挖掘 2.视觉重构 3.情绪引导 4.互动闭环设计', prompt: '请改写为爆款小红书笔记：' },
                'risk': { role: '资深总编兼法务专家', style: '批判性思维，严密客观。直接指出逻辑矛盾、表达歧义或潜在风险。', steps: '1.全维扫描 2.风险定性 3.漏洞剖析 4.合规化重写', prompt: '请进行多维度风险扫描：' },
                'eq': { role: '职场沟通心理学大师', style: '共情力强，委婉且不失原则。关注接收者心理感受，化解对抗性。', steps: '1.情绪拆解 2.接收者画像 3.语言缓冲 4.目标驱动改写', prompt: '请进行高情商重组：' },
                'ghost': { role: '影子写手专家', style: '极强的文风模仿能力。保持原文的韵律感和意境，确保续写部分浑然天成。', steps: '1.风格画像 2.意境对齐 3.逻辑顺延 4.文采升华', prompt: '请根据原文风格进行续写：' },
                'mindmap': { role: '资深商业分析师', style: '结构化思维。只保留核心词汇，层级严密，适合转化为思维导图。', steps: '1.骨架提取 2.层级划分 3.冗余剥离 4.Markdown树状化', prompt: '请提取逻辑大纲：' }
            };

            const config = toolConfigs[toolId] || toolConfigs['gongwen'];
            const systemPrompt = `你是一位经验丰富、笔风严谨的${config.role}。当前北京时间：${beijingDate}。身份：单位资深“笔杆子”。风格：${config.style}。步骤：${config.steps}。请直接输出结果。`;

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
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }
}
