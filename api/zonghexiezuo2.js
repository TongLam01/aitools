/**
 * api/zonghexiezuo.js - 优化版本
 * 增强错误处理、支持更多参数配置
 */
export const config = { 
    runtime: 'edge',
    // 增加超时时间以支持长文本生成
    maxDuration: 60
};

// 工具配置 - 更详细的 prompt
const TOOL_CONFIGS = {
    'gongwen': { 
        role: '资深公文写作专家，拥有20年政府机关公文撰写经验', 
        prompt: `请将以下素材重构为正式规范的公文。要求：
1. 严格遵循公文格式规范（标题、主送机关、正文、落款等）
2. 语言正式、准确、简练
3. 逻辑清晰，层次分明
4. 仅在关键信息（如具体日期、金额、人名）确实缺失时使用"[待填充]"
5. 不要过度使用占位符，能推断的内容直接补充完整` 
    },
    'intent': { 
    role: '资深心理分析师和沟通专家，擅长解读语言背后的真实意图', 
    prompt: `请深度解读以下文字背后的核心意图和潜台词。要求：
1. 分析表面含义：这段话字面上在说什么
2. 挖掘深层意图：说话者真正想表达/获得什么
3. 识别潜台词：哪些话有言外之意，具体是什么
4. 情绪分析：说话者的情绪状态和心理动机
5. 语境推断：可能的说话场景和人物关系
6. 应对建议：如何回应才能达到良好的沟通效果
请用清晰的结构分点阐述，必要时引用原文进行分析。` 
},
    'risk': { 
        role: '资深法律顾问和逻辑分析专家', 
        prompt: `请对以下内容进行全面的逻辑和风险排查。要求：
1. 指出逻辑漏洞或自相矛盾之处
2. 标注可能的法律风险或合规问题
3. 发现表述模糊或歧义的地方
4. 提出具体的修改建议
5. 按风险等级（高/中/低）分类列出` 
    },
    'eq': { 
        role: '高情商沟通专家，擅长职场和人际关系处理', 
        prompt: `请将以下内容改写为高情商表达。要求：
1. 保持核心意思不变
2. 语气委婉得体，不伤人
3. 多用"我"开头的表述，少用指责性语言
4. 适当表达理解和共情
5. 如有批评，先肯定后建议
6. 给出原文和改写后的对比` 
    },
    'ghost': { 
        role: '资深影子写手，能够完美模仿各种文风', 
        prompt: `请根据以下原文的风格特点进行自然续写。要求：
1. 仔细分析原文的语言风格、句式特点
2. 保持人称、时态、叙事角度一致
3. 续写内容要与原文逻辑连贯
4. 篇幅与原文大致相当
5. 不要出现明显的风格断层` 
    },
    'mindmap': { 
        role: '结构化思维专家，擅长信息提炼和逻辑梳理', 
        prompt: `请提炼以下内容的逻辑大纲。要求：
1. 使用标准层级序号：1. → 1.1 → 1.1.1
2. 每级缩进清晰
3. 提炼核心观点，去除冗余
4. 层级不超过4级
5. 每个要点简洁明了（不超过20字）
6. 严禁使用"11、12"这种错误格式` 
    }
};

// CORS 配置
const ALLOWED_ORIGINS = [
    "https://www.aibox6.com", 
    "https://aibox6.com", 
    "http://localhost:3000",
    "http://localhost:5173"  // Vite 开发服务器
];

export default async function handler(req) {
    // 处理 CORS 预检请求
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: getCorsHeaders(req)
        });
    }
    
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
            status: 405,
            headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) }
        });
    }
    
    const origin = req.headers.get("origin");
    
    // 生产环境下检查来源
    if (process.env.NODE_ENV === 'production' && origin && !ALLOWED_ORIGINS.includes(origin)) {
        return new Response(JSON.stringify({ error: 'Unauthorized Domain' }), { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await req.json();
        const { message, userKey, model, toolId, temperature = 0.4 } = body;

        // 参数验证
        if (!message || typeof message !== 'string') {
            return errorResponse('缺少必要参数: message', 400, origin);
        }
        
        if (!userKey || typeof userKey !== 'string') {
            return errorResponse('缺少必要参数: userKey', 400, origin);
        }
        
        if (message.length > 50000) {
            return errorResponse('内容过长，请控制在 50000 字以内', 400, origin);
        }

        const toolConfig = TOOL_CONFIGS[toolId] || TOOL_CONFIGS['gongwen'];
        const beijingDate = new Date().toLocaleString("zh-CN", { 
            timeZone: "Asia/Shanghai",
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });

        // 构建系统提示词
        const systemPrompt = `你是一位${toolConfig.role}。

当前时间：${beijingDate}

【核心输出规范】
1. 直接输出 Markdown 格式的结果
2. 不要有任何自我介绍、开场白或总结语
3. 严禁出现空括号 "()" 或 "（）"
4. 只有当关键信息完全缺失且无法推断时，才使用 [待填充]
5. 保持专业性的同时确保可读性

【任务说明】
${toolConfig.prompt}`;

        // 调用 DeepSeek API
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${userKey}` 
            },
            body: JSON.stringify({
                model: model || "deepseek-reasoner",
                messages: [
                    { role: "system", content: systemPrompt }, 
                    { role: "user", content: `请处理以下素材：\n\n${message}` }
                ],
                stream: true,
                temperature: Math.min(Math.max(parseFloat(temperature) || 0.4, 0), 1),
                max_tokens: 8192
            })
        });

        // 检查 API 响应
        if (!response.ok) {
            const errorBody = await response.text();
            let errorMessage = `API 错误 (${response.status})`;
            
            try {
                const errorJson = JSON.parse(errorBody);
                errorMessage = errorJson.error?.message || errorMessage;
            } catch (e) {
                errorMessage = errorBody || errorMessage;
            }
            
            // 特殊处理常见错误
            if (response.status === 401) {
                errorMessage = 'API Key 无效，请检查配置';
            } else if (response.status === 429) {
                errorMessage = '请求过于频繁，请稍后重试';
            } else if (response.status === 402) {
                errorMessage = 'API 余额不足，请充值';
            }
            
            return errorResponse(errorMessage, response.status, origin);
        }

        // 创建流式响应
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body.getReader();
                const encoder = new TextEncoder();
                
                // 心跳定时器，防止连接超时
                const heartbeatInterval = setInterval(() => {
                    try { 
                        controller.enqueue(encoder.encode(': heartbeat\n\n')); 
                    } catch(e) {
                        clearInterval(heartbeatInterval);
                    }
                }, 15000); // 15秒一次心跳
                
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            // 发送结束标记
                            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                            break;
                        }
                        controller.enqueue(value);
                    }
                } catch (err) {
                    // 发送错误信息到前端
                    const errorEvent = `data: ${JSON.stringify({ error: { message: err.message } })}\n\n`;
                    controller.enqueue(encoder.encode(errorEvent));
                } finally {
                    clearInterval(heartbeatInterval);
                    controller.close();
                }
            }
        });

        return new Response(stream, { 
            headers: { 
                'Content-Type': 'text/event-stream', 
                'Cache-Control': 'no-cache, no-store, must-revalidate', 
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
                ...getCorsHeaders(req)
            } 
        });

    } catch (error) {
        console.error('Handler error:', error);
        return errorResponse(error.message || '服务器内部错误', 500, req.headers.get("origin"));
    }
}

// 辅助函数：生成错误响应
function errorResponse(message, status, origin) {
    return new Response(
        JSON.stringify({ error: { message, status } }), 
        { 
            status,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': origin || '*'
            } 
        }
    );
}

// 辅助函数：获取 CORS 头
function getCorsHeaders(req) {
    const origin = req.headers.get("origin");
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
    };
}
