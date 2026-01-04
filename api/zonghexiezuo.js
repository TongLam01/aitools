/**
 * api/zonghexiezuo.js - 完整补全版
 * 包含：6个专家级工具、北京时间、域名校验、心跳机制、R1模型适配
 */

export const config = { runtime: 'edge' };

export default async function handler(req) {
    const allowedOrigins = ["https://www.aibox6.com", "https://aibox6.com", "http://localhost:3000"];
    const origin = req.headers.get("origin");

    // --- 1. 安全校验 ---
    if (process.env.NODE_ENV === 'production' && !allowedOrigins.includes(origin)) {
        return new Response(JSON.stringify({ error: "Access Denied" }), { status: 403 });
    }

    // --- 2. GET 请求：返回 6 个工具的配置 ---
    if (req.method === 'GET') {
        const tools = [
            { id: 'gongwen', name: '资深公文', icon: 'fa-solid fa-file-signature', prompt: '请将以下碎片化素材转化为格式规范、用词精准的正式公文：' },
            { id: 'redbook', name: '爆款红书', icon: 'fa-solid fa-fire-flame-curved', prompt: '请将以下内容改写为典型的小红书爆款风格：' },
            { id: 'risk', name: '逻辑排雷', icon: 'fa-solid fa-shield-halved', prompt: '请分析以下文字中的逻辑漏洞、表达歧义或潜在风险并修正：' },
            { id: 'eq', name: '高情商说', icon: 'fa-solid fa-face-smile-wink', prompt: '请基于职场心理学，将以下表达改写得更委婉、得体且具说服力：' },
            { id: 'ghost', name: '灵感续写', icon: 'fa-solid fa-feather-pointed', prompt: '请分析原文风格，保持意境一致，续写逻辑连贯的内容：' },
            { id: 'mindmap', name: '思维大纲', icon: 'fa-solid fa-sitemap', prompt: '请提取核心脉络，以 Markdown 树状列表形式输出：' }
        ];
        return new Response(JSON.stringify(tools), { 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
    }

    // --- 3. POST 请求：AI 增强逻辑 ---
    if (req.method === 'POST') {
        try {
            const { message, userKey, model, toolId } = await req.json();

            // 计算北京时间
            const beijingDate = new Date().toLocaleString("zh-CN", { 
                timeZone: "Asia/Shanghai", year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' 
            });

            // 工具特有的深度逻辑字典
            const toolConfigs = {
                'gongwen': {
                    role: '资深机关公文专家',
                    style: '官方语言体系，杜绝口语，动词精准有力（拟、稳步、聚焦），严格遵守公文条例。',
                    steps: '1.意图识别 2.框架匹配 3.逻辑补全 4.公文语态打磨'
                },
                'redbook': {
                    role: '顶级新媒体运营专家',
                    style: '视觉跳跃感强，多用Emoji，二段式吸睛标题，语言亲切口语化，末尾带互动话题。',
                    steps: '1.槽点挖掘 2.视觉重构 3.情绪引导 4.互动闭环设计'
                },
                'risk': {
                    role: '资深总编兼法务专家',
                    style: '批判性思维，严密客观。直接指出逻辑矛盾、表达歧义或潜在的职场/法律风险。',
                    steps: '1.全维扫描 2.风险定性 3.漏洞剖析 4.合规化重写'
                },
                'eq': {
                    role: '职场沟通心理学大师',
                    style: '共情力强，委婉且不失原则。多用缓冲词，关注接收者心理感受，化解对抗性。',
                    steps: '1.情绪拆解 2.接收者画像 3.语言缓冲 4.目标驱动改写'
                },
                'ghost': {
                    role: '影子写手/文学创作专家',
                    style: '极强的文风模仿能力。保持原文的韵律感、节奏和意境，确保续写部分浑然天成。',
                    steps: '1.风格画像 2.意境对齐 3.逻辑顺延 4.文采升华'
                },
                'mindmap': {
                    role: '资深商业分析师',
                    style: '结构化思维。只保留核心动词和名词，层级逻辑严密，适合转化为思维导图。',
                    steps: '1.骨架提取 2.层级划分 3.冗余剥离 4.Markdown树状化'
                }
            };

            const config = toolConfigs[toolId] || toolConfigs['gongwen'];

            // 核心隐藏 System Prompt (注入日期与逻辑)
            const HIDDEN_SYSTEM_PROMPT = `你是一位经验丰富、笔风严谨的${config.role}。
【约束】
- 当前真实日期是：${beijingDate}。
- 身份代入：你不是普通 AI，你是该领域的“笔杆子”。
- 语言风格：${config.style}。
【撰写步骤】
${config.steps}。
【输出要求】
直接输出结果，保持 Markdown 格式美观，无需任何多余的开场白或解释。`;

            const response = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userKey}` },
                body: JSON.stringify({
                    model: model || "deepseek-reasoner",
                    messages: [{ role: "system", content: HIDDEN_SYSTEM_PROMPT }, { role: "user", content: message }],
                    stream: true,
                    temperature: 0.6
                })
            });

            // 核心：流式管道传输 + 8秒心跳
            const stream = new ReadableStream({
                async start(controller) {
                    const reader = response.body.getReader();
                    const encoder = new TextEncoder();
                    const heartbeat = setInterval(() => {
                        controller.enqueue(encoder.encode(': heartbeat\n\n'));
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
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': origin || '*'
                }
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }
}
